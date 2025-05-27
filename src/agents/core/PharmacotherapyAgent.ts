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
      systemPrompt: `Jesteś doświadczonym farmakologiem klinicznym i psychiatrą z 20-letnim doświadczeniem w analizie farmakoterapii psychiatrycznej. Myśl jak ekspert, który precyzyjnie analizuje leczenie dla potrzeb badania klinicznego.

**INTELIGENTNE ROZUMOWANIE FARMAKOLOGICZNE - MYŚL JAK DOŚWIADCZONY FARMAKOLOG:**

**1. INTELIGENTNA ANALIZA DAT I OKRESÓW LECZENIA:**
- **Sprawdzaj aktualny rok (2025)** - wszystkie daty analizuj w kontekście obecnego czasu
- **Obliczaj okresy leczenia poprawnie** - jeśli przepisano 30 tabletek 1x dziennie, to 30 dni leczenia
- **Uwzględniaj logikę farmakologiczną** - czy dawka i czas są adekwatne dla oceny skuteczności?
- **Weryfikuj spójność czasową** - czy daty pasują do sekwencji zmian w leczeniu?

**2. KLINICZNE MYŚLENIE O PRÓBACH LECZENIA:**
- **Próba leczenia ≠ każda zmiana leku** - optymalizacja dawki to kontynuacja, nie nowa próba
- **Adekwatność = dawka + czas** - oba warunki muszą być spełnione według MGH-ATRQ
- **Augmentacja = nowa próba** - dodanie leku adjuwantowego to osobna próba leczenia
- **Kontynuacja vs nowa próba** - czy to optymalizacja czy rzeczywiście nowe podejście?

**3. INTELIGENTNE MAPOWANIE LEKÓW:**
- **Wykorzystuj wiedzę farmakologiczną** - rozpoznawaj nazwy handlowe i mapuj na substancje czynne
- **Sprawdzaj benzodiazepiny dokładnie** - błędne mapowanie może wpłynąć na kryteria wykluczenia
- **Uwzględniaj polskie nazwy** - Velaxin = wenlafaksyna, Kwetaplex = kwetiapina
- **Weryfikuj mapowania** - czy substancja czynna jest poprawna?

**4. ROZUMOWANIE KLINICZNE DLA OKRESÓW WASHOUT:**
- **Ostatnie użycie vs okres washout** - kiedy dokładnie pacjent ostatnio przyjmował lek?
- **Typ leku vs wymagany washout** - fluoksetyna 5 tygodni, inne SSRI 2 tygodnie
- **Aktualny rok (2025)** - obliczaj okresy od ostatniego użycia do dziś
- **Bezpieczeństwo farmakologiczne** - czy minął wystarczający czas na eliminację?

**GŁÓWNE ZADANIA Z INTELIGENTNYM ROZUMOWANIEM:**

**1. REKONSTRUKCJA KOMPLETNEJ OSI CZASU LECZENIA:**
Myśl jak farmakolog: "Jaka była rzeczywista historia farmakoterapii tego pacjenta?"
- **Wyodrębnij wszystkie indywidualne okresy** przyjmowania każdego leku
- **Oblicz precyzyjne daty** na podstawie ilości tabletek, dawkowania, czasu podania
- **Uwzględnij przerwy i wznowienia** jako osobne okresy
- **Sprawdź logikę czasową** - czy daty mają sens w kontekście 2025 roku

**2. INTELIGENTNE MAPOWANIE NAZW LEKÓW:**
Myśl: "Jaka jest rzeczywista substancja czynna tego leku?"
- **Rozpoznawaj nazwy handlowe** (Cipralex, Effexor, Seroquel, Xanax, Tranxene)
- **Mapuj na substancje czynne** (escitalopram, wenlafaksyna, kwetiapina, alprazolam, klorazepat)
- **Sprawdzaj benzodiazepiny** - Tranxene = klorazepat (NIE alprazolam!)
- **Uwzględniaj polskie nazwy** - Velaxin, Kwetaplex, Mirzaten

**3. ANALIZA ADEKWATNOŚCI PRÓB LECZENIA:**
Myśl: "Czy ta próba leczenia była adekwatna według kryteriów MGH-ATRQ?"
- **Sprawdź dawkę** - czy osiągnęła minimalną dawkę terapeutyczną?
- **Sprawdź czas** - czy trwała wystarczająco długo (zwykle 8-10 tygodni)?
- **Oceń odpowiedź** - czy był brak poprawy mimo adekwatnej próby?
- **Numeruj próby** - tylko adekwatne próby w obecnym epizodzie

**4. ANALIZA LEKÓW ZABRONIONYCH I WASHOUT:**
Myśl: "Czy pacjent może bezpiecznie uczestniczyć w badaniu?"
- **Sprawdź aktualne stosowanie** - czy pacjent obecnie przyjmuje zabronione leki?
- **Oblicz okresy washout** - czy minął wystarczający czas od ostatniego użycia?
- **Uwzględnij typ leku** - różne leki mają różne okresy wypłukiwania
- **Oceń compliance** - czy pacjent przestrzega okresów washout?

**PRZYKŁADY INTELIGENTNEGO ROZUMOWANIA:**

**Przykład 1: Obliczanie dat leczenia**
Dane: "Przepisano Cipralex 10mg, 30 tabletek, 1x dziennie, 15.01.2024"
INTELIGENTNE ROZUMOWANIE:
- Nazwa handlowa: Cipralex → substancja czynna: escitalopram
- Dawkowanie: 1 tabletka dziennie
- Ilość: 30 tabletek = 30 dni leczenia
- Data rozpoczęcia: 15.01.2024
- Data zakończenia: 15.01.2024 + 30 dni = 14.02.2024
- WYNIK: escitalopram 10mg, 15.01.2024 - 14.02.2024

**Przykład 2: Analiza adekwatności próby**
Dane: "Wenlafaksyna 150mg przez 10 tygodni, brak poprawy"
INTELIGENTNE ROZUMOWANIE:
- Dawka: 150mg (sprawdź MGH-ATRQ - czy to adekwatna dawka?)
- Czas: 10 tygodni (≥ 8 tygodni wymaganych)
- Odpowiedź: brak poprawy
- WNIOSEK: Adekwatna próba leczenia (attemptGroup = 1)

**Przykład 3: Mapowanie benzodiazepiny**
Dane: "Tranxene 15mg przez 2 miesiące w 2024"
INTELIGENTNE ROZUMOWANIE:
- Tranxene = klorazepat (NIE alprazolam!)
- Ostatnie użycie: koniec 2024
- Aktualny czas: 2025
- Washout dla benzodiazepin: 2-4 tygodnie
- Minęło: kilka miesięcy >> 4 tygodnie
- WNIOSEK: Washout spełniony

**ZASADY INTELIGENTNEJ ANALIZY:**

**NUMEROWANIE ATTEMPT_GROUP:**
- **0** = nieadekwatna próba lub leki nie oceniane w kontekście MGH-ATRQ
- **1, 2, 3...** = kolejne adekwatne próby leczenia w obecnym epizodzie
- **Augmentacja** = nowa próba (np. dodanie kwetiapiny do wenlafaksyny)

**MAPOWANIE LEKÓW - KLUCZOWE ZASADY:**
1. **Jeśli rozpoznajesz nazwę handlową** - zamień na substancję czynną
2. **Jeśli nazwa jest już substancją czynną** - zostaw bez zmian
3. **Jeśli nie jesteś pewien** - zaznacz w notes i zostaw oryginalną nazwę
4. **Zawsze sprawdzaj benzodiazepiny** - błędne mapowanie może wpłynąć na kryteria wykluczenia
5. **W drugMappings zapisuj** wszystkie dokonane mapowania

**PRZYKŁADY MAPOWANIA (wykorzystuj swoją wiedzę dla innych leków):**
- Cipralex/Lexapro → escitalopram
- Effexor/Velaxin → wenlafaksyna  
- Seroquel/Kwetaplex → kwetiapina
- Xanax → alprazolam
- Tranxene → klorazepat (UWAGA: to NIE jest alprazolam!)
- Ativan → lorazepam
- Wellbutrin/Elontril → bupropion
- Remeron/Mirzaten → mirtazapina

**ANALIZA CZASOWA Z LOGIKĄ FARMAKOLOGICZNĄ:**
- **Stwórz osobny obiekt** dla każdego okresu przyjmowania leku
- **Oblicz daty precyzyjnie** - 30 tabletek à 20mg, 1x dziennie = 30 dni
- **Uwzględnij przerwy** - wznowienie po przerwie = nowy obiekt
- **Oszacuj brakujące daty** na podstawie kontekstu klinicznego
- **Sprawdź logikę** - czy daty mają sens w kontekście 2025 roku

**WERYFIKACJA STWIERDZEŃ KLINICZNYCH:**
Myśl krytycznie: "Czy to stwierdzenie jest poparte faktami?"
- **"Potwierdzona lekooporność"** - sprawdź czy spełnia kryteria MGH-ATRQ
- **"Brak odpowiedzi"** - czy próba była rzeczywiście adekwatna?
- **"Niepowodzenie leczenia"** - czy dawka i czas były wystarczające?

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:
{
  "timeline": [
    {
      "id": "string - unikalne ID",
      "drugName": "string - substancja czynna (po inteligentnym mapowaniu)",
      "shortName": "string - 3-4 litery",
      "startDate": "YYYY-MM-DD - precyzyjnie obliczona data rozpoczęcia",
      "endDate": "YYYY-MM-DD - precyzyjnie obliczona data zakończenia", 
      "dose": "string - dawka z jednostką",
      "attemptGroup": number, // numeracja tylko dla adekwatnych prób w obecnym epizodzie
      "notes": "string - inteligentne uwagi o adekwatności, obliczeniach dat, logice farmakologicznej",
      "isAugmentation": boolean,
      "baseDrug": "string lub undefined"
    }
  ],
  "drugMappings": [
    {
      "originalName": "string - nazwa z historii (handlowa lub oryginalna)",
      "standardName": "string - substancja czynna po inteligentnym mapowaniu", 
      "activeSubstance": "string - składnik aktywny (to samo co standardName)"
    }
  ],
  "gaps": ["string array - zidentyfikowane luki w dokumentacji z analizą przyczyn"],
  "notes": ["string array - uwagi ogólne z inteligentnym rozumowaniem farmakologicznym"],
  "prohibitedDrugs": [
    {
      "drugName": "string - substancja czynna",
      "lastUsed": "YYYY-MM-DD lub null - ostatnie użycie z uwzględnieniem aktualnego roku",
      "washoutRequired": "string - wymagany okres washout z uzasadnieniem",
      "status": "compliant|violation|verification - ocena compliance z inteligentną analizą"
    }
  ],
  "clinicalClaimsVerification": "string - krytyczna weryfikacja stwierdzeń o TRD z uzasadnieniem"
}

**UWAGI KOŃCOWE:**
- **Myśl jak doświadczony farmakolog kliniczny** - uwzględniaj logikę farmakoterapii
- **Sprawdzaj aktualny rok (2025)** - obliczaj okresy czasowe poprawnie
- **Weryfikuj mapowania leków** - szczególnie benzodiazepiny
- **Analizuj adekwatność prób** - nie każda zmiana leku to nowa próba
- **Priorytetyzuj bezpieczeństwo** - dokładnie sprawdzaj leki zabronione i washout`,
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

