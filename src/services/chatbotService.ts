import { MedicalChatbotAgent } from '../agents/core/MedicalChatbotAgent';
import type { SharedContext, ChatbotResult } from '../types/agents';
import type { PatientData, SupportedAIModel } from '../types/index';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  confidence?: number;
  referencedSections?: string[];
  suggestedFollowUp?: string[];
}

export interface ChatSession {
  messages: ChatMessage[];
  context: SharedContext | null;
  isActive: boolean;
  analysisType: 'multi-agent' | 'single-agent';
}

class ChatbotService {
  private chatbotAgent: MedicalChatbotAgent;
  private session: ChatSession;

  constructor() {
    this.chatbotAgent = new MedicalChatbotAgent();
    this.session = {
      messages: [],
      context: null,
      isActive: false,
      analysisType: 'multi-agent'
    };
  }

  /**
   * Inicjalizuje sesję chatbota z wynikami analizy wieloagentowej
   */
  public initializeSession(
    patientData: PatientData,
    agentResults: Record<string, any>,
    medicalHistory: string,
    studyProtocol: string
  ): void {
    this.session.context = {
      medicalHistory,
      studyProtocol,
      modelUsed: patientData.modelUsed || 'o3',
      clinicalSynthesis: agentResults['clinical-synthesis'],
      episodeAnalysis: agentResults['episode-analysis'],
      pharmacotherapyAnalysis: agentResults['pharmacotherapy-analysis'],
      trdAssessment: agentResults['trd-assessment'],
      inclusionCriteriaAssessment: agentResults['criteria-assessment'],
      riskAssessment: agentResults['risk-assessment']
    };

    this.session.isActive = true;
    this.session.analysisType = 'multi-agent';
    this.session.messages = [
      {
        id: 'welcome',
        type: 'bot',
        content: `Witam! Jestem asystentem medycznym AI specjalizującym się w analizie pre-screeningowej. Właśnie zakończyłem **analizę wieloagentową** pacjenta ${patientData.summary?.id || 'N/A'}. 

Mogę odpowiedzieć na pytania dotyczące:
• Kryteriów włączenia i wyłączenia
• Analizy farmakoterapii i TRD
• Oceny ryzyka pacjenta
• Rekomendacji dalszych kroków

**Uwaga:** To tylko analiza wstępna. Wszystkie decyzje medyczne wymagają weryfikacji przez lekarza prowadzącego.

Jak mogę ci pomóc?`,
        timestamp: new Date(),
        confidence: 1.0,
        suggestedFollowUp: [
          'Dlaczego ten pacjent może nie spełniać kryteriów?',
          'Jakie są główne ryzyka dla tego pacjenta?',
          'Czy możesz wyjaśnić ocenę TRD?',
          'Jakie dodatkowe badania są potrzebne?'
        ]
      }
    ];
  }

  /**
   * Inicjalizuje sesję chatbota z wynikami analizy monoagentowej (klasycznej)
   */
  public initializeSessionFromSingleAgent(
    patientData: PatientData,
    medicalHistory: string,
    studyProtocol: string
  ): void {
    // Konwertuj wyniki analizy monoagentowej do formatu kompatybilnego z chatbotem
    const mockAgentResults = this.convertSingleAgentToMultiAgentFormat(patientData);

    this.session.context = {
      medicalHistory,
      studyProtocol,
      modelUsed: patientData.modelUsed || 'o3',
      clinicalSynthesis: mockAgentResults.clinicalSynthesis,
      episodeAnalysis: mockAgentResults.episodeAnalysis,
      pharmacotherapyAnalysis: mockAgentResults.pharmacotherapyAnalysis,
      trdAssessment: mockAgentResults.trdAssessment,
      inclusionCriteriaAssessment: mockAgentResults.criteriaAssessment,
      riskAssessment: mockAgentResults.riskAssessment
    };

    this.session.isActive = true;
    this.session.analysisType = 'single-agent';
    this.session.messages = [
      {
        id: 'welcome',
        type: 'bot',
        content: `Witam! Jestem asystentem medycznym AI specjalizującym się w analizie pre-screeningowej. Właśnie zakończyłem **analizę klasyczną** pacjenta ${patientData.summary?.id || 'N/A'}. 

Mogę odpowiedzieć na pytania dotyczące:
• Kryteriów włączenia i wyłączenia
• Analizy farmakoterapii i TRD
• Oceny ryzyka pacjenta
• Rekomendacji dalszych kroków

**Uwaga:** To analiza klasyczna (monoagentowa). Wszystkie decyzje medyczne wymagają weryfikacji przez lekarza prowadzącego.

Jak mogę ci pomóc?`,
        timestamp: new Date(),
        confidence: 0.8, // Nieco niższa pewność dla analizy monoagentowej
        suggestedFollowUp: [
          'Dlaczego ten pacjent może nie spełniać kryteriów?',
          'Jakie są główne problemy w analizie?',
          'Czy możesz wyjaśnić ocenę TRD?',
          'Jakie dodatkowe informacje są potrzebne?'
        ]
      }
    ];
  }

