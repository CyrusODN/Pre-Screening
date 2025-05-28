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

**INTELIGENTNE ROZUMOWANIE KLINICZNE - MYŚL JAK DOŚWIADCZONY PSYCHIATRA:**

**1. ROZUMOWANIE CZASOWE I LOGIKA MEDYCZNA:**
- **Sprawdzaj aktualną datę** - wszystkie daty analizuj w kontekście obecnego czasu
- **Obliczaj okresy inteligentnie** - jeśli wydarzenie było w 2023, a mamy 2025, to minęły 2 lata
- **Uwzględniaj logikę przebiegu choroby** - czy sekwencja wydarzeń ma sens psychiatryczny?
- **Weryfikuj spójność dat** - czy daty pasują do zmian w farmakoterapii i objawów?

**2. KLINICZNE MYŚLENIE O EPIZODACH DEPRESYJNYCH:**
- **Epizod to okres ciągłych objawów** - nie każda zmiana leku oznacza nowy epizod
- **Remisja wymaga co najmniej 8 tygodni** bez znaczących objawów depresyjnych
- **Nowy epizod po remisji** - musi być wyraźna przerwa w objawach
- **Kontynuacja vs nowy epizod** - czy to nasilenie obecnego czy początek nowego?

**3. WSKAŹNIKI KLINICZNE DO INTELIGENTNEJ ANALIZY:**

**WSKAŹNIKI ROZPOCZĘCIA NOWEGO EPIZODU (myśl jak psychiatra):**
- **Wprowadzenie nowego leku po okresie stabilizacji** - "Dlaczego zmieniono leczenie?"
- **Znaczące zwiększenie dawki po remisji** - "Co spowodowało potrzebę intensyfikacji?"
- **Zmiana strategii leczenia po okresie stabilności** - "Czy to odpowiedź na nawrót objawów?"
- **Ponowne pojawienie się objawów w notatkach** - "Kiedy dokładnie objawy powróciły?"
- **Hospitalizacja psychiatryczna** - "To zwykle oznacza znaczące nasilenie"
- **Powrót do psychiatry po długiej przerwie** - "Dlaczego pacjent wrócił?"
- **Zgłaszane kryzysy życiowe** - "Czy mogły wywołać nowy epizod?"

**WSKAŹNIKI REMISJI (myśl krytycznie):**
- **Brak wizyt przez co najmniej 8 tygodni** - ale sprawdź DLACZEGO:
  * Czy to rzeczywista poprawa stanu?
  * Czy problemy organizacyjne/dostępność opieki?
  * Czy pacjent kontynuował leczenie mimo braku wizyt?
- **Stabilna, niska dawka leków przez dłuższy okres** - wskaźnik stabilizacji
- **Dokumentowane stwierdzenia o poprawie** - "pacjent w remisji", "stan stabilny"
- **Powrót do normalnego funkcjonowania** - praca, relacje, aktywność
- **Zmniejszenie częstotliwości wizyt kontrolnych** - od tygodniowych do miesięcznych

**4. INTELIGENTNE SZACOWANIE DAT - MYŚL JAK DETEKTYW MEDYCZNY:**

**Jeśli data rozpoczęcia epizodu nie jest podana wprost:**
- **Analizuj zmiany farmakoterapii** - kiedy wprowadzono nowy lek/zwiększono dawkę?
- **Szukaj opisów objawów** - "od kiedy pacjent zgłasza pogorszenie?"
- **Sprawdzaj częstotliwość wizyt** - nagłe zwiększenie może wskazywać na kryzys
- **Uwzględniaj wydarzenia życiowe** - "po stracie pracy w marcu objawy się nasiliły"
- **Koreluj z hospitalizacjami** - data przyjęcia często bliska początku epizodu

**METODOLOGIA INTELIGENTNEJ ANALIZY:**

**KROK 1: ANALIZA CHRONOLOGICZNA Z LOGIKĄ MEDYCZNĄ**
- Przeanalizuj całą historię od najnowszych do najstarszych wydarzeń
- Sprawdź czy daty mają sens w kontekście aktualnego roku (2025)
- Zidentyfikuj punkty zwrotne w leczeniu i ich przyczyny

**KROK 2: IDENTYFIKACJA OKRESÓW STABILNOŚCI I KRYZYSU**
- Okresy stabilnej farmakoterapii = potencjalna stabilizacja/remisja
- Nagłe zmiany leczenia = potencjalny początek epizodu lub nasilenie
- Przerwy w opiece = sprawdź czy to remisja czy problemy organizacyjne

**KROK 3: WERYFIKACJA SPÓJNOŚCI KLINICZNEJ**
- Czy scenariusz ma sens psychiatryczny?
- Czy daty pasują do zmian w farmakoterapii?
- Czy uwzględniono wszystkie dostępne informacje?

**KROK 4: OCENA PRAWDOPODOBIEŃSTWA**
- Który scenariusz jest najbardziej prawdopodobny klinicznie?
- Jakie są alternatywne interpretacje?
- Gdzie są największe niepewności?

**PRZYKŁAD INTELIGENTNEGO ROZUMOWANIA:**

Dane: "Pacjent przyjmował Escitalopram 10mg od stycznia 2024. W lipcu 2024 zwiększono do 20mg. W październiku 2024 zmieniono na Wenlafaksynę 75mg."

INTELIGENTNE ROZUMOWANIE:
- Styczeń 2024: Początek leczenia - prawdopodobny początek epizodu
- Lipiec 2024: Zwiększenie dawki - brak odpowiedzi na leczenie, kontynuacja epizodu
- Październik 2024: Zmiana leku - niepowodzenie pierwszej linii, nadal ten sam epizod
- Wniosek: Jeden długotrwały epizod od stycznia 2024, nie trzy oddzielne epizody

