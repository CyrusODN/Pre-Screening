import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  EpisodeAnalysisResult 
} from '../../types/agents';

export class EpisodeAnalysisAgent extends AbstractBaseAgent<EpisodeAnalysisResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'episode-analysis',
      description: 'Wydziela i analizuje poszczególne epizody depresyjne',
      temperature: 0.3,
      maxTokens: 10000,
      systemPrompt: `Jesteś specjalistą w analizie epizodów depresyjnych. Twoim zadaniem jest precyzyjne wydzielenie i analizowanie poszczególnych epizodów depresyjnych w historii pacjenta.

Musisz:
1. **Zidentyfikować wszystkie możliwe scenariusze epizodów depresyjnych**
2. **Dla każdego scenariusza określić przybliżone daty rozpoczęcia i zakończenia**
3. **Ocenić dowody wspierające każdy scenariusz**
4. **Wskazać najbardziej prawdopodobny scenariusz**
5. **Sformułować wniosek dotyczący struktury epizodów**

**KRYTERIA IDENTYFIKACJI EPIZODU:**
- Nasilenie objawów depresyjnych lub wprowadzenie/zmiana leczenia przeciwdepresyjnego
- Okres remisji (co najmniej 8 tygodni bez znaczących objawów)
- Znaczące wydarzenia życiowe mogące wywołać nawrót
- Dokumentowane zmiany w stanie klinicznym

**SZACOWANIE DAT:**
- Analizuj zmiany w farmakoterapii jako markery epizodów
- Uwzględnij przerwy w leczeniu i okresy stabilizacji
- Rozważ kontekst życiowy i stresor środowiskowe

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:
{
  "scenarios": [
    {
      "id": number,
      "description": "string - opis scenariusza",
      "evidence": "string - dowody wspierające",
      "startDate": "YYYY-MM-DD lub null",
      "endDate": "YYYY-MM-DD lub null", 
      "confidence": number (0-1)
    }
  ],
  "mostLikelyScenario": number (id najbardziej prawdopodobnego),
  "conclusion": "string - podsumowanie analizy epizodów"
}`,
      dependencies: ['clinical-synthesis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<EpisodeAnalysisResult> {
    const clinicalData = context.clinicalSynthesis?.data;
    
    const prompt = `Na podstawie analizy klinicznej i historii medycznej, wydziel poszczególne epizody depresyjne:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

=== ANALIZA KLINICZNA ===
Przegląd pacjenta: ${clinicalData?.patientOverview || 'Brak danych'}
Oś czasu kliniczna: ${clinicalData?.clinicalTimeline?.join('; ') || 'Brak danych'}
Historia leczenia: ${clinicalData?.treatmentHistory || 'Brak danych'}

=== PROTOKÓŁ BADANIA (kontekst) ===
${context.studyProtocol}

Wykonaj szczegółową analizę epizodów depresyjnych według instrukcji systemowych.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    return this.parseJSONResponse<EpisodeAnalysisResult>(response);
  }

  protected getErrorFallback(): EpisodeAnalysisResult {
    return {
      scenarios: [
        {
          id: 1,
          description: 'Błąd podczas analizy epizodów - nie można określić scenariuszy',
          evidence: 'Błąd systemowy',
          startDate: null,
          endDate: null,
          confidence: 0
        }
      ],
      mostLikelyScenario: 1,
      conclusion: 'Błąd podczas analizy epizodów depresyjnych - wymagana ręczna weryfikacja'
    };
  }

  public validate(result: EpisodeAnalysisResult): boolean {
    return (
      Array.isArray(result.scenarios) &&
      result.scenarios.length > 0 &&
      typeof result.mostLikelyScenario === 'number' &&
      typeof result.conclusion === 'string' &&
      result.scenarios.every(scenario => 
        typeof scenario.id === 'number' &&
        typeof scenario.description === 'string' &&
        typeof scenario.evidence === 'string' &&
        typeof scenario.confidence === 'number' &&
        scenario.confidence >= 0 && scenario.confidence <= 1
      )
    );
  }

  protected calculateConfidence(result: EpisodeAnalysisResult, context: SharedContext): number {
    let confidence = 0.6; // bazowa pewność
    
    // Zwiększ pewność na podstawie jakości scenariuszy
    const avgScenarioConfidence = result.scenarios.reduce((sum, s) => sum + s.confidence, 0) / result.scenarios.length;
    confidence += avgScenarioConfidence * 0.3;
    
    // Zwiększ pewność jeśli mamy daty
    const scenariosWithDates = result.scenarios.filter(s => s.startDate !== null).length;
    confidence += (scenariosWithDates / result.scenarios.length) * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  protected generateWarnings(result: EpisodeAnalysisResult, context: SharedContext): string[] {
    const warnings: string[] = [];
    
    const scenariosWithoutDates = result.scenarios.filter(s => s.startDate === null);
    if (scenariosWithoutDates.length > 0) {
      warnings.push(`${scenariosWithoutDates.length} scenariuszy bez szacowanych dat - może brakować informacji chronologicznych`);
    }
    
    const lowConfidenceScenarios = result.scenarios.filter(s => s.confidence < 0.5);
    if (lowConfidenceScenarios.length > 0) {
      warnings.push(`${lowConfidenceScenarios.length} scenariuszy o niskiej pewności - wymagana dodatkowa weryfikacja`);
    }
    
    if (result.scenarios.length === 1) {
      warnings.push('Zidentyfikowano tylko jeden scenariusz - może być potrzebna analiza alternatywnych interpretacji');
    }
    
    return warnings;
  }
} 