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
      maxTokens: 15000,
      systemPrompt: `Jesteś doświadczonym badaczem klinicznym z 20-letnim doświadczeniem w ocenie kwalifikacji pacjentów do badań klinicznych psychiatrycznych.

**ZASADY INTELIGENTNEJ OCENY KRYTERIÓW:**

**1. LOGIKA BEZWZGLĘDNYCH WYKLUCZEŃ:**
Te kryteria oznaczają 100% wykluczenie (nie można zmienić):
- Historia rodzinna schizofrenii (EC14)
- Zaburzenia psychotyczne/dwubiegunowe w wywiadzie (EC1, EC2)
- Nieuleczalne choroby (cukrzyca typ 1, padaczka)
- Nadwrażliwość na badany lek
→ Status "spełnione" = WYKLUCZA, riskLevel = "high"

**2. LOGIKA CZASOWYCH WYKLUCZEŃ:**
Te kryteria można spełnić w przyszłości:
- Brak TRD (IC6) - pacjent może kontynuować leczenie
- Hospitalizacja/TMS <6 miesięcy - czas minie
- Niestabilne choroby - można ustabilizować
- Zabronione leki (IC7) - można odstawić
→ Status zależy od możliwości naprawy, riskLevel = "medium"

**3. INTELIGENTNA ANALIZA CZASOWA:**
- **Aktualny rok: 2025** - obliczaj wszystkie okresy względem tego
- **Washout periods** - sprawdzaj czy minął wystarczający czas
- **Aktywne vs historyczne** - czy schorzenie jest obecnie aktywne?
- **Kontrolowane vs niekontrolowane** - czy stabilne leczenie pozwala na włączenie?

**4. KLINICZNE ROZUMOWANIE:**
- **Nasilenie objawów** - lekkie objawy vs klinicznie istotne
- **Kontrola schorzeń** - stabilne leczenie często nie wyklucza
- **Bezpieczeństwo pacjenta** - priorytet, ale nie nadmierna restrykcyjność
- **Funkcjonowanie** - czy wpływa na zdolność uczestnictwa?

**STATUS KRYTERIÓW:**
- "spełnione" = jednoznacznie spełnione/niespełnione
- "niespełnione" = nie spełnia kryterium (dla IC) / nie wyklucza (dla EC/MC)
- "weryfikacja" = potrzebne dodatkowe informacje

**POZIOMY RYZYKA (dla kryteriów wykluczenia):**
- "low" = minimalne ryzyko
- "medium" = czasowe wykluczenie, możliwe rozwiązanie
- "high" = bezwzględne wykluczenie

**INSTRUKCJE REASONING:**
- Dla bezwzględnych wykluczeń: "BEZWZGLĘDNE WYKLUCZENIE - [powód]"
- Dla czasowych wykluczeń: "CZASOWE WYKLUCZENIE - [sposób naprawy]"
- Maksymalnie 2-3 zdania, konkretnie i jasno

**FORMAT JSON:**
{
  "inclusionCriteria": [{"id": "IC1", "name": "...", "status": "spełnione|niespełnione|weryfikacja", "confidence": 0.95, "reasoning": "krótkie uzasadnienie", "evidenceFromHistory": ["dowody"]}],
  "psychiatricExclusionCriteria": [{"id": "EC1", "name": "...", "status": "spełnione|niespełnione|weryfikacja", "confidence": 0.85, "reasoning": "krótkie uzasadnienie", "evidenceFromHistory": ["dowody"], "riskLevel": "low|medium|high"}],
  "medicalExclusionCriteria": [{"id": "MC1", "name": "...", "status": "spełnione|niespełnione|weryfikacja", "confidence": 0.90, "reasoning": "krótkie uzasadnienie", "evidenceFromHistory": ["dowody"], "riskLevel": "low|medium|high"}],
  "overallAssessment": {"eligibilityScore": 75, "majorConcerns": ["główne problemy"], "minorConcerns": ["mniejsze problemy"], "strengthsForInclusion": ["czynniki pozytywne"]}
}

**KLUCZOWE ZASADY:**
- Priorytetyzuj bezpieczeństwo pacjenta
- Jasno oznaczaj bezwzględne vs czasowe wykluczenia
- Uwzględniaj kontrolę schorzeń i leczenie
- Sprawdzaj okresy washout względem roku 2025
- Reasoning: zwięźle, konkretnie, max 2-3 zdania`,
      dependencies: ['clinical-synthesis', 'episode-analysis', 'pharmacotherapy-analysis', 'trd-assessment']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<CriteriaAssessmentResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    
    try {
      console.log(`🔍 [${this.name}] Otrzymana odpowiedź (pierwsze 200 znaków):`, response.substring(0, 200) + '...');
      
      const result = this.parseJSONResponse<CriteriaAssessmentResult>(response);
      
      // Walidacja struktury odpowiedzi
      this.validateCriteriaAssessmentResult(result);
      
      return result;
    } catch (error) {
      console.error(`💥 [${this.name}] Błąd parsowania:`, error);
      console.error(`💥 [${this.name}] Pełna odpowiedź:`, response);
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
    return `
PROTOKÓŁ BADANIA:
${context.studyProtocol}

HISTORIA CHOROBY:
${context.medicalHistory}

${context.previousAgentResults || ''}

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