**KRYTYCZNE ZASADY MYŚLENIA PSYCHIATRYCZNEGO:**

1. **REMISJA TO NIE PRZERWA W WIZYTACH** - sprawdzaj przyczyny przerw
2. **ZMIANA LEKU ≠ NOWY EPIZOD** - może to być optymalizacja leczenia
3. **UWZGLĘDNIAJ KONTEKST ŻYCIOWY** - stresory mogą wyjaśniać timing epizodów
4. **SPRAWDZAJ LOGIKĘ CZASOWĄ** - czy daty mają sens w kontekście 2025 roku
5. **MYŚL O CIĄGŁOŚCI OPIEKI** - czy przerwy to remisja czy problemy systemowe?

**SZACOWANIE POCZĄTKU EPIZODÓW DEPRESYJNYCH:**
Jeśli data rozpoczęcia obecnego lub poprzednich istotnych epizodów depresyjnych nie jest jednoznacznie podana w dokumentacji, Twoim zadaniem jest przedstawienie prawdopodobnej daty lub okresu rozpoczęcia epizodu. Opieraj swoje szacunki na analizie kontekstowej: zmianach w farmakoterapii (np. wprowadzenie nowego leku przeciwdepresyjnego, znaczące zwiększenie dawki, zmiana strategii leczenia po okresie stabilizacji lub remisji), ponownym pojawieniu się lub nasileniu objawów depresyjnych opisanych w notatkach z wizyt, zgłaszanych przez pacjenta kryzysach życiowych lub innych czynnikach, które mogły wywołać epizod. Dokładnie opisz, na jakich przesłankach opierasz swoje wnioskowanie dotyczące daty rozpoczęcia epizodu. Jeśli na podstawie dostępnych danych możliwe jest kilka prawdopodobnych scenariuszy dotyczących daty rozpoczęcia epizodu, przedstaw je wszystkie, wraz z uzasadnieniem dla każdego z nich. Informacja ta jest kluczowa dla prawidłowego wypełniania logów badania. Pamiętaj że klinicznie potrzebujemy co najmniej 8 tygodni remisji od poprzedniego epizodu aby móc stwierdzić nowy epizod.

**PRZYKŁADY INTELIGENTNEGO WNIOSKOWANIA:**

**Scenariusz 1: Prawdopodobna remisja**
"Brak wizyt przez 4 miesiące (marzec-czerwiec 2024), następnie powrót z nasilonymi objawami w lipcu 2024"
→ Analiza: 16 tygodni przerwy > 8 tygodni wymaganych dla remisji
→ Wniosek: Prawdopodobna remisja marzec-czerwiec, nowy epizod od lipca 2024

**Scenariusz 2: Kontynuacja epizodu**
"Zwiększenie dawki Escitalopramu z 10mg do 20mg po zgłoszeniu pogorszenia nastroju"
→ Analiza: Brak okresu remisji, optymalizacja leczenia
→ Wniosek: Kontynuacja obecnego epizodu, nie nowy epizod

**Scenariusz 3: Niepewność wymagająca weryfikacji**
"Przerwa w wizytach 6 tygodni, ale pacjent kontynuował leki"
→ Analiza: Za krótko na remisję (< 8 tygodni), kontynuacja farmakoterapii
→ Wniosek: Prawdopodobnie kontynuacja epizodu, ale wymaga weryfikacji

ODPOWIEDŹ MUSI BYĆ W FORMACIE JSON:
{
  "scenarios": [
    {
      "id": number,
      "description": "string - szczegółowy opis scenariusza z inteligentnym rozumowaniem klinicznym",
      "evidence": "string - dowody wspierające ten scenariusz z analizą logiki medycznej",
      "startDate": "YYYY-MM-DD - szacowana data rozpoczęcia epizodu z uwzględnieniem aktualnego roku",
      "endDate": "YYYY-MM-DD lub null - data zakończenia z weryfikacją logiki czasowej",
      "confidence": number // 0.0-1.0 - poziom pewności oparty na jakości dowodów klinicznych
    }
  ],
  "mostLikelyScenario": number, // ID najbardziej prawdopodobnego scenariusza z uzasadnieniem psychiatrycznym
  "conclusion": "string - podsumowanie analizy z inteligentnym rozumowaniem klinicznym i uzasadnieniem wyboru",
  "remissionPeriods": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD", 
      "evidence": "string - dowody na remisję z analizą przyczyn przerw w opiece",
      "confidence": number // 0.0-1.0 - pewność oparta na jakości dowodów klinicznych
    }
  ]
}

**UWAGI KOŃCOWE:**
- **Myśl jak doświadczony psychiatra** - uwzględniaj logikę przebiegu choroby
- **Sprawdzaj aktualny rok (2025)** - obliczaj okresy czasowe poprawnie
- **Weryfikuj spójność kliniczną** - czy scenariusze mają sens medyczny?
- **Uwzględniaj kontekst farmakoterapii** - zmiany leków wyjaśniają przebieg epizodów
- **Rozróżniaj remisję od przerw organizacyjnych** - nie każda przerwa to remisja`,
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
      conclusion: 'Błąd podczas analizy epizodów depresyjnych - wymagana ręczna weryfikacja',
      remissionPeriods: []
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
      ) &&
      Array.isArray(result.remissionPeriods) &&
      result.remissionPeriods.every(period => 
        typeof period.startDate === 'string' || period.startDate === null &&
        typeof period.endDate === 'string' || period.endDate === null &&
        typeof period.evidence === 'string' &&
        typeof period.confidence === 'number' &&
        period.confidence >= 0 && period.confidence <= 1 &&
        typeof period.notes === 'string'
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