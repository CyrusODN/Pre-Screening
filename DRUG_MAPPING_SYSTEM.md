# System Mapowania Leków - Dokumentacja

## Przegląd

System mapowania leków to zaawansowane rozwiązanie do lokalnego wyszukiwania i klasyfikacji leków na podstawie oficjalnego Rejestru Produktów Leczniczych. System umożliwia efektywne mapowanie nazw handlowych leków na standardowe substancje czynne, kody ATC i inne informacje farmakologiczne bez konieczności wysyłania dużych ilości danych do modeli językowych.

## Architektura

### Backend (Node.js/Express)
- **Lokalizacja**: `server/index.js`
- **Endpointy API**: `/api/drug-mapping/*`
- **Baza danych**: CSV file (`Rejestr_Produktow_Leczniczych_calosciowy_stan_na_dzien_20250527.csv`)

### Frontend Service
- **TypeScript Client**: `src/services/drugMappingClient.ts`
- **Backend Service**: `src/services/drugMappingService.js` (JavaScript wrapper)
- **TypeScript Service**: `src/services/drugMappingService.ts` (główna logika)

### Komponenty UI
- **Demo Component**: `src/components/DrugMappingDemo.tsx`
- **Integracja z App**: Przycisk "🧪 Demo Mapowania Leków" w footer

## Funkcjonalności

### 1. Mapowanie Leków
```typescript
// Przykład użycia
const result = await drugMappingClient.mapDrugToStandard("duloxetine");
```

**Zwraca:**
- `found`: boolean - czy lek został znaleziony
- `standardName`: string - standardowa nazwa (łacińska)
- `activeSubstance`: string - substancja czynna
- `atcCode`: string - kod ATC
- `alternatives`: string[] - alternatywne nazwy handlowe
- `confidence`: number - pewność dopasowania (0-1)
- `details`: DrugRecord[] - szczegółowe informacje

### 2. Szczegółowe Wyszukiwanie
```typescript
const searchResult = await drugMappingClient.searchDrugs("sertralina");
```

**Zwraca:**
- `exactMatches`: DrugRecord[] - dokładne dopasowania
- `partialMatches`: DrugRecord[] - częściowe dopasowania
- `substanceMatches`: DrugRecord[] - dopasowania substancji czynnej
- `confidence`: number - ogólna pewność
- `searchTerm`: string - wyszukiwany termin

### 3. Statystyki Bazy Danych
```typescript
const stats = await drugMappingClient.getDatabaseStats();
```

**Zwraca:**
- `totalDrugs`: number - łączna liczba leków (18,769)
- `uniqueSubstances`: number - unikalne substancje (8,383)
- `uniqueAtcCodes`: number - kody ATC (2,169)
- `topAtcClasses`: Array - top 10 klas ATC

### 4. Leki Przeciwdepresyjne
```typescript
const antidepressants = await drugMappingClient.getAntidepressants();
```

**Zwraca:** Array z 469 lekami przeciwdepresyjnymi (kody ATC N06A*)

### 5. Sprawdzanie Klasy Leku
```typescript
const result = await drugMappingClient.isAntidepressant("prozac");
```

## API Endpoints

### POST `/api/drug-mapping/search`
Mapowanie nazwy leku na standardową substancję czynną.

**Request:**
```json
{
  "drugName": "duloxetine"
}
```

**Response:**
```json
{
  "found": true,
  "standardName": "Duloxetinum",
  "activeSubstance": "Duloxetinum 30 mg",
  "atcCode": "N06AX21",
  "alternatives": ["Duloxetine Lilly", "Duloxetine Sandoz"],
  "confidence": 0.8,
  "details": [...]
}
```

### POST `/api/drug-mapping/detailed-search`
Szczegółowe wyszukiwanie z różnymi typami dopasowań.

### GET `/api/drug-mapping/stats`
Statystyki bazy danych leków.

### GET `/api/drug-mapping/antidepressants`
Lista wszystkich leków przeciwdepresyjnych.

### POST `/api/drug-mapping/is-antidepressant`
Sprawdzenie czy lek jest przeciwdepresyjny.

## Algorytm Wyszukiwania

### 1. Normalizacja
- Konwersja na małe litery
- Usunięcie znaków specjalnych
- Normalizacja spacji

### 2. Typy Dopasowań
1. **Dokładne** - pełna zgodność nazwy produktu lub nazwy powszechnej
2. **Częściowe** - dopasowanie słów kluczowych w nazwie
3. **Substancja** - dopasowanie substancji czynnej

### 3. Scoring Confidence
- Dokładne dopasowanie: 0.95
- Częściowe dopasowanie: 0.8
- Dopasowanie substancji: 0.6

## Integracja z Analizą Kliniczną

### Enhanced Drug Classification
```typescript
const result = await classifyDrugForClinicalResearchEnhanced("duloxetine");
```

**Funkcjonalności:**
- Automatyczna klasyfikacja na podstawie kodu ATC
- Identyfikacja mechanizmu działania
- Określenie czy lek jest przeciwdepresyjny
- Fallback do klasycznej metody

### Klasy Farmakologiczne
- **SSRI** (N06AB*) - Selektywne inhibitory wychwytu serotoniny
- **SNRI** (N06AX*) - Inhibitory wychwytu serotoniny i noradrenaliny
- **Tricyclic** (N06AA*) - Trójpierścieniowe
- **MAOI** (N06AD*, N06AF*, N06AG*) - Inhibitory monoaminooksydazy
- **NaSSA** - Noradrenergiczne i specyficzne serotoninergiczne
- **NDRI** - Inhibitory wychwytu noradrenaliny i dopaminy

## Dane Źródłowe

### Rejestr Produktów Leczniczych
- **Źródło**: Urząd Rejestracji Produktów Leczniczych
- **Data**: 27.05.2025
- **Format**: CSV z separatorem `;`
- **Kodowanie**: UTF-8
- **Rozmiar**: ~15MB

### Struktura Danych
```typescript
interface DrugRecord {
  id: string;                    // Identyfikator produktu
  productName: string;           // Nazwa handlowa
  commonName: string;            // Nazwa powszechna (łacińska)
  strength: string;              // Moc/dawka
  atcCode: string;               // Kod ATC
  activeSubstance: string;       // Substancja czynna
  pharmaceuticalForm: string;    // Postać farmaceutyczna
  routeOfAdministration: string; // Droga podania
}
```

## Wydajność

### Inicjalizacja
- Czas ładowania: ~1-2 sekundy
- Pamięć: ~50MB
- Cache: Singleton pattern

### Wyszukiwanie
- Czas odpowiedzi: <100ms
- Concurrent requests: Obsługiwane
- Batch processing: 5 leków jednocześnie

## Przykłady Użycia

### 1. Podstawowe Mapowanie
```javascript
// Test z curl
curl -X POST http://localhost:3001/api/drug-mapping/search \
  -H "Content-Type: application/json" \
  -d '{"drugName":"duloxetine"}'
```

### 2. Frontend Demo
1. Uruchom aplikację
2. Kliknij "🧪 Demo Mapowania Leków"
3. Wpisz nazwę leku (np. "Prozac", "Sertralina", "Duloxetine")
4. Zobacz wyniki mapowania i klasyfikacji

### 3. Integracja w Kodzie
```typescript
import drugMappingClient from './services/drugMappingClient';

// Mapowanie pojedynczego leku
const mapping = await drugMappingClient.mapDrugToStandard("prozac");

// Batch processing
const mappings = await drugMappingClient.mapMultipleDrugs([
  "prozac", "zoloft", "lexapro"
]);

// Sugestie
const suggestions = await drugMappingClient.getDrugSuggestions("ser");
```

## Korzyści

### 1. Efektywność
- **Lokalny processing** - brak potrzeby wysyłania dużych danych do LLM
- **Szybkie odpowiedzi** - wyszukiwanie w pamięci
- **Niskie koszty** - brak opłat za API calls dla mapowania

### 2. Dokładność
- **Oficjalne dane** - Rejestr Produktów Leczniczych
- **Aktualne informacje** - stan na maj 2025
- **Standardowe kody** - ATC classification

### 3. Skalowalność
- **Batch processing** - obsługa wielu leków jednocześnie
- **Caching** - singleton pattern dla wydajności
- **API-first** - łatwa integracja z innymi systemami

## Rozszerzenia

### Planowane Funkcjonalności
1. **Interakcje leków** - sprawdzanie interakcji między lekami
2. **Dawkowanie** - rekomendacje dawek na podstawie wskazań
3. **Przeciwwskazania** - automatyczne wykrywanie przeciwwskazań
4. **Aktualizacje** - automatyczne pobieranie nowych wersji rejestru

### Możliwe Integracje
1. **Systemy EMR** - integracja z elektroniczną dokumentacją medyczną
2. **Apteki** - weryfikacja dostępności leków
3. **Ubezpieczenia** - sprawdzanie refundacji
4. **Badania kliniczne** - automatyczna klasyfikacja leków w protokołach

## Troubleshooting

### Częste Problemy

1. **Plik CSV nie znaleziony**
   - Sprawdź czy plik `Rejestr_Produktow_Leczniczych_*.csv` jest w głównym katalogu
   - Sprawdź ścieżkę w `drugMappingService.js`

2. **Błędy importu TypeScript**
   - Użyj JavaScript wrapper (`drugMappingService.js`)
   - Sprawdź czy `csv-parse` jest zainstalowany

3. **Wolne wyszukiwanie**
   - Sprawdź czy baza została zainicjalizowana
   - Rozważ ograniczenie wyników

### Logi
```
🔄 Inicjalizacja bazy danych leków...
✅ Załadowano 18769 rekordów leków
🔍 [Backend] Drug mapping search request: duloxetine
✅ [Backend] Drug mapping completed for: duloxetine, found: true
```

## Podsumowanie

System mapowania leków to potężne narzędzie do lokalnego przetwarzania informacji o lekach, które znacznie redukuje koszty i zwiększa wydajność analizy farmakoterapii. Dzięki integracji z oficjalnym rejestrem produktów leczniczych, system zapewnia wysoką dokładność i aktualność danych, jednocześnie oferując szybkie i efektywne API do różnorodnych zastosowań medycznych. 