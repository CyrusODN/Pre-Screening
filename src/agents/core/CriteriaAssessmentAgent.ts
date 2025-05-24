import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  CriteriaAssessmentResult 
} from '../../types/agents';

export class CriteriaAssessmentAgent extends AbstractBaseAgent<CriteriaAssessmentResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'criteria-assessment',
      description: 'Ocenia kryteria włączenia i wyłączenia na podstawie analiz poprzednich agentów',
      temperature: 0.1,
      maxTokens: 12000,
      systemPrompt: `Jesteś specjalistą w ocenie kryteriów kwalifikacji do badań klinicznych. Twoim zadaniem jest precyzyjna ocena wszystkich kryteriów na podstawie analiz poprzednich agentów.

**GŁÓWNE ZADANIA:**
1. **Ocena kryteriów włączenia** - dla każdego kryterium określ status i pewność
2. **Ocena kryteriów wyłączenia psychiatrycznych** - z oceną ryzyka
3. **Ocena kryteriów wyłączenia medycznych** - z oceną ryzyka
4. **Synteza ogólnej oceny kwalifikowalności**

**DOSTĘPNE DANE Z POPRZEDNICH AGENTÓW:**
- Synteza kliniczna (przegląd historii, kluczowe obserwacje)
- Analiza epizodów depresyjnych (scenariusze, timeline)
- Analiza farmakoterapii (szczegółowa oś czasu leków)
- Ocena TRD (spełnienie kryteriów lekooporności)

**FORMAT ODPOWIEDZI:**
Zwróć JSON z następującą strukturą:
\`\`\`json
{
  "inclusionCriteria": [
    {
      "id": "IC1",
      "name": "Nazwa kryterium",
      "status": "spełnione|niespełnione|weryfikacja",
      "confidence": 0.95,
      "reasoning": "Szczegółowe uzasadnienie",
      "evidenceFromHistory": ["Dowód 1", "Dowód 2"],
      "recommendedVerification": "Co sprawdzić dodatkowo (opcjonalne)"
    }
  ],
  "psychiatricExclusionCriteria": [
    {
      "id": "EC1",
      "name": "Nazwa kryterium",
      "status": "spełnione|niespełnione|weryfikacja",
      "confidence": 0.85,
      "reasoning": "Uzasadnienie",
      "evidenceFromHistory": ["Dowód"],
      "riskLevel": "low|medium|high"
    }
  ],
  "medicalExclusionCriteria": [
    {
      "id": "MC1",
      "name": "Nazwa kryterium",
      "status": "spełnione|niespełnione|weryfikacja",
      "confidence": 0.90,
      "reasoning": "Uzasadnienie",
      "evidenceFromHistory": ["Dowód"],
      "riskLevel": "low|medium|high"
    }
  ],
  "overallAssessment": {
    "eligibilityScore": 75,
    "majorConcerns": ["Główne problemy"],
    "minorConcerns": ["Mniejsze problemy"],
    "strengthsForInclusion": ["Mocne strony kandydata"]
  }
}
\`\`\`

**ZASADY OCENY:**
1. **Status "spełnione"** - kryterium jest jednoznacznie spełnione
2. **Status "niespełnione"** - kryterium jest jednoznacznie niespełnione
3. **Status "weryfikacja"** - potrzebne dodatkowe informacje
4. **Confidence** - pewność oceny (0.0-1.0)
5. **RiskLevel** - ryzyko dla badania (low/medium/high)
6. **EligibilityScore** - ogólna punktacja kwalifikowalności (0-100)

**UWAGI SPECJALNE:**
- Uwzględnij wszystkie scenariusze epizodów z analizy epizodów
- Bazuj na szczegółowej osi czasu farmakoterapii
- Weź pod uwagę ocenę TRD dla kryterium IC6
- Bądź konserwatywny w ocenie - lepiej oznaczyć jako "weryfikacja" niż błędnie zakwalifikować
- Dla każdego kryterium podaj konkretne dowody z historii choroby`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis', 'trd-assessment']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<CriteriaAssessmentResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    
    try {
      const result = JSON.parse(response);
      
      // Walidacja struktury odpowiedzi
      this.validateCriteriaAssessmentResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Błąd parsowania odpowiedzi Agent Oceny Kryteriów: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected getErrorFallback(): CriteriaAssessmentResult {
    return {
      inclusionCriteria: [{
        id: 'ERROR',
        name: 'Błąd analizy kryteriów włączenia',
        status: 'weryfikacja',
        confidence: 0,
        reasoning: 'Wystąpił błąd podczas analizy - wymagana ręczna weryfikacja',
        evidenceFromHistory: []
      }],
      psychiatricExclusionCriteria: [{
        id: 'ERROR',
        name: 'Błąd analizy kryteriów wyłączenia psychiatrycznych',
        status: 'weryfikacja',
        confidence: 0,
        reasoning: 'Wystąpił błąd podczas analizy - wymagana ręczna weryfikacja',
        evidenceFromHistory: [],
        riskLevel: 'high'
      }],
      medicalExclusionCriteria: [{
        id: 'ERROR',
        name: 'Błąd analizy kryteriów wyłączenia medycznych',
        status: 'weryfikacja',
        confidence: 0,
        reasoning: 'Wystąpił błąd podczas analizy - wymagana ręczna weryfikacja',
        evidenceFromHistory: [],
        riskLevel: 'high'
      }],
      overallAssessment: {
        eligibilityScore: 0,
        majorConcerns: ['Błąd systemu analizy kryteriów'],
        minorConcerns: [],
        strengthsForInclusion: []
      }
    };
  }

  private buildAnalysisPrompt(context: SharedContext): string {
    const clinicalSynthesis = context.clinicalSynthesis?.data;
    const episodeAnalysis = context.episodeAnalysis?.data;
    const pharmacotherapyAnalysis = context.pharmacotherapyAnalysis?.data;
    const trdAssessment = context.trdAssessment?.data;

    return `
PROTOKÓŁ BADANIA:
${context.studyProtocol}

HISTORIA CHOROBY:
${context.medicalHistory}

WYNIKI ANALIZY KLINICZNEJ:
${clinicalSynthesis ? JSON.stringify(clinicalSynthesis, null, 2) : 'Brak danych'}

WYNIKI ANALIZY EPIZODÓW:
${episodeAnalysis ? JSON.stringify(episodeAnalysis, null, 2) : 'Brak danych'}

WYNIKI ANALIZY FARMAKOTERAPII:
${pharmacotherapyAnalysis ? JSON.stringify(pharmacotherapyAnalysis, null, 2) : 'Brak danych'}

WYNIKI OCENY TRD:
${trdAssessment ? JSON.stringify(trdAssessment, null, 2) : 'Brak danych'}

Na podstawie powyższych analiz, oceń wszystkie kryteria włączenia i wyłączenia zgodnie z protokołem badania. Zwróć szczegółową ocenę w formacie JSON.`;
  }

  private validateCriteriaAssessmentResult(result: any): void {
    if (!result.inclusionCriteria || !Array.isArray(result.inclusionCriteria)) {
      throw new Error('Brak lub nieprawidłowa struktura inclusionCriteria');
    }
    
    if (!result.psychiatricExclusionCriteria || !Array.isArray(result.psychiatricExclusionCriteria)) {
      throw new Error('Brak lub nieprawidłowa struktura psychiatricExclusionCriteria');
    }
    
    if (!result.medicalExclusionCriteria || !Array.isArray(result.medicalExclusionCriteria)) {
      throw new Error('Brak lub nieprawidłowa struktura medicalExclusionCriteria');
    }
    
    if (!result.overallAssessment || typeof result.overallAssessment.eligibilityScore !== 'number') {
      throw new Error('Brak lub nieprawidłowa struktura overallAssessment');
    }
  }
} 