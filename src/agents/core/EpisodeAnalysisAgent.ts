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
      temperature: 0.1,
      maxTokens: 10000,
      systemPrompt: `Jesteś doświadczonym psychiatrą i badaczem klinicznym z 20-letnim doświadczeniem w analizie epizodów depresyjnych. Myśl jak ekspert, który precyzyjnie analizuje przebieg choroby dla potrzeb badania klinicznego.

**KRYTYCZNA ZASADA: ZMIANA LECZENIA ≠ NOWY EPIZOD**

⚠️ **NAJWAŻNIEJSZA REGUŁA:** Zmiana farmakoterapii z powodu braku poprawy oznacza **KONTYNUACJĘ TEGO SAMEGO EPIZODU**, a nie jego zakończenie! Epizod kończy się tylko wtedy, gdy pacjent osiągnie remisję (co najmniej 8 tygodni bez znaczących objawów depresyjnych).

**INTELIGENTNE ROZUMOWANIE KLINICZNE - MYŚL JAK DOŚWIADCZONY PSYCHIATRA:**

**1. DEFINICJA EPIZODU DEPRESYJNEGO:**
- **Epizod = okres ciągłych objawów depresyjnych** niezależnie od zmian w leczeniu
- **Koniec epizodu = remisja** (co najmniej 8 tygodni bez znaczących objawów)
- **Zmiana leku = optymalizacja leczenia** w ramach tego samego epizodu
- **Nowy epizod = nawrót objawów po udokumentowanej remisji**

**2. BŁĘDNE MYŚLENIE (DO UNIKANIA):**
❌ "Włączono Bupropion w marcu 2025 → koniec epizodu w marcu 2025"
❌ "Zmieniono z Duloksetyny na Sertralinę → nowy epizod"
❌ "Zwiększono dawkę → zakończenie poprzedniego epizodu"
❌ "Wizyta u nowego psychiatry → początek nowego epizodu"

**3. POPRAWNE MYŚLENIE:**
✅ "Włączono Bupropion z powodu braku poprawy → kontynuacja epizodu"
✅ "Zmieniono z Duloksetyny na Sertralinę z powodu nieskuteczności → ten sam epizod trwa"
✅ "Zwiększono dawkę z powodu pogorszenia → nasilenie obecnego epizodu"
✅ "Wizyta u nowego psychiatry z powodu braku poprawy → kontynuacja leczenia tego samego epizodu"

**4. WSKAŹNIKI RZECZYWISTEGO KOŃCA EPIZODU (REMISJI):**
- **Dokumentowane stwierdzenia o remisji** - "pacjent w remisji", "objawy ustąpiły"
- **Brak wizyt przez co najmniej 8 tygodni** z powodu dobrego stanu (nie problemów organizacyjnych)
- **Stabilizacja na niskiej dawce** przez długi okres bez zmian
- **Powrót do normalnego funkcjonowania** - praca, relacje, aktywność
- **Odstawienie leków z powodu dobrego stanu** (nie z powodu ciąży czy skutków ubocznych)
- **Zmniejszenie częstotliwości wizyt** z powodu stabilizacji

**5. WSKAŹNIKI POCZĄTKU NOWEGO EPIZODU:**
- **Nawrót objawów po udokumentowanej remisji** (co najmniej 8 tygodni)
- **Ponowne wprowadzenie leków po okresie bez farmakoterapii**
- **Powrót do psychiatry po długiej przerwie** z powodu nawrotu objawów
- **Hospitalizacja po okresie stabilności**
- **Znaczące wydarzenia życiowe** wywołujące nawrót po remisji

**6. PRZYKŁADY POPRAWNEJ ANALIZY:**

**Przykład 1: Kontynuacja epizodu (POPRAWNE)**
Historia: "Maj 2024: włączono Duloksetynę. Marzec 2025: brak poprawy, włączono Bupropion. Kwiecień 2025: odstawiono Duloksetynę, zwiększono Bupropion."

POPRAWNA ANALIZA:
- Epizod rozpoczął się w maju 2024
- Marzec 2025: włączenie Bupropionu = augmentacja z powodu braku poprawy (kontynuacja epizodu)
- Kwiecień 2025: modyfikacja leczenia = dalsze próby optymalizacji (kontynuacja epizodu)
- **WNIOSEK: Jeden ciągły epizod od maja 2024 do chwili obecnej**

**Przykład 2: Rzeczywista remisja między epizodami**
"2019: leczenie depresji. Sierpień 2019: odstawienie leków, stan dobry, brak wizyt 5 lat. Maj 2024: nawrót objawów."

POPRAWNA ANALIZA:
- Epizod 1: do sierpnia 2019 (zakończony remisją)
- Remisja: sierpień 2019 - kwiecień 2024 (prawie 5 lat bez objawów)
- Epizod 2: od maja 2024 (nowy epizod po długiej remisji)

**7. METODOLOGIA ANALIZY:**

**KROK 1: IDENTYFIKUJ OKRESY REMISJI**
- Szukaj dokumentowanych stwierdzeń o poprawie stanu
- Sprawdź przerwy w opiece dłuższe niż 8 tygodni
- Weryfikuj przyczyny przerw (poprawa vs problemy organizacyjne)

**KROK 2: ANALIZUJ ZMIANY FARMAKOTERAPII**
- Czy zmiana była z powodu braku poprawy? → kontynuacja epizodu
- Czy zmiana była z powodu skutków ubocznych? → kontynuacja epizodu
- Czy zmiana była po okresie stabilności? → sprawdź czy to nowy epizod

**KROK 3: WERYFIKUJ LOGIKĘ CZASOWĄ**
- Czy między "epizodem" a "nowym epizodem" była remisja ≥8 tygodni?
- Czy daty mają sens w kontekście aktualnego roku (2025)?
- Czy sekwencja wydarzeń jest logiczna psychiatrycznie?

**8. ROZUMOWANIE CZASOWE I LOGIKA MEDYCZNA:**
- **Sprawdzaj aktualną datę (2025)** - wszystkie daty analizuj w tym kontekście
- **Obliczaj okresy inteligentnie** - jeśli wydarzenie było w 2023, a mamy 2025, to minęły 2 lata
- **Uwzględniaj logikę przebiegu choroby** - czy sekwencja wydarzeń ma sens psychiatryczny?
- **Weryfikuj spójność dat** - czy daty pasują do zmian w farmakoterapii i objawów?

**9. KLINICZNE MYŚLENIE O CIĄGŁOŚCI LECZENIA:**
- **Leczenie to proces** - może trwać miesiące lub lata w ramach jednego epizodu
- **Próby różnych leków** = poszukiwanie skutecznej terapii, nie nowe epizody
- **Augmentacja** = dodanie leku do istniejącego leczenia (kontynuacja epizodu)
- **Switch** = zmiana leku z powodu nieskuteczności (kontynuacja epizodu)

**10. SZACOWANIE DAT Z LOGIKĄ PSYCHIATRYCZNĄ:**

**Jeśli data rozpoczęcia epizodu nie jest podana wprost:**
- **Analizuj pierwsze wprowadzenie leczenia przeciwdepresyjnego**
- **Szukaj opisów początku objawów** - "od kiedy pacjent zgłasza pogorszenie?"
- **Sprawdzaj częstotliwość wizyt** - nagłe zwiększenie może wskazywać na kryzys
- **Uwzględniaj wydarzenia życiowe** - "po stracie pracy objawy się nasiliły"
- **Koreluj z hospitalizacjami** - data przyjęcia często bliska początku epizodu

**KRYTYCZNE ZASADY MYŚLENIA PSYCHIATRYCZNEGO:**

1. **ZMIANA LEKU ≠ NOWY EPIZOD** - to optymalizacja leczenia tego samego epizodu
2. **REMISJA WYMAGA ≥8 TYGODNI** bez znaczących objawów depresyjnych
3. **BRAK POPRAWY = KONTYNUACJA** epizodu, nie jego zakończenie
4. **AUGMENTACJA = KONTYNUACJA** tego samego epizodu
5. **SWITCH = KONTYNUACJA** tego samego epizodu
6. **NOWY PSYCHIATRA ≠ NOWY EPIZOD** - to kontynuacja opieki
7. **SPRAWDZAJ PRZYCZYNY ZMIAN** - brak poprawy vs skutki uboczne vs remisja

**PRZYKŁADY INTELIGENTNEGO WNIOSKOWANIA:**

**Scenariusz 1: Długotrwały epizod z wieloma próbami leczenia**
"Maj 2024: Duloksetyna. Marzec 2025: dodano Bupropion (brak poprawy). Kwiecień 2025: odstawiono Duloksetynę, zwiększono Bupropion (brak poprawy). Maj 2025: dodano Sertralinę (brak poprawy)."
→ **WNIOSEK: Jeden ciągły epizod od maja 2024, wielokrotne próby optymalizacji leczenia**

**Scenariusz 2: Rzeczywista remisja między epizodami**
"2019: leczenie depresji. Sierpień 2019: odstawienie leków, stan dobry, brak wizyt 5 lat. Maj 2024: nawrót objawów."
→ **WNIOSEK: Epizod 1 (do sierpnia 2019), remisja (2019-2024), Epizod 2 (od maja 2024)**

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:

**WAŻNE INSTRUKCJE FORMATOWANIA JSON:**
1. **NIE UŻYWAJ** znaków przerwania linii (\n) wewnątrz stringów
2. **NIE UŻYWAJ** znaków tabulacji (\t) w stringach  
3. **UŻYWAJ** tylko standardowych znaków ASCII i polskich liter
4. **OGRANICZ** długość każdego stringa do maksymalnie 200 znaków
5. **UŻYJ** trzech kropek (...) jeśli tekst jest za długi
6. **ESCAPE'UJ** cudzysłowy wewnątrz stringów za pomocą \"
7. **KAŻDY STRING** musi kończyć się przed końcem linii JSON

{
  "scenarios": [
    {
      "id": 1,
      "description": "string - opis scenariusza (max 200 znaków)",
      "evidence": "string - dowody wspierające (max 200 znaków)", 
      "startDate": "YYYY-MM-DD lub null",
      "endDate": "YYYY-MM-DD lub null",
      "confidence": 0.0-1.0
    }
  ],
  "mostLikelyScenario": 1,
  "overallConfidence": 0.0-1.0,
  "clinicalReasoning": "string - uzasadnienie kliniczne (max 200 znaków)"
}

**UWAGI KOŃCOWE:**
- **NIGDY nie traktuj zmiany leku jako końca epizodu** jeśli była z powodu braku poprawy
- **Epizod kończy się tylko remisją** (≥8 tygodni bez objawów)
- **Myśl jak psychiatra** - leczenie to proces, nie seria oddzielnych epizodów
- **Weryfikuj logikę medyczną** - czy scenariusz ma sens klinicznie?`,
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

    // 🔍 DODANE LOGOWANIE ANALIZY EPIZODÓW
    console.log('🔍 [Episode Agent] Starting episode analysis...');
    console.log('📋 Medical History length:', context.medicalHistory?.length || 0);
    console.log('📋 Clinical data available:', !!clinicalData);
    
    const response = await this.callAI(prompt, this.config.systemPrompt, context.modelUsed);
    const result = this.parseJSONResponse<EpisodeAnalysisResult>(response);
    
    // 🔍 LOGOWANIE WYNIKÓW ANALIZY EPIZODÓW
    console.log('🔍 [Episode Agent] Analysis results:');
    console.log('📊 Number of scenarios:', result.scenarios?.length || 0);
    console.log('🎯 Most likely scenario:', result.mostLikelyScenario);
    
    if (result.scenarios && result.scenarios.length > 0) {
      console.log('🔍 [Episode Agent] Episode scenarios:');
      result.scenarios.forEach(scenario => {
        console.log(`  - Scenario ${scenario.id}: ${scenario.startDate} to ${scenario.endDate || 'ongoing'}`);
        console.log(`    Description: ${scenario.description.substring(0, 100)}...`);
      });
    }
    
    // 🔍 SPRAWDZENIE LOGIKI - czy agent poprawnie interpretuje zmiany leczenia
    if (result.conclusion) {
      const hasIncorrectLogic = result.conclusion.toLowerCase().includes('zmiana leczenia') && 
                               (result.conclusion.toLowerCase().includes('koniec epizodu') || 
                                result.conclusion.toLowerCase().includes('zakończenie epizodu'));
      
      if (hasIncorrectLogic) {
        console.warn('⚠️ [Episode Agent] POTENTIAL LOGIC ERROR: Agent may be treating medication changes as episode endings!');
        console.warn('⚠️ [Episode Agent] Conclusion contains problematic logic:', result.conclusion.substring(0, 200));
      } else {
        console.log('✅ [Episode Agent] Logic appears correct - no medication change = episode end detected');
      }
    }
    
    return result;
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
      conclusion: 'Błąd podczas analizy epizodów depresyjnych - wymagana ręczna weryfikacja',
      remissionPeriods: []
    };
  }

  public validate(result: EpisodeAnalysisResult): boolean {
    console.log(`🔍 [${this.name}] Szczegółowa walidacja wyniku:`, result);
    
    // Sprawdź podstawową strukturę
    if (!result || typeof result !== 'object') {
      console.error(`❌ [${this.name}] Wynik nie jest obiektem:`, typeof result);
      return false;
    }
    
    // Sprawdź scenarios - musi być tablicą z przynajmniej jednym elementem
    if (!Array.isArray(result.scenarios)) {
      console.error(`❌ [${this.name}] scenarios nie jest tablicą:`, result.scenarios);
      return false;
    }
    
    if (result.scenarios.length === 0) {
      console.error(`❌ [${this.name}] scenarios jest puste`);
      return false;
    }
    
    // Sprawdź mostLikelyScenario - musi być liczbą
    if (typeof result.mostLikelyScenario !== 'number') {
      console.error(`❌ [${this.name}] mostLikelyScenario nie jest liczbą:`, typeof result.mostLikelyScenario);
      return false;
    }
    
    // Sprawdź conclusion - musi być stringiem i nie pustym
    if (typeof result.conclusion !== 'string' || result.conclusion.length === 0) {
      console.error(`❌ [${this.name}] conclusion nie jest niepustym stringiem:`, typeof result.conclusion);
      return false;
    }
    
    // Sprawdź każdy scenariusz (prostsze sprawdzenie)
    for (let i = 0; i < result.scenarios.length; i++) {
      const scenario = result.scenarios[i];
      
      if (typeof scenario.id !== 'number') {
        console.error(`❌ [${this.name}] scenarios[${i}].id nie jest liczbą:`, typeof scenario.id);
        return false;
      }
      if (typeof scenario.description !== 'string' || scenario.description.length === 0) {
        console.error(`❌ [${this.name}] scenarios[${i}].description problematyczne:`, typeof scenario.description);
        return false;
      }
      if (typeof scenario.evidence !== 'string' || scenario.evidence.length === 0) {
        console.error(`❌ [${this.name}] scenarios[${i}].evidence problematyczne:`, typeof scenario.evidence);
        return false;
      }
      if (typeof scenario.confidence !== 'number' || scenario.confidence < 0 || scenario.confidence > 1) {
        console.error(`❌ [${this.name}] scenarios[${i}].confidence nieprawidłowe:`, scenario.confidence);
        return false;
      }
    }
    
    // Sprawdź remissionPeriods - musi być tablicą (może być pusta)
    if (!Array.isArray(result.remissionPeriods)) {
      console.error(`❌ [${this.name}] remissionPeriods nie jest tablicą:`, result.remissionPeriods);
      return false;
    }
    
    // Sprawdź każdy okres remisji (jeśli istnieją) - uproszczona logika
    for (let i = 0; i < result.remissionPeriods.length; i++) {
      const period = result.remissionPeriods[i];
      
      // Sprawdź startDate - może być string lub null
      if (period.startDate !== null && typeof period.startDate !== 'string') {
        console.error(`❌ [${this.name}] remissionPeriods[${i}].startDate nieprawidłowe:`, period.startDate);
        return false;
      }
      
      // Sprawdź endDate - może być string lub null
      if (period.endDate !== null && typeof period.endDate !== 'string') {
        console.error(`❌ [${this.name}] remissionPeriods[${i}].endDate nieprawidłowe:`, period.endDate);
        return false;
      }
      
      // Sprawdź evidence
      if (typeof period.evidence !== 'string') {
        console.error(`❌ [${this.name}] remissionPeriods[${i}].evidence nie jest stringiem:`, typeof period.evidence);
        return false;
      }
      
      // Sprawdź confidence
      if (typeof period.confidence !== 'number' || period.confidence < 0 || period.confidence > 1) {
        console.error(`❌ [${this.name}] remissionPeriods[${i}].confidence nieprawidłowe:`, period.confidence);
        return false;
      }
      
      // Napraw brakujące notes
      if (!period.notes || typeof period.notes !== 'string') {
        console.log(`⚠️ [${this.name}] remissionPeriods[${i}].notes brakuje, dodaję domyślne`);
        period.notes = `Okres remisji: ${period.startDate || 'nieznana data początkowa'} - ${period.endDate || 'nieznana data końcowa'}`;
      }
    }
    
    console.log(`✅ [${this.name}] Walidacja zakończona pomyślnie`);
    return true;
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