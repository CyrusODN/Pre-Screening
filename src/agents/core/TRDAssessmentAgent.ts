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

**KRYTERIA ADEKWATNEJ PRÓBY:**
- Lek musi być na liście MGH-ATRQ z protokołu badania
- Dawka ≥ minimalnej dawki z kryteriów MGH-ATRQ
- Czas trwania ≥ minimalnego czasu z kryteriów MGH-ATRQ
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
      "reasoning": "string - szczegółowe uzasadnienie"
    }
  ],
  "trdStatus": "confirmed" | "not_confirmed" | "insufficient_data",
  "failureCount": number,
  "conclusion": "string - szczegółowy wniosek z listą niepowodzeń"
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

=== ANALIZA KLINICZNA ===
${clinicalData?.patientOverview || 'Brak danych'}

=== SCENARIUSZE EPIZODÓW ===
${episodeData?.scenarios?.map(s => `Scenariusz ${s.id}: ${s.description} (${s.startDate} - ${s.endDate}), pewność: ${s.confidence}`).join('\n') || 'Brak danych'}
Najbardziej prawdopodobny: ${episodeData?.mostLikelyScenario || 'N/A'}

=== OŚ CZASU FARMAKOTERAPII ===
${pharmacoData?.timeline?.map(item => 
  `${item.drugName} (${item.dose}): ${item.startDate} - ${item.endDate}, grupa: ${item.attemptGroup}, uwagi: ${item.notes}`
).join('\n') || 'Brak danych'}

=== MAPOWANIA LEKÓW ===
${pharmacoData?.drugMappings?.map(m => `${m.originalName} → ${m.standardName}`).join('\n') || 'Brak mapowań'}

=== PROTOKÓŁ BADANIA z KRYTERIAMI MGH-ATRQ ===
${context.studyProtocol}

Wykonaj szczegółową ocenę TRD według instrukcji systemowych, uwzględniając najbardziej prawdopodobny scenariusz epizodu.`;

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