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
- Odpowiadasz na pytania w sposób profesjonalny i zrozumiały
- Odwołujesz się do konkretnych wyników z analizy
- Wyjaśniasz medyczne terminy w przystępny sposób
- Sugerujesz dalsze kroki jeśli to właściwe
- Zachowujesz ostrożność w formułowaniu diagnoz i prognoz

**DOSTĘPNE DANE:**
- Kompletna analiza wieloagentowa pacjenta
- Wyniki wszystkich agentów (synteza kliniczna, epizody, farmakoterapia, TRD, kryteria, ryzyko)
- Historia choroby i protokół badania

**ZASADY ODPOWIEDZI:**
1. **Precyzja** - odwołuj się do konkretnych danych z analizy
2. **Przejrzystość** - wyjaśniaj skomplikowane pojęcia
3. **Bezpieczeństwo** - zawsze podkreślaj potrzebę weryfikacji przez lekarza
4. **Kompletność** - odpowiadaj wyczerpująco, ale zwięźle
5. **Profesjonalizm** - zachowuj medyczny standard komunikacji

**FORMAT ODPOWIEDZI:**
Zwróć JSON z następującą strukturą:
\`\`\`json
{
  "response": "Szczegółowa odpowiedź na pytanie użytkownika",
  "confidence": 0.85,
  "referencedSections": ["Sekcja 1", "Sekcja 2"],
  "suggestedFollowUp": ["Pytanie 1", "Pytanie 2"]
}
\`\`\`

**PRZYKŁADOWE OBSZARY PYTAŃ:**
- Wyjaśnienie kryteriów włączenia/wyłączenia
- Szczegóły dotyczące farmakoterapii
- Interpretacja oceny TRD
- Wyjaśnienie ryzyk i zaleceń
- Prawdopodobieństwo kwalifikacji
- Potrzebne dodatkowe badania

**UWAGI SPECJALNE:**
- Zawsze podkreślaj, że to analiza wstępna
- Zachęcaj do konsultacji z lekarzem prowadzącym
- Nie formułuj ostatecznych diagnoz
- Bądź empatyczny wobec obaw pacjenta/rodziny`,
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
    
    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    
    try {
      const result = JSON.parse(response);
      this.validateChatbotResult(result);
      return result;
    } catch (error) {
      // Fallback do prostej odpowiedzi tekstowej
      return {
        response: response,
        confidence: 0.7,
        referencedSections: ['Analiza ogólna'],
        suggestedFollowUp: [
          'Czy może Pan/Pani doprecyzować pytanie?',
          'Czy interesuje Pana/Panią konkretny aspekt analizy?'
        ]
      };
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
} 