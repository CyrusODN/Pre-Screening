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

**WAŻNE: MAPOWANIE LEKÓW ZOSTAŁO JUŻ WYKONANE**
Historia medyczna została już wstępnie przetworzona i wszystkie nazwy handlowe leków zostały automatycznie zmapowane na substancje czynne przez system lokalnej bazy danych. **NIE WYKONUJ WŁASNEGO MAPOWANIA LEKÓW** - używaj nazw dokładnie tak, jak zostały podane w preprocessowanej historii.

**KRYTYCZNE: PRAWIDŁOWE PARSOWANIE DAWEK I INSTRUKCJI KLINICZNYCH**

**1. SEPARACJA DAWKI OD INSTRUKCJI KLINICZNYCH:**
- **Pole "dose"**: TYLKO czysta dawka numeryczna (np. "60mg", "150mg", "2x25mg")
- **Pole "notes"**: Wszystkie instrukcje kliniczne, opisy dawkowania, zmiany dawek
- **NIGDY nie mieszaj**: dawki z instrukcjami w jednym polu

**PRZYKŁADY PRAWIDŁOWEGO PARSOWANIA:**

BŁĘDNIE - dose zawiera instrukcje:
dose: "stopniowo schodzić z dawki, jeśli ostatnie zwiększenie nie przyniosło żadnego efektu. Proponuję stopniowo - o 15 mg (0,5 tabl. 30mg) co tydzień do dawki 60mg."
notes: "Brak poprawy"

POPRAWNIE - czysta dawka w dose, instrukcje w notes:
dose: "60mg"
notes: "stopniowo schodzić z dawki, jeśli ostatnie zwiększenie nie przyniosło żadnego efektu. Proponuję stopniowo - o 15 mg (0,5 tabl. 30mg) co tydzień do dawki 60mg. Brak poprawy"

BŁĘDNIE - dawkowanie w dose:
dose: "18 mg 1-0-0, w razie nieodczuwania efektu po kilku dniach zwiększenie dawki do 2-0-0"
notes: "Włączenie metylofenidatu"

POPRAWNIE - końcowa dawka w dose, schemat w notes:
dose: "36mg"
notes: "Włączenie metylofenidatu. 18 mg 1-0-0, w razie nieodczuwania efektu po kilku dniach zwiększenie dawki do 2-0-0"

**2. ZASADY EKSTRAKTOWANIA DAWEK:**
- **Dawka docelowa**: Jeśli tekst wspomina "do dawki 60mg" → dose: "60mg"
- **Obliczenia**: "2x25mg" → dose: "50mg"
- **Harmonogram**: "1-0-1" z tabletkach 20mg → dose: "40mg"
- **Instrukcje**: Cała reszta idzie do "notes"

**3. INTELIGENTNE ROZUMOWANIE FARMAKOLOGICZNE - MYŚL JAK DOŚWIADCZONY FARMAKOLOG:**

**INTELIGENTNA ANALIZA DAT I OKRESÓW LECZENIA:**
- **Sprawdzaj aktualny rok (2025)** - wszystkie daty analizuj w kontekście obecnego czasu
- **Obliczaj okresy leczenia poprawnie** - jeśli przepisano 30 tabletek 1x dziennie, to 30 dni leczenia
- **Uwzględniaj logikę farmakologiczną** - czy dawka i czas są adekwatne dla oceny skuteczności?
- **Weryfikuj spójność czasową** - czy daty pasują do sekwencji zmian w leczeniu?

**KLINICZNE MYŚLENIE O PRÓBACH LECZENIA:**
- **Próba leczenia ≠ każda zmiana leku** - optymalizacja dawki to kontynuacja, nie nowa próba
- **Adekwatność = dawka + czas** - oba warunki muszą być spełnione według MGH-ATRQ
- **Augmentacja = nowa próba** - dodanie leku adjuwantowego to osobna próba leczenia
- **Kontynuacja vs nowa próba** - czy to optymalizacja czy rzeczywiście nowe podejście?

**UŻYWAJ JUŻ ZMAPOWANYCH NAZW LEKÓW:**
- **Nie mapuj nazw leków samodzielnie** - system już wykonał profesjonalne mapowanie
- **Używaj dokładnie tych nazw**, które występują w preprocessowanej historii medycznej
- **Jeśli nazwa została zmieniona**, oznacza to że została zmapowana (np. "Vortioxetini hydrobromidum (Brintellix)")
- **Drugmappings pozostaw PUSTE** - mapowanie zostało już wykonane na etapie preprocessingu

