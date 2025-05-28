// src/agents/coordination/MultiAgentCoordinator.ts

import type { 
  MultiAgentCoordinator, 
  SharedContext, 
  AgentResult
} from '../../types/agents';
import type { PatientData, SupportedAIModel } from '../../types/index';
import drugMappingClient from '../../services/drugMappingClient';

// Import wszystkich agentów
import { ClinicalSynthesisAgent } from '../core/ClinicalSynthesisAgent';
import { EpisodeAnalysisAgent } from '../core/EpisodeAnalysisAgent';
import { PharmacotherapyAgent } from '../core/PharmacotherapyAgent';
import { TRDAssessmentAgent } from '../core/TRDAssessmentAgent';
import { CriteriaAssessmentAgent } from '../core/CriteriaAssessmentAgent';
import { RiskAssessmentAgent } from '../core/RiskAssessmentAgent';

/**
 * Preprocessuje historię medyczną, mapując nazwy handlowe leków na substancje czynne
 */
async function preprocessMedicalHistoryForDrugMapping(medicalHistory: string): Promise<{
  processedHistory: string;
  drugMappings: Array<{original: string; mapped: string; confidence: number}>;
}> {
  console.log('🔍 [Multi-Agent] Preprocessing medical history for drug mapping...');
  
  const drugMappings: Array<{original: string; mapped: string; confidence: number}> = [];
  let processedHistory = medicalHistory;
  
  // Wzorce do wykrywania nazw leków w tekście
  const drugPatterns = [
    // Wzorce dla polskich nazw leków
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:\d+\s*mg|\d+mg|tabl|kaps|ml)/gi,
    // Wzorce dla nazw w nawiasach
    /\(([^)]+(?:ina|ine|ol|um|an|on|ex|al))\)/gi,
    // Wzorce dla nazw po "lek:", "preparat:", itp.
    /(?:lek|preparat|medication|drug):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    // Wzorce dla typowych końcówek nazw leków
    /\b([A-Z][a-z]*(?:ina|ine|ol|um|an|on|ex|al|yl|il))\b/gi
  ];
  
  const potentialDrugs = new Set<string>();
  
  // Wyciągnij potencjalne nazwy leków
  drugPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(medicalHistory)) !== null) {
      const drugName = match[1].trim();
      if (drugName.length > 3) { // Ignoruj bardzo krótkie nazwy
        potentialDrugs.add(drugName);
      }
    }
  });
  
  console.log(`🔍 [Multi-Agent] Found ${potentialDrugs.size} potential drug names:`, Array.from(potentialDrugs));
  
  // Mapuj każdą potencjalną nazwę leku
  for (const drugName of potentialDrugs) {
    try {
      const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
      
      if (mappingResult.found && mappingResult.confidence > 0.6) {
        const standardName = mappingResult.standardName;
        const activeSubstance = mappingResult.activeSubstance;
        
        // Użyj substancji czynnej jako głównej nazwy
        const mappedName = activeSubstance || standardName;
        
        drugMappings.push({
          original: drugName,
          mapped: mappedName,
          confidence: mappingResult.confidence
        });
        
        // Zamień w tekście wszystkie wystąpienia nazwy handlowej na substancję czynną
        const regex = new RegExp(`\\b${drugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        processedHistory = processedHistory.replace(regex, `${mappedName} (${drugName})`);
        
        console.log(`✅ [Multi-Agent] Mapped: ${drugName} → ${mappedName} (confidence: ${Math.round(mappingResult.confidence * 100)}%)`);
      } else {
        console.log(`⚠️ [Multi-Agent] No mapping found for: ${drugName} (confidence: ${mappingResult.confidence})`);
      }
    } catch (error) {
      console.error(`❌ [Multi-Agent] Error mapping drug ${drugName}:`, error);
    }
  }
  
  console.log(`✅ [Multi-Agent] Drug mapping completed. Mapped ${drugMappings.length} drugs.`);
  
  return {
    processedHistory,
    drugMappings
  };
}

export class MultiAgentCoordinatorImpl implements MultiAgentCoordinator {
  private readonly agents: Map<string, any> = new Map();
  private readonly executionLog: string[] = [];
  private readonly RATE_LIMIT_DELAY = 45000; // 45 sekund między agentami - zwiększone z powodu rate limiting Claude
  private readonly CLAUDE_RATE_LIMIT_DELAY = 60000; // 60 sekund specjalnie dla Claude
  private readonly MAX_RETRIES = 3;

  constructor() {
    // Inicjalizacja wszystkich agentów
    this.agents.set('clinical-synthesis', new ClinicalSynthesisAgent());
    this.agents.set('episode-analysis', new EpisodeAnalysisAgent());
    this.agents.set('pharmacotherapy-analysis', new PharmacotherapyAgent());
    this.agents.set('trd-assessment', new TRDAssessmentAgent());
    this.agents.set('criteria-assessment', new CriteriaAssessmentAgent());
    this.agents.set('risk-assessment', new RiskAssessmentAgent());
  }

  public async executeAgentPipeline(
    medicalHistory: string,
    studyProtocol: string,
    selectedModel: SupportedAIModel
  ): Promise<{
    finalResult: PatientData;
    agentResults: Record<string, AgentResult>;
    executionLog: string[];
  }> {
    this.executionLog.length = 0; // Wyczyść logi
    
    try {
      // NOWE: Preprocessuj historię medyczną dla mapowania leków
      this.log('🔍 Preprocessing medical history for drug mapping...');
      const { processedHistory, drugMappings } = await preprocessMedicalHistoryForDrugMapping(medicalHistory);
      
      // Dodaj informację o mapowaniu do kontekstu
      let enhancedHistory = processedHistory;
      if (drugMappings.length > 0) {
        enhancedHistory += '\n\n--- INFORMACJE O MAPOWANIU LEKÓW ---\n';
        enhancedHistory += 'Następujące nazwy handlowe zostały automatycznie zmapowane na substancje czynne:\n';
        drugMappings.forEach(mapping => {
          enhancedHistory += `• ${mapping.original} → ${mapping.mapped} (pewność: ${Math.round(mapping.confidence * 100)}%)\n`;
        });
        enhancedHistory += 'Proszę używać nazw substancji czynnych w analizie dla większej precyzji.\n';
      }
      
      this.log(`✅ Drug mapping completed. Mapped ${drugMappings.length} drugs.`);
      
      // Inicjalizacja kontekstu współdzielonego z przetworzoną historią
      const context: SharedContext = {
        medicalHistory: enhancedHistory, // Używamy przetworzonej historii
        studyProtocol,
        modelUsed: selectedModel,
        drugMappingInfo: {
          mappingsApplied: drugMappings.length,
          mappings: drugMappings,
          preprocessedAt: new Date().toISOString()
        }
      };

      const agentResults: Record<string, AgentResult> = {};

      // FAZA 1: Analiza podstawowa - sekwencyjna dla zależności
      this.log('🚀 FAZA 1: Rozpoczynanie analizy podstawowej...');
      
      // Krok 1a: Clinical Synthesis (brak zależności)
      const clinicalResult = await this.executeAgent('clinical-synthesis', context);
      agentResults['clinical-synthesis'] = clinicalResult;
      context.clinicalSynthesis = clinicalResult;
      this.log('✅ Agent Syntezy Klinicznej zakończony pomyślnie');

      // Krok 1b: Episode Analysis (zależy tylko od clinical-synthesis)
      const episodeResult = await this.executeAgent('episode-analysis', context);
      agentResults['episode-analysis'] = episodeResult;
      context.episodeAnalysis = episodeResult;
      this.log('✅ Agent Analizy Epizodów zakończony pomyślnie');

      // Krok 1c: Pharmacotherapy Analysis (zależy od clinical-synthesis i episode-analysis)
      const pharmacoResult = await this.executeAgent('pharmacotherapy-analysis', context);
      agentResults['pharmacotherapy-analysis'] = pharmacoResult;
      context.pharmacotherapyAnalysis = pharmacoResult;
      this.log('✅ Agent Farmakoterapii zakończony pomyślnie');

      // FAZA 2: Analiza TRD (zależy od fazy 1)
      this.log('🔬 FAZA 2: Rozpoczynanie analizy TRD...');
      
      const trdResult = await this.executeAgent('trd-assessment', context);
      agentResults['trd-assessment'] = trdResult;
      context.trdAssessment = trdResult;
      this.log('✅ Agent TRD zakończony');

      // FAZA 3: Ocena kryteriów (zależy od faz 1-2)
      this.log('📋 FAZA 3: Rozpoczynanie oceny kryteriów...');
      
      const criteriaResult = await this.executeAgent('criteria-assessment', context);
      agentResults['criteria-assessment'] = criteriaResult;
      context.inclusionCriteriaAssessment = criteriaResult;
      this.log('✅ Agent Oceny Kryteriów zakończony');

      // FAZA 4: Ocena ryzyka (zależy od wszystkich poprzednich)
      this.log('⚠️ FAZA 4: Rozpoczynanie oceny ryzyka...');
      
      const riskResult = await this.executeAgent('risk-assessment', context);
      agentResults['risk-assessment'] = riskResult;
      context.riskAssessment = riskResult;
      this.log('✅ Agent Oceny Ryzyka zakończony');

      // FAZA 5: Synteza końcowa
      this.log('🎯 FAZA 5: Synteza wyników...');
      
      const finalResult = this.synthesizeFinalResult(agentResults, context);
      
      // Dodaj informacje o mapowaniu leków do wyniku końcowego
      finalResult.drugMappingInfo = {
        mappingsApplied: drugMappings.length,
        mappings: drugMappings,
        preprocessedAt: new Date().toISOString()
      };
      
      this.log(`✅ Analiza wieloagentowa zakończona pomyślnie z ${drugMappings.length} mapowaniami leków`);
      
      return {
        finalResult,
        agentResults,
        executionLog: [...this.executionLog]
      };

    } catch (error) {
      this.log(`💥 Krytyczny błąd w pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async executeAgent(agentName: string, context: SharedContext): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} nie został znaleziony`);
    }

    this.log(`🔄 Wykonywanie agenta: ${agentName}`);
    const startTime = Date.now();
    
    // Dodaj opóźnienie przed wykonaniem agenta (oprócz pierwszego)
    if (agentName !== 'clinical-synthesis') {
      // Użyj dłuższego opóźnienia dla Claude
      const delay = context.modelUsed === 'claude-opus' ? this.CLAUDE_RATE_LIMIT_DELAY : this.RATE_LIMIT_DELAY;
      this.log(`⏳ Oczekiwanie ${delay/1000}s przed wykonaniem ${agentName} (rate limiting ${context.modelUsed} API)...`);
      await this.sleep(delay);
    }
    
    // USPRAWNIENIE: Wzbogać kontekst o wyniki poprzednich agentów w czytelnej formie
    const enrichedContext = this.enrichContextForAgent(agentName, context);
    
    let lastError: Error | null = null;
    
    // Retry logic dla błędów rate limit
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.log(`🎯 ${agentName} - próba ${attempt}/${this.MAX_RETRIES}`);
        const result = await agent.process(enrichedContext);
        const duration = Date.now() - startTime;
        this.log(`⏱️ Agent ${agentName} zakończony w ${duration}ms`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        const isRateLimit = error instanceof Error && 
          (error.message.includes('rate_limit_error') || 
           error.message.includes('429') ||
           error.message.includes('rate limit'));
        
        if (isRateLimit && attempt < this.MAX_RETRIES) {
          // Zwiększ opóźnienie eksponencjalnie dla kolejnych prób
          const baseDelay = context.modelUsed === 'claude-opus' ? this.CLAUDE_RATE_LIMIT_DELAY : this.RATE_LIMIT_DELAY;
          const retryDelay = baseDelay * attempt * 1.5;
          this.log(`⚠️ ${agentName} - rate limit ${context.modelUsed} API (próba ${attempt}/${this.MAX_RETRIES}). Oczekiwanie ${retryDelay/1000}s przed ponowną próbą...`);
          await this.sleep(retryDelay);
          continue;
        } else {
          // Nie jest to rate limit lub wyczerpano próby
          break;
        }
      }
    }
    
    // Jeśli dotarliśmy tutaj, wszystkie próby się nie powiodły
    const duration = Date.now() - startTime;
    this.log(`💥 Agent ${agentName} zakończony błędem po ${duration}ms: ${lastError?.message || 'Unknown error'}`);
    
    // Sprawdź czy to błąd rate limit Claude - jeśli tak, zasugeruj użycie innego modelu
    const isClaudeRateLimit = context.modelUsed === 'claude-opus' && lastError?.message?.includes('rate_limit_error');
    if (isClaudeRateLimit) {
      this.log(`💡 Sugestia: Rozważ użycie modelu 'gemini' lub 'o3' zamiast 'claude-opus' aby uniknąć limitów API`);
    }
    
    // Zamiast rzucać błąd dalej, zwracamy fallback result
    console.error(`[MultiAgentCoordinator] Szczegóły błędu ${agentName}:`, lastError);
    
    return {
      agentName: agentName,
      data: agent.getErrorFallback(),
      confidence: 0,
      warnings: [`Błąd w ${agentName}: ${lastError?.message || 'Unknown error'}${isClaudeRateLimit ? ' (Claude rate limit - spróbuj inny model)' : ''}`],
      processingTime: duration,
      timestamp: new Date().toISOString()
    };
  }

  // NOWA METODA: Wzbogacanie kontekstu dla każdego agenta
  private enrichContextForAgent(agentName: string, context: SharedContext): SharedContext {
    const enriched = { ...context };
    
    // Dodaj podsumowanie wyników poprzednich agentów w czytelnej formie
    let previousResults = '';
    
    if (context.clinicalSynthesis && agentName !== 'clinical-synthesis') {
      previousResults += `\n=== WYNIKI SYNTEZY KLINICZNEJ ===\n`;
      previousResults += `Przegląd pacjenta: ${context.clinicalSynthesis.data?.patientOverview || 'Brak danych'}\n`;
      previousResults += `Historia leczenia: ${context.clinicalSynthesis.data?.treatmentHistory || 'Brak danych'}\n`;
      previousResults += `Kluczowe obserwacje: ${context.clinicalSynthesis.data?.keyObservations?.join('; ') || 'Brak danych'}\n`;
      previousResults += `Czynniki ryzyka: ${context.clinicalSynthesis.data?.riskFactors?.join('; ') || 'Brak danych'}\n`;
    }
    
    if (context.episodeAnalysis && !['clinical-synthesis', 'episode-analysis'].includes(agentName)) {
      previousResults += `\n=== WYNIKI ANALIZY EPIZODÓW ===\n`;
      previousResults += `Najbardziej prawdopodobny scenariusz: ${context.episodeAnalysis.data?.mostLikelyScenario || 'N/A'}\n`;
      previousResults += `Scenariusze epizodów:\n`;
      context.episodeAnalysis.data?.scenarios?.forEach(s => {
        previousResults += `- Scenariusz ${s.id}: ${s.description} (${s.startDate} - ${s.endDate || 'trwający'}), pewność: ${s.confidence}\n`;
      });
      previousResults += `Wniosek: ${context.episodeAnalysis.data?.conclusion || 'Brak wniosku'}\n`;
    }
    
    if (context.pharmacotherapyAnalysis && !['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis'].includes(agentName)) {
      previousResults += `\n=== WYNIKI ANALIZY FARMAKOTERAPII ===\n`;
      previousResults += `Oś czasu farmakoterapii:\n`;
      context.pharmacotherapyAnalysis.data?.timeline?.forEach(item => {
        previousResults += `- ${item.drugName} (${item.dose}): ${item.startDate} - ${item.endDate}, grupa: ${item.attemptGroup}, uwagi: ${item.notes}\n`;
      });
      previousResults += `Mapowania leków:\n`;
      context.pharmacotherapyAnalysis.data?.drugMappings?.forEach(m => {
        previousResults += `- ${m.originalName} → ${m.standardName}\n`;
      });
      if (context.pharmacotherapyAnalysis.data?.prohibitedDrugs?.length > 0) {
        previousResults += `Leki zabronione: ${context.pharmacotherapyAnalysis.data.prohibitedDrugs.map(d => `${d.drugName} (${d.status})`).join('; ')}\n`;
      }
    }
    
    if (context.trdAssessment && !['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis', 'trd-assessment'].includes(agentName)) {
      previousResults += `\n=== WYNIKI OCENY TRD ===\n`;
      previousResults += `Status TRD: ${context.trdAssessment.data?.trdStatus || 'N/A'}\n`;
      previousResults += `Liczba niepowodzeń: ${context.trdAssessment.data?.failureCount || 0}\n`;
      previousResults += `Data rozpoczęcia epizodu: ${context.trdAssessment.data?.episodeStartDate || 'N/A'}\n`;
      previousResults += `Adekwatne próby leczenia:\n`;
      context.trdAssessment.data?.adequateTrials?.forEach(trial => {
        previousResults += `- ${trial.drugName} (${trial.dose}): ${trial.duration} tygodni, adekwatna: ${trial.adequate ? 'TAK' : 'NIE'}\n`;
      });
      previousResults += `Wniosek TRD: ${context.trdAssessment.data?.conclusion || 'Brak wniosku'}\n`;
    }
    
    // Dodaj wyniki poprzednich agentów do kontekstu
    if (previousResults) {
      enriched.previousAgentResults = previousResults;
    }
    
    return enriched;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private synthesizeFinalResult(
    agentResults: Record<string, AgentResult>, 
    context: SharedContext
  ): PatientData {
    // Pobierz wyniki z agentów
    const clinicalSynthesis = agentResults['clinical-synthesis']?.data;
    const episodeAnalysis = agentResults['episode-analysis']?.data;
    const pharmacotherapyAnalysis = agentResults['pharmacotherapy-analysis']?.data;
    const trdAssessment = agentResults['trd-assessment']?.data;
    const criteriaAssessment = agentResults['criteria-assessment']?.data;
    const riskAssessment = agentResults['risk-assessment']?.data;

    // Generuj ID pacjenta
    const patientId = this.generatePatientId();

    // Synteza danych pacjenta
    const patientData: PatientData = {
      summary: {
        id: patientId,
        age: this.extractAge(clinicalSynthesis) || 0,
        mainDiagnosis: clinicalSynthesis?.mainDiagnosis || 'Brak danych o głównym rozpoznaniu',
        comorbidities: clinicalSynthesis?.comorbidities || []
      },
      
      episodeEstimation: {
        scenarios: episodeAnalysis?.scenarios?.map((scenario: any) => ({
          id: scenario.id,
          description: scenario.description,
          evidence: scenario.evidence,
          startDate: scenario.startDate,
          endDate: scenario.endDate,
          confidence: scenario.confidence
        })) || [],
        conclusion: episodeAnalysis?.conclusion || 'Brak danych o epizodach'
      },

      trdAnalysis: {
        episodeStartDate: this.extractEpisodeStartDate(episodeAnalysis, trdAssessment),
        pharmacotherapy: pharmacotherapyAnalysis?.timeline || [],
        conclusion: trdAssessment?.conclusion || 'Brak oceny TRD'
      },

      inclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.inclusionCriteria || []),
      psychiatricExclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.psychiatricExclusionCriteria || []),
      medicalExclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.medicalExclusionCriteria || []),

      reportConclusion: {
        overallQualification: this.generateOverallQualification(riskAssessment, criteriaAssessment),
        mainIssues: this.extractMainIssues(riskAssessment, criteriaAssessment),
        criticalInfoNeeded: this.extractCriticalInfo(riskAssessment, criteriaAssessment),
        estimatedProbability: riskAssessment?.inclusionProbability?.score || 0,
        riskFactors: this.extractRiskFactors(clinicalSynthesis, riskAssessment)
      },

      analyzedAt: new Date().toISOString(),
      isMockData: false,
      modelUsed: context.modelUsed
    };

    return patientData;
  }

  // Metody pomocnicze do ekstrakcji danych
  private extractAge(clinicalSynthesis: any): number | null {
    if (!clinicalSynthesis?.patientOverview) return null;
    
    // Spróbuj różnych wzorców dla wieku
    const patterns = [
      /(\d+)[\s-]*lat/i,          // "33 lat", "33-lat"
      /(\d+)[\s-]*roku/i,         // "33 roku", "33-roku"  
      /wiek[:\s]*(\d+)/i,         // "wiek: 33", "wiek 33"
      /lat[:\s]*(\d+)/i,          // "lat: 33"
      /(?:^|\s)(\d+)(?:[\s-]*letni|[\s-]*letnia)/i, // "33-letni", "33 letnia"
    ];
    
    for (const pattern of patterns) {
      const ageMatch = clinicalSynthesis.patientOverview.match(pattern);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age >= 18 && age <= 100) { // Sprawdzenie sensowności wieku
          return age;
        }
      }
    }
    
    // Spróbuj znaleźć w keyObservations
    if (clinicalSynthesis.keyObservations) {
      for (const observation of clinicalSynthesis.keyObservations) {
        for (const pattern of patterns) {
          const ageMatch = observation.match(pattern);
          if (ageMatch) {
            const age = parseInt(ageMatch[1]);
            if (age >= 18 && age <= 100) {
              return age;
            }
          }
        }
      }
    }
    
    return null;
  }

  private extractMainDiagnosis(clinicalSynthesis: any): string | null {
    if (!clinicalSynthesis?.patientOverview) return null;
    
    const overview = clinicalSynthesis.patientOverview;
    const treatmentHistory = clinicalSynthesis.treatmentHistory || '';
    const keyObservations = (clinicalSynthesis.keyObservations || []).join(' ');
    const allText = `${overview} ${treatmentHistory} ${keyObservations}`.toLowerCase();
    
    console.log('[DEBUG] extractMainDiagnosis - Tekst do analizy (pierwsze 200 znaków):', allText.substring(0, 200));
    
    // PRIORYTET 1: Szukaj kodów F33 (depresja nawracająca) - NAJWYŻSZY PRIORYTET
    const f33Patterns = [
      /F33(?:\.\d+)?/gi,
      /F33(?:\.\d+)?\s*[:-]?\s*([^,.;()]*)/gi
    ];
    
    for (const pattern of f33Patterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        console.log('[DEBUG] extractMainDiagnosis - Znaleziono kod F33:', match[0]);
        // F33 to zawsze depresja nawracająca - zwróć natychmiast
        return 'Depresja nawracająca (F33)';
      }
    }
    
    // PRIORYTET 2: Szukaj innych kodów depresyjnych F3x
    const f3xPatterns = [
      /F3[0-9](?:\.\d+)?/gi,
      /F3[0-9](?:\.\d+)?\s*[:-]?\s*([^,.;()]*)/gi
    ];
    
    for (const pattern of f3xPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        console.log('[DEBUG] extractMainDiagnosis - Znaleziono kod F3x:', match[0]);
        const fullMatch = match[0];
        const description = match[1] || '';
        
        // Sprawdź czy to nie F32 (epizod depresyjny) lub inne kody depresyjne
        if (fullMatch.match(/F3[0-2]/i)) {
          return `Depresja (${fullMatch.toUpperCase()})${description ? ' - ' + description.trim() : ''}`;
        }
      }
    }
    
    // PRIORYTET 3: Szukaj opisowych rozpoznań depresyjnych
    const depressionPatterns = [
      // Bezpośrednie wzorce depresyjne
      /(?:depresj[a-z]*|TRD|lekoopora)[^,.;()]*(?:\s+F3[0-9](?:\.\d+)?)?/gi,
      /(?:nawracaj[a-z]*|powracaj[a-z]*|przewlekł[a-z]*)\s+depresj[a-z]*/gi,
      /(?:epizod|zaburzenia)\s+depresyjn[a-z]*/gi,
      /(?:depresj[a-z]*)\s+(?:nawracaj[a-z]*|powracaj[a-z]*|przewlekł[a-z]*)/gi,
      // Główne rozpoznanie explicite z depresją
      /(?:główn[a-z]*\s+)?(?:rozpoznanie|diagnoza)[:\s]*([^,.;()]*(?:depresj|TRD|lekoopora)[^,.;()]*)/gi,
      // Leczenie z powodu depresji
      /(?:leczony|hospitalizowany)\s+z\s+powodu\s+([^,.;()]*(?:depresj|TRD|lekoopora)[^,.;()]*)/gi
    ];
    
    for (const pattern of depressionPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const diagnosis = match[1] || match[0];
        console.log('[DEBUG] extractMainDiagnosis - Znaleziono potencjalną depresję:', diagnosis);
        if (diagnosis && diagnosis.length > 3) {
          const cleanedDiagnosis = this.cleanDiagnosisText(diagnosis);
          console.log('[DEBUG] extractMainDiagnosis - Po czyszczeniu:', cleanedDiagnosis);
          if (cleanedDiagnosis && cleanedDiagnosis.length > 3) {
            // Znaleziono rozpoznanie depresyjne - zwróć je jako główne
            console.log('[DEBUG] extractMainDiagnosis - ZWRACAM DEPRESJĘ:', cleanedDiagnosis);
            return cleanedDiagnosis;
          }
        }
      }
    }
    
    console.log('[DEBUG] extractMainDiagnosis - Nie znaleziono depresji, szukam innych rozpoznań...');
    
    // PRIORYTET 4: Ogólne wzorce rozpoznań (jeśli nie znaleziono depresji)
    const generalPatterns = [
      // Kody ICD-10 z opisami (ale nie F3x - te już sprawdziliśmy)
      /F[014-9]\d+(?:\.\d+)?\s*[:-]?\s*([^,.;()]+)/gi,
      // Opisowe rozpoznania
      /(?:rozpoznanie|diagnoza|leczony z powodu|hospitalizowany z powodu)[:\s]+([^,.;()]+)/gi,
      // Główne rozpoznanie explicite
      /(?:główn[a-z]*\s+)?(?:rozpoznanie|diagnoza)[:\s]*([^,.;()]+)/gi
    ];
    
    const foundDiagnoses: Array<{diagnosis: string, frequency: number, context: string}> = [];
    
    // Znajdź wszystkie rozpoznania i policz ich częstotliwość w kontekście leczenia
    for (const pattern of generalPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const diagnosis = match[1]?.trim();
        console.log('[DEBUG] extractMainDiagnosis - Znaleziono ogólne rozpoznanie:', diagnosis);
        if (diagnosis && diagnosis.length > 3) {
          const cleanedDiagnosis = this.cleanDiagnosisText(diagnosis);
          console.log('[DEBUG] extractMainDiagnosis - Po czyszczeniu ogólnego:', cleanedDiagnosis);
          if (cleanedDiagnosis) {
            // Policz częstotliwość występowania w kontekście leczenia
            const frequency = this.calculateDiagnosisFrequency(cleanedDiagnosis, allText);
            const context = this.analyzeDiagnosisContext(cleanedDiagnosis, allText);
            
            foundDiagnoses.push({
              diagnosis: cleanedDiagnosis,
              frequency,
              context
            });
          }
        }
      }
    }
    
    console.log('[DEBUG] extractMainDiagnosis - Znalezione rozpoznania:', foundDiagnoses);
    
    // Jeśli nie znaleziono żadnych rozpoznań, użyj fallback
    if (foundDiagnoses.length === 0) {
      console.log('[DEBUG] extractMainDiagnosis - Brak rozpoznań, używam fallback');
      return 'Depresja lekoopora (TRD)';
    }
    
    // SPECJALNA LOGIKA: Jeśli znaleziono F33.1 w chorobach towarzyszących, to znaczy że to główne rozpoznanie
    const hasF33InComorbidities = foundDiagnoses.some(d => d.diagnosis.match(/F33/i));
    if (hasF33InComorbidities) {
      console.log('[DEBUG] extractMainDiagnosis - Znaleziono F33 w rozpoznaniach - to główne rozpoznanie!');
      return 'Depresja nawracająca (F33.1)';
    }
    
    // Sortuj według częstotliwości i kontekstu leczenia
    foundDiagnoses.sort((a, b) => {
      // Priorytet dla rozpoznań z kontekstem głównego leczenia
      const aMainTreatment = a.context.includes('main_treatment') ? 10 : 0;
      const bMainTreatment = b.context.includes('main_treatment') ? 10 : 0;
      
      // Priorytet dla częstotliwości
      const frequencyDiff = b.frequency - a.frequency;
      
      return (bMainTreatment - aMainTreatment) || frequencyDiff;
    });
    
    console.log('[DEBUG] extractMainDiagnosis - Po sortowaniu:', foundDiagnoses);
    console.log('[DEBUG] extractMainDiagnosis - ZWRACAM:', foundDiagnoses[0].diagnosis);
    
    return foundDiagnoses[0].diagnosis;
  }

  private cleanDiagnosisText(diagnosis: string): string | null {
    console.log('[DEBUG] cleanDiagnosisText - Wejście:', diagnosis);
    
    // Oczyść tekst z niepotrzebnych informacji, ale zachowaj kluczowe części diagnozy
    let cleaned = diagnosis
      .replace(/\d+[\s-]*letni[a]?/gi, '') // Usuń wiek
      .replace(/kawaler|bezdzietny|wykształcenie|mieszka|pracuje/gi, '') // Usuń dane demograficzne
      .replace(/^(na|z powodu|przez|od|do)\s+/i, '') // Usuń przedimki na początku
      .trim();
    
    console.log('[DEBUG] cleanDiagnosisText - Po podstawowym czyszczeniu:', cleaned);
    
    // NIE OBCINAJ końcówek - mogą zawierać ważne informacje o diagnozie
    // Usuń tylko wyraźne dodatkowe informacje po przecinku/średniku
    cleaned = cleaned.replace(/\s*[,;]\s*(?:i|oraz|a także).*$/i, '');
    
    console.log('[DEBUG] cleanDiagnosisText - Po usunięciu końcówek:', cleaned);
    
    // Odrzuć zbyt krótkie terminy
    if (cleaned.length < 3) {
      console.log('[DEBUG] cleanDiagnosisText - Odrzucono: za krótkie');
      return null;
    }
    
    // Odrzuć tylko bardzo ogólne terminy, ale zachowaj konkretne diagnozy
    const tooGeneral = /^(choroby|schorzenia|problemy|stan|objawy|leczenie|terapia)$/i;
    if (tooGeneral.test(cleaned)) {
      console.log('[DEBUG] cleanDiagnosisText - Odrzucono: zbyt ogólne');
      return null;
    }
    
    // Popraw typowe błędy w ekstraktowaniu
    if (cleaned.startsWith('m ')) {
      console.log('[DEBUG] cleanDiagnosisText - Naprawiam błąd "m " na początku');
      cleaned = cleaned.replace(/^m\s+/, ''); // Usuń "m " na początku
    }
    
    console.log('[DEBUG] cleanDiagnosisText - Wynik końcowy:', cleaned);
    
    return cleaned;
  }

  private calculateDiagnosisFrequency(diagnosis: string, text: string): number {
    const diagnosisLower = diagnosis.toLowerCase();
    let frequency = 0;
    
    // Wzorce dla różnych form występowania rozpoznania
    const patterns = [
      new RegExp(`\\b${diagnosisLower}\\b`, 'gi'),
      new RegExp(`${diagnosisLower.split(' ')[0]}`, 'gi'), // Pierwsze słowo
      // Dla depresji
      /depresj[a-z]*/gi,
      /TRD/gi,
      /lekoopora/gi,
      // Dla OCD
      /obsesyjn[a-z]*/gi,
      /kompulsyjn[a-z]*/gi,
      /OCD/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        frequency += matches.length;
      }
    }
    
    return frequency;
  }

  private analyzeDiagnosisContext(diagnosis: string, text: string): string {
    const diagnosisLower = diagnosis.toLowerCase();
    let context = '';
    
    // Sprawdź kontekst głównego leczenia
    const mainTreatmentPatterns = [
      /(?:głównie|przede wszystkim|podstawowo)\s+leczony\s+z\s+powodu/gi,
      /(?:większość|wielu|liczne)\s+(?:wizyt|hospitalizacji|leczenia)/gi,
      /(?:od lat|długotrwale|przewlekle)\s+leczony/gi,
      /(?:podstawowe|główne)\s+(?:rozpoznanie|leczenie)/gi
    ];
    
    for (const pattern of mainTreatmentPatterns) {
      if (pattern.test(text)) {
        // Sprawdź czy rozpoznanie występuje w pobliżu tych wzorców
        const contextWindow = 100; // 100 znaków przed i po
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const matchIndex = text.indexOf(match);
            const contextText = text.substring(
              Math.max(0, matchIndex - contextWindow),
              Math.min(text.length, matchIndex + match.length + contextWindow)
            );
            
            if (contextText.toLowerCase().includes(diagnosisLower)) {
              context += 'main_treatment ';
              break;
            }
          }
        }
      }
    }
    
    // Sprawdź kontekst dodatkowego rozpoznania
    const additionalPatterns = [
      /(?:dodatkowo|również|ponadto|w toku|w trakcie)\s+(?:rozpoznano|stwierdzono)/gi,
      /(?:współistniejące|towarzyszące|dodatkowe)/gi,
      /(?:w wywiadzie|wcześniej|w przeszłości)/gi
    ];
    
    for (const pattern of additionalPatterns) {
      if (pattern.test(text)) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const matchIndex = text.indexOf(match);
            const contextWindow = 100;
            const contextText = text.substring(
              Math.max(0, matchIndex - contextWindow),
              Math.min(text.length, matchIndex + match.length + contextWindow)
            );
            
            if (contextText.toLowerCase().includes(diagnosisLower)) {
              context += 'additional ';
              break;
            }
          }
        }
      }
    }
    
    return context.trim();
  }

  private extractComorbidities(clinicalSynthesis: any): string[] {
    if (!clinicalSynthesis) return [];
    
    const comorbidities: string[] = [];
    const mainDiagnosis = this.extractMainDiagnosis(clinicalSynthesis);
    
    console.log('[DEBUG] extractComorbidities - Główne rozpoznanie:', mainDiagnosis);
    
    const textToSearch = [
      clinicalSynthesis.patientOverview || '',
      ...(clinicalSynthesis.keyObservations || []),
      clinicalSynthesis.treatmentHistory || ''
    ].join(' ').toLowerCase();
    
    // INTELIGENTNE ROZPOZNAWANIE CHORÓB Z KONTEKSTU
    // Wzorce dla identyfikacji chorób towarzyszących
    const diseasePatterns = [
      // Wzorce bezpośredniego wymienienia chorób
      /(?:choruje na|cierpi na|ma|rozpoznano|stwierdza się|w wywiadzie)\s+([^,.;()]+?)(?:\s+(?:i|oraz|,|;|\.|$))/gi,
      /(?:współistniejące|towarzyszące|dodatkowe)\s+(?:choroby|schorzenia|rozpoznania)[:\s]+([^,.;()]+)/gi,
      /(?:dodatkowo|również|ponadto|w toku|w trakcie)\s+(?:choruje na|ma|cierpi na|rozpoznano|stwierdzono)\s+([^,.;()]+)/gi,
      
      // Wzorce z kodami ICD-10 (wszystkie)
      /([A-Z]\d+(?:\.\d+)?)\s*[:-]?\s*([^,.;()]+)/gi,
      
      // Wzorce opisowe
      /(?:w wywiadzie|w przeszłości|wcześniej)\s+(?:leczony z powodu|chorował na|miał)\s+([^,.;()]+)/gi,
      /(?:przyjmuje|stosuje|zażywa)\s+(?:leki na|z powodu)\s+([^,.;()]+)/gi
    ];
    
    for (const pattern of diseasePatterns) {
      let match;
      while ((match = pattern.exec(textToSearch)) !== null) {
        const potentialDisease = match[1] || match[2];
        if (potentialDisease) {
          const cleanedDisease = this.cleanAndValidateDisease(potentialDisease.trim());
          console.log('[DEBUG] extractComorbidities - Potencjalna choroba:', potentialDisease, '-> po czyszczeniu:', cleanedDisease);
          if (cleanedDisease && !comorbidities.includes(cleanedDisease)) {
            // KLUCZOWE: Sprawdź czy to nie jest główne rozpoznanie
            const isSame = this.isSameDiagnosis(cleanedDisease, mainDiagnosis);
            console.log('[DEBUG] extractComorbidities - Czy to samo co główne rozpoznanie?', cleanedDisease, 'vs', mainDiagnosis, '=', isSame);
            if (!isSame) {
              comorbidities.push(cleanedDisease);
              console.log('[DEBUG] extractComorbidities - Dodano do chorób towarzyszących:', cleanedDisease);
            } else {
              console.log('[DEBUG] extractComorbidities - Pominięto (to główne rozpoznanie):', cleanedDisease);
            }
          }
        }
      }
    }
    
    // Dodaj kody ICD-10 inne niż główne rozpoznanie
    const icdMatches = textToSearch.match(/[A-Z]\d+(?:\.\d+)?/gi);
    if (icdMatches) {
      console.log('[DEBUG] extractComorbidities - Znalezione kody ICD-10:', icdMatches);
      for (const code of icdMatches) {
        const codeUpper = code.toUpperCase();
        const isSame = this.isSameDiagnosis(codeUpper, mainDiagnosis);
        console.log('[DEBUG] extractComorbidities - Kod ICD-10:', codeUpper, 'vs główne:', mainDiagnosis, '= czy to samo?', isSame);
        if (!comorbidities.includes(codeUpper) && !isSame) {
          comorbidities.push(codeUpper);
          console.log('[DEBUG] extractComorbidities - Dodano kod ICD-10:', codeUpper);
        } else {
          console.log('[DEBUG] extractComorbidities - Pominięto kod ICD-10:', codeUpper, '(duplikat lub główne rozpoznanie)');
        }
      }
    }
    
    console.log('[DEBUG] extractComorbidities - Finalne choroby towarzyszące:', comorbidities);
    
    return comorbidities;
  }

  private isSameDiagnosis(diagnosis1: string | null, diagnosis2: string | null): boolean {
    if (!diagnosis1 || !diagnosis2) return false;
    
    const d1 = diagnosis1.toLowerCase().trim();
    const d2 = diagnosis2.toLowerCase().trim();
    
    // Dokładne dopasowanie
    if (d1 === d2) return true;
    
    // Sprawdź czy jeden zawiera drugi (dla różnych form tego samego rozpoznania)
    if (d1.includes(d2) || d2.includes(d1)) return true;
    
    // Sprawdź kody ICD-10 (podstawowe kody bez podkategorii)
    const icd1 = d1.match(/([A-Z]\d+)/i)?.[1];
    const icd2 = d2.match(/([A-Z]\d+)/i)?.[1];
    if (icd1 && icd2 && icd1.toLowerCase() === icd2.toLowerCase()) return true;
    
    // ROZSZERZONE SPRAWDZENIE KODÓW DEPRESYJNYCH
    const depressionCodes = ['f30', 'f31', 'f32', 'f33', 'f34', 'f38', 'f39'];
    const isD1DepressionCode = depressionCodes.some(code => d1.includes(code));
    const isD2DepressionCode = depressionCodes.some(code => d2.includes(code));
    if (isD1DepressionCode && isD2DepressionCode) return true;
    
    // Sprawdź synonimy dla depresji (rozszerzone)
    const depressionTerms = ['depresj', 'trd', 'lekoopora', 'f3', 'nawracaj', 'epizod depresyjny'];
    const isD1Depression = depressionTerms.some(term => d1.includes(term));
    const isD2Depression = depressionTerms.some(term => d2.includes(term));
    if (isD1Depression && isD2Depression) return true;
    
    // Sprawdź synonimy dla OCD
    const ocdTerms = ['obsesyjn', 'kompulsyjn', 'ocd', 'f42'];
    const isD1OCD = ocdTerms.some(term => d1.includes(term));
    const isD2OCD = ocdTerms.some(term => d2.includes(term));
    if (isD1OCD && isD2OCD) return true;
    
    return false;
  }

  private cleanAndValidateDisease(disease: string): string | null {
    // Oczyść tekst z niepotrzebnych słów
    let cleaned = disease
      .replace(/^(na|z powodu|przez|od|do)\s+/i, '')
      .replace(/\s+(i|oraz|a także|,|;).*$/i, '')
      .replace(/\d+[\s-]*letni[a]?/gi, '')
      .replace(/kawaler|bezdzietny|wykształcenie|mieszka|pracuje/gi, '')
      .trim();
    
    // Odrzuć jeśli to nie wygląda na chorobę
    if (cleaned.length < 3) return null;
    
    // Odrzuć czynniki psychosocjalne (nie są chorobami)
    const psychosocialKeywords = /(?:sytuacja|warunki|problemy|wsparcia|izolacja|bezrobocie|konflikt|przemoc|uzależnienie|alkohol|narkotyki|mieszka|pracuje|rodzina|związek)/i;
    if (psychosocialKeywords.test(cleaned)) return null;
    
    // Odrzuć zbyt ogólne terminy
    const tooGeneral = /^(choroby|schorzenia|problemy|zaburzenia|stan|objawy|leczenie|terapia)$/i;
    if (tooGeneral.test(cleaned)) return null;
    
    // Mapowanie popularnych skrótów i nazw potocznych na pełne nazwy
    const diseaseMapping: Record<string, string> = {
      'nt': 'nadciśnienie tętnicze',
      'dm': 'cukrzyca',
      'dm2': 'cukrzyca typu 2',
      'dm1': 'cukrzyca typu 1',
      'pochp': 'przewlekła obturacyjna choroba płuc',
      'chns': 'przewlekła choroba nerek',
      'mi': 'zawał serca',
      'af': 'migotanie przedsionków',
      'hf': 'niewydolność serca',
      'copd': 'przewlekła obturacyjna choroba płuc',
      'gerd': 'refluks żołądkowo-przełykowy',
      'ibs': 'zespół jelita drażliwego',
      'ra': 'reumatoidalne zapalenie stawów',
      'sle': 'toczeń rumieniowaty układowy',
      'ocd': 'zaburzenia obsesyjno-kompulsyjne'
    };
    
    const lowerCleaned = cleaned.toLowerCase();
    if (diseaseMapping[lowerCleaned]) {
      return diseaseMapping[lowerCleaned];
    }
    
    return cleaned;
  }

  private extractEpisodeStartDate(episodeAnalysis: any, _trdAssessment: any): string | null {
    if (episodeAnalysis?.scenarios?.length > 0) {
      return episodeAnalysis.scenarios[0].startDate;
    }
    return null;
  }

  private convertCriteriaToLegacyFormat(criteria: any[]): any[] {
    return criteria.map(criterion => {
      let displayStatus = criterion.status;
      
      // POPRAWKA LOGIKI KRYTERIÓW WYKLUCZENIA
      // Dla kryteriów wykluczenia (EC, MC): "niespełnione" = PRZESZEDŁ = zielony
      if (criterion.id?.includes('EC') || criterion.id?.includes('MC')) {
        if (criterion.status === 'niespełnione') {
          displayStatus = 'spełnione'; // Pacjent PRZESZEDŁ kryterium wykluczenia (zielony)
        } else if (criterion.status === 'spełnione') {
          displayStatus = 'niespełnione'; // Pacjent NIE PRZESZEDŁ kryterium wykluczenia (czerwony)
        }
        // 'weryfikacja' pozostaje bez zmian (żółty)
      }
      // Dla kryteriów włączenia (IC): status pozostaje bez zmian
      
      return {
        id: criterion.id,
        name: criterion.name,
        details: criterion.reasoning,
        status: displayStatus,
        userStatus: null,
        userComment: null,
        userOverrideTimestamp: null
      };
    });
  }

  private generateOverallQualification(riskAssessment: any, _criteriaAssessment: any): string {
    const recommendation = riskAssessment?.inclusionProbability?.recommendation;
    const score = riskAssessment?.inclusionProbability?.score || 0;
    
    if (recommendation === 'include' && score >= 70) {
      return 'Kandydat kwalifikuje się do badania';
    } else if (recommendation === 'further_evaluation' || (score >= 40 && score < 70)) {
      return 'Kandydat wymaga dodatkowej oceny';
    } else {
      return 'Kandydat prawdopodobnie nie kwalifikuje się do badania';
    }
  }

  private extractMainIssues(riskAssessment: any, criteriaAssessment: any): string[] {
    const issues: string[] = [];
    const seenIssues = new Set<string>(); // Deduplikacja
    
    // Dodaj główne problemy z oceny kryteriów
    if (criteriaAssessment?.overallAssessment?.majorConcerns) {
      for (const concern of criteriaAssessment.overallAssessment.majorConcerns) {
        const normalizedConcern = this.normalizeIssueText(concern);
        if (!seenIssues.has(normalizedConcern)) {
          seenIssues.add(normalizedConcern);
          issues.push(concern);
        }
      }
    }
    
    // Dodaj negatywne czynniki z oceny ryzyka (tylko jeśli nie są już uwzględnione)
    if (riskAssessment?.inclusionProbability?.keyFactors?.negative) {
      for (const factor of riskAssessment.inclusionProbability.keyFactors.negative) {
        const normalizedFactor = this.normalizeIssueText(factor);
        if (!seenIssues.has(normalizedFactor)) {
          seenIssues.add(normalizedFactor);
          issues.push(factor);
        }
      }
    }
    
    return issues;
  }

  private extractCriticalInfo(riskAssessment: any, criteriaAssessment: any): string[] {
    const info: string[] = [];
    const seenInfo = new Set<string>(); // Deduplikacja
    
    // Dodaj mniejsze problemy z oceny kryteriów
    if (criteriaAssessment?.overallAssessment?.minorConcerns) {
      for (const concern of criteriaAssessment.overallAssessment.minorConcerns) {
        const normalizedConcern = this.normalizeIssueText(concern);
        if (!seenInfo.has(normalizedConcern)) {
          seenInfo.add(normalizedConcern);
          info.push(concern);
        }
      }
    }
    
    // Dodaj informacje o wysokim ryzyku samobójczym
    if (riskAssessment?.patientRiskProfile?.suicidalRisk?.level === 'high' || 
        riskAssessment?.patientRiskProfile?.suicidalRisk?.level === 'critical') {
      const riskInfo = 'Wymagana szczegółowa ocena ryzyka samobójczego';
      const normalizedRisk = this.normalizeIssueText(riskInfo);
      if (!seenInfo.has(normalizedRisk)) {
        seenInfo.add(normalizedRisk);
        info.push(riskInfo);
      }
    }
    
    // Dodaj pozytywne czynniki jako informacje dodatkowe (nie jako główne problemy)
    if (riskAssessment?.inclusionProbability?.keyFactors?.positive) {
      for (const factor of riskAssessment.inclusionProbability.keyFactors.positive) {
        const normalizedFactor = this.normalizeIssueText(factor);
        if (!seenInfo.has(normalizedFactor)) {
          seenInfo.add(normalizedFactor);
          info.push(`Pozytywny czynnik: ${factor}`);
        }
      }
    }
    
    return info;
  }

  // Nowa metoda pomocnicza do normalizacji tekstu dla deduplikacji
  private normalizeIssueText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Usuń znaki interpunkcyjne
      .replace(/\s+/g, ' ') // Znormalizuj spacje
      .trim();
  }

  private extractRiskFactors(clinicalSynthesis: any, riskAssessment: any): string[] {
    if (!clinicalSynthesis) return [];
    
    const riskFactors: string[] = [];
    
    const textToSearch = [
      clinicalSynthesis.patientOverview || '',
      ...(clinicalSynthesis.keyObservations || []),
      clinicalSynthesis.treatmentHistory || '',
      ...(clinicalSynthesis.riskFactors || [])
    ].join(' ').toLowerCase();
    
    // INTELIGENTNE ROZPOZNAWANIE CZYNNIKÓW RYZYKA PSYCHOSOCJALNYCH
    const riskFactorPatterns = [
      // Sytuacja mieszkaniowa i wsparcie społeczne
      /(?:mieszka|żyje)\s+(sam|sama|samotnie|bez wsparcia|z babcią|z rodzicami)/gi,
      /(?:brak|nie ma|bez)\s+(?:wsparcia|rodziny|przyjaciół|kontaktów społecznych)/gi,
      /(?:izolacja|odosobnienie|samotność)\s+(?:społeczna|emocjonalna)?/gi,
      
      // Sytuacja zawodowa i finansowa
      /(?:bezrobotny|bezrobotna|nie pracuje|bez pracy)/gi,
      /(?:renta|rentista|na rencie|pobiera rentę)/gi,
      /(?:problemy|trudności)\s+(?:finansowe|ekonomiczne|materialne)/gi,
      /(?:zła|trudna|niestabilna)\s+sytuacja\s+(?:finansowa|materialna|ekonomiczna)/gi,
      
      // Ryzyko samobójcze i myśli rezygnacyjne
      /(?:myśli|ideacje|tendencje)\s+(?:samobójcze|suicydalne|rezygnacyjne)/gi,
      /(?:próby|zamiary)\s+(?:samobójcze|suicydalne)/gi,
      /(?:ryzyko|zagrożenie)\s+(?:samobójcze|suicydalne)/gi,
      
      // Uzależnienia i substancje
      /(?:uzależnienie|nadużywanie|problemy)\s+(?:od|z)\s+(?:alkoholu|narkotyków|substancji)/gi,
      /(?:pije|pił|nadużywa|używa)\s+(?:alkohol|narkotyki|substancje)/gi,
      
      // Konflikty i przemoc
      /(?:konflikty|problemy|trudności)\s+(?:rodzinne|w rodzinie|w związku|interpersonalne)/gi,
      /(?:przemoc|krzywdzenie|maltretowanie)\s+(?:domowa|w rodzinie|fizyczna|psychiczna)/gi,
      
      // Stan cywilny i relacje
      /(?:kawaler|panna|rozwiedziony|rozwiedziona|po rozwodzie)/gi,
      /(?:brak|nie ma)\s+(?:stałego związku|partnera|partnerki)/gi,
      
      // Wykształcenie i funkcjonowanie
      /(?:niskie|podstawowe|niepełne)\s+wykształcenie/gi,
      /(?:problemy|trudności)\s+(?:w funkcjonowaniu|społeczne|zawodowe)/gi
    ];
    
    for (const pattern of riskFactorPatterns) {
      let match;
      while ((match = pattern.exec(textToSearch)) !== null) {
        const fullMatch = match[0];
        const cleanedRisk = this.cleanAndValidateRiskFactor(fullMatch.trim());
        if (cleanedRisk && !riskFactors.includes(cleanedRisk)) {
          riskFactors.push(cleanedRisk);
        }
      }
    }
    
    // Dodaj czynniki ryzyka z riskAssessment - negatywne faktory
    if (riskAssessment?.inclusionProbability?.keyFactors?.negative) {
      for (const risk of riskAssessment.inclusionProbability.keyFactors.negative) {
        if (!riskFactors.includes(risk)) {
          riskFactors.push(risk);
        }
      }
    }
    
    // Dodaj wskaźniki ryzyka samobójczego
    if (riskAssessment?.patientRiskProfile?.suicidalRisk?.indicators) {
      for (const indicator of riskAssessment.patientRiskProfile.suicidalRisk.indicators) {
        if (!riskFactors.includes(indicator)) {
          riskFactors.push(indicator);
        }
      }
    }
    
    return riskFactors;
  }

  private cleanAndValidateRiskFactor(riskFactor: string): string | null {
    // Oczyść tekst z niepotrzebnych słów
    let cleaned = riskFactor
      .replace(/\d+[\s-]*letni[a]?/gi, '')
      .trim();
    
    // Odrzuć jeśli to za krótkie
    if (cleaned.length < 5) return null;
    
    // Sprawdź czy to rzeczywiście czynnik ryzyka psychosocjalny
    const medicalTerms = /(?:astma|cukrzyca|nadciśnienie|epilepsja|migrena|F\d+|[A-Z]\d+)/i;
    if (medicalTerms.test(cleaned)) return null;
    
    // Mapowanie na bardziej czytelne opisy
    const riskMapping: Record<string, string> = {
      'mieszka sam': 'brak sieci wsparcia społecznego - mieszka sam',
      'mieszka sama': 'brak sieci wsparcia społecznego - mieszka sama',
      'mieszka samotnie': 'brak sieci wsparcia społecznego - mieszka samotnie',
      'bezrobotny': 'bezrobocie - brak stabilnej sytuacji zawodowej',
      'bezrobotna': 'bezrobocie - brak stabilnej sytuacji zawodowej',
      'na rencie': 'pobiera rentę - ograniczona aktywność zawodowa',
      'kawaler': 'stan cywilny kawaler - brak stałego związku',
      'panna': 'stan cywilny panna - brak stałego związku'
    };
    
    const lowerCleaned = cleaned.toLowerCase();
    if (riskMapping[lowerCleaned]) {
      return riskMapping[lowerCleaned];
    }
    
    return cleaned;
  }

  private generatePatientId(): string {
    const d = new Date();
    return `PAT/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}/${Math.floor(
      Math.random() * 1000
    ).toString().padStart(3, '0')}`;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.executionLog.push(logEntry);
    console.log(logEntry);
  }
} 