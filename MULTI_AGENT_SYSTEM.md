# System Wieloagentowy - Dokumentacja

## Przegląd

System wieloagentowy to zaawansowana architektura analizy pre-screeningowej, która dzieli kompleksową analizę medyczną na wyspecjalizowane komponenty (agenty). Każdy agent jest ekspertem w swojej dziedzinie i współpracuje z innymi agentami, aby dostarczyć kompleksową ocenę kwalifikowalności pacjenta do badania klinicznego.

## Architektura Systemu

### Fazy Wykonania

System działa w 5 fazach:

1. **FAZA 1: Analiza Podstawowa** (równolegle)
   - Agent Syntezy Klinicznej
   - Agent Analizy Epizodów
   - Agent Farmakoterapii

2. **FAZA 2: Ocena TRD** (sekwencyjnie)
   - Agent Oceny Lekooporności

3. **FAZA 3: Ocena Kryteriów** (sekwencyjnie)
   - Agent Oceny Kryteriów

4. **FAZA 4: Ocena Ryzyka** (sekwencyjnie)
   - Agent Oceny Ryzyka

5. **FAZA 5: Synteza Końcowa**
   - Generowanie finalnego raportu

### Agenty Systemu

## 1. Agent Syntezy Klinicznej (`ClinicalSynthesisAgent`)

**Rola:** Doświadczony badacz kliniczny psychiatra
**Zadanie:** Wszechstronna synteza kliniczna historii medycznej

**Funkcje:**
- Analiza historii medycznej jako całości
- Identyfikacja kluczowych obserwacji klinicznych
- Tworzenie timeline'u leczenia
- Ocena czynników ryzyka
- Synteza przeglądu pacjenta

**Wynik:** `ClinicalSynthesisResult`
```typescript
{
  patientOverview: string;
  clinicalTimeline: string[];
  keyObservations: string[];
  treatmentHistory: string;
  riskFactors: string[];
}
```

## 2. Agent Analizy Epizodów (`EpisodeAnalysisAgent`)

**Rola:** Specjalista w analizie epizodów depresyjnych
**Zadanie:** Wydzielenie i analiza poszczególnych epizodów depresyjnych

**Funkcje:**
- Identyfikacja wszystkich możliwych scenariuszy epizodów
- Określenie dat rozpoczęcia i zakończenia
- Ocena pewności każdego scenariusza
- Wybór najbardziej prawdopodobnego scenariusza

**Wynik:** `EpisodeAnalysisResult`
```typescript
{
  scenarios: Array<{
    id: number;
    description: string;
    evidence: string;
    startDate: string | null;
    endDate: string | null;
    confidence: number;
  }>;
  mostLikelyScenario: number;
  conclusion: string;
}
```

## 3. Agent Farmakoterapii (`PharmacotherapyAgent`)

**Rola:** Specjalista farmakoterapii w psychiatrii
**Zadanie:** Skrupulatna analiza farmakoterapii i mapowanie leków

**Funkcje:**
- Rekonstrukcja szczegółowej osi czasu farmakoterapii
- Mapowanie nazw handlowych na substancje czynne
- Analiza dawek i okresów stosowania
- Identyfikacja luk w dokumentacji
- Ocena adherencji pacjenta

**Wynik:** `PharmacotherapyAnalysisResult`
```typescript
{
  timeline: PharmacotherapyItem[];
  drugMappings: Array<{
    originalName: string;
    standardName: string;
    activeSubstance: string;
  }>;
  gaps: string[];
  notes: string[];
}
```

## 4. Agent Oceny Lekooporności (`TRDAssessmentAgent`)

**Rola:** Specjalista w ocenie lekooporności według MGH-ATRQ
**Zadanie:** Precyzyjna analiza spełnienia kryteriów IC6

**Funkcje:**
- Ocena każdej próby leczenia pod kątem adekwatności
- Weryfikacja dawek i czasu trwania
- Analiza dla każdego scenariusza epizodów
- Określenie spełnienia kryteriów MGH-ATRQ

**Wynik:** `TRDAssessmentResult`
```typescript
{
  scenarioAssessments: Array<{
    scenarioId: string;
    scenarioName: string;
    adequateTrials: Array<{
      medication: string;
      duration: string;
      dosage: string;
      isAdequate: boolean;
      reasoning: string;
    }>;
    totalAdequateTrials: number;
    meetsIC6Criteria: boolean;
    confidence: number;
    reasoning: string;
  }>;
  overallTRDAssessment: {
    bestScenario: string;
    maxAdequateTrials: number;
    recommendedScenario: string;
    confidence: number;
  };
}
```

## 5. Agent Oceny Kryteriów (`CriteriaAssessmentAgent`)

**Rola:** Specjalista w ocenie kryteriów kwalifikacji
**Zadanie:** Ocena wszystkich kryteriów włączenia i wyłączenia

**Funkcje:**
- Ocena kryteriów włączenia z pewności
- Ocena kryteriów wyłączenia psychiatrycznych z oceną ryzyka
- Ocena kryteriów wyłączenia medycznych z oceną ryzyka
- Synteza ogólnej oceny kwalifikowalności

**Wynik:** `CriteriaAssessmentResult`
```typescript
{
  inclusionCriteria: Array<{
    id: string;
    name: string;
    status: 'spełnione' | 'niespełnione' | 'weryfikacja';
    confidence: number;
    reasoning: string;
    evidenceFromHistory: string[];
    recommendedVerification?: string;
  }>;
  // ... podobnie dla psychiatricExclusionCriteria i medicalExclusionCriteria
  overallAssessment: {
    eligibilityScore: number; // 0-100
    majorConcerns: string[];
    minorConcerns: string[];
    strengthsForInclusion: string[];
  };
}
```