**ROZUMOWANIE KLINICZNE DLA OKRESÓW WASHOUT:**
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

**2. UŻYWAJ TYLKO PREPROCESSOWANYCH NAZW LEKÓW:**
- **Nie zmieniaj nazw leków** - zostały już profesjonalnie zmapowane przez system
- **Nie twórz drugMappings** - mapowanie zostało wykonane wcześniej
- **Używaj nazw dokładnie jak w tekście** - system już wykonał konwersję nazw handlowych
- **Jeśli widzisz format "substancja (nazwa handlowa)"** - używaj części przed nawiasem

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

**Przykład 1: Prawidłowe parsowanie dawek**
Tekst: "Duloksetyna: stopniowo zwiększać do dawki 90mg przez 4 tygodnie"
POPRAWNE UŻYCIE:
- dose: "90mg"
- notes: "stopniowo zwiększać do dawki 90mg przez 4 tygodnie"

**Przykład 2: Używanie preprocessowanych nazw**
Preprocessowana historia: "Pacjent otrzymał Vortioxetini hydrobromidum (Brintellix) 10mg"
POPRAWNE UŻYCIE:
- drugName: "Vortioxetini hydrobromidum" (używaj substancji czynnej, nie nazwy handlowej)
- dose: "10mg"
- NIE TWÓRZ drugMappings - mapowanie już zostało wykonane

**Przykład 3: Analiza adekwatności próby**
Dane: "Vortioxetini hydrobromidum 10mg przez 12 tygodni, brak poprawy"
INTELIGENTNE ROZUMOWANIE:
- Dawka: 10mg (sprawdź MGH-ATRQ - czy to adekwatna dawka?)
- Czas: 12 tygodni (≥ 8 tygodni wymaganych)
- Odpowiedź: brak poprawy
- WNIOSEK: Adekwatna próba leczenia (attemptGroup = 1)

**ZASADY INTELIGENTNEJ ANALIZY:**

**NUMEROWANIE ATTEMPT_GROUP:**
- **0** = nieadekwatna próba lub leki nie oceniane w kontekście MGH-ATRQ
- **1, 2, 3...** = kolejne adekwatne próby leczenia w obecnym epizodzie
- **Augmentacja** = nowa próba (np. dodanie kwetiapiny do wenlafaksyny)

**UŻYWANIE PREPROCESSOWANYCH NAZW LEKÓW - KLUCZOWE ZASADY:**
1. **Nie mapuj nazw leków** - to zostało już zrobione przez system
2. **Używaj nazw dokładnie jak w preprocessowanej historii**
3. **Nie twórz drugMappings** - zostaw tę tablicę PUSTĄ []
4. **Jeśli widzisz format "substancja (handlowa)"** - używaj substancji czynnej
5. **Skup się na analizie czasowej i klinicznej**, nie na mapowaniu nazw

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

**WAŻNE INSTRUKCJE FORMATOWANIA JSON:**
1. **NIE UŻYWAJ** znaków przerwania linii (\n) wewnątrz stringów
2. **NIE UŻYWAJ** znaków tabulacji (\t) w stringach  
3. **UŻYWAJ** tylko standardowych znaków ASCII i polskich liter
4. **OGRANICZ** długość każdego stringa do maksymalnie 150 znaków
5. **UŻYJ** trzech kropek (...) jeśli tekst jest za długi
6. **ESCAPE'UJ** cudzysłowy wewnątrz stringów za pomocą \"
7. **KAŻDY STRING** musi kończyć się przed końcem linii JSON

{
  "timeline": [
    {
      "drugName": "string - nazwa leku (max 50 znaków)",
      "dose": "string - dawka (max 30 znaków)", 
      "startDate": "YYYY-MM-DD lub null",
      "endDate": "YYYY-MM-DD lub null",
      "notes": "string - uwagi (max 150 znaków)",
      "attemptGroup": 0
    }
  ],
  "drugMappings": [],
  "gaps": ["string - luki w danych (max 100 znaków)"],
  "notes": ["string - uwagi (max 120 znaków)"],
  "prohibitedDrugs": ["string - zabronione leki (max 80 znaków)"],
  "clinicalClaimsVerification": "string - weryfikacja stwierdzeń (max 200 znaków)"
}

