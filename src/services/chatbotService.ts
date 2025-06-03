import type { PatientData, SupportedAIModel } from '../types/index';
import { getAIConfig } from '../config/aiConfig';

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
  patientData: PatientData | null;
  medicalHistory: string;
  studyProtocol: string;
  isActive: boolean;
}

class ChatbotService {
  private session: ChatSession;

  constructor() {
    this.session = {
      messages: [],
      patientData: null,
      medicalHistory: '',
      studyProtocol: '',
      isActive: false
    };
  }

  /**
   * Inicjalizuje sesję chatbota z wynikami analizy monoagentowej
   */
  public initializeSessionFromSingleAgent(
    patientData: PatientData,
    medicalHistory: string,
    studyProtocol: string
  ): void {
    this.session.patientData = patientData;
    this.session.medicalHistory = medicalHistory;
    this.session.studyProtocol = studyProtocol;
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

Jak mogę ci pomóc?`,
        timestamp: new Date(),
        confidence: 0.8,
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
   * Zadaje pytanie chatbotowi
   */
  public async askQuestion(
    question: string,
    focusArea?: 'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general'
  ): Promise<ChatMessage> {
    if (!this.session.isActive || !this.session.patientData) {
      throw new Error('Sesja chatbota nie jest aktywna');
    }

    // Dodaj pytanie użytkownika do historii
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    this.session.messages.push(userMessage);

    try {
      // Przygotuj kontekst dla AI
      const context = this.buildContextForAI(question, focusArea);
      
      // Wywołaj AI bezpośrednio
      const response = await this.callAI(context, this.session.patientData.modelUsed || 'claude-opus');

      // Przygotuj odpowiedź bota
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: response,
        timestamp: new Date(),
        confidence: 0.8,
        referencedSections: this.extractReferencedSections(focusArea),
        suggestedFollowUp: this.generateSuggestedFollowUp(question, focusArea)
      };

      this.session.messages.push(botMessage);
      return botMessage;

    } catch (error) {
      console.error('Błąd podczas odpowiedzi chatbota:', error);
      
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        type: 'bot',
        content: 'Przepraszam, wystąpił błąd podczas przetwarzania twojego pytania. Spróbuj ponownie lub zadaj pytanie w inny sposób.',
        timestamp: new Date(),
        confidence: 0.1
      };

      this.session.messages.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Buduje kontekst dla AI na podstawie pytania i danych analizy
   */
  private buildContextForAI(question: string, focusArea?: string): string {
    const patientData = this.session.patientData!;
    
    let context = `Jesteś doświadczonym lekarzem psychiatrą i specjalistą badań klinicznych. Odpowiadasz na pytania dotyczące analizy pre-screeningowej pacjenta.

PYTANIE UŻYTKOWNIKA: ${question}

DANE PACJENTA:
- ID: ${patientData.summary?.id || 'Nieznane'}
- Wiek: ${patientData.summary?.age || 'Nieznany'} lat
- Główna diagnoza: ${patientData.summary?.mainDiagnosis || 'Nieznana'}
- Choroby towarzyszące: ${patientData.summary?.comorbidities?.join(', ') || 'Brak'}

WYNIKI ANALIZY:
- Ogólna kwalifikacja: ${patientData.reportConclusion?.overallQualification || 'Nieznana'}
- Prawdopodobieństwo kwalifikacji: ${patientData.reportConclusion?.estimatedProbability || 0}%
- Główne problemy: ${patientData.reportConclusion?.mainIssues?.join('; ') || 'Brak'}
- Krytyczne informacje do weryfikacji: ${patientData.reportConclusion?.criticalInfoNeeded?.join('; ') || 'Brak'}

ANALIZA TRD:
${patientData.trdAnalysis?.conclusion || 'Brak danych o TRD'}

KRYTERIA WŁĄCZENIA:
${patientData.inclusionCriteria?.map(c => `- ${c.id}: ${c.name} - ${c.status} (${c.details})`).join('\n') || 'Brak danych'}

KRYTERIA WYŁĄCZENIA PSYCHIATRYCZNE:
${patientData.psychiatricExclusionCriteria?.map(c => `- ${c.id}: ${c.name} - ${c.status} (${c.details})`).join('\n') || 'Brak danych'}

KRYTERIA WYŁĄCZENIA MEDYCZNE:
${patientData.medicalExclusionCriteria?.map(c => `- ${c.id}: ${c.name} - ${c.status} (${c.details})`).join('\n') || 'Brak danych'}`;

    if (focusArea) {
      context += `\n\nOBSZAR FOKUS: ${focusArea}`;
    }

    context += `\n\nODPOWIEDZ w sposób profesjonalny, konkretny i pomocny. Odwołuj się do konkretnych danych z analizy. Jeśli nie masz wystarczających informacji, powiedz o tym wprost.`;

    return context;
  }

  /**
   * Wywołuje AI bezpośrednio
   */
  private async callAI(prompt: string, model: SupportedAIModel): Promise<string> {
    const config = getAIConfig(model);
    
    if (!config.apiKey) {
      throw new Error(`Brak konfiguracji dla modelu ${model}`);
    }

    const systemPrompt = `Jesteś doświadczonym lekarzem psychiatrą i specjalistą badań klinicznych. Odpowiadasz na pytania dotyczące analizy pre-screeningowej pacjentów w sposób profesjonalny, konkretny i pomocny.

ZASADY:
- Odwołuj się do konkretnych danych z analizy
- Bądź precyzyjny w ocenach medycznych
- Wskazuj na potrzebę weryfikacji przez lekarza
- Używaj polskiej terminologii medycznej
- Jeśli nie masz wystarczających danych, powiedz o tym wprost`;

    if (model === 'claude-opus') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2000,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;

    } else if (model === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;

    } else {
      // o3 lub inne modele OpenAI-like
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }
  }

  /**
   * Wyciąga sekcje, do których odnosi się odpowiedź
   */
  private extractReferencedSections(focusArea?: string): string[] {
    const sections: string[] = [];
    
    if (focusArea === 'criteria') {
      sections.push('Kryteria włączenia', 'Kryteria wyłączenia');
    } else if (focusArea === 'pharmacotherapy') {
      sections.push('Analiza farmakoterapii', 'Ocena TRD');
    } else if (focusArea === 'episodes') {
      sections.push('Analiza epizodów');
    } else if (focusArea === 'risk') {
      sections.push('Ocena ryzyka');
    } else {
      sections.push('Analiza ogólna');
    }
    
    return sections;
  }

  /**
   * Generuje sugerowane pytania następne
   */
  private generateSuggestedFollowUp(question: string, focusArea?: string): string[] {
    const suggestions: string[] = [];
    
    if (focusArea === 'criteria') {
      suggestions.push(
        'Które kryteria wymagają dodatkowej weryfikacji?',
        'Jakie badania mogą pomóc w ocenie kryteriów?'
      );
    } else if (focusArea === 'pharmacotherapy') {
      suggestions.push(
        'Czy pacjent spełnia kryteria TRD?',
        'Jakie leki były nieskuteczne?'
      );
    } else {
      suggestions.push(
        'Jakie są główne ryzyka dla tego pacjenta?',
        'Czy możesz wyjaśnić prawdopodobieństwo kwalifikacji?',
        'Jakie dodatkowe informacje są potrzebne?'
      );
  }

    return suggestions;
  }

  public getMessages(): ChatMessage[] {
    return this.session.messages;
  }

  public isSessionActive(): boolean {
    return this.session.isActive;
  }

  public clearSession(): void {
    this.session = {
      messages: [],
      patientData: null,
      medicalHistory: '',
      studyProtocol: '',
      isActive: false
    };
  }

  public getSuggestedQuestions(): string[] {
    if (!this.session.isActive) {
      return [];
    }

    return [
      'Dlaczego ten pacjent może nie spełniać kryteriów?',
      'Jakie są główne problemy w analizie?',
      'Czy możesz wyjaśnić ocenę TRD?',
      'Jakie dodatkowe informacje są potrzebne?',
      'Jakie badania mogą pomóc w kwalifikacji?',
      'Czy pacjent ma przeciwwskazania do badania?'
      ];
    }
  }

export const chatbotService = new ChatbotService();