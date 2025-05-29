import { AbstractBaseAgent } from './BaseAgent';
import type { 
  AgentConfig, 
  SharedContext, 
  PharmacotherapyAnalysisResult,
  ClinicalContext,
  EpisodeTimelineEntry,
  DateInference
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
    
    const prompt = `Przeprowadź skrupulatną analizę farmakoterapii:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

${context.previousAgentResults || ''}

=== PROTOKÓŁ BADANIA ===
${context.studyProtocol}

Wykonaj szczegółową analizę farmakoterapii według instrukcji systemowych, uwzględniając najbardziej prawdopodobny scenariusz epizodu z poprzednich agentów.`;

    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    
    // KROK 1: Standardowe parsowanie JSON
    const rawResult = this.parseJSONResponse<PharmacotherapyAnalysisResult>(response);
    
    // KROK 2: Hybrydowa sanityzacja - inteligentne wypełnianie brakujących dat
    const sanitizedResult = this.sanitizePharmacotherapyData(rawResult, context);
    
    // KROK 3: Weryfikacja integralności danych
    const verifiedResult = this.verifyDataIntegrity(sanitizedResult, context);
    
    // 🔍 DODANE LOGOWANIE MAPOWAŃ
    console.log('🔍 [Pharmacotherapy Agent] Analysis results:');
    console.log('📊 Timeline items:', verifiedResult.timeline?.length || 0);
    console.log('🔄 Drug mappings created:', verifiedResult.drugMappings?.length || 0);
    
    if (verifiedResult.drugMappings && verifiedResult.drugMappings.length > 0) {
      console.log('🔍 [Pharmacotherapy Agent] Drug mappings:');
      verifiedResult.drugMappings.forEach(mapping => {
        console.log(`  - ${mapping.originalName} → ${mapping.standardName}`);
      });
    } else {
      console.log('⚠️ [Pharmacotherapy Agent] No drug mappings created!');
    }
    
    return verifiedResult;
  }

  /**
   * HYBRYDOWY SANITIZER - Rozwiązanie 1 + 4
   * Inteligentnie wypełnia brakujące daty użwając kontekstu klinicznego
   */
  private sanitizePharmacotherapyData(
    result: PharmacotherapyAnalysisResult, 
    context: SharedContext
  ): PharmacotherapyAnalysisResult {
    console.log('🧹 [Pharmacotherapy Sanitizer] Rozpoczynam sanityzację danych...');
    
    // Zbuduj kontekst kliniczny z dostępnych danych
    const clinicalContext = this.extractClinicalContext(context);
    const episodeTimeline = this.buildEpisodeTimeline(context);
    
    // 1. INTELIGENTNE WYPEŁNIANIE BRAKUJĄCYCH DAT I PÓL
    result.timeline = result.timeline.map((item, index) => {
      const sanitizedItem = { ...item };
      let hasChanges = false;
      
      // SANITYZACJA PODSTAWOWYCH PÓL WYMAGANYCH PRZEZ WALIDACJĘ
      
      // Sprawdź i napraw id
      if (!sanitizedItem.id || typeof sanitizedItem.id !== 'string') {
        sanitizedItem.id = `drug-${index + 1}-${Date.now()}`;
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wygenerowano ID dla item[${index}]: ${sanitizedItem.id}`);
      }
      
      // Sprawdź i napraw drugName
      if (!sanitizedItem.drugName || typeof sanitizedItem.drugName !== 'string') {
        sanitizedItem.drugName = `Nieznany lek ${index + 1}`;
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wygenerowano drugName dla item[${index}]: ${sanitizedItem.drugName}`);
      }
      
      // Sprawdź i napraw shortName
      if (!sanitizedItem.shortName || typeof sanitizedItem.shortName !== 'string') {
        const drugName = sanitizedItem.drugName || `UNK${index + 1}`;
        sanitizedItem.shortName = drugName.substring(0, 3).toUpperCase();
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wygenerowano shortName dla item[${index}]: ${sanitizedItem.shortName}`);
      }
      
      // Sprawdź i napraw dose
      if (!sanitizedItem.dose || typeof sanitizedItem.dose !== 'string') {
        sanitizedItem.dose = 'N/A';
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wygenerowano dose dla item[${index}]: ${sanitizedItem.dose}`);
      }
      
      // Sprawdź i napraw notes
      if (!sanitizedItem.notes || typeof sanitizedItem.notes !== 'string') {
        sanitizedItem.notes = 'Dane uzupełnione przez sanitizer';
        hasChanges = true;
      }
      
      // Sprawdź i napraw isAugmentation
      if (typeof sanitizedItem.isAugmentation !== 'boolean') {
        sanitizedItem.isAugmentation = false;
        hasChanges = true;
      }
      
      // Sprawdź i napraw baseDrug
      if (sanitizedItem.baseDrug === null) {
        sanitizedItem.baseDrug = undefined;
        hasChanges = true;
      }
      
      // Sprawdź i napraw attemptGroup
      if (typeof sanitizedItem.attemptGroup !== 'number') {
        sanitizedItem.attemptGroup = 0;
        hasChanges = true;
      }
      
      // SANITYZACJA DAT (istniejąca logika)
      
      // Sprawdź i napraw startDate
      if (!sanitizedItem.startDate) {
        const inferredStart = this.inferStartDate(item, result.timeline, context, index, episodeTimeline, clinicalContext);
        sanitizedItem.startDate = inferredStart.date;
        sanitizedItem.notes = this.appendNote(sanitizedItem.notes, inferredStart.reasoning);
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wywnioskowano startDate dla ${item.drugName}: ${inferredStart.date}`);
      }
      
      // Sprawdź i napraw endDate jeśli powinno być określone
      if (!sanitizedItem.endDate && this.shouldHaveEndDate(item, context, episodeTimeline)) {
        const inferredEnd = this.inferEndDate(item, result.timeline, context, index, episodeTimeline, clinicalContext);
        sanitizedItem.endDate = inferredEnd.date;
        sanitizedItem.notes = this.appendNote(sanitizedItem.notes, inferredEnd.reasoning);
        hasChanges = true;
        console.log(`🔧 [Sanitizer] Wywnioskowano endDate dla ${item.drugName}: ${inferredEnd.date}`);
      }
      
      if (hasChanges) {
        console.log(`✅ [Sanitizer] Sanityzowano item[${index}]: ${sanitizedItem.drugName}`);
      }
      
      return sanitizedItem;
    });
    
    // 2. WALIDACJA SPÓJNOŚCI CZASOWEJ
    result.timeline = this.validateTimelineConsistency(result.timeline, context);
    
    console.log('✅ [Pharmacotherapy Sanitizer] Sanityzacja zakończona');
    return result;
  }

  /**
   * Ekstraktuje kontekst kliniczny z dostępnych danych agentów
   */
  private extractClinicalContext(context: SharedContext): ClinicalContext {
    const episodeData = context.episodeAnalysis?.data;
    const clinicalData = context.clinicalSynthesis?.data;
    
    return {
      currentYear: 2025,
      mostLikelyEpisode: episodeData?.scenarios?.[episodeData.mostLikelyScenario - 1] || null,
      allEpisodes: episodeData?.scenarios || [],
      remissionPeriods: episodeData?.remissionPeriods || [],
      clinicalTimeline: clinicalData?.clinicalTimeline || [],
      treatmentHistory: clinicalData?.treatmentHistory || '',
      mainDiagnosis: clinicalData?.mainDiagnosis || ''
    };
  }

  /**
   * Buduje timeline epizodów z dostępnych danych
   */
  private buildEpisodeTimeline(context: SharedContext): EpisodeTimelineEntry[] {
    const episodeData = context.episodeAnalysis?.data;
    if (!episodeData?.scenarios) return [];
    
    return episodeData.scenarios.map(scenario => ({
      id: scenario.id,
      description: scenario.description,
      startDate: scenario.startDate,
      endDate: scenario.endDate,
      confidence: scenario.confidence,
      evidence: scenario.evidence
    }));
  }

  /**
   * INTELIGENTNE WNIOSKOWANIE DATY ROZPOCZĘCIA
   * Hierarchia fallback dla startDate
   */
  private inferStartDate(
    item: any,
    timeline: any[],
    context: SharedContext,
    currentIndex: number,
    episodeTimeline: EpisodeTimelineEntry[],
    clinicalContext: ClinicalContext
  ): DateInference {
    
    // STRATEGIA 1: Użyj dat epizodów z episode-analysis
    const episodeBasedDate = this.inferFromEpisodeData(item, episodeTimeline, clinicalContext);
    if (episodeBasedDate.date) {
      return {
        date: episodeBasedDate.date,
        reasoning: `Data rozpoczęcia wywnioskowana z analizy epizodów: ${episodeBasedDate.reasoning}`
      };
    }
    
    // STRATEGIA 2: Logika sekwencyjna - bazuj na poprzednim leku
    if (currentIndex > 0) {
      const sequentialDate = this.inferFromSequentialLogic(item, timeline, currentIndex);
      if (sequentialDate.date) {
        return {
          date: sequentialDate.date,
          reasoning: `Data wywnioskowana z sekwencji leczenia: ${sequentialDate.reasoning}`
        };
      }
    }
    
    // STRATEGIA 3: Analiza notatek klinicznych
    const noteBasedDate = this.extractDateFromNotes(item.notes, clinicalContext);
    if (noteBasedDate.date) {
      return {
        date: noteBasedDate.date,
        reasoning: `Data wyekstraktowana z notatek klinicznych: ${noteBasedDate.reasoning}`
      };
    }
    
    // STRATEGIA 4: Fallback na najbardziej prawdopodobny epizod
    const fallbackDate = this.getFallbackStartDate(item, clinicalContext);
    return {
      date: fallbackDate.date,
      reasoning: `Data fallback: ${fallbackDate.reasoning}`
    };
  }

  /**
   * INTELIGENTNE WNIOSKOWANIE DATY ZAKOŃCZENIA
   */
  private inferEndDate(
    item: any,
    timeline: any[],
    context: SharedContext,
    currentIndex: number,
    episodeTimeline: EpisodeTimelineEntry[],
    clinicalContext: ClinicalContext
  ): DateInference {
    
    // STRATEGIA 1: Bazuj na następnym leku w sekwencji
    const nextItemDate = this.inferFromNextItem(item, timeline, currentIndex);
    if (nextItemDate.date) {
      return nextItemDate;
    }
    
    // STRATEGIA 2: Standardowy czas leczenia (28-84 dni w zależności od typu leku)
    const standardDuration = this.getStandardTreatmentDuration(item);
    const endDate = this.addDaysToDate(item.startDate, standardDuration);
    
    return {
      date: endDate,
      reasoning: `Data zakończenia oszacowana na ${standardDuration} dni (standardowy czas leczenia)`
    };
  }

  /**
   * Sprawdza czy lek powinien mieć określoną datę końcową
   */
  private shouldHaveEndDate(
    item: any, 
    context: SharedContext, 
    episodeTimeline: EpisodeTimelineEntry[]
  ): boolean {
    // Sprawdź czy to nie jest obecne leczenie
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Jeśli startDate jest w przeszłości i nie ma endDate, prawdopodobnie powinno mieć
    if (item.startDate && item.startDate < currentDate) {
      // Sprawdź czy jest wzmianka o kontynuacji lub zakończeniu w notatkach
      const notes = (item.notes || '').toLowerCase();
      const isOngoing = notes.includes('kontynuacja') || 
                       notes.includes('obecnie') || 
                       notes.includes('nadal') ||
                       notes.includes('w toku');
      
      return !isOngoing;
    }
    
    return false;
  }

  /**
   * Waliduje spójność czasową całej osi
   */
  private validateTimelineConsistency(
    timeline: any[],
    context: SharedContext
  ): any[] {
    console.log('🔍 [Timeline Validator] Sprawdzam spójność czasową...');
    
    return timeline.map((item, index) => {
      const validatedItem = { ...item };
      
      // Sprawdź czy endDate nie jest wcześniejsze niż startDate
      if (validatedItem.startDate && validatedItem.endDate) {
        if (validatedItem.endDate < validatedItem.startDate) {
          console.warn(`⚠️ [Timeline Validator] ${item.drugName}: endDate wcześniejsze niż startDate, poprawiam...`);
          validatedItem.endDate = this.addDaysToDate(validatedItem.startDate, 28);
          validatedItem.notes = this.appendNote(validatedItem.notes, 'Data zakończenia skorygowana (była wcześniejsza niż rozpoczęcia)');
        }
      }
      
      return validatedItem;
    });
  }

  /**
   * Weryfikuje integralność danych po sanityzacji
   */
  private verifyDataIntegrity(
    result: PharmacotherapyAnalysisResult,
    context: SharedContext
  ): PharmacotherapyAnalysisResult {
    console.log('🔍 [Data Integrity] Weryfikuję integralność danych...');
    
    const verifiedResult = { ...result };
    
    // Sprawdź czy wszystkie wymagane pola są obecne
    verifiedResult.timeline = verifiedResult.timeline.filter(item => {
      const isValid = item.id && item.drugName && item.startDate;
      if (!isValid) {
        console.warn(`⚠️ [Data Integrity] Usuwam niepełny wpis: ${JSON.stringify(item)}`);
      }
      return isValid;
    });
    
    // Dodaj summary do gaps jeśli coś było naprawiane
    const sanitizedItems = verifiedResult.timeline.filter(item => 
      item.notes && (item.notes.includes('wywnioskowana') || item.notes.includes('oszacowana'))
    );
    
    if (sanitizedItems.length > 0) {
      verifiedResult.gaps.push(`Sanityzowano ${sanitizedItems.length} wpisów z brakującymi datami`);
    }
    
    console.log('✅ [Data Integrity] Weryfikacja zakończona');
    return verifiedResult;
  }

  // ===== METODY POMOCNICZE DLA SANITYZACJI =====

  /**
   * Dodaje notatkę do istniejących notatek
   */
  private appendNote(existingNotes: string | undefined, newNote: string): string {
    if (!existingNotes) return newNote;
    return `${existingNotes}; ${newNote}`;
  }

  /**
   * Wnioskuje datę rozpoczęcia na podstawie danych epizodów
   */
  private inferFromEpisodeData(
    item: any,
    episodeTimeline: EpisodeTimelineEntry[],
    clinicalContext: ClinicalContext
  ): DateInference {
    // Znajdź najbardziej prawdopodobny epizod dla tego leku
    const relevantEpisode = this.findRelevantEpisodeForDrug(item, episodeTimeline, clinicalContext);
    
    if (relevantEpisode && relevantEpisode.startDate) {
      return {
        date: relevantEpisode.startDate,
        reasoning: `pasuje do epizodu ${relevantEpisode.id} (confidence: ${relevantEpisode.confidence})`
      };
    }
    
    return { date: '', reasoning: 'brak pasujących epizodów' };
  }

  /**
   * Wnioskuje datę na podstawie sekwencji leczenia
   */
  private inferFromSequentialLogic(
    item: any,
    timeline: any[],
    currentIndex: number
  ): DateInference {
    const previousItem = timeline[currentIndex - 1];
    
    if (previousItem?.endDate) {
      // Dodaj 1-7 dni przerwy między lekami (standardowo 3 dni)
      const gapDays = 3;
      const inferredDate = this.addDaysToDate(previousItem.endDate, gapDays);
      
      return {
        date: inferredDate,
        reasoning: `${gapDays} dni po zakończeniu ${previousItem.drugName}`
      };
    }
    
    if (previousItem?.startDate) {
      // Jeśli poprzedni lek nie ma endDate, załóż że ten zaczyna się 30 dni później
      const inferredDate = this.addDaysToDate(previousItem.startDate, 30);
      
      return {
        date: inferredDate,
        reasoning: `30 dni po rozpoczęciu ${previousItem.drugName} (brak daty końca poprzedniego)`
      };
    }
    
    return { date: '', reasoning: 'brak użytecznych danych z poprzednich leków' };
  }

  /**
   * Ekstraktuje datę z notatek klinicznych
   */
  private extractDateFromNotes(
    notes: string | undefined,
    clinicalContext: ClinicalContext
  ): DateInference {
    if (!notes) return { date: '', reasoning: 'brak notatek' };
    
    // Szukaj wzorców dat w tekście (różne formaty)
    const datePatterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,  // YYYY-MM-DD
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, // DD.MM.YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // DD/MM/YYYY
      /(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+(\d{4})/gi // miesiąc YYYY
    ];
    
    for (const pattern of datePatterns) {
      const matches = notes.match(pattern);
      if (matches && matches.length > 0) {
        const dateStr = this.normalizeDate(matches[0]);
        if (dateStr) {
          return {
            date: dateStr,
            reasoning: `wyekstraktowana z notatki: "${matches[0]}"`
          };
        }
      }
    }
    
    return { date: '', reasoning: 'nie znaleziono rozpoznawalnych wzorców dat' };
  }

  /**
   * Zwraca fallback datę rozpoczęcia
   */
  private getFallbackStartDate(
    item: any,
    clinicalContext: ClinicalContext
  ): DateInference {
    // Użyj daty rozpoczęcia najbardziej prawdopodobnego epizodu
    if (clinicalContext.mostLikelyEpisode?.startDate) {
      return {
        date: clinicalContext.mostLikelyEpisode.startDate,
        reasoning: `data rozpoczęcia najbardziej prawdopodobnego epizodu`
      };
    }
    
    // Fallback na początek 2024 roku (obecny epizod)
    return {
      date: '2024-01-01',
      reasoning: 'domyślna data fallback (brak innych wskazówek)'
    };
  }

  /**
   * Wnioskuje datę końcową na podstawie następnego leku
   */
  private inferFromNextItem(
    item: any,
    timeline: any[],
    currentIndex: number
  ): DateInference {
    if (currentIndex < timeline.length - 1) {
      const nextItem = timeline[currentIndex + 1];
      if (nextItem?.startDate) {
        // Zakończ 1 dzień przed rozpoczęciem następnego leku
        const endDate = this.subtractDaysFromDate(nextItem.startDate, 1);
        return {
          date: endDate,
          reasoning: `dzień przed rozpoczęciem ${nextItem.drugName}`
        };
      }
    }
    
    return { date: '', reasoning: 'brak następnego leku w sekwencji' };
  }

  /**
   * Zwraca standardowy czas leczenia dla danego typu leku
   */
  private getStandardTreatmentDuration(item: any): number {
    const drugName = (item.drugName || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    
    // Jeśli w notatkach jest wzmianka o czasie trwania
    if (notes.includes('krótka próba') || notes.includes('krótki czas')) {
      return 14; // 2 tygodnie
    }
    
    if (notes.includes('długa próba') || notes.includes('długi czas')) {
      return 84; // 12 tygodni
    }
    
    // Na podstawie typu leku
    if (drugName.includes('benzodiazepin') || drugName.includes('alprazolam') || 
        drugName.includes('lorazepam') || drugName.includes('klonazepam')) {
      return 28; // 4 tygodnie dla benzodiazepin
    }
    
    if (drugName.includes('antydepresant') || drugName.includes('ssri') || 
        drugName.includes('snri') || drugName.includes('sertralina') ||
        drugName.includes('escitalopram') || drugName.includes('wenlafaksyna')) {
      return 56; // 8 tygodni dla antydepresantów
    }
    
    // Domyślnie 6 tygodni
    return 42;
  }

  /**
   * Dodaje dni do daty w formacie YYYY-MM-DD
   */
  private addDaysToDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Odejmuje dni od daty w formacie YYYY-MM-DD
   */
  private subtractDaysFromDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Normalizuje datę do formatu YYYY-MM-DD
   */
  private normalizeDate(dateStr: string): string {
    // Implementacja normalizacji różnych formatów dat
    const isoPattern = /(\d{4})-(\d{1,2})-(\d{1,2})/;
    const match = dateStr.match(isoPattern);
    
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Dodatkowe wzorce można dodać tutaj
    return '';
  }

  /**
   * Znajduje najbardziej pasujący epizod dla danego leku
   */
  private findRelevantEpisodeForDrug(
    item: any,
    episodeTimeline: EpisodeTimelineEntry[],
    clinicalContext: ClinicalContext
  ): EpisodeTimelineEntry | null {
    // Sprawdź attemptGroup - wyższe grupy to nowsze epizody
    if (item.attemptGroup && item.attemptGroup > 0) {
      // Znajdź epizody które pasują czasowo do grupy próby
      const relevantEpisodes = episodeTimeline.filter(episode => {
        // Logika dopasowywania epizodu do grupy próby
        return episode.confidence > 0.7;
      });
      
      if (relevantEpisodes.length > 0) {
        // Zwróć epizod z najwyższą pewnością
        return relevantEpisodes.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
      }
    }
    
    // Fallback - zwróć najbardziej prawdopodobny epizod
    return clinicalContext.mostLikelyEpisode;
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