## 6. Agent Oceny Ryzyka (`RiskAssessmentAgent`)

**Rola:** Specjalista w ocenie ryzyka w badaniach klinicznych
**Zadanie:** Kompleksowa ocena ryzyk i prawdopodobieństwa włączenia

**Funkcje:**
- Ocena profilu ryzyka pacjenta (samobójcze, adherencja, zdarzenia niepożądane, rezygnacja)
- Ocena ryzyk specyficznych dla badania
- Oszacowanie prawdopodobieństwa włączenia
- Rekomendacja końcowa (include/exclude/further_evaluation)

**Wynik:** `RiskAssessmentResult`
```typescript
{
  patientRiskProfile: {
    suicidalRisk: { level, indicators, mitigationStrategies };
    adherenceRisk: { level, factors, recommendations };
    adverseEventRisk: { level, potentialEvents, monitoringNeeds };
    dropoutRisk: { level, factors, retentionStrategies };
  };
  studySpecificRisks: {
    protocolCompliance: number; // 0-100
    dataQuality: number; // 0-100
    ethicalConcerns: string[];
  };
  inclusionProbability: {
    score: number; // 0-100
    confidence: number; // 0-100
    keyFactors: { positive, negative, neutral };
    recommendation: 'include' | 'exclude' | 'further_evaluation';
    reasoning: string;
  };
}
```

## 7. Agent Chatbot Medyczny (`MedicalChatbotAgent`)

**Rola:** Doświadczony lekarz psychiatra i specjalista badań klinicznych
**Zadanie:** Odpowiadanie na pytania użytkownika o gotową analizę

**Funkcje:**
- Odpowiadanie na pytania w sposób profesjonalny
- Odwoływanie się do konkretnych wyników z analizy
- Wyjaśnianie medycznych terminów
- Sugerowanie dalszych kroków
- Zachowanie ostrożności w formułowaniu diagnoz

**Metoda specjalna:** `answerQuestion(question, context, focusArea?)`

## Koordynator Systemu

### `MultiAgentCoordinator`

Zarządza wykonaniem wszystkich agentów w odpowiedniej kolejności:

**Funkcje:**
- Inicjalizacja kontekstu współdzielonego
- Wykonanie agentów w fazach
- Obsługa błędów i fallback'ów
- Synteza wyników końcowych
- Logowanie procesu

**Główna metoda:**
```typescript
executeAgentPipeline(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel
): Promise<{
  finalResult: PatientData;
  agentResults: Record<string, AgentResult>;
  executionLog: string[];
}>
```

## Kontekst Współdzielony

### `SharedContext`

Struktura danych przekazywana między agentami:

```typescript
interface SharedContext {
  medicalHistory: string;
  studyProtocol: string;
  modelUsed: SupportedAIModel;
  
  // Wyniki z poprzednich agentów
  clinicalSynthesis?: AgentResult<ClinicalSynthesisResult>;
  episodeAnalysis?: AgentResult<EpisodeAnalysisResult>;
  pharmacotherapyAnalysis?: AgentResult<PharmacotherapyAnalysisResult>;
  trdAssessment?: AgentResult<TRDAssessmentResult>;
  inclusionCriteriaAssessment?: AgentResult<CriteriaAssessmentResult>;
  riskAssessment?: AgentResult<RiskAssessmentResult>;
}
```

## Użycie Systemu

### Przełączanie Trybu

W interfejsie użytkownika dostępny jest przełącznik "Tryb wieloagentowy":
- **Wyłączony**: Używa klasycznego systemu AI
- **Włączony**: Używa nowego systemu wieloagentowego

### Programowe Użycie

```typescript
import { analyzePatientDataMultiAgent } from './services/multiAgentService';

const result = await analyzePatientDataMultiAgent(
  medicalHistory,
  studyProtocol,
  selectedModel
);
```

### Testowanie Agentów

```typescript
import { testAgentPipeline } from './services/multiAgentService';

const testResult = await testAgentPipeline(
  medicalHistory,
  studyProtocol,
  selectedModel
);
```

## Zalety Systemu Wieloagentowego

1. **Specjalizacja**: Każdy agent jest ekspertem w swojej dziedzinie
2. **Modularność**: Łatwe dodawanie nowych agentów lub modyfikacja istniejących
3. **Równoległość**: Niektóre analizy mogą być wykonywane jednocześnie
4. **Przejrzystość**: Jasny podział odpowiedzialności i śledzenie procesu
5. **Skalowalność**: Możliwość łatwego rozszerzania systemu
6. **Niezawodność**: Izolacja błędów i fallback'i dla każdego agenta
7. **Dokładność**: Głębsza analiza dzięki specjalizacji agentów

## Kompatybilność

System wieloagentowy jest w pełni kompatybilny z istniejącą aplikacją:
- Zachowuje ten sam interfejs API
- Zwraca dane w tym samym formacie (`PatientData`)
- Może być włączany/wyłączany bez wpływu na funkcjonalność
- Używa tych samych modeli AI (o3, Gemini, Claude)

## Rozwój i Rozszerzenia

System został zaprojektowany z myślą o łatwym rozszerzaniu:

1. **Nowe agenty**: Dziedzicz z `AbstractBaseAgent`
2. **Nowe fazy**: Dodaj do `MultiAgentCoordinator`
3. **Nowe typy wyników**: Rozszerz `SharedContext`
4. **Nowe strategie wykonania**: Implementuj `ExecutionStrategy`

## Monitoring i Debugowanie

System zapewnia szczegółowe logowanie:
- Czas wykonania każdego agenta
- Ostrzeżenia i błędy
- Pewność wyników
- Kompletny log wykonania pipeline'u

Logi są dostępne w konsoli przeglądarki i zwracane w wynikach analizy. 