import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  TRDAssessmentResult 
} from '../../types/agents';

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
Pacjent spełnia kryterium IC6, jeśli doświadczył niepowodzenia co najmniej DWÓCH (2) RÓŻNYCH, "adekwatnych prób leczenia" w obecnym epizodzie depresyjnym.

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
{
  "episodeStartDate": "YYYY-MM-DD lub null",
  "adequateTrials": [
    {
      "id": "string",
      "drugName": "string",
      "dose": "string",
      "duration": number,
      "adequate": boolean,
      "reasoning": "string - szczegółowe uzasadnienie wg MGH-ATRQ"
    }
  ],
  "trdStatus": "confirmed" | "not_confirmed" | "insufficient_data",
  "failureCount": number,
  "conclusion": "string - szczegółowy wniosek z listą punktowaną niepowodzeń: \\n- Próba 1: opis\\n- Próba 2: opis"
}`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<TRDAssessmentResult> {
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

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    return this.parseJSONResponse<TRDAssessmentResult>(response);
  }

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