import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  RiskAssessmentResult 
} from '../../types/agents';

export class RiskAssessmentAgent extends AbstractBaseAgent<RiskAssessmentResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'risk-assessment',
      description: 'Ocenia potencjalne ryzyka związane z pacjentem i szacuje prawdopodobieństwo włączenia',
      temperature: 0.2,
      maxTokens: 15000,
      systemPrompt: `Jesteś specjalistą w ocenie ryzyka w badaniach klinicznych psychiatrycznych. Twoim zadaniem jest kompleksowa ocena ryzyk związanych z pacjentem i oszacowanie prawdopodobieństwa włączenia do badania.

**GŁÓWNE ZADANIA:**
1. **Ocena profilu ryzyka pacjenta** - ryzyko samobójcze, adherencja, zdarzenia niepożądane, rezygnacja
2. **Ocena ryzyk specyficznych dla badania** - zgodność z protokołem, jakość danych, kwestie etyczne
3. **Oszacowanie prawdopodobieństwa włączenia** - na podstawie wszystkich czynników
4. **Rekomendacja końcowa** - include/exclude/further_evaluation

**DOSTĘPNE DANE Z POPRZEDNICH AGENTÓW:**
- Synteza kliniczna (historia, czynniki ryzyka)
- Analiza epizodów depresyjnych (ciężkość, przebieg)
- Analiza farmakoterapii (adherencja, odpowiedź na leczenie)
- Ocena TRD (stopień lekooporności)
- Ocena kryteriów (spełnienie wymogów protokołu)

**FORMAT ODPOWIEDZI:**
Zwróć JSON z następującą strukturą:
\`\`\`json
{
  "patientRiskProfile": {
    "suicidalRisk": {
      "level": "low|medium|high|critical",
      "indicators": ["Wskaźnik 1", "Wskaźnik 2"],
      "mitigationStrategies": ["Strategia 1", "Strategia 2"]
    },
    "adherenceRisk": {
      "level": "low|medium|high",
      "factors": ["Czynnik 1", "Czynnik 2"],
      "recommendations": ["Rekomendacja 1", "Rekomendacja 2"]
    },
    "adverseEventRisk": {
      "level": "low|medium|high",
      "potentialEvents": ["Zdarzenie 1", "Zdarzenie 2"],
      "monitoringNeeds": ["Monitoring 1", "Monitoring 2"]
    },
    "dropoutRisk": {
      "level": "low|medium|high",
      "factors": ["Czynnik 1", "Czynnik 2"],
      "retentionStrategies": ["Strategia 1", "Strategia 2"]
    }
  },
  "studySpecificRisks": {
    "protocolCompliance": 85,
    "dataQuality": 90,
    "ethicalConcerns": ["Kwestia 1", "Kwestia 2"]
  },
  "inclusionProbability": {
    "score": 75,
    "confidence": 85,
    "keyFactors": {
      "positive": ["Pozytywny 1", "Pozytywny 2"],
      "negative": ["Negatywny 1", "Negatywny 2"],
      "neutral": ["Neutralny 1", "Neutralny 2"]
    },
    "recommendation": "include|exclude|further_evaluation",
    "reasoning": "Szczegółowe uzasadnienie rekomendacji"
  }
}
\`\`\`

**ZASADY OCENY RYZYKA:**
1. **Ryzyko samobójcze** - priorytet bezpieczeństwa, historia prób, ideacje
2. **Ryzyko adherencji** - historia przestrzegania zaleceń, czynniki psychosocjalne
3. **Ryzyko zdarzeń niepożądanych** - profil farmakologiczny, choroby współistniejące
4. **Ryzyko rezygnacji** - motywacja, wsparcie społeczne, obciążenie protokołem

**KRYTERIA PRAWDOPODOBIEŃSTWA WŁĄCZENIA:**
- 80-100: Wysoka - silny kandydat do włączenia
- 60-79: Średnia - kandydat z zastrzeżeniami
- 40-59: Niska - wymaga dodatkowej oceny
- 0-39: Bardzo niska - prawdopodobnie wykluczenie

**UWAGI SPECJALNE:**
- Priorytet dla bezpieczeństwa pacjenta
- Uwzględnij specyfikę badania TRD
- Oceń realność przestrzegania protokołu
- Rozważ wpływ na jakość danych badania`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis', 'trd-assessment', 'criteria-assessment']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<RiskAssessmentResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    
    try {
      const result = JSON.parse(response);
      
      // Walidacja struktury odpowiedzi
      this.validateRiskAssessmentResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Błąd parsowania odpowiedzi Agent Oceny Ryzyka: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected getErrorFallback(): RiskAssessmentResult {
    return {
      patientRiskProfile: {
        suicidalRisk: {
          level: 'high',
          indicators: ['Błąd analizy - nie można ocenić ryzyka'],
          mitigationStrategies: ['Wymagana ręczna ocena psychiatryczna']
        },
        adherenceRisk: {
          level: 'high',
          factors: ['Błąd analizy - nie można ocenić adherencji'],
          recommendations: ['Wymagana szczegółowa ocena historii leczenia']
        },
        adverseEventRisk: {
          level: 'high',
          potentialEvents: ['Nieznane - błąd analizy'],
          monitoringNeeds: ['Wzmożony monitoring ze względu na błąd systemu']
        },
        dropoutRisk: {
          level: 'high',
          factors: ['Błąd analizy - nie można ocenić ryzyka rezygnacji'],
          retentionStrategies: ['Wymagana indywidualna ocena motywacji']
        }
      },
      studySpecificRisks: {
        protocolCompliance: 0,
        dataQuality: 0,
        ethicalConcerns: ['Błąd systemu analizy ryzyka']
      },
      inclusionProbability: {
        score: 0,
        confidence: 0,
        keyFactors: {
          positive: [],
          negative: ['Błąd systemu analizy'],
          neutral: []
        },
        recommendation: 'further_evaluation',
        reasoning: 'Wystąpił błąd podczas analizy ryzyka - wymagana kompletna ręczna ocena przez zespół badawczy'
      }
    };
  }

  private buildAnalysisPrompt(context: SharedContext): string {
    const clinicalSynthesis = context.clinicalSynthesis?.data;
    const episodeAnalysis = context.episodeAnalysis?.data;
    const pharmacotherapyAnalysis = context.pharmacotherapyAnalysis?.data;
    const trdAssessment = context.trdAssessment?.data;
    const criteriaAssessment = context.inclusionCriteriaAssessment?.data;

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

WYNIKI OCENY KRYTERIÓW:
${criteriaAssessment ? JSON.stringify(criteriaAssessment, null, 2) : 'Brak danych'}

Na podstawie powyższych analiz, przeprowadź kompleksową ocenę ryzyka pacjenta i oszacuj prawdopodobieństwo włączenia do badania. Zwróć szczegółową ocenę w formacie JSON.`;
  }

  private validateRiskAssessmentResult(result: any): void {
    if (!result.patientRiskProfile) {
      throw new Error('Brak struktury patientRiskProfile');
    }
    
    const requiredRisks = ['suicidalRisk', 'adherenceRisk', 'adverseEventRisk', 'dropoutRisk'];
    for (const risk of requiredRisks) {
      if (!result.patientRiskProfile[risk] || !result.patientRiskProfile[risk].level) {
        throw new Error(`Brak lub nieprawidłowa struktura ${risk}`);
      }
    }
    
    if (!result.studySpecificRisks || 
        typeof result.studySpecificRisks.protocolCompliance !== 'number' ||
        typeof result.studySpecificRisks.dataQuality !== 'number') {
      throw new Error('Brak lub nieprawidłowa struktura studySpecificRisks');
    }
    
    if (!result.inclusionProbability || 
        typeof result.inclusionProbability.score !== 'number' ||
        typeof result.inclusionProbability.confidence !== 'number' ||
        !result.inclusionProbability.recommendation) {
      throw new Error('Brak lub nieprawidłowa struktura inclusionProbability');
    }
  }
} 