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
  
  // POPRAWIONE WZORCE - bardziej precyzyjne wykrywanie nazw leków
  const drugPatterns = [
    // Wzorce dla nazw leków z dawkami (najwyższy priorytet)
    /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\s+(?:\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|IU|j\.m\.))/gi,
    
    // Wzorce dla znanych nazw handlowych leków (lista sprawdzonych nazw)
    /\b(Escitalopram|Elicea|Efevelon|Hydroxyzinum|Lamitrin|Pregabalin|Wellbutrin|Egzysta|Oreos|Lamotrix|Brintellix|Dulsevia|Neurovit|Welbox|Preato|Asertin|Dekristol|Mirtagen)\b/gi,
    
    // Wzorce dla nazw z typowymi końcówkami farmaceutycznymi (tylko jeśli mają sens)
    /\b([A-Z][a-z]{3,}(?:ina|ine|ol|um|an|on|ex|al|yl|il|ium))\b(?=\s+(?:\d+|tabl|kaps|mg|ml|dawka|rano|wieczór|na noc))/gi,
    
    // Wzorce dla nazw po słowach kluczowych
    /(?:lek|preparat|medication|drug|stosuje|przyjmuje|zażywa|podaje)[\s:]+([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)/gi,
    
    // Wzorce dla nazw w nawiasach (tylko jeśli wyglądają jak leki)
    /\(([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)\)/gi
  ];
  
  const potentialDrugs = new Set<string>();
  
  // Lista słów do wykluczenia (nie są lekami)
  const excludeWords = new Set([
    'Centrum', 'Szpital', 'Oddział', 'Gmina', 'Telefon', 'Stan', 'Hemoglobina', 
    'Cholesterol', 'Kreatynina', 'Witamina', 'Marcina', 'Nadal', 'Roste',
    'Zawiesina', 'Regon', 'Hormon', 'Kontrola', 'Skan', 'Mail', 'Dialog',
    'Terapia', 'Centrum', 'Ograniczon', 'Orygina', 'Zmian', 'Wspomina',
    'Spowodowan', 'Koleina', 'Ealan', 'Trijodotyronina', 'Tyreotropina',
    'Creatinine', 'Evevelon', 'Dulsevic', 'Elsay', 'Ntrum', 'Orycina'
  ]);
  
  // Wyciągnij potencjalne nazwy leków
  drugPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(medicalHistory)) !== null) {
      const drugName = match[1].trim();
      
      // Sprawdź czy to nie jest słowo do wykluczenia
      if (drugName.length > 3 && 
          !excludeWords.has(drugName) && 
          !excludeWords.has(drugName.toLowerCase()) &&
          // Sprawdź czy nie zawiera cyfr (prawdopodobnie nie jest lekiem)
          !/\d/.test(drugName) &&
          // Sprawdź czy nie jest zbyt długie (prawdopodobnie fragment tekstu)
          drugName.length < 25 &&
          // Sprawdź czy nie zawiera typowych słów niefarmaceutycznych
          !/(?:pacjent|leczenie|terapia|badanie|wizyta|kontrola|szpital|oddział|centrum|telefon|mail|adres|ulica|miasto)/i.test(drugName)) {
        potentialDrugs.add(drugName);
      }
    }
  });
  
  console.log(`🔍 [Multi-Agent] Found ${potentialDrugs.size} potential drug names:`, Array.from(potentialDrugs));
  
  // Mapuj każdą potencjalną nazwę leku
  for (const drugName of potentialDrugs) {
    try {
      const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
      
      if (mappingResult.found && mappingResult.confidence > 0.7) { // Zwiększony próg confidence
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
    this.log(`🚀 Rozpoczynanie analizy wieloagentowej z modelem: ${selectedModel}`);
    
    // 🔍 PREPROCESSING: Mapowanie leków na początku
    console.log('🔍 [Multi-Agent] Starting drug mapping preprocessing...');
    const { processedHistory, drugMappings } = await preprocessMedicalHistoryForDrugMapping(medicalHistory);
    
    // 🔍 DODANE LOGOWANIE PREPROCESSINGU
    console.log('🔍 [Multi-Agent] Preprocessing results:');
    console.log('📋 Original history length:', medicalHistory.length);
    console.log('📋 Processed history length:', processedHistory.length);
    console.log('🔄 Drug mappings found:', drugMappings.length);
    
    if (drugMappings.length > 0) {
      console.log('🔍 [Multi-Agent] Drug mappings from preprocessing:');
      drugMappings.forEach(mapping => {
        console.log(`  - ${mapping.original} → ${mapping.mapped} (confidence: ${Math.round(mapping.confidence * 100)}%)`);
      });
    } else {
      console.log('⚠️ [Multi-Agent] No drug mappings found during preprocessing!');
    }
    
    // Utwórz kontekst współdzielony z wzbogaconą historią
    const sharedContext: SharedContext = {
      medicalHistory: processedHistory, // Użyj wzbogaconej historii
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
    const clinicalResult = await this.executeAgent('clinical-synthesis', sharedContext);
    agentResults['clinical-synthesis'] = clinicalResult;
    sharedContext.clinicalSynthesis = clinicalResult;
    this.log('✅ Agent Syntezy Klinicznej zakończony pomyślnie');

    // Krok 1b: Episode Analysis (zależy tylko od clinical-synthesis)
    const episodeResult = await this.executeAgent('episode-analysis', sharedContext);
    agentResults['episode-analysis'] = episodeResult;
    sharedContext.episodeAnalysis = episodeResult;
    this.log('✅ Agent Analizy Epizodów zakończony pomyślnie');

    // Krok 1c: Pharmacotherapy Analysis (zależy od clinical-synthesis i episode-analysis)
    const pharmacoResult = await this.executeAgent('pharmacotherapy-analysis', sharedContext);
    agentResults['pharmacotherapy-analysis'] = pharmacoResult;
    sharedContext.pharmacotherapyAnalysis = pharmacoResult;
    this.log('✅ Agent Farmakoterapii zakończony pomyślnie');

    // FAZA 2: Analiza TRD (zależy od fazy 1)
    this.log('🔬 FAZA 2: Rozpoczynanie analizy TRD...');
    
    const trdResult = await this.executeAgent('trd-assessment', sharedContext);
    agentResults['trd-assessment'] = trdResult;
    sharedContext.trdAssessment = trdResult;
    this.log('✅ Agent TRD zakończony');

    // FAZA 3: Ocena kryteriów (zależy od faz 1-2)
    this.log('📋 FAZA 3: Rozpoczynanie oceny kryteriów...');
    
    const criteriaResult = await this.executeAgent('criteria-assessment', sharedContext);
    agentResults['criteria-assessment'] = criteriaResult;
    sharedContext.inclusionCriteriaAssessment = criteriaResult;
    this.log('✅ Agent Oceny Kryteriów zakończony');

    // FAZA 4: Ocena ryzyka (zależy od wszystkich poprzednich)
    this.log('⚠️ FAZA 4: Rozpoczynanie oceny ryzyka...');
    
    const riskResult = await this.executeAgent('risk-assessment', sharedContext);
    agentResults['risk-assessment'] = riskResult;
    sharedContext.riskAssessment = riskResult;
    this.log('✅ Agent Oceny Ryzyka zakończony');

    // FAZA 5: Synteza końcowa
    this.log('🎯 FAZA 5: Synteza wyników...');
    
    const finalResult = await this.synthesizeFinalResult(agentResults, sharedContext);
    
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

  private async synthesizeFinalResult(
    agentResults: Record<string, AgentResult>, 
    context: SharedContext
  ): Promise<PatientData> {
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
        comorbidities: await this.extractComorbidities(clinicalSynthesis)
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

      // Kopiuj kontekst historyczny z analizy farmakoterapii
      historicalContext: pharmacotherapyAnalysis?.historicalContext,

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

  private async extractComorbidities(clinicalSynthesis: any): Promise<string[]> {
    if (!clinicalSynthesis) return [];
    
    const mainDiagnosis = this.extractMainDiagnosis(clinicalSynthesis);
    console.log('[DEBUG] extractComorbidities - Główne rozpoznanie:', mainDiagnosis);
    
    const clinicalText = [
      clinicalSynthesis.patientOverview || '',
      ...(clinicalSynthesis.keyObservations || []),
      clinicalSynthesis.treatmentHistory || ''
    ].join(' ').trim();
    
    try {
      const prompt = this.buildComorbiditiesExtractionPrompt(clinicalText, mainDiagnosis);
      const response = await this.callAIForComorbidities(prompt, this.getComorbiditiesSystemPrompt());
      
      console.log('[DEBUG] extractComorbidities - AI response:', response);
      
      // Parse JSON response
      const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
      const comorbidities = Array.isArray(parsed.comorbidities) ? parsed.comorbidities : [];
      
      console.log('[DEBUG] extractComorbidities - Finalne choroby towarzyszące (AI):', comorbidities);
      return comorbidities;
      
    } catch (error) {
      console.error('[ERROR] extractComorbidities - AI extraction failed:', error);
      console.warn('[WARNING] extractComorbidities - Falling back to empty array');
      return [];
    }
  }

  private buildComorbiditiesExtractionPrompt(clinicalText: string, mainDiagnosis: string | null): string {
    return `
**GŁÓWNE ROZPOZNANIE:** ${mainDiagnosis || 'nie ustalono'}

**TEKST KLINICZNY DO ANALIZY:**
${clinicalText}

**ZADANIE:** Wyekstraktuj choroby współistniejące zgodnie z instrukcjami systemowymi.
Zwróć wynik w formacie JSON zgodnie z przykładami.
    `.trim();
  }

  private getComorbiditiesSystemPrompt(): string {
    return `
Jesteś doświadczonym lekarzem specjalistą z 20-letnim doświadczeniem w analizie dokumentacji medycznej. Twoim zadaniem jest precyzyjna ekstrakcja chorób współistniejących z polskiej dokumentacji klinicznej.

**ROLA I ODPOWIEDZIALNOŚĆ:**
- Analizujesz dokumentację medyczną pod kątem chorób towarzyszących
- Odróżniasz choroby od metod leczenia z pełną precyzją kliniczną
- Dostarczasz standardowe nazewnictwo medyczne zgodne z ICD-10

**DEFINICJE KLUCZOWE:**
• CHOROBA WSPÓŁISTNIEJĄCA = schorzenie inne niż główne rozpoznanie, które występuje u pacjenta
• METODA LECZENIA = sposób terapii, farmakoterapia, interwencje medyczne (NIE są chorobami)

**PRZYKŁADY EKSTRAKCJI:**

**PRZYKŁAD 1 - POZYTYWNY:**
Tekst: "Pacjent cierpi na F84 - Całościowe zaburzenia rozwojowe, F90 - Zaburzenia hiperkinetyczne, w wywiadzie cukrzyca typu 2"
Główne: "zaburzenia depresyjne"
→ {"comorbidities": ["Zaburzenia ze spektrum autyzmu (F84)", "Zespół nadpobudliwości psychoruchowej/ADHD (F90)", "Cukrzyca typu 2"]}

**PRZYKŁAD 2 - NEGATYWNY (wykluczenie leczenia):**
Tekst: "Z uwagi na niepowodzenie leczenia epizodu depresyjnego kilkoma lekami przeciwdepresyjnymi i stwierdzoną lekooporność"
Główne: "zaburzenia depresyjne"
→ {"comorbidities": []}
UZASADNIENIE: "lekami przeciwdepresyjnymi" to METODA LECZENIA, nie choroba

**PRZYKŁAD 3 - MIESZANY:**
Tekst: "Pacjent choruje na nadciśnienie tętnicze, leczony sertraliną, farmakoterapia fluoksetyną"
Główne: "zaburzenia depresyjne"
→ {"comorbidities": ["Nadciśnienie tętnicze"]}
UZASADNIENIE: nadciśnienie to choroba, sertralina i fluoksetyna to leki (wykluczamy)

**ZASADY EKSTRAKCJI:**

1. **WŁĄCZAJ (choroby):**
   ✅ Kody ICD-10 z opisami (F84 → "Zaburzenia ze spektrum autyzmu (F84)")
   ✅ Nazwy chorób ("cukrzyca", "nadciśnienie", "astma")
   ✅ Opisy po słowach kluczowych: "cierpi na", "w wywiadzie", "rozpoznano"

2. **WYKLUCZAJ (nie są chorobami):**
   ❌ Nazwy leków i metody leczenia ("sertraliną", "lekami przeciwdepresyjnymi")
   ❌ Procedury medyczne ("farmakoterapia", "terapia", "leczenie")
   ❌ Główne rozpoznanie (jeśli podane)
   ❌ Objawy ("ból głowy", "nudności") - tylko jeśli nie są nazwami chorób

3. **MAPOWANIE ICD-10 NA NAZWY:**
   • F84 → "Zaburzenia ze spektrum autyzmu (F84)"
   • F90 → "Zespół nadpobudliwości psychoruchowej/ADHD (F90)"
   • F42 → "Zaburzenia obsesyjno-kompulsyjne (F42)"
   • E11 → "Cukrzyca typu 2 (E11)"
   • I10 → "Nadciśnienie tętnicze pierwotne (I10)"

4. **KRYTERIUM JAKOŚCI:**
   - Każda pozycja to rzeczywista CHOROBA (nie leczenie)
   - Nazwy pełne i klinicznie precyzyjne
   - Brak duplikatów i głównego rozpoznania

**FORMAT ODPOWIEDZI:**
Zawsze zwracaj TYLKO poprawny JSON w formacie:
{"comorbidities": ["nazwa choroby 1", "nazwa choroby 2"]}

**WALIDACJA FINALNA:**
Przed zwróceniem wyniku zadaj sobie pytanie: "Czy każda pozycja to rzeczywiście CHOROBA, a nie metoda leczenia?"
    `.trim();
  }

  // Pomocnicza metoda do wywołania AI (używana przez extractComorbidities)
  private async callAIForComorbidities(userPrompt: string, systemPrompt: string): Promise<string> {
    const backendUrl = 'http://localhost:3001';
    
    try {
      console.log(`🔄 [MultiAgentCoordinator] Calling AI for comorbidities extraction with model: gemini`);
      
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini',
          systemPrompt,
          userPrompt,
          temperature: 0.1, // Niska temperatura dla precyzji medycznej
          maxTokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend API Error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`✅ [MultiAgentCoordinator] AI response received for comorbidities extraction`);
      
      return data.content || '';
      
    } catch (error) {
      console.error(`💥 [MultiAgentCoordinator] AI call failed:`, error);
      throw error;
    }
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

  private generateOverallQualification(riskAssessment: any, criteriaAssessment: any): string {
    const recommendation = riskAssessment?.inclusionProbability?.recommendation;
    const score = riskAssessment?.inclusionProbability?.score || 0;
    
    // Sprawdź czy są bezwzględne wykluczenia
    const hasAbsoluteExclusions = this.checkForAbsoluteExclusions(criteriaAssessment);
    
    if (hasAbsoluteExclusions) {
      return 'Kandydat nie kwalifikuje się do badania - bezwzględne wykluczenie';
    } else if (recommendation === 'exclude' || score === 0) {
      return 'Kandydat nie kwalifikuje się do badania';
    } else if (recommendation === 'include' && score >= 70) {
      return 'Kandydat kwalifikuje się do badania';
    } else if (recommendation === 'further_evaluation' || (score >= 40 && score < 70)) {
      return 'Kandydat wymaga dodatkowej oceny';
    } else {
      return 'Kandydat prawdopodobnie nie kwalifikuje się do badania';
    }
  }

  private checkForAbsoluteExclusions(criteriaAssessment: any): boolean {
    if (!criteriaAssessment) return false;
    
    // Lista kryteriów bezwzględnie wykluczających
    const absoluteExclusionCriteria = [
      'EC14', // Historia rodzinna schizofrenii
      'EC1',  // Zaburzenia afektywne dwubiegunowe
      'EC2',  // Zaburzenia psychotyczne
      'GMEC6', // Cukrzyca typu 1
      'GMEC8', // Padaczka
      'GMEC12' // Nadwrażliwość na badany lek
    ];
    
    // Sprawdź kryteria psychiatryczne
    const psychiatricCriteria = criteriaAssessment.psychiatricExclusionCriteria || [];
    for (const criterion of psychiatricCriteria) {
      if (absoluteExclusionCriteria.includes(criterion.id) && 
          criterion.status === 'spełnione' &&
          criterion.reasoning?.includes('BEZWZGLĘDNE WYKLUCZENIE')) {
        return true;
      }
    }
    
    // Sprawdź kryteria medyczne
    const medicalCriteria = criteriaAssessment.medicalExclusionCriteria || [];
    for (const criterion of medicalCriteria) {
      if (absoluteExclusionCriteria.includes(criterion.id) && 
          criterion.status === 'spełnione' &&
          criterion.reasoning?.includes('BEZWZGLĘDNE WYKLUCZENIE')) {
        return true;
      }
    }
    
    return false;
  }

  private extractMainIssues(riskAssessment: any, criteriaAssessment: any): string[] {
    const issues: string[] = [];
    
    // Dodaj bezwzględne wykluczenia na początku
    if (criteriaAssessment) {
      const allCriteria = [
        ...(criteriaAssessment.psychiatricExclusionCriteria || []),
        ...(criteriaAssessment.medicalExclusionCriteria || [])
      ];
      
      for (const criterion of allCriteria) {
        if (criterion.status === 'spełnione' && 
            criterion.reasoning?.includes('BEZWZGLĘDNE WYKLUCZENIE')) {
          issues.push(`BEZWZGLĘDNE WYKLUCZENIE: ${criterion.name}`);
        }
      }
    }
    
    // Dodaj inne problemy z oceny ryzyka
    if (riskAssessment?.inclusionProbability?.keyFactors?.negative) {
      issues.push(...riskAssessment.inclusionProbability.keyFactors.negative);
    }
    
    // Dodaj problemy z kryteriów włączenia
    if (criteriaAssessment?.inclusionCriteria) {
      for (const criterion of criteriaAssessment.inclusionCriteria) {
        if (criterion.status === 'niespełnione') {
          if (criterion.reasoning?.includes('CZASOWE WYKLUCZENIE')) {
            issues.push(`Czasowe wykluczenie: ${criterion.name}`);
          } else {
            issues.push(`Niespełnione kryterium: ${criterion.name}`);
          }
        }
      }
    }
    
    return issues.slice(0, 5); // Ogranicz do 5 najważniejszych problemów
  }

  private extractCriticalInfo(riskAssessment: any, criteriaAssessment: any): string[] {
    const criticalInfo: string[] = [];
    
    // Dodaj informacje z oceny ryzyka
    if (riskAssessment?.inclusionProbability?.keyFactors?.neutral) {
      criticalInfo.push(...riskAssessment.inclusionProbability.keyFactors.neutral);
    }
    
    // Dodaj kryteria wymagające weryfikacji
    if (criteriaAssessment) {
      const allCriteria = [
        ...(criteriaAssessment.inclusionCriteria || []),
        ...(criteriaAssessment.psychiatricExclusionCriteria || []),
        ...(criteriaAssessment.medicalExclusionCriteria || [])
      ];
      
      for (const criterion of allCriteria) {
        if (criterion.status === 'weryfikacja') {
          criticalInfo.push(`Weryfikacja wymagana: ${criterion.name}`);
        }
      }
    }
    
    return criticalInfo.slice(0, 5); // Ogranicz do 5 najważniejszych informacji
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