  /**
   * Konwertuje wyniki analizy monoagentowej do formatu wieloagentowego dla chatbota
   */
  private convertSingleAgentToMultiAgentFormat(patientData: PatientData): any {
    return {
      clinicalSynthesis: {
        success: true,
        data: {
          patientOverview: `Pacjent ${patientData.summary.age} lat z głównym rozpoznaniem: ${patientData.summary.mainDiagnosis}. ${patientData.summary.comorbidities.length > 0 ? 'Choroby towarzyszące: ' + patientData.summary.comorbidities.join(', ') + '.' : ''}`,
          mainDiagnosis: patientData.summary.mainDiagnosis,
          comorbidities: patientData.summary.comorbidities,
          clinicalTimeline: [
            `Analiza przeprowadzona: ${patientData.analyzedAt ? new Date(patientData.analyzedAt).toLocaleDateString('pl-PL') : 'Nieznana data'}`,
            `Model użyty: ${patientData.modelUsed}`,
            ...(patientData.trdAnalysis.pharmacotherapy.map(p => 
              `${p.drugName} (${p.dose}): ${p.startDate} - ${p.endDate}`
            ))
          ],
          keyObservations: [
            `Główne rozpoznanie: ${patientData.summary.mainDiagnosis}`,
            `Wiek pacjenta: ${patientData.summary.age} lat`,
            `Liczba leków w historii: ${patientData.trdAnalysis.pharmacotherapy.length}`,
            `Data rozpoczęcia epizodu: ${patientData.trdAnalysis.episodeStartDate || 'Nie określona'}`
          ],
          treatmentHistory: patientData.trdAnalysis.conclusion,
          riskFactors: patientData.reportConclusion.mainIssues || []
        },
        confidence: 0.8,
        warnings: ['Dane pochodzą z analizy monoagentowej - mogą być mniej szczegółowe']
      },
      episodeAnalysis: {
        success: true,
        data: {
          scenarios: patientData.episodeEstimation.scenarios || [
            {
              id: 1,
              description: patientData.episodeEstimation.conclusion,
              evidence: 'Analiza oparta na danych z analizy klasycznej',
              startDate: patientData.trdAnalysis.episodeStartDate,
              endDate: null,
              confidence: 0.7
            }
          ],
          mostLikelyScenario: 1,
          conclusion: patientData.episodeEstimation.conclusion,
          remissionPeriods: []
        },
        confidence: 0.7,
        warnings: ['Analiza epizodów z analizy monoagentowej - ograniczona szczegółowość']
      },
      pharmacotherapyAnalysis: {
        success: true,
        data: {
          timeline: patientData.trdAnalysis.pharmacotherapy,
          drugMappings: patientData.trdAnalysis.pharmacotherapy.map(p => ({
            originalName: p.drugName,
            standardName: p.drugName,
            confidence: 0.8
          })),
          prohibitedDrugs: [],
          gaps: [],
          summary: `Zidentyfikowano ${patientData.trdAnalysis.pharmacotherapy.length} leków w historii farmakoterapii.`
        },
        confidence: 0.8,
        warnings: ['Analiza farmakoterapii z systemu monoagentowego']
      },
      trdAssessment: {
        success: true,
        data: {
          trdStatus: patientData.trdAnalysis.conclusion.toLowerCase().includes('trd') || 
                   patientData.trdAnalysis.conclusion.toLowerCase().includes('lekoopora') ? 'confirmed' : 'not_confirmed',
          failureCount: patientData.trdAnalysis.pharmacotherapy.filter(p => p.attemptGroup > 0).length,
          episodeStartDate: patientData.trdAnalysis.episodeStartDate,
          adequateTrials: patientData.trdAnalysis.pharmacotherapy.map(p => ({
            drugName: p.drugName,
            dose: p.dose,
            duration: 8, // Domyślnie 8 tygodni
            adequate: p.attemptGroup > 0
          })),
          conclusion: patientData.trdAnalysis.conclusion
        },
        confidence: 0.7,
        warnings: ['Ocena TRD z analizy monoagentowej - może wymagać weryfikacji']
      },
      criteriaAssessment: {
        success: true,
        data: {
          inclusionCriteria: patientData.inclusionCriteria.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            confidence: 0.8,
            reasoning: c.details,
            evidenceFromHistory: [c.details]
          })),
          psychiatricExclusionCriteria: patientData.psychiatricExclusionCriteria.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            confidence: 0.8,
            reasoning: c.details,
            evidenceFromHistory: [c.details],
            riskLevel: c.status === 'spełnione' ? 'high' : 'low'
          })),
          medicalExclusionCriteria: patientData.medicalExclusionCriteria.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            confidence: 0.8,
            reasoning: c.details,
            evidenceFromHistory: [c.details],
            riskLevel: c.status === 'spełnione' ? 'high' : 'low'
          })),
          overallAssessment: {
            eligibilityScore: patientData.reportConclusion.estimatedProbability,
            majorConcerns: patientData.reportConclusion.mainIssues,
            minorConcerns: [],
            strengthsForInclusion: []
          }
        },
        confidence: 0.8,
        warnings: ['Ocena kryteriów z analizy monoagentowej']
      },
      riskAssessment: {
        success: true,
        data: {
          patientRiskProfile: {
            suicidalRisk: {
              level: 'medium',
              indicators: ['Analiza z systemu monoagentowego - wymagana szczegółowa ocena'],
              mitigationStrategies: ['Regularne monitorowanie psychiatryczne']
            },
            adherenceRisk: {
              level: 'medium',
              factors: ['Historia leczenia wskazuje na potrzebę oceny adherencji'],
              recommendations: ['Edukacja pacjenta', 'Regularne kontrole']
            },
            adverseEventRisk: {
              level: 'medium',
              potentialEvents: ['Standardowe ryzyko dla leków przeciwdepresyjnych'],
              monitoringNeeds: ['Standardowe monitorowanie']
            },
            dropoutRisk: {
              level: 'medium',
              factors: ['Wymagana ocena motywacji pacjenta'],
              retentionStrategies: ['Regularne kontakty', 'Wsparcie psychologiczne']
            }
          },
          studySpecificRisks: {
            protocolCompliance: patientData.reportConclusion.estimatedProbability,
            dataQuality: 70,
            ethicalConcerns: patientData.reportConclusion.mainIssues
          },
          inclusionProbability: {
            score: patientData.reportConclusion.estimatedProbability,
            confidence: 70,
            keyFactors: {
              positive: [],
              negative: patientData.reportConclusion.mainIssues,
              neutral: patientData.reportConclusion.criticalInfoNeeded || []
            },
            recommendation: patientData.reportConclusion.estimatedProbability > 70 ? 'include' : 
                           patientData.reportConclusion.estimatedProbability > 40 ? 'further_evaluation' : 'exclude',
            reasoning: patientData.reportConclusion.overallQualification
          }
        },
        confidence: 0.7,
        warnings: ['Ocena ryzyka z analizy monoagentowej - może wymagać dodatkowej weryfikacji']
      }
    };
  }

  /**
   * Wysyła pytanie do chatbota i zwraca odpowiedź
   */
  public async askQuestion(
    question: string,
    focusArea?: 'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general'
  ): Promise<ChatMessage> {
    if (!this.session.context) {
      throw new Error('Chat session not initialized');
    }

    // Dodaj pytanie użytkownika
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    this.session.messages.push(userMessage);

    try {
      // Wywołaj chatbota
      const result: ChatbotResult = await this.chatbotAgent.answerQuestion(
        question,
        this.session.context,
        focusArea
      );

      // Stwórz odpowiedź bota
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: result.response,
        timestamp: new Date(),
        confidence: result.confidence,
        referencedSections: result.referencedSections,
        suggestedFollowUp: result.suggestedFollowUp
      };

      this.session.messages.push(botMessage);
      return botMessage;

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: `Przepraszam, wystąpił błąd podczas przetwarzania twojego pytania: ${error instanceof Error ? error.message : 'Nieznany błąd'}. Proszę spróbować ponownie.`,
        timestamp: new Date(),
        confidence: 0,
        suggestedFollowUp: [
          'Czy możesz zadać pytanie w inny sposób?',
          'Czy potrzebujesz pomocy z konkretnym aspektem?'
        ]
      };

      this.session.messages.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Pobiera historię wiadomości
   */
  public getMessages(): ChatMessage[] {
    return [...this.session.messages];
  }

  /**
   * Sprawdza czy sesja jest aktywna
   */
  public isSessionActive(): boolean {
    return this.session.isActive;
  }

  /**
   * Pobiera typ analizy używanej w sesji
   */
  public getAnalysisType(): 'multi-agent' | 'single-agent' {
    return this.session.analysisType;
  }

  /**
   * Czyści sesję
   */
  public clearSession(): void {
    this.session = {
      messages: [],
      context: null,
      isActive: false,
      analysisType: 'multi-agent'
    };
  }

  /**
   * Pobiera predefiniowane pytania sugerowane
   */
  public getSuggestedQuestions(): string[] {
    const baseQuestions = [
      'Dlaczego ten pacjent może nie spełniać kryteriów włączenia?',
      'Jakie są główne ryzyka związane z tym pacjentem?',
      'Czy możesz wyjaśnić szczegóły oceny TRD?',
      'Jakie dodatkowe badania lub informacje są potrzebne?',
      'Jaka jest interpretacja analizy farmakoterapii?',
      'Czy pacjent nadaje się do włączenia do badania?',
      'Które kryteria wymagają dodatkowej weryfikacji?'
    ];

    if (this.session.analysisType === 'single-agent') {
      return [
        ...baseQuestions,
        'Jakie są ograniczenia analizy klasycznej?',
        'Czy warto przeprowadzić analizę wieloagentową?'
      ];
    } else {
      return [
        ...baseQuestions,
        'Jakie są alternatywne scenariusze epizodów depresyjnych?',
        'Jak różni się ta analiza od klasycznej?'
      ];
    }
  }
}

// Singleton instance
export const chatbotService = new ChatbotService();
export default chatbotService; 