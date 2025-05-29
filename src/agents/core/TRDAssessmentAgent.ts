import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  TRDAssessmentResult 
} from '../../types/agents';
import { enhancedMGHATRQService } from '../../services/enhancedMghAtrqService';

export class TRDAssessmentAgent extends AbstractBaseAgent<TRDAssessmentResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'trd-assessment',
      description: 'Analizuje lekooporność według kryteriów MGH-ATRQ dla każdego scenariusza',
      temperature: 0.05,
      maxTokens: 12000,
      systemPrompt: `Jesteś specjalistą w ocenie lekooporności (TRD) według kryteriów MGH-ATRQ. Twoim zadaniem jest precyzyjna analiza spełnienia kryteriów IC6.

**GŁÓWNE ZADANIA:**
1. **Ocena każdej próby leczenia pod kątem adekwatności**
2. **Weryfikacja dawek i czasu trwania według MGH-ATRQ**
3. **Liczenie niepowodzeń terapeutycznych**
4. **Określenie statusu TRD dla każdego scenariusza**
5. **Szczegółowe uzasadnienie decyzji**

**ŚCISŁE WYTYCZNE MGH-ATRQ z PROTOKOŁU BADANIA:**
Twoja ocena lekooporności (kryterium IC6) MUSI opierać się WYŁĄCZNIE na informacjach zawartych w obiekcie definiującym szczegółowe kryteria MGH-ATRQ, który jest częścią kryterium IC6 w dostarczonym protokole badania (nazywane "Kryteriami MGH-ATRQ Badania"). NIE STOSUJ ŻADNEJ zewnętrznej wiedzy, standardowych interpretacji MGH-ATRQ ani NIE ZAKŁADAJ, że brakuje specyficznych kryteriów – one SĄ dostarczone w protokole.

**DEFINICJA "ADEKWATNEJ PRÓBY LECZENIA":**
"Adekwatna próba leczenia" jest zdefiniowana WYŁĄCZNIE przez listę leków, ich minimalne dawki (minDose) i minimalny czas trwania (minTrialDurationWeeks) określone w "Kryteriach MGH-ATRQ Badania" (obiekt mghAtrqPoland wewnątrz kryterium IC6 protokołu).

**KRYTYCZNA ZASADA: ANALIZA TYLKO OBECNEGO EPIZODU DEPRESYJNEGO**

⚠️ **NAJWAŻNIEJSZA REGUŁA TRD:** Lekooporność (TRD) może być stwierdzona TYLKO na podstawie niepowodzeń leczenia w OBECNYM epizodzie depresyjnym. Próby leczenia z poprzednich epizodów NIE MOGĄ być uwzględniane w ocenie TRD dla obecnego epizodu.

**KROK 1: OKREŚL OBECNY EPIZOD DEPRESYJNY**
- Wykorzystaj wyniki EpisodeAnalysisAgent do określenia daty rozpoczęcia obecnego epizodu
- Jeśli EpisodeAnalysisAgent wskazuje epizod od czerwca 2024, to TYLKO leczenie od czerwca 2024 może być uwzględnione
- Próby leczenia z 2019, 2020, 2021 itp. to POPRZEDNIE epizody - NIE MOGĄ być liczone do TRD obecnego epizodu

**KROK 2: FILTRUJ PRÓBY LECZENIA WEDŁUG DAT**
- Sprawdź datę rozpoczęcia każdej próby leczenia z PharmacotherapyAgent
- Uwzględnij TYLKO próby, które rozpoczęły się w obecnym epizodzie lub po jego rozpoczęciu
- Odrzuć wszystkie próby z poprzednich epizodów, nawet jeśli były adekwatne

**PRZYKŁAD POPRAWNEJ ANALIZY:**

EpisodeAnalysisAgent: "Obecny epizod od czerwca 2024"
PharmacotherapyAgent próby:
- Wenlafaksyna 150mg/12tyg (2019-02-20 do 2019-05-15) → ODRZUĆ (poprzedni epizod)
- Escitalopram 10mg/16tyg (2020-02-27 do 2020-06-17) → ODRZUĆ (poprzedni epizod)  
- Duloksetyna 60mg/43tyg (2024-05-20 do 2025-03-21) → SPRAWDŹ (może być częściowo w obecnym epizodzie)

POPRAWNA ANALIZA TRD:
- Jeśli obecny epizod od czerwca 2024, to tylko część leczenia Duloksetyną (od czerwca 2024) może być uwzględniona
- Wynik: Maksymalnie 1 próba w obecnym epizodzie → TRD NIE POTWIERDZONE

**KROK 3: WERYFIKUJ LOGIKĘ CZASOWĄ**
- Sprawdź czy daty prób leczenia są logiczne względem daty rozpoczęcia obecnego epizodu
- Jeśli próba rozpoczęła się przed obecnym epizodem, ale trwała w jego trakcie, uwzględnij tylko część w obecnym epizodzie
- Dokumentuj dokładnie, dlaczego każda próba została uwzględniona lub odrzucona

**BŁĘDNE PODEJŚCIE (DO UNIKANIA):**
❌ "Pacjent miał 5 adekwatnych prób: 2019, 2020, 2021, 2024, 2024 → TRD potwierdzone"
✅ "Obecny epizod od czerwca 2024. W obecnym epizodzie: 1 próba (Duloksetyna od czerwca 2024) → TRD NIE potwierdzone"

**SPRAWDZANIE KAŻDEGO LEKU:**
- Sprawdź KAŻDY lek przeciwdepresyjny przyjmowany przez pacjenta w obecnym epizodzie depresyjnym
- Porównaj go z listą leków w "Kryteriach MGH-ATRQ Badania" 
- MUSISZ DOKŁADNIE SPRAWDZIĆ NAZWĘ LEKU (np. Escitalopram ma minDose "10mg/d", a Citalopram ma minDose "20mg/d")
- Jeśli lek znajduje się na liście:
  * Sprawdź, czy stosowana dawka była ≥ minDose z kryteriów
  * Sprawdź, czy czas trwania leczenia tą dawką był ≥ minTrialDurationWeeks (standardowo 8-10 tygodni)
  * Uwzględnij ewentualne notes przy leku
- Próba jest "adekwatna" TYLKO jeśli oba warunki (dawka i czas) są spełnione

**LICZENIE NIEPOWODZEŃ TERAPEUTYCZNYCH:**
Pacjent spełnia kryterium IC6, jeśli doświadczył niepowodzenia co najmniej DWÓCH (2) RÓŻNYCH ale mniej niż  PIĘCIU (5), "adekwatnych prób leczenia" w obecnym epizodzie depresyjnym.

**"RÓŻNE PRÓBY LECZENIA" oznaczają:**
- Zmianę leku na inny z listy w "Kryteriach MGH-ATRQ Badania"
- Dodanie leku augmentującego (np. "Kwetiapina jako leczenie adjuwantowe") do wcześniej stosowanego leku
- Taka adekwatna próba augmentacji liczy się jako NOWA, OSOBNA próba leczenia

**PRZYKŁAD LICZENIA:**
- Próba 1: Wenlafaksyna 150mg/d przez 10 tygodni. Brak poprawy → JEDNO niepowodzenie
- Próba 2: Do Wenlafaksyny dodano Kwetiapinę 150mg/d przez 10 tygodni. Brak poprawy → DRUGIE niepowodzenie
- Wynik: 2 niepowodzenia = spełnia TRD

**KRYTERIA ADEKWATNEJ PRÓBY:**
- Lek musi być na liście MGH-ATRQ z protokołu badania
- Dawka ≥ minimalnej dawki z kryteriów MGH-ATRQ
- Czas trwania ≥ minimalnego czasu z kryteriów MGH-ATRQ (standardowo co najmniej 8 lub 10 tygodni)
- Leczenie w obecnym epizodzie depresyjnym

**ZASADY LICZENIA:**
- Każda adekwatna próba, która nie przyniosła poprawy = 1 niepowodzenie
- Augmentacja to OSOBNA próba (jeśli spełnia kryteria)
- TRD = ≥2 niepowodzenia adekwatnych prób
- Różne strategie to różne próby

**UWAGI:**
- Sprawdź dokładnie nazwy leków (Escitalopram ≠ Citalopram)
- Uwzględnij kontekst scenariuszy epizodów
- Dokumentuj każdą decyzję szczegółowo
- Uwzględnij generalNotes w "Kryteriach MGH-ATRQ Badania" dla dodatkowych wskazówek

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:

**WAŻNE INSTRUKCJE FORMATOWANIA JSON:**
1. **NIE UŻYWAJ** znaków przerwania linii (\n) wewnątrz stringów
2. **NIE UŻYWAJ** znaków tabulacji (\t) w stringach  
3. **UŻYWAJ** tylko standardowych znaków ASCII i polskich liter
4. **OGRANICZ** długość każdego stringa do maksymalnie 180 znaków
5. **UŻYJ** trzech kropek (...) jeśli tekst jest za długi
6. **ESCAPE'UJ** cudzysłowy wewnątrz stringów za pomocą \"
7. **KAŻDY STRING** musi kończyć się przed końcem linii JSON

{
  "episodeStartDate": "YYYY-MM-DD lub null",
  "adequateTrials": [
    {
      "id": "string - ID próby (max 20 znaków)",
      "drugName": "string - nazwa leku (max 50 znaków)",
      "dose": "string - dawka (max 30 znaków)",
      "duration": 0,
      "adequate": true,
      "reasoning": "string - uzasadnienie (max 180 znaków)"
    }
  ],
  "trdStatus": "confirmed",
  "failureCount": 0,
  "conclusion": "string - wniosek (max 200 znaków)"
}`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<TRDAssessmentResult> {
    // Zapisz kontekst dla dostępu w metodach pomocniczych
    this.currentContext = context;
    
    const clinicalData = context.clinicalSynthesis?.data;
    const episodeData = context.episodeAnalysis?.data;
    const pharmacoData = context.pharmacotherapyAnalysis?.data;
    
    const prompt = `Przeprowadź precyzyjną ocenę lekooporności (TRD) według kryteriów MGH-ATRQ:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

${context.previousAgentResults || ''}

=== PROTOKÓŁ BADANIA z KRYTERIAMI MGH-ATRQ ===
${context.studyProtocol}

Wykonaj szczegółową ocenę TRD według instrukcji systemowych, uwzględniając najbardziej prawdopodobny scenariusz epizodu i precyzyjną analizę farmakoterapii z poprzednich agentów.`;

    // 🔍 DODANE LOGOWANIE PROMPTU
    console.log('🔍 [TRD Agent] Prompt content preview:');
    console.log('📋 Medical History length:', context.medicalHistory?.length || 0);
    console.log('📋 Previous Agent Results length:', context.previousAgentResults?.length || 0);
    console.log('📋 Study Protocol length:', context.studyProtocol?.length || 0);
    
    // Loguj mapowania preprocessing
    if (context.drugMappingInfo?.mappings) {
      console.log('🔍 [TRD Agent] Drug mappings available in context:', context.drugMappingInfo.mappings.length);
      context.drugMappingInfo.mappings.forEach(mapping => {
        console.log(`  - ${mapping.original} → ${mapping.mapped} (confidence: ${Math.round(mapping.confidence * 100)}%)`);
      });
    } else {
      console.log('⚠️ [TRD Agent] No drug mappings found in context.drugMappingInfo');
    }
    
    // Loguj fragment previousAgentResults, żeby zobaczyć mapowania
    if (context.previousAgentResults) {
      const mappingSection = context.previousAgentResults.match(/Mapowania leków:[\s\S]*?(?=\n\n|\n[A-Z]|$)/);
      if (mappingSection) {
        console.log('🔍 [TRD Agent] Drug mappings found in context:', mappingSection[0]);
      } else {
        console.log('⚠️ [TRD Agent] No drug mappings section found in previousAgentResults');
      }
    }

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    const aiResult = this.parseJSONResponse<TRDAssessmentResult>(response);
    
    // UJEDNOLICENIE: Weryfikacja wyników AI za pomocą ujednoliconego serwisu
    const verifiedResult = await this.verifyWithUnifiedService(aiResult, pharmacoData?.timeline || [], context);
    
    return verifiedResult;
  }

  /**
   * Weryfikuje wyniki AI za pomocą ujednoliconego serwisu MGH-ATRQ
   */
  private async verifyWithUnifiedService(
    aiResult: TRDAssessmentResult, 
    pharmacotherapy: any[],
    context: SharedContext
  ): Promise<TRDAssessmentResult> {
    console.log(`🔄 [TRD Agent] Verifying AI results with unified MGH-ATRQ service`);
    
    try {
      // KROK 1: Wyodrębnij mapowania preprocessing z kontekstu
      const preprocessingMappings = this.extractPreprocessingMappings(context);
      console.log(`📋 [TRD Agent] Extracted ${preprocessingMappings.length} preprocessing mappings`);
      
      // KROK 2: Użyj Enhanced MGH-ATRQ service z AI-powered tłumaczeniem
      const serviceResult = await enhancedMGHATRQService.assessTRDWithPreprocessing(
        pharmacotherapy,
        aiResult.episodeStartDate,
        preprocessingMappings
      );
      
      // KROK 3: Porównaj wyniki
      const aiFailureCount = aiResult.failureCount;
      const serviceFailureCount = serviceResult.failureCount || 0;
      
      console.log(`🔍 [TRD Verification] AI: ${aiFailureCount} failures, Service: ${serviceFailureCount} failures`);
      
      // Jeśli wyniki się różnią znacząco, użyj wyników serwisu jako bardziej wiarygodnych
      if (Math.abs(aiFailureCount - serviceFailureCount) > 1) {
        console.warn(`⚠️ [TRD Verification] Significant difference detected. Using service results.`);
        
        return {
          ...aiResult,
          failureCount: serviceFailureCount,
          trdStatus: serviceResult.isCompliant ? 'confirmed' : 'not_confirmed',
          conclusion: serviceResult.reasoning,
          adequateTrials: serviceResult.adequateTrials?.map(trial => ({
            id: trial.id,
            drugName: trial.originalDrugName,
            dose: trial.dose,
            duration: trial.duration,
            adequate: trial.adequate,
            reasoning: trial.reasoning
          })) || aiResult.adequateTrials
        };
      }
      
      // Jeśli wyniki są podobne, zachowaj AI reasoning ale zaktualizuj dane techniczne
      return {
        ...aiResult,
        failureCount: serviceFailureCount, // Użyj dokładniejszej liczby z serwisu
        adequateTrials: serviceResult.adequateTrials?.map(trial => ({
          id: trial.id,
          drugName: trial.originalDrugName,
          dose: trial.dose,
          duration: trial.duration,
          adequate: trial.adequate,
          reasoning: trial.reasoning
        })) || aiResult.adequateTrials
      };
      
    } catch (error) {
      console.error(`❌ [TRD Verification] Error verifying with service:`, error);
      // W przypadku błędu, zwróć oryginalne wyniki AI
      return aiResult;
    }
  }

  /**
   * Wyodrębnia mapowania preprocessing z kontekstu SharedContext
   */
  private extractPreprocessingMappings(context: SharedContext): Array<{ originalName: string; standardName: string; activeSubstance: string }> {
    // Sprawdź czy są mapowania w drugMappingInfo (główna ścieżka w MultiAgentCoordinator)
    if (context?.drugMappingInfo?.mappings) {
      console.log(`🔍 [TRD Agent] Found preprocessing mappings in context.drugMappingInfo`);
      return context.drugMappingInfo.mappings.map((mapping: any) => ({
        originalName: mapping.original || '',
        standardName: mapping.mapped || '',
        activeSubstance: mapping.mapped || ''
      }));
    }
    
    // Jeśli nie ma bezpośredniego dostępu, spróbuj wyodrębnić z previousAgentResults
    if (context?.previousAgentResults) {
      const mappings = this.parsePreprocessingFromText(context.previousAgentResults);
      if (mappings.length > 0) {
        console.log(`🔍 [TRD Agent] Extracted ${mappings.length} mappings from previousAgentResults text`);
        return mappings;
      }
    }
    
    console.log(`⚠️ [TRD Agent] No preprocessing mappings found in context`);
    return [];
  }
  
  /**
   * Parsuje mapowania preprocessing z tekstu previousAgentResults
   */
  private parsePreprocessingFromText(text: string): Array<{ originalName: string; standardName: string; activeSubstance: string }> {
    const mappings: Array<{ originalName: string; standardName: string; activeSubstance: string }> = [];
    
    // Szukaj sekcji mapowań leków
    const mappingSection = text.match(/Mapowania leków:[\s\S]*?(?=\n\n|\n[A-Z]|$)/);
    if (!mappingSection) return [];
    
    // Parsuj linie mapowań typu "- welbox → Bupropioni hydrochloridum 150 mg (confidence: 98%)"
    const mappingLines = mappingSection[0].match(/- .+ → .+ \(confidence: \d+%\)/g);
    if (!mappingLines) return [];
    
    for (const line of mappingLines) {
      const match = line.match(/- (.+) → (.+) \(confidence: \d+%\)/);
      if (match) {
        const originalName = match[1].trim();
        const standardName = match[2].trim();
        
        mappings.push({
          originalName,
          standardName,
          activeSubstance: standardName
        });
      }
    }
    
    return mappings;
  }
  
  // Dodaj właściwość do przechowywania kontekstu
  private currentContext?: SharedContext;

  protected getErrorFallback(): TRDAssessmentResult {
    return {
      episodeStartDate: null,
      adequateTrials: [
        {
          id: 'error-1',
          drugName: 'Błąd analizy',
          dose: 'N/A',
          duration: 0,
          adequate: false,
          reasoning: 'Błąd podczas oceny TRD - wymagana ręczna weryfikacja'
        }
      ],
      trdStatus: 'insufficient_data',
      failureCount: 0,
      conclusion: 'Błąd podczas oceny lekooporności - nie można określić statusu TRD'
    };
  }

  public validate(result: TRDAssessmentResult): boolean {
    return (
      ['confirmed', 'not_confirmed', 'insufficient_data'].includes(result.trdStatus) &&
      typeof result.failureCount === 'number' &&
      result.failureCount >= 0 &&
      Array.isArray(result.adequateTrials) &&
      typeof result.conclusion === 'string' &&
      result.adequateTrials.every(trial => 
        typeof trial.id === 'string' &&
        typeof trial.drugName === 'string' &&
        typeof trial.dose === 'string' &&
        typeof trial.duration === 'number' &&
        typeof trial.adequate === 'boolean' &&
        typeof trial.reasoning === 'string'
      )
    );
  }

  protected calculateConfidence(result: TRDAssessmentResult, context: SharedContext): number {
    let confidence = 0.6; // bazowa pewność
    
    // Zwiększ pewność na podstawie jakości danych epizodów
    const episodeData = context.episodeAnalysis?.data;
    if (episodeData && episodeData.scenarios.length > 0) {
      const bestScenario = episodeData.scenarios.find(s => s.id === episodeData.mostLikelyScenario);
      if (bestScenario && bestScenario.confidence > 0.7) {
        confidence += 0.2;
      }
    }
    
    // Zwiększ pewność na podstawie kompletności prób
    const trialsWithCompleteData = result.adequateTrials.filter(trial => 
      trial.duration > 0 && trial.dose !== 'N/A'
    ).length;
    
    confidence += (trialsWithCompleteData / Math.max(1, result.adequateTrials.length)) * 0.2;
    
    // Zmniejsz pewność dla niepewnych statusów
    if (result.trdStatus === 'insufficient_data') {
      confidence *= 0.5;
    }
    
    return Math.min(confidence, 1.0);
  }

  protected generateWarnings(result: TRDAssessmentResult, context: SharedContext): string[] {
    const warnings: string[] = [];
    
    if (result.trdStatus === 'insufficient_data') {
      warnings.push('Niewystarczające dane do oceny TRD - wymagana dodatkowa weryfikacja');
    }
    
    const inadequateTrials = result.adequateTrials.filter(trial => !trial.adequate);
    if (inadequateTrials.length > 0) {
      warnings.push(`${inadequateTrials.length} prób leczenia nie spełnia kryteriów adekwatności MGH-ATRQ`);
    }
    
    if (!result.episodeStartDate) {
      warnings.push('Brak określonej daty rozpoczęcia epizodu - może wpływać na ocenę TRD');
    }
    
    if (result.trdStatus === 'confirmed' && result.failureCount < 2) {
      warnings.push('UWAGA: Status TRD potwierdzony mimo <2 niepowodzeń - sprawdź logikę');
    }
    
    if (result.trdStatus === 'not_confirmed' && result.failureCount >= 2) {
      warnings.push('UWAGA: TRD nie potwierdzony mimo ≥2 niepowodzeń - sprawdź uzasadnienie');
    }
    
    return warnings;
  }
}