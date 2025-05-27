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
}

class ChatbotService {
  private chatbotAgent: MedicalChatbotAgent;
  private session: ChatSession;

  constructor() {
    this.chatbotAgent = new MedicalChatbotAgent();
    this.session = {
      messages: [],
      context: null,
      isActive: false
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
    this.session.messages = [
      {
        id: 'welcome',
        type: 'bot',
        content: `Witam! Jestem asystentem medycznym AI specjalizującym się w analizie pre-screeningowej. Właśnie zakończyłem analizę pacjenta ${patientData.summary?.id || 'N/A'}. 

Mogę odpowiedzieć na pytania dotyczące:
• Kryteriów włączenia i wyłączenia
• Analizy farmakoterapii i TRD
• Oceny ryzyka pacjenta
• Rekomendacji dalszych kroków

**Uwaga:** To tylko analiza wstępna. Wszystkie decyzje medyczne wymagają weryfikacji przez lekarza prowadzącego.

Jak mogę Panu/Pani pomóc?`,
        timestamp: new Date(),
        confidence: 1.0,
        suggestedFollowUp: [
          'Dlaczego ten pacjent może nie spełniać kryteriów?',
          'Jakie są główne ryzyka dla tego pacjenta?',
          'Czy może Pan wyjaśnić ocenę TRD?',
          'Jakie dodatkowe badania są potrzebne?'
        ]
      }
    ];
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
        content: `Przepraszam, wystąpił błąd podczas przetwarzania Pana/Pani pytania: ${error instanceof Error ? error.message : 'Nieznany błąd'}. Proszę spróbować ponownie.`,
        timestamp: new Date(),
        confidence: 0,
        suggestedFollowUp: [
          'Czy może Pan/Pani zadać pytanie w inny sposób?',
          'Czy potrzebuje Pan/Pani pomocy z konkretnym aspektem?'
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
   * Czyści sesję
   */
  public clearSession(): void {
    this.session = {
      messages: [],
      context: null,
      isActive: false
    };
  }

  /**
   * Pobiera predefiniowane pytania sugerowane
   */
  public getSuggestedQuestions(): string[] {
    return [
      'Dlaczego ten pacjent może nie spełniać kryteriów włączenia?',
      'Jakie są główne ryzyka związane z tym pacjentem?',
      'Czy może Pan wyjaśnić szczegóły oceny TRD?',
      'Jakie dodatkowe badania lub informacje są potrzebne?',
      'Jaka jest interpretacja analizy farmakoterapii?',
      'Czy pacjent nadaje się do włączenia do badania?',
      'Jakie są alternatywne scenariusze epizodów depresyjnych?',
      'Które kryteria wymagają dodatkowej weryfikacji?'
    ];
  }
}

// Singleton instance
export const chatbotService = new ChatbotService();
export default chatbotService; 