**UWAGI KOŃCOWE:**
- **Myśl jak doświadczony farmakolog kliniczny** - uwzględniaj logikę farmakoterapii
- **Sprawdzaj aktualny rok (2025)** - obliczaj okresy czasowe poprawnie
- **NIE MAPUJ LEKÓW** - używaj tylko preprocessowanych nazw z systemu
- **SEPARUJ DAWKI OD INSTRUKCJI** - to kluczowe dla poprawnej analizy
- **Analizuj adekwatność prób** - nie każda zmiana leku to nowa próba
- **Priorytetyzuj bezpieczeństwo** - dokładnie sprawdzaj leki zabronione i washout`,
      dependencies: ['clinical-synthesis', 'episode-analysis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<PharmacotherapyAnalysisResult> {
    const clinicalData = context.clinicalSynthesis?.data;
    const episodeData = context.episodeAnalysis?.data;
    
    const prompt = `Przeprowadź skrupulatną analizę farmakoterapii:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

${context.previousAgentResults || ''}

=== PROTOKÓŁ BADANIA ===
${context.studyProtocol}

Wykonaj szczegółową analizę farmakoterapii według instrukcji systemowych, uwzględniając najbardziej prawdopodobny scenariusz epizodu z poprzednich agentów.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    const result = this.parseJSONResponse<PharmacotherapyAnalysisResult>(response);
    
    // 🔍 DODANE LOGOWANIE MAPOWAŃ
    console.log('🔍 [Pharmacotherapy Agent] Analysis results:');
    console.log('📊 Timeline items:', result.timeline?.length || 0);
    console.log('🔄 Drug mappings created:', result.drugMappings?.length || 0);
    
    if (result.drugMappings && result.drugMappings.length > 0) {
      console.log('🔍 [Pharmacotherapy Agent] Drug mappings:');
      result.drugMappings.forEach(mapping => {
        console.log(`  - ${mapping.originalName} → ${mapping.standardName}`);
      });
    } else {
      console.log('⚠️ [Pharmacotherapy Agent] No drug mappings created!');
    }
    
    return result;
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
    
    // NAPRAWIONO: Automatyczna konwersja notes z string na tablicę
    if (typeof result.notes === 'string') {
      console.log(`⚠️ [${this.name}] notes jest stringiem, konwertuję na tablicę`);
      result.notes = [result.notes];
    }
    
    if (!Array.isArray(result.notes)) {
      console.error(`❌ [${this.name}] notes nie jest tablicą:`, result.notes);
      return false;
    }
    
    if (!Array.isArray(result.prohibitedDrugs)) {
      console.error(`❌ [${this.name}] prohibitedDrugs nie jest tablicą:`, result.prohibitedDrugs);
      return false;
    }
    
    // NAPRAWIONO: Automatyczna konwersja clinicalClaimsVerification z obiektu na string
    if (typeof result.clinicalClaimsVerification === 'object' && result.clinicalClaimsVerification !== null) {
      console.log(`⚠️ [${this.name}] clinicalClaimsVerification jest obiektem, konwertuję na string`);
      result.clinicalClaimsVerification = JSON.stringify(result.clinicalClaimsVerification, null, 2);
    }
    
    if (typeof result.clinicalClaimsVerification !== 'string') {
      console.error(`❌ [${this.name}] clinicalClaimsVerification nie jest stringiem:`, typeof result.clinicalClaimsVerification, result.clinicalClaimsVerification);
      return false;
    }
    
    // Sprawdź elementy timeline i popraw błędne dane
    for (let i = 0; i < result.timeline.length; i++) {
      const item = result.timeline[i];
      console.log(`🔍 [${this.name}] Sprawdzanie timeline[${i}]:`, item);
      
      // NAPRAWIONO: Automatyczne generowanie ID jeśli brakuje
      if (!item.id || typeof item.id !== 'string') {
        console.log(`⚠️ [${this.name}] timeline[${i}].id brakuje lub nie jest stringiem, generuję nowe ID`);
        item.id = `timeline-${i}-${item.drugName?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`;
      }
      
      if (typeof item.drugName !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].drugName nie jest stringiem:`, typeof item.drugName, item.drugName);
        return false;
      }
      
      // NAPRAWIONO: Automatyczne generowanie shortName jeśli brakuje
      if (!item.shortName || typeof item.shortName !== 'string') {
        console.log(`⚠️ [${this.name}] timeline[${i}].shortName brakuje lub nie jest stringiem, generuję na podstawie drugName`);
        item.shortName = item.drugName.substring(0, 4).toUpperCase();
      }
      
      // shortName jest teraz gwarantowane jako string po automatycznym generowaniu powyżej
      
      // startDate może być null (brak danych o dacie rozpoczęcia)
      if (item.startDate !== null && typeof item.startDate !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].startDate nie jest stringiem ani null:`, typeof item.startDate, item.startDate);
        return false;
      }
      
      // endDate może być null (leczenie w toku)
      if (item.endDate !== null && typeof item.endDate !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].endDate nie jest stringiem ani null:`, typeof item.endDate, item.endDate);
        return false;
      }
      
      // dose może być null (brak informacji o dawce)
      if (item.dose !== null && typeof item.dose !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].dose nie jest stringiem ani null:`, typeof item.dose, item.dose);
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
      
      // notes jest opcjonalne - może być undefined, string lub null
      if (item.notes !== undefined && item.notes !== null && typeof item.notes !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].notes nie jest stringiem, null ani undefined:`, typeof item.notes, item.notes);
        return false;
      }
      
      // Dodaj brakujące pola wymagane przez wykres
      if (typeof item.isAugmentation !== 'boolean') {
        console.log(`⚠️ [${this.name}] timeline[${i}].isAugmentation brakuje, ustawiam na false`);
        item.isAugmentation = false;
      }
      
      // baseDrug jest opcjonalne - może być undefined lub string
      if (item.baseDrug === null) {
        item.baseDrug = undefined;
      }
      if (item.baseDrug !== undefined && typeof item.baseDrug !== 'string') {
        console.error(`❌ [${this.name}] timeline[${i}].baseDrug nie jest stringiem ani undefined:`, typeof item.baseDrug, item.baseDrug);
        return false;
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
    
    // Sprawdź prohibitedDrugs
    for (let i = 0; i < result.prohibitedDrugs.length; i++) {
      const drug = result.prohibitedDrugs[i];
      console.log(`🔍 [${this.name}] Sprawdzanie prohibitedDrugs[${i}]:`, drug);
      
      if (typeof drug.drugName !== 'string') {
        console.error(`❌ [${this.name}] prohibitedDrugs[${i}].drugName nie jest stringiem:`, typeof drug.drugName, drug.drugName);
        return false;
      }
      
      // NAPRAWIONO: AI zwraca lastUse ale walidacja sprawdzała lastUsed
      // Normalizuj nazwy pól
      if ((drug as any).lastUse !== undefined && drug.lastUsed === undefined) {
        drug.lastUsed = (drug as any).lastUse;
        delete (drug as any).lastUse;
      }
      
      // NAPRAWIONO: AI może zwracać washoutPeriod ale oczekujemy washoutRequired
      if ((drug as any).washoutPeriod !== undefined && !(drug as any).washoutRequired) {
        (drug as any).washoutRequired = (drug as any).washoutPeriod || 'nieznany okres washout';
        delete (drug as any).washoutPeriod;
      }
      
      // NAPRAWIONO: AI może zwracać reason ale oczekujemy status
      if ((drug as any).reason !== undefined && !(drug as any).status) {
        (drug as any).status = 'verification'; // domyślny status jeśli nie podano
      }
      
      // NAPRAWIONO: Jeśli brakuje status field, ustaw domyślny
      if (!(drug as any).status) {
        console.log(`⚠️ [${this.name}] prohibitedDrugs[${i}].status brakuje, ustawiam domyślny 'verification'`);
        (drug as any).status = 'verification';
      }
      
      // lastUsed może być null
      if (drug.lastUsed !== null && typeof drug.lastUsed !== 'string') {
        console.error(`❌ [${this.name}] prohibitedDrugs[${i}].lastUsed nie jest stringiem ani null:`, typeof drug.lastUsed, drug.lastUsed);
        return false;
      }
      
      if (typeof (drug as any).washoutRequired !== 'string') {
        console.error(`❌ [${this.name}] prohibitedDrugs[${i}].washoutRequired nie jest stringiem:`, typeof (drug as any).washoutRequired, (drug as any).washoutRequired);
        return false;
      }
      
      if (!['compliant', 'violation', 'verification'].includes((drug as any).status)) {
        console.error(`❌ [${this.name}] prohibitedDrugs[${i}].status ma nieprawidłową wartość:`, (drug as any).status);
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