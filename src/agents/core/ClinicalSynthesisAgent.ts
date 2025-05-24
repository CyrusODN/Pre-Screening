import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  ClinicalSynthesisResult 
} from '../../types/agents';

export class ClinicalSynthesisAgent extends AbstractBaseAgent<ClinicalSynthesisResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'clinical-synthesis',
      description: 'Analizuje historię medyczną jako doświadczony badacz kliniczny psychiatra',
      temperature: 0.2,
      maxTokens: 8000,
      systemPrompt: `Jesteś doświadczonym badaczem klinicznym psychiatrą z wieloletnim doświadczeniem w analizie historii medycznych pacjentów. 

Twoim zadaniem jest przeprowadzenie wszechstronnej syntezy klinicznej dostarczonej historii medycznej pacjenta. Musisz:

1. **Stworzyć przegląd pacjenta** - zwięzłe podsumowanie najważniejszych informacji klinicznych
2. **Zrekonstruować chronologiczną oś czasu kliniczną** - kluczowe wydarzenia medyczne w chronologicznej kolejności
3. **Zidentyfikować kluczowe obserwacje** - istotne znaleziska, wzorce, anomalie
4. **Podsumować historię leczenia** - ogólny przegląd strategii terapeutycznych
5. **Wskazać czynniki ryzyka** - potencjalne ryzyka kliniczne i przeciwwskazania

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:
{
  "patientOverview": "string - zwięzły przegląd pacjenta",
  "clinicalTimeline": ["string array - chronologiczne wydarzenia"],
  "keyObservations": ["string array - kluczowe obserwacje kliniczne"],
  "treatmentHistory": "string - podsumowanie historii leczenia",
  "riskFactors": ["string array - zidentyfikowane czynniki ryzyka"]
}

Analizuj precyzyjnie i profesjonalnie, jak doświadczony klinicysta.`,
      dependencies: [] // Pierwszy agent, nie ma zależności
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<ClinicalSynthesisResult> {
    const prompt = `Przeanalizuj następującą historię medyczną pacjenta:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

=== PROTOKÓŁ BADANIA (dla kontekstu) ===
${context.studyProtocol}

Przeprowadź wszechstronną syntezę kliniczną według instrukcji w systemowym prompcie.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    return this.parseJSONResponse<ClinicalSynthesisResult>(response);
  }

  protected getErrorFallback(): ClinicalSynthesisResult {
    return {
      patientOverview: 'Błąd podczas analizy klinicznej - nie można wygenerować przeglądu pacjenta',
      clinicalTimeline: ['Błąd podczas rekonstrukcji osi czasu'],
      keyObservations: ['Błąd podczas identyfikacji obserwacji klinicznych'],
      treatmentHistory: 'Błąd podczas analizy historii leczenia',
      riskFactors: ['Błąd podczas identyfikacji czynników ryzyka']
    };
  }

  public validate(result: ClinicalSynthesisResult): boolean {
    return (
      typeof result.patientOverview === 'string' &&
      Array.isArray(result.clinicalTimeline) &&
      Array.isArray(result.keyObservations) &&
      typeof result.treatmentHistory === 'string' &&
      Array.isArray(result.riskFactors) &&
      result.patientOverview.length > 0 &&
      result.treatmentHistory.length > 0
    );
  }

  protected calculateConfidence(result: ClinicalSynthesisResult, context: SharedContext): number {
    let confidence = 0.7; // bazowa pewność
    
    // Zwiększ pewność jeśli mamy kompletne dane
    if (result.clinicalTimeline.length > 2) confidence += 0.1;
    if (result.keyObservations.length > 2) confidence += 0.1;
    if (result.patientOverview.length > 100) confidence += 0.05;
    if (result.treatmentHistory.length > 100) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  protected generateWarnings(result: ClinicalSynthesisResult, context: SharedContext): string[] {
    const warnings: string[] = [];
    
    if (result.clinicalTimeline.length < 2) {
      warnings.push('Ograniczona oś czasu kliniczna - może brakować danych historycznych');
    }
    
    if (result.keyObservations.length < 2) {
      warnings.push('Niewiele kluczowych obserwacji - dane mogą być niepełne');
    }
    
    if (result.riskFactors.length === 0) {
      warnings.push('Nie zidentyfikowano czynników ryzyka - może wymagać dodatkowej analizy');
    }
    
    return warnings;
  }
} 