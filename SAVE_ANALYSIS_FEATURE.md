# 💾 Funkcja Zapisywania Analiz - Dokumentacja

## 🎯 Przegląd

Dodano funkcjonalność zapisywania gotowych analiz do folderu `History` z możliwością przeglądania, zmiany nazw i zarządzania zapisanymi analizami.

## ✨ Nowe Funkcje

### 1. Przycisk "Zapisz Analizę"
- **Lokalizacja**: Header aplikacji (po prawej stronie) oraz w stopce
- **Funkcjonalność**: 
  - Zapisuje aktualną analizę do folderu `History`
  - Pozwala na nadanie niestandardowej nazwy
  - Automatycznie generuje domyślną nazwę: `{PatientID} - {Tryb} - {Data} {Czas}`
  - Obsługuje zarówno analizy klasyczne jak i wieloagentowe

### 2. Manager Zapisanych Analiz
- **Lokalizacja**: Dostępny przez przycisk "Zapisane Analizy"
- **Funkcjonalności**:
  - Przeglądanie wszystkich zapisanych analiz
  - Wyszukiwanie analiz po nazwie, ID pacjenta, itp.
  - Filtrowanie po typie analizy (klasyczna/wieloagentowa)
  - Sortowanie po dacie, nazwie, typie
  - Edycja nazw analiz (inline editing)
  - Usuwanie analiz
  - Otwieranie zapisanych analiz
  - Statystyki storage'u

## 🏗️ Implementacja

### Nowe Komponenty

#### `SaveAnalysisButton.tsx`
```typescript
interface SaveAnalysisButtonProps {
  patientData: PatientData;
  medicalHistory?: string;
  studyProtocol?: string;
  isMultiAgentMode?: boolean;
  agentResults?: Record<string, any>;
  className?: string;
}
```

**Funkcje:**
- Dialog do wprowadzenia nazwy analizy
- Walidacja danych wejściowych
- Obsługa błędów zapisywania
- Feedback wizualny (loading, success, error)
- Automatyczne generowanie nazw

#### `SavedAnalysesManager.tsx`
```typescript
interface SavedAnalysesManagerProps {
  onAnalysisSelect?: (analysis: StoredAnalysis) => void;
  onClose?: () => void;
}
```

**Funkcje:**
- Lista wszystkich zapisanych analiz
- Wyszukiwanie i filtrowanie
- Inline editing nazw
- Akcje: otwórz, usuń, edytuj
- Responsywny design
- Statystyki i metryki

### Integracja z App.tsx

#### Nowy Stan
```typescript
const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
const [originalAnalysisData, setOriginalAnalysisData] = useState<{
  medicalHistory: string;
  studyProtocol: string;
  agentResults?: Record<string, any>;
} | null>(null);
```

#### Nowe Funkcje
- `handleLoadSavedAnalysis()` - ładowanie zapisanej analizy
- Przechowywanie oryginalnych danych analizy
- Integracja z istniejącym systemem storage'u

## 📁 Struktura Plików

### Folder History
```
History/
├── metadata/           # Metadane analiz (szybki dostęp)
│   ├── analysis_abc123.json
│   └── analysis_def456.json
└── data/              # Pełne dane analiz
    ├── analysis_abc123.json
    └── analysis_def456.json
```

### Format Zapisanych Analiz
```typescript
interface StoredAnalysis {
  metadata: {
    id: string;
    patientId: string;
    analysisType: 'single-agent' | 'multi-agent';
    modelUsed: string;
    createdAt: string;
    updatedAt: string;
    status: 'completed' | 'failed' | 'in_progress';
    version: string;
    tags?: string[];
    notes?: string; // Niestandardowa nazwa
  };
  patientData: PatientData;
  agentResults?: Record<string, any>;
  medicalHistory: string;
  studyProtocol: string;
  rawResponse?: string;
}
```

## 🎮 Instrukcja Użycia

### Zapisywanie Analizy
1. Przeprowadź analizę pacjenta (klasyczną lub wieloagentową)
2. Kliknij przycisk "Zapisz Analizę" w headerze lub stopce
3. Wprowadź niestandardową nazwę lub użyj automatycznie wygenerowanej
4. Kliknij "Zapisz"
5. Analiza zostanie zapisana w folderze `History`

### Przeglądanie Zapisanych Analiz
1. Kliknij przycisk "Zapisane Analizy"
2. Przeglądaj listę wszystkich analiz
3. Użyj wyszukiwania lub filtrów do znalezienia konkretnej analizy
4. Kliknij ikonę oka aby otworzyć analizę
5. Kliknij ikonę ołówka aby zmienić nazwę
6. Kliknij ikonę kosza aby usunąć analizę

### Zmiana Nazwy Analizy
1. W managerze zapisanych analiz kliknij ikonę ołówka
2. Wprowadź nową nazwę
3. Kliknij ikonę checkmark aby zapisać lub X aby anulować

## 🔧 Konfiguracja

### Zmienne Środowiskowe
```bash
# Lokalne storage (domyślne)
STORAGE_TYPE=local
STORAGE_PATH=./History
STORAGE_COMPRESSION=false
STORAGE_ENCRYPTION=false
STORAGE_MAX_FILE_SIZE=52428800  # 50MB
STORAGE_RETENTION_DAYS=365      # 1 rok
```

### Automatyczne Tworzenie Folderów
System automatycznie tworzy strukturę folderów:
- `./History/metadata/` - metadane analiz
- `./History/data/` - pełne dane analiz

## 📊 Funkcje Zaawansowane

### Wyszukiwanie
- Wyszukiwanie po nazwie analizy
- Wyszukiwanie po ID pacjenta
- Wyszukiwanie po modelu AI
- Wyszukiwanie po tagach

### Filtrowanie
- Typ analizy (klasyczna/wieloagentowa)
- Model AI użyty do analizy
- Status analizy
- Zakres dat

### Sortowanie
- Data utworzenia (najnowsze/najstarsze)
- Nazwa analizy (A-Z/Z-A)
- Typ analizy

### Statystyki
- Łączna liczba analiz
- Rozmiar storage'u
- Liczba analiz z ostatnich 7 dni
- Podział według typu analizy
- Podział według modelu AI

## 🚀 Korzyści

1. **Trwałe Przechowywanie**: Analizy są zapisywane lokalnie i nie znikają po odświeżeniu strony
2. **Organizacja**: Możliwość nadawania niestandardowych nazw i organizowania analiz
3. **Szybki Dostęp**: Łatwe wyszukiwanie i filtrowanie zapisanych analiz
4. **Backup**: Automatyczne tworzenie kopii zapasowych wszystkich analiz
5. **Migracja**: Gotowość do migracji na AWS S3/DynamoDB w przyszłości
6. **Audyt**: Pełna historia wszystkich przeprowadzonych analiz

## 🔮 Przyszłe Rozszerzenia

1. **Export/Import**: Eksport analiz do JSON/CSV
2. **Udostępnianie**: Możliwość udostępniania analiz między użytkownikami
3. **Wersjonowanie**: Śledzenie zmian w analizach
4. **Komentarze**: Dodawanie notatek do zapisanych analiz
5. **Kategorie**: Grupowanie analiz w kategorie/projekty
6. **Synchronizacja**: Synchronizacja z chmurą (AWS S3)

## 🛠️ Rozwiązywanie Problemów

### Brak Uprawnień do Zapisu
```bash
chmod 755 ./History
```

### Przekroczenie Limitu Rozmiaru
Zwiększ limit w konfiguracji:
```typescript
const config = {
  maxFileSize: 100 * 1024 * 1024 // 100MB
};
```

### Błędy Storage'u
Sprawdź logi w konsoli przeglądarki i upewnij się, że folder `History` istnieje i ma odpowiednie uprawnienia. 