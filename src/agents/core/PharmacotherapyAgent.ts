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
      systemPrompt: `Jesteś ekspertem farmakoterapii psychiatrycznej. Analizujesz leczenie dla badania klinicznego.

**KLUCZOWE ZASADY:**

**1. HYBRYDOWE PODEJŚCIE - STRUKTURA + KONTEKST:**
- **timeline** = tylko leki z konkretnymi datami → JSON strukturalny dla analizy
- **historicalContext** = ogólne wzmianki bez dat → tekst dla kontekstu badawczego

**2. PARSOWANIE DO TIMELINE (strukturalne dane):**
✅ WŁĄCZ: "Duloksetyna 30mg od 05.12.2022, zwiększenie do 60mg 28.12.2022"
❌ POMIŃ: "W przeszłości próbował sertralinę, nie pamięta dawki"

**3. EKSTRAKTOWANIE DAWEK - KLUCZOWE PRZYKŁADY:**
Z tekstu: "Depretal: tabl. dojelitowe, 30 mg / 1 op. po 28 szt. DS: 2x1"
→ dose: "30mg"

Z tekstu: "Dulsevia 60mg 1-0-0"
→ dose: "60mg"

Z tekstu: "zwiększenie dawki Dulsevii z 30 do 60mg/d"
→ Dwa oddzielne wpisy: dose: "30mg" i dose: "60mg"

Z tekstu: "Concerta 36mg+18mg rano"
→ dose: "54mg" (suma dawek)

**ZAWSZE ekstraktuj konkretną liczbową dawkę z jednostką mg!**

**4. CHRONOLOGICZNE SEGMENTOWANIE:**
🔑 **NIGDY nie używaj zakresów dawek!**
❌ Źle: duloksetyna 30-60mg (2022-12-05 - 2023-01-10)
✅ Dobrze: 
  - duloksetyna 30mg (2022-12-05 - 2022-12-28)  
  - duloksetyna 60mg (2022-12-28 - 2023-01-10)

**5. KONTEKST HISTORYCZNY (tekst opisowy):**
Wszystkie ogólne wzmianki bez konkretnych dat → historicalContext:
- "Stosował sertralinę, fluoksetynę - brak szczegółów"
- "Mama leczy się na nerwice, ojciec uzależniony od alkoholu"  
- "TMS 30 zabiegów, EMDR, różne psychoterapie"

**6. DRUG MAPPINGS - WAŻNE ZASADY:**
- Jeśli otrzymałeś mapowania z preprocessing → UŻYJ ICH, nie twórz nowych
- Twórz mapowania TYLKO dla leków z timeline gdzie nazwa handlowa ≠ standardowa
- Maksymalnie 5-8 mapowań (jeden lek = jedno mapowanie)
- Format: {"originalName": "Depretal", "standardName": "duloksetyna", "activeSubstance": "duloksetyna"}

**ALGORYTM PARSOWANIA:**
1. Znajdź wszystkie wzmianki o lekach z datami
2. Dla każdej zmiany dawki tego samego leku → nowy wpis timeline
3. Ekstraktuj KONKRETNĄ dawkę (liczba + mg)
4. Wszystko inne → historicalContext

**ODPOWIEDŹ JSON:**
{
  "timeline": [
    {
      "id": "1",
      "drugName": "duloksetyna",
      "shortName": "DUL",
      "startDate": "2022-12-05",
      "endDate": "2022-12-28",
      "dose": "30mg",
      "attemptGroup": 0,
      "notes": "Włączenie duloksetyny",
      "isAugmentation": false,
      "baseDrug": null
    }
  ],
  "drugMappings": [
    // TYLKO mapowania leków z timeline, TYLKO jeśli nazwa handlowa różni się od standardowej
    // Przykład: {"originalName": "Depretal", "standardName": "duloksetyna", "activeSubstance": "duloksetyna"}
    // Jeśli preprocessing już dostarczył mapowania, użyj je i NIE twórz nowych
  ],
  "gaps": [/* luki w danych */],
  "notes": [/* uwagi techniczne */],
  "prohibitedDrugs": [/* analiza washout */],
  "clinicalClaimsVerification": "weryfikacja stwierdzeń...",
  "historicalContext": {
    "previousMedications": "Pacjent w przeszłości stosował sertralinę 50mg, fluoksetynę, lek trójpiersieniowy, welbox 150mg, Mozarin, Alventa 75-112.5mg, Brintellix, Pregabalin 100mg - brak dokładnych dat i okresów stosowania",
    "familyHistory": "Mama leczy się na nerwice, przyjmowała setaloft. Ojciec uzależniony od alkoholu",
    "otherTreatments": "TMS 30 zabiegów, EMDR, różne psychoterapie: psychoanalityczna, CBT, grupowa",
    "patientBackground": "Pochodzi ze wschodniej granicy Polski, dysfunkcyjna rodzina alkoholowa"
  }
}

**UWAGA:** Zawsze wypełnij pole "dose" konkretną dawką! Jeśli nie możesz ustalić dawki, użyj "dawka nieznana", ale NIE zostawiaj pustego pola.

**INSTRUKCJE WYJŚCIOWE:**
Zwróć TYLKO czysty JSON bez żadnych dodatków, markdown czy komentarzy. Pierwszym znakiem odpowiedzi musi być "{", ostatnim "}".`,
      dependencies: ['clinical-synthesis', 'episode-analysis']
    };
    
    super(config);
  }

  protected async executeLogic(context: SharedContext): Promise<PharmacotherapyAnalysisResult> {
    const clinicalData = context.clinicalSynthesis?.data;
    const episodeData = context.episodeAnalysis?.data;
    
    // Przygotuj mapowania leków z preprocessing'u
    let drugMappingsSection = '';
    if (context.drugMappingInfo?.mappings && context.drugMappingInfo.mappings.length > 0) {
      drugMappingsSection = `\n=== MAPOWANIA LEKÓW Z PREPROCESSING ===
Używaj następujących mapowań (nie zgaduj samodzielnie):
${context.drugMappingInfo.mappings.map(m => `- ${m.original} → ${m.mapped} (confidence: ${Math.round(m.confidence * 100)}%)`).join('\n')}
`;

      console.log(`🔄 [Pharmacotherapy Agent] Otrzymano ${context.drugMappingInfo.mappings.length} mapowań z preprocessing'u:`);
      context.drugMappingInfo.mappings.forEach(mapping => {
        console.log(`  - ${mapping.original} → ${mapping.mapped} (${Math.round(mapping.confidence * 100)}%)`);
      });
    } else {
      console.log('⚠️ [Pharmacotherapy Agent] Brak mapowań z preprocessing\'u');
    }
    
    const prompt = `Przeprowadź skrupulatną analizę farmakoterapii:

=== HISTORIA MEDYCZNA ===
${context.medicalHistory}

${context.previousAgentResults || ''}
${drugMappingsSection}
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
        // Próbuj znaleźć nazwę leku w innych polach
        const itemAsAny = sanitizedItem as any;
        const possibleNames = [
          itemAsAny.medicationName,
          itemAsAny.medication,
          itemAsAny.drug,
          itemAsAny.name
        ].filter(name => name && typeof name === 'string');
        
        if (possibleNames.length > 0) {
          sanitizedItem.drugName = possibleNames[0];
          // Znajdź które pole zostało użyte
          const sourceField = ['medicationName', 'medication', 'drug', 'name']
            .find(field => itemAsAny[field] === possibleNames[0]);
          console.log(`🔧 [Sanitizer] Zmapowano ${sourceField} na drugName: ${possibleNames[0]}`);
        } else {
          sanitizedItem.drugName = `Nieznany lek ${index + 1}`;
          console.log(`🔧 [Sanitizer] Wygenerowano drugName dla item[${index}]: ${sanitizedItem.drugName}`);
        }
        hasChanges = true;
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
    
    // 3. SANITYZACJA DRUG MAPPINGS - odfiltruj niepoprawne mapowania
    if (Array.isArray(result.drugMappings)) {
      const originalLength = result.drugMappings.length;
      result.drugMappings = result.drugMappings.filter((mapping, index) => {
        if (!mapping || typeof mapping !== 'object') {
          console.log(`🧹 [Sanitizer] Usuwam niepoprawne mapowanie[${index}]: nie jest obiektem`);
          return false;
        }
        if (!mapping.originalName || typeof mapping.originalName !== 'string') {
          console.log(`🧹 [Sanitizer] Usuwam niepoprawne mapowanie[${index}]: brak originalName`);
          return false;
        }
        if (!mapping.standardName || typeof mapping.standardName !== 'string') {
          console.log(`🧹 [Sanitizer] Usuwam niepoprawne mapowanie[${index}]: brak standardName`);
          return false;
        }
        if (!mapping.activeSubstance || typeof mapping.activeSubstance !== 'string') {
          console.log(`🧹 [Sanitizer] Usuwam niepoprawne mapowanie[${index}]: brak activeSubstance`);
          return false;
        }
        return true;
      });
      
      if (result.drugMappings.length !== originalLength) {
        console.log(`🧹 [Sanitizer] Usunięto ${originalLength - result.drugMappings.length} niepoprawnych mapowań`);
      }
    } else {
      result.drugMappings = [];
      console.log(`🧹 [Sanitizer] drugMappings nie było tablicą, ustawiono pustą tablicę`);
    }
    
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
      clinicalClaimsVerification: 'Błąd analizy - nie można zweryfikować stwierdzeń klinicznych',
      historicalContext: {
        previousMedications: 'Pacjent w przeszłości stosował...',
        familyHistory: 'Mama leczy się na nerwice...',
        otherTreatments: 'TMS 30 zabiegów, EMDR...',
        patientBackground: 'Kontekst życiowy i społeczny...'
      }
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