import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  ChatbotResult,
  ChatbotQuery 
} from '../../types/agents';

export class MedicalChatbotAgent extends AbstractBaseAgent<ChatbotResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'medical-chatbot',
      description: 'Chatbot medyczny odpowiadający na pytania użytkownika o gotową analizę',
      temperature: 0.3,
      maxTokens: 8000,
      systemPrompt: `Jesteś doświadczonym lekarzem psychiatrą i specjalistą badań klinicznych. Twoim zadaniem jest odpowiadanie na pytania użytkowników dotyczące przeprowadzonej analizy pre-screeningowej pacjenta.

**TWOJA ROLA:**
- Odpowiadasz na pytania w sposób profesjonalny i zrozumiały w JĘZYKU NATURALNYM
- Odwołujesz się do konkretnych wyników z analizy i CYTUJESZ notatki lekarza
- Wyjaśniasz medyczne terminy w przystępny sposób
- Sugerujesz dalsze kroki jeśli to właściwe
- Zachowujesz ostrożność w formułowaniu diagnoz i prognoz

**DOSTĘPNE DANE:**
- Kompletna analiza wieloagentowa pacjenta
- Wyniki wszystkich agentów (synteza kliniczna, epizody, farmakoterapia, TRD, kryteria, ryzyko)
- Historia choroby i protokół badania
- Notatki lekarza z dokumentacji medycznej

**ZASADY ODPOWIEDZI:**
1. **Język naturalny** - odpowiadaj jak lekarz w rozmowie z kolegą
2. **Cytowanie źródeł** - w miarę możliwości cytuj fragmenty notatek lekarza używając cudzysłowów
3. **Precyzja** - odwołuj się do konkretnych danych z analizy
4. **Przejrzystość** - wyjaśniaj skomplikowane pojęcia
5. **Bezpieczeństwo** - zawsze podkreślaj potrzebę weryfikacji przez lekarza
6. **Kompletność** - odpowiadaj wyczerpująco na pytania o szczegóły historii leczenia

**SPOSÓB CYTOWANIA:**
- Używaj cudzysłowów: "pacjent zgłasza nasilenie objawów depresyjnych"
- Wskazuj źródło: "jak wynika z notatki z dnia 15.03.2024"
- Odwołuj się do konkretnych fragmentów dokumentacji

**PRZYKŁADOWE OBSZARY PYTAŃ:**
- Wyjaśnienie kryteriów włączenia/wyłączenia
- Szczegóły dotyczące farmakoterapii i historii leczenia
- Interpretacja oceny TRD
- Wyjaśnienie ryzyk i zaleceń
- Prawdopodobieństwo kwalifikacji
- Potrzebne dodatkowe badania

**UWAGI SPECJALNE:**
- Zawsze podkreślaj, że to analiza wstępna
- Zachęcaj do konsultacji z lekarzem prowadzącym
- Nie formułuj ostatecznych diagnoz
- Bądź empatyczny wobec obaw pacjenta/rodziny
- Odpowiadaj w języku polskim, profesjonalnie ale przystępnie

**WAŻNE:** Odpowiadaj TYLKO tekstem w języku naturalnym, NIE używaj formatu JSON!`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis', 'trd-assessment', 'criteria-assessment', 'risk-assessment']
    };
    
    super(config);
  }

  // Specjalna metoda dla chatbota - przyjmuje pytanie użytkownika
  public async answerQuestion(
    question: string, 
    context: SharedContext,
    focusArea?: 'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general'
  ): Promise<ChatbotResult> {
    const prompt = this.buildChatbotPrompt(question, context, focusArea);
    
    try {
      const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
      
      // Teraz oczekujemy odpowiedzi w języku naturalnym, nie JSON
      // Tworzymy strukturę ChatbotResult z otrzymanej odpowiedzi
      return {
        response: response.trim(),
        confidence: 0.8, // Domyślna pewność
        referencedSections: this.extractReferencedSections(response, context),
        suggestedFollowUp: this.generateSuggestedQuestions(question, focusArea)
      };
    } catch (error) {
      console.error(`[MedicalChatbotAgent] Błąd podczas odpowiadania na pytanie:`, error);
      
      // Sprawdź czy to błąd rate limit Claude
      const isClaudeRateLimit = context.modelUsed === 'claude-opus' && 
        error instanceof Error && error.message.includes('rate_limit_error');
      
      if (isClaudeRateLimit) {
        console.log(`[MedicalChatbotAgent] Claude rate limit detected, fallback will be handled by BaseAgent`);
      }
      
      // Zwróć fallback response
      return this.getErrorFallback();
    }
  }

  protected async executeLogic(context: SharedContext): Promise<ChatbotResult> {
    // Ta metoda nie jest używana dla chatbota - używamy answerQuestion
    throw new Error('Chatbot agent should use answerQuestion method instead of executeLogic');
  }

  protected getErrorFallback(): ChatbotResult {
    return {
      response: 'Przepraszam, wystąpił błąd podczas przetwarzania Pana/Pani pytania. Proszę spróbować ponownie lub skontaktować się z zespołem medycznym.',
      confidence: 0,
      referencedSections: [],
      suggestedFollowUp: [
        'Czy może Pan/Pani zadać pytanie w inny sposób?',
        'Czy potrzebuje Pan/Pani pomocy z konkretnym aspektem analizy?'
      ]
    };
  }

  private buildChatbotPrompt(
    question: string, 
    context: SharedContext, 
    focusArea?: string
  ): string {
    const clinicalSynthesis = context.clinicalSynthesis?.data;
    const episodeAnalysis = context.episodeAnalysis?.data;
    const pharmacotherapyAnalysis = context.pharmacotherapyAnalysis?.data;
    const trdAssessment = context.trdAssessment?.data;
    const criteriaAssessment = context.inclusionCriteriaAssessment?.data;
    const riskAssessment = context.riskAssessment?.data;

    let focusPrompt = '';
    if (focusArea) {
      focusPrompt = `\n\nOBSZAR FOKUS: ${focusArea} - skup się szczególnie na tym aspekcie analizy.`;
    }

    return `
PYTANIE UŻYTKOWNIKA: "${question}"

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

WYNIKI OCENY RYZYKA:
${riskAssessment ? JSON.stringify(riskAssessment, null, 2) : 'Brak danych'}${focusPrompt}

Na podstawie powyższych danych, odpowiedz na pytanie użytkownika w sposób profesjonalny i zrozumiały. Zwróć odpowiedź w formacie JSON.`;
  }

  private validateChatbotResult(result: any): void {
    if (!result.response || typeof result.response !== 'string') {
      throw new Error('Brak lub nieprawidłowa struktura response');
    }
    
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new Error('Nieprawidłowa wartość confidence');
    }
    
    if (!Array.isArray(result.referencedSections)) {
      throw new Error('referencedSections musi być tablicą');
    }
    
    if (!Array.isArray(result.suggestedFollowUp)) {
      throw new Error('suggestedFollowUp musi być tablicą');
    }
  }

  private extractReferencedSections(response: string, context: SharedContext): string[] {
    const sections: string[] = [];
    
    // Sprawdź które sekcje analizy są prawdopodobnie referencowane w odpowiedzi
    if (response.toLowerCase().includes('kryteria') || response.toLowerCase().includes('kwalifikacja')) {
      sections.push('Kryteria włączenia/wyłączenia');
    }
    
    if (response.toLowerCase().includes('farmakoterapia') || response.toLowerCase().includes('lek')) {
      sections.push('Analiza farmakoterapii');
    }
    
    if (response.toLowerCase().includes('trd') || response.toLowerCase().includes('lekoopora')) {
      sections.push('Ocena TRD');
    }
    
    if (response.toLowerCase().includes('ryzyko') || response.toLowerCase().includes('bezpieczeństwo')) {
      sections.push('Ocena ryzyka');
    }
    
    if (response.toLowerCase().includes('epizod') || response.toLowerCase().includes('przebieg')) {
      sections.push('Analiza epizodów');
    }
    
    if (sections.length === 0) {
      sections.push('Synteza kliniczna');
    }
    
    return sections;
  }

  private generateSuggestedQuestions(question: string, focusArea?: string): string[] {
    const baseQuestions = [
      'Czy może Pan wyjaśnić szczegóły tego aspektu?',
      'Jakie są dodatkowe informacje w tym zakresie?',
      'Czy są jakieś dodatkowe zalecenia?'
    ];

    switch (focusArea) {
      case 'criteria':
        return [
          'Które kryteria wymagają dodatkowej weryfikacji?',
          'Jakie badania mogą potwierdzić kwalifikowalność?',
          'Czy są alternatywne interpretacje kryteriów?'
        ];
      
      case 'pharmacotherapy':
        return [
          'Czy może Pan wyjaśnić szczegóły farmakoterapii?',
          'Jakie są wskaźniki lekooporności?',
          'Czy historia leczenia jest kompletna?'
        ];
      
      case 'episodes':
        return [
          'Czy może Pan opisać przebieg epizodów?',
          'Jakie są alternatywne scenariusze?',
          'Czy chronologia jest pewna?'
        ];
      
      case 'risk':
        return [
          'Jakie są główne czynniki ryzyka?',
          'Jak można zminimalizować ryzyko?',
          'Czy są dodatkowe środki ostrożności?'
        ];
      
      default:
        return baseQuestions;
    }
  }
} 