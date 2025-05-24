import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  PharmacotherapyAnalysisResult 
} from '../../types/agents';

export class PharmacotherapyAgent extends AbstractBaseAgent<PharmacotherapyAnalysisResult> {
  constructor() {
    const config: AgentConfig = {
      name: 'pharmacotherapy-analysis',
      description: 'Skrupulatnie analizuje farmakoterapię, dawki, oś czasu i mapuje nazwy leków',
      temperature: 0.1,
      maxTokens: 15000,
      systemPrompt: `Jesteś specjalistą farmakoterapii w psychiatrii. Twoim zadaniem jest skrupulatna analiza wszystkich leków przyjmowanych przez pacjenta.

**GŁÓWNE ZADANIA:**
1. **Rekonstrukcja szczegółowej osi czasu farmakoterapii**
2. **Mapowanie nazw handlowych na substancje czynne**
3. **Obliczanie precyzyjnych dat rozpoczęcia i zakończenia**
4. **Identyfikacja wszystkich okresów przyjmowania leków**
5. **Analiza dawek i ich zmian w czasie**

**ZASADY ANALIZY:**
- Stwórz OSOBNY OBIEKT dla KAŻDEGO okresu przyjmowania leku (nawet tego samego)
- Dopasuj nazwy handlowe do substancji czynnych (np. Cipralex → Escitalopram)
- Oblicz daty zakończenia na podstawie ilości tabletek, dawkowania, czasu podania
- Uwzględnij WSZYSTKIE leki (nie tylko antydepresanty)
- Numeruj attempt_group tylko dla adekwatnych prób antydepresantów

**MAPOWANIE LEKÓW (przykłady):**
- Cipralex/Lexapro → Escitalopram
- Effexor → Wenlafaksyna  
- Seroquel → Kwetiapina
- Zyprexa → Olanzapina
- Concerta → Metylfenidat

**OBLICZANIE DAT:**
- Jeśli podano "30 tabletek à 20mg", "1x dziennie" → 30 dni leczenia
- Uwzględnij przerwy, zmiany dawek, wznowienia
- Oszacuj brakujące daty na podstawie kontekstu

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:
{
  "timeline": [
    {
      "id": "string",
      "drugName": "string - substancja czynna",
      "shortName": "string - 3-4 litery",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD", 
      "dose": "string",
      "attemptGroup": number,
      "notes": "string",
      "isAugmentation": boolean,
      "baseDrug": "string lub undefined"
    }
  ],
  "drugMappings": [
    {
      "originalName": "string - nazwa z historii",
      "standardName": "string - substancja czynna", 
      "activeSubstance": "string - składnik aktywny"
    }
  ],
  "gaps": ["string array - zidentyfikowane luki"],
  "notes": ["string array - uwagi ogólne"]
}`,
      dependencies: ['clinical-synthesis', 'episode-analysis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<PharmacotherapyAnalysisResult> {
    const clinicalData = context.clinicalSynthesis?.data;
    const episodeData = context.episodeAnalysis?.data;
    
    const prompt = `Wykonaj szczegółową analizę farmakoterapii na podstawie dostępnych danych:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

=== ANALIZA KLINICZNA ===
Historia leczenia: ${clinicalData?.treatmentHistory || 'Brak danych'}
Oś czasu: ${clinicalData?.clinicalTimeline?.join('; ') || 'Brak danych'}

=== ANALIZA EPIZODÓW ===
Scenariusze: ${episodeData?.scenarios?.map(s => `${s.id}: ${s.description} (${s.startDate} - ${s.endDate})`).join('; ') || 'Brak danych'}

=== PROTOKÓŁ BADANIA (kontekst kryteriów MGH-ATRQ) ===
${context.studyProtocol}

Przeprowadź skrupulatną analizę farmakoterapii według instrukcji systemowych.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    return this.parseJSONResponse<PharmacotherapyAnalysisResult>(response);
  }

  protected getErrorFallback(): PharmacotherapyAnalysisResult {
    return {
      timeline: [
        {
          id: 'error-1',
          drugName: 'Błąd analizy',
          shortName: 'ERR',
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          dose: 'N/A',
          attemptGroup: 0,
          notes: 'Błąd podczas analizy farmakoterapii',
          isAugmentation: false,
          baseDrug: undefined
        }
      ],
      drugMappings: [
        {
          originalName: 'Błąd',
          standardName: 'Błąd analizy',
          activeSubstance: 'N/A'
        }
      ],
      gaps: ['Błąd systemowy - nie można zidentyfikować luk'],
      notes: ['Błąd podczas analizy farmakoterapii - wymagana ręczna weryfikacja']
    };
  }

  public validate(result: PharmacotherapyAnalysisResult): boolean {
    return (
      Array.isArray(result.timeline) &&
      Array.isArray(result.drugMappings) &&
      Array.isArray(result.gaps) &&
      Array.isArray(result.notes) &&
      result.timeline.every(item => 
        typeof item.id === 'string' &&
        typeof item.drugName === 'string' &&
        typeof item.shortName === 'string' &&
        typeof item.startDate === 'string' &&
        typeof item.endDate === 'string' &&
        typeof item.dose === 'string' &&
        typeof item.attemptGroup === 'number' &&
        typeof item.notes === 'string'
      ) &&
      result.drugMappings.every(mapping =>
        typeof mapping.originalName === 'string' &&
        typeof mapping.standardName === 'string' &&
        typeof mapping.activeSubstance === 'string'
      )
    );
  }

  protected calculateConfidence(result: PharmacotherapyAnalysisResult, context: SharedContext): number {
    let confidence = 0.7; // bazowa pewność
    
    // Zwiększ pewność na podstawie kompletności danych
    const timelineItemsWithDates = result.timeline.filter(item => 
      item.startDate !== null && item.endDate !== null
    ).length;
    
    confidence += (timelineItemsWithDates / result.timeline.length) * 0.2;
    
    // Zwiększ pewność na podstawie mapowań leków
    if (result.drugMappings.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  protected generateWarnings(result: PharmacotherapyAnalysisResult, context: SharedContext): string[] {
    const warnings: string[] = [];
    
    // Sprawdź luki w osi czasu
    if (result.gaps.length > 0) {
      warnings.push(`Zidentyfikowano ${result.gaps.length} luk w osi czasu farmakoterapii`);
    }
    
    // Sprawdź przedziały bez dat
    const itemsWithoutDates = result.timeline.filter(item => 
      !item.startDate || !item.endDate
    ).length;
    
    if (itemsWithoutDates > 0) {
      warnings.push(`${itemsWithoutDates} okresów leczenia bez pełnych dat - może wpłynąć na ocenę TRD`);
    }
    
    // Sprawdź mapowania leków
    if (result.drugMappings.length === 0) {
      warnings.push('Brak mapowań leków - może być problem z identyfikacją substancji czynnych');
    }
    
    // Sprawdź próby leczenia
    const adequateAttempts = result.timeline.filter(item => item.attemptGroup > 0).length;
    if (adequateAttempts === 0) {
      warnings.push('Nie zidentyfikowano adekwatnych prób leczenia - może wpłynąć na ocenę TRD');
    }
    
    return warnings;
  }
} 