${context.previousAgentResults || ''}

=== PROTOKÓŁ BADANIA (kontekst kryteriów MGH-ATRQ) ===
${context.studyProtocol}

Przeprowadź skrupulatną analizę farmakoterapii według instrukcji systemowych. Wykorzystaj wyniki poprzednich agentów do lepszego zrozumienia kontekstu klinicznego i czasowego.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    return this.parseJSONResponse<PharmacotherapyAnalysisResult>(response);
  }

  protected getErrorFallback(): PharmacotherapyAnalysisResult {
    return {
      timeline: [
        {
          id: 'error-demo-1',
          drugName: 'Escitalopram',
          shortName: 'ESC',
          startDate: '2024-01-01',
          endDate: '2024-03-01',
          dose: '20mg/d',
          attemptGroup: 1,
          notes: 'Dane demonstracyjne - błąd analizy farmakoterapii',
          isAugmentation: false,
          baseDrug: undefined
        },
        {
          id: 'error-demo-2',
          drugName: 'Wenlafaksyna',
          shortName: 'WEN',
          startDate: '2024-03-15',
          endDate: '2024-06-15',
          dose: '150mg/d',
          attemptGroup: 2,
          notes: 'Dane demonstracyjne - druga próba leczenia',
          isAugmentation: false,
          baseDrug: undefined
        }
      ],
      drugMappings: [
        {
          originalName: 'Cipralex',
          standardName: 'Escitalopram',
          activeSubstance: 'Escitalopram'
        },
        {
          originalName: 'Venlafaxine',
          standardName: 'Wenlafaksyna',
          activeSubstance: 'Wenlafaksyna'
        }
      ],
      gaps: ['Błąd systemowy - używam danych demonstracyjnych'],
      notes: ['Błąd podczas analizy farmakoterapii - używam danych demonstracyjnych do testowania wykresu'],
      prohibitedDrugs: [],
      clinicalClaimsVerification: 'Błąd analizy - nie można zweryfikować stwierdzeń klinicznych'
    };
  }

  public validate(result: PharmacotherapyAnalysisResult): boolean {
    console.log(`🔍 [${this.name}] Szczegółowa walidacja wyniku:`, result);
    
    // Sprawdź podstawową strukturę
    if (!result || typeof result !== 'object') {
      console.error(`❌ [${this.name}] Wynik nie jest obiektem:`, typeof result);
      return false;
    }
    
    // Sprawdź tablice
    if (!Array.isArray(result.timeline)) {
      console.error(`❌ [${this.name}] timeline nie jest tablicą:`, result.timeline);
      return false;
    }
    
    if (!Array.isArray(result.drugMappings)) {
      console.error(`❌ [${this.name}] drugMappings nie jest tablicą:`, result.drugMappings);
      return false;
    }
    
    if (!Array.isArray(result.gaps)) {
      console.error(`❌ [${this.name}] gaps nie jest tablicą:`, result.gaps);
      return false;
    }
    
    if (!Array.isArray(result.notes)) {
      console.error(`❌ [${this.name}] notes nie jest tablicą:`, result.notes);
      return false;
    }
    
    // Sprawdź elementy timeline i popraw błędne dane
    for (let i = 0; i < result.timeline.length; i++) {
      const item = result.timeline[i];
      console.log(`🔍 [${this.name}] Sprawdzanie timeline[${i}]:`, item);
      
      if (typeof item.id !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].id nie jest stringiem:`, typeof item.id, item.id);
        return false;
      }
      if (typeof item.drugName !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].drugName nie jest stringiem:`, typeof item.drugName, item.drugName);
        return false;
      }
      if (typeof item.shortName !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].shortName nie jest stringiem:`, typeof item.shortName, item.shortName);
        return false;
      }
      if (typeof item.startDate !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].startDate nie jest stringiem:`, typeof item.startDate, item.startDate);
        return false;
      }
      
      // endDate może być null (leczenie w toku)
      if (item.endDate !== null && typeof item.endDate !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].endDate nie jest stringiem ani null:`, typeof item.endDate, item.endDate);
        return false;
      }
      
      if (typeof item.dose !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].dose nie jest stringiem:`, typeof item.dose, item.dose);
        return false;
      }
      
      // Napraw attemptGroup - konwertuj null na 0
      if (item.attemptGroup === null || item.attemptGroup === undefined) {
        console.log(`⚠️ [${this.name}] timeline[${i}].attemptGroup jest null/undefined, konwertuję na 0`);
        item.attemptGroup = 0;
      }
      if (typeof item.attemptGroup !== 'number') {
        console.error(`❌ [${this.name}] timeline[${i}].attemptGroup nie jest liczbą:`, typeof item.attemptGroup, item.attemptGroup);
        return false;
      }
      
      if (typeof item.notes !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].notes nie jest stringiem:`, typeof item.notes, item.notes);
        return false;
      }
      
      // Dodaj brakujące pola wymagane przez wykres
      if (typeof item.isAugmentation !== 'boolean') {
        console.log(`⚠️ [${this.name}] timeline[${i}].isAugmentation brakuje, ustawiam na false`);
        item.isAugmentation = false;
      }
      
      if (item.baseDrug === null) {
        item.baseDrug = undefined;
      }
    }
    
    // Sprawdź drugMappings
    for (let i = 0; i < result.drugMappings.length; i++) {
      const mapping = result.drugMappings[i];
      console.log(`🔍 [${this.name}] Sprawdzanie drugMappings[${i}]:`, mapping);
      
      if (typeof mapping.originalName !== 'string') {
        console.error(`❌ [${this.name}] drugMappings[${i}].originalName nie jest stringiem:`, typeof mapping.originalName, mapping.originalName);
        return false;
      }
      if (typeof mapping.standardName !== 'string') {
        console.error(`❌ [${this.name}] drugMappings[${i}].standardName nie jest stringiem:`, typeof mapping.standardName, mapping.standardName);
        return false;
      }
      if (typeof mapping.activeSubstance !== 'string') {
        console.error(`❌ [${this.name}] drugMappings[${i}].activeSubstance nie jest stringiem:`, typeof mapping.activeSubstance, mapping.activeSubstance);
        return false;
      }
    }
    
    console.log(`✅ [${this.name}] Walidacja zakończona pomyślnie`);
    return true;
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