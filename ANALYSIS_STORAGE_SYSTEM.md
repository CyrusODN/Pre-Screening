# 📚 System Zapisywania Analiz - Dokumentacja

## 🎯 Przegląd

System zapisywania analiz zapewnia trwałe przechowywanie wszystkich przeprowadzonych analiz medycznych z możliwością łatwej migracji między różnymi rozwiązaniami storage'u (lokalny → AWS).

## 🏗️ Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                    APLIKACJA                                │
├─────────────────────────────────────────────────────────────┤
│  clinicalAnalysisService  │  multiAgentService              │
│  (analiza klasyczna)      │  (analiza wieloagentowa)        │
├─────────────────────────────────────────────────────────────┤
│              AnalysisHistoryService                         │
│              (główny interfejs)                             │
├─────────────────────────────────────────────────────────────┤
│                 StorageFactory                              │
│              (factory pattern)                              │
├─────────────────────────────────────────────────────────────┤
│  LocalAnalysisStorage  │  AwsAnalysisStorage                │
│  (implementacja lokalna) │  (implementacja AWS)             │
├─────────────────────────────────────────────────────────────┤
│     ./History/           │    S3 + DynamoDB                 │
│   ├── metadata/          │  ┌─────────────────────────────┐ │
│   │   ├── analysis1.json │  │ DynamoDB: metadane          │ │
│   │   └── analysis2.json │  │ - szybkie wyszukiwanie      │ │
│   └── data/              │  │ - indeksy                   │ │
│       ├── analysis1.json │  └─────────────────────────────┘ │
│       └── analysis2.json │  ┌─────────────────────────────┐ │
│                          │  │ S3: pełne dane              │ │
│                          │  │ - duże pliki JSON           │ │
│                          │  │ - archiwizacja              │ │
│                          │  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Struktura Plików

### Lokalne Storage (./History/)
```
History/
├── metadata/           # Metadane analiz (szybki dostęp)
│   ├── analysis_abc123.json
│   └── analysis_def456.json
└── data/              # Pełne dane analiz
    ├── analysis_abc123.json
    └── analysis_def456.json
```

### AWS Storage
```
S3 Bucket: medical-analysis-storage
├── analyses/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── analysis_abc123.json
│   │   │   └── analysis_def456.json
│   │   └── 02/
│   └── 2025/

DynamoDB Table: medical-analysis-metadata
- Partition Key: analysisId
- Sort Key: createdAt
- GSI1: patientId-createdAt
- GSI2: analysisType-createdAt
- GSI3: modelUsed-createdAt
```

## 🔧 Konfiguracja

### Zmienne Środowiskowe

```bash
# Typ storage'u
STORAGE_TYPE=local                    # local | aws-s3

# Lokalne storage
STORAGE_PATH=./History               # ścieżka do folderu
STORAGE_COMPRESSION=false            # kompresja plików
STORAGE_ENCRYPTION=false             # szyfrowanie
STORAGE_MAX_FILE_SIZE=52428800       # 50MB
STORAGE_RETENTION_DAYS=365           # 1 rok

# AWS storage
AWS_REGION=us-east-1
AWS_S3_BUCKET=medical-analysis-storage
AWS_DYNAMODB_TABLE=medical-analysis-metadata
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Konfiguracja Programowa

```typescript
import { StorageFactory } from './services/storage/StorageFactory';

// Lokalne storage
const localConfig = StorageFactory.createDefaultLocalConfig('./History');

// AWS storage
const awsConfig = StorageFactory.createAwsConfig(
  'us-east-1',
  'medical-analysis-storage',
  'medical-analysis-metadata'
);

// Z zmiennych środowiskowych
const envConfig = StorageFactory.createConfigFromEnv();
```

## 💾 Zapisywanie Analiz

### Automatyczne Zapisywanie

System automatycznie zapisuje wszystkie analizy:

```typescript
// Analiza klasyczna (automatycznie zapisywana)
const result = await analyzePatientDataWithHistory(
  medicalHistory,
  studyProtocol,
  'o3'
);

// Analiza wieloagentowa (automatycznie zapisywana)
const result = await analyzePatientDataMultiAgent(
  medicalHistory,
  studyProtocol,
  'claude-opus'
);
```

### Ręczne Zapisywanie

```typescript
import { analysisHistoryService } from './services/AnalysisHistoryService';

// Zapisz analizę klasyczną
const analysisId = await analysisHistoryService.saveSingleAgentAnalysis(
  patientData,
  medicalHistory,
  studyProtocol,
  rawAIResponse
);

// Zapisz analizę wieloagentową
const analysisId = await analysisHistoryService.saveMultiAgentAnalysis(
  patientData,
  agentResults,
  medicalHistory,
  studyProtocol,
  executionLogs
);

// Zapisz nieudaną analizę
const analysisId = await analysisHistoryService.saveFailedAnalysis(
  partialPatientData,
  medicalHistory,
  studyProtocol,
  errorMessage,
  'single-agent'
);
```

## 🔍 Wyszukiwanie i Filtrowanie

### Podstawowe Operacje

```typescript
// Lista wszystkich analiz
const analyses = await analysisHistoryService.getAnalysesList({
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

// Wyszukiwanie tekstowe
const searchResults = await analysisHistoryService.searchAnalyses(
  'pacjent depresja',
  { analysisType: 'multi-agent' }
);

// Analizy konkretnego pacjenta
const patientAnalyses = await analysisHistoryService.getPatientAnalyses(
  'patient_45_depresja_major_abc123'
);

// Ostatnie analizy
const recentAnalyses = await analysisHistoryService.getRecentAnalyses(10);
```

### Zaawansowane Filtrowanie

```typescript
const filteredAnalyses = await analysisHistoryService.getAnalysesList({
  analysisType: 'multi-agent',
  modelUsed: 'claude-opus',
  status: 'completed',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  tags: ['trd:confirmed', 'age:senior'],
  page: 1,
  pageSize: 50
});
```

## 📊 Zarządzanie i Statystyki

### Statystyki

```typescript
const stats = await analysisHistoryService.getStatistics();
console.log(stats);
// {
//   total: 150,
//   byType: { 'single-agent': 100, 'multi-agent': 50 },
//   byModel: { 'o3': 80, 'claude-opus': 70 },
//   byStatus: { 'completed': 145, 'failed': 5 },
//   recentCount: 25,
//   storageSize: 52428800
// }
```

### Zarządzanie Metadanymi

```typescript
// Aktualizuj metadane
await analysisHistoryService.updateAnalysisMetadata(analysisId, {
  notes: 'Pacjent z wysokim ryzykiem',
  tags: ['high-risk', 'requires-review']
});

// Dodaj tagi
await analysisHistoryService.addTagsToAnalysis(analysisId, [
  'reviewed-by-doctor',
  'approved'
]);
```

### Czyszczenie

```typescript
// Usuń stare analizy (starsze niż 365 dni)
const deletedCount = await analysisHistoryService.cleanupOldAnalyses(365);

// Usuń konkretne analizy
await analysisHistoryService.deleteMultipleAnalyses([
  'analysis_abc123',
  'analysis_def456'
]);
```

## 📤 Eksport i Import

### Eksport Analiz

```typescript
// Eksportuj wybrane analizy
const analyses = await analysisHistoryService.exportAnalyses([
  'analysis_abc123',
  'analysis_def456'
]);

// Zapisz do pliku
const exportData = JSON.stringify(analyses, null, 2);
await fs.writeFile('export.json', exportData);
```

### Import Analiz

```typescript
// Wczytaj z pliku
const importData = await fs.readFile('export.json', 'utf-8');
const analyses = JSON.parse(importData);

// Importuj analizy
const result = await analysisHistoryService.importAnalyses(analyses);
console.log(`Zaimportowano: ${result.imported}, błędy: ${result.failed}`);
```

## 🔄 Migracja do AWS

### Przygotowanie AWS

1. **Utwórz S3 Bucket:**
```bash
aws s3 mb s3://medical-analysis-storage --region us-east-1
```

2. **Utwórz tabelę DynamoDB:**
```bash
aws dynamodb create-table \
  --table-name medical-analysis-metadata \
  --attribute-definitions \
    AttributeName=analysisId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=patientId,AttributeType=S \
    AttributeName=analysisType,AttributeType=S \
    AttributeName=modelUsed,AttributeType=S \
  --key-schema \
    AttributeName=analysisId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=PatientIndex,KeySchema=[{AttributeName=patientId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    IndexName=TypeIndex,KeySchema=[{AttributeName=analysisType,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    IndexName=ModelIndex,KeySchema=[{AttributeName=modelUsed,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

3. **Skonfiguruj IAM:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::medical-analysis-storage",
        "arn:aws:s3:::medical-analysis-storage/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/medical-analysis-metadata",
        "arn:aws:dynamodb:us-east-1:*:table/medical-analysis-metadata/index/*"
      ]
    }
  ]
}
```

### Migracja Danych

```typescript
import { StorageFactory } from './services/storage/StorageFactory';

// Utwórz storage'y
const localStorage = StorageFactory.createStorage({
  type: 'local',
  basePath: './History'
});

const awsStorage = StorageFactory.createStorage({
  type: 'aws-s3',
  awsConfig: {
    region: 'us-east-1',
    bucket: 'medical-analysis-storage',
    tableName: 'medical-analysis-metadata'
  }
});

// Migruj dane
const migrationResult = await StorageFactory.migrateData(
  localStorage,
  awsStorage,
  10 // batch size
);

console.log(`Migracja: ${migrationResult.migrated} sukces, ${migrationResult.failed} błędów`);
```

### Zmiana Konfiguracji

```typescript
// Zmień storage w działającej aplikacji
await analysisHistoryService.changeStorage({
  type: 'aws-s3',
  awsConfig: {
    region: 'us-east-1',
    bucket: 'medical-analysis-storage',
    tableName: 'medical-analysis-metadata'
  },
  compression: true,
  encryption: true
});
```

## 🎨 Interfejs Użytkownika

### Komponent AnalysisHistory

```tsx
import { AnalysisHistory } from './components/AnalysisHistory';

function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  return (
    <div>
      <button onClick={() => setShowHistory(true)}>
        Historia Analiz
      </button>
      
      {showHistory && (
        <AnalysisHistory
          onAnalysisSelect={(analysis) => {
            setSelectedAnalysis(analysis);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
```

### Funkcjonalności UI

- **Wyszukiwanie:** Po ID pacjenta, typie analizy, modelu
- **Filtrowanie:** Typ analizy, model AI, status, daty
- **Paginacja:** Obsługa dużych ilości danych
- **Statystyki:** Podsumowanie w czasie rzeczywistym
- **Zarządzanie:** Usuwanie, tagowanie, eksport

## 🔒 Bezpieczeństwo

### Lokalne Storage
- Pliki przechowywane w folderze `./History/`
- Opcjonalne szyfrowanie plików
- Kontrola dostępu przez system plików

### AWS Storage
- Szyfrowanie w spoczynku (S3 + DynamoDB)
- Szyfrowanie w tranzycie (HTTPS)
- IAM role i polityki
- VPC endpoints dla bezpieczeństwa sieci

## 📈 Wydajność

### Optymalizacje Lokalne
- Podział na metadane i dane
- Indeksowanie przez nazwy plików
- Lazy loading pełnych danych

### Optymalizacje AWS
- DynamoDB GSI dla szybkich zapytań
- S3 partycjonowanie według daty
- Batch operations dla operacji masowych
- CloudFront dla cache'owania

## 🚨 Monitoring i Logi

### Logi Systemowe
```
📁 [LocalStorage] Initialized directories: ./History
💾 [HistoryService] Saved single-agent analysis: analysis_abc123
📖 [HistoryService] Loaded analysis: analysis_abc123 (single-agent)
🔍 [HistoryService] Found 5 analyses for query: "depresja"
🧹 [HistoryService] Cleaned up 10 analyses older than 365 days
```

### Metryki
- Liczba zapisanych analiz
- Rozmiar storage'u
- Czas odpowiedzi operacji
- Błędy i ostrzeżenia

## 🔧 Rozwiązywanie Problemów

### Częste Problemy

1. **Brak uprawnień do zapisu:**
```bash
chmod 755 ./History
```

2. **Przekroczenie limitu rozmiaru:**
```typescript
// Zwiększ limit w konfiguracji
const config = {
  maxFileSize: 100 * 1024 * 1024 // 100MB
};
```

3. **Błędy AWS:**
```bash
# Sprawdź konfigurację
aws configure list
aws sts get-caller-identity
```

### Diagnostyka

```typescript
// Test połączenia
const isConnected = await analysisHistoryService.testConnection();
console.log('Storage connected:', isConnected);

// Statystyki storage'u
const stats = await analysisHistoryService.getStatistics();
console.log('Storage stats:', stats);
```

## 🎯 Najlepsze Praktyki

1. **Regularne Backupy:** Eksportuj analizy regularnie
2. **Monitoring Rozmiaru:** Śledź rozmiar storage'u
3. **Czyszczenie:** Usuwaj stare analizy zgodnie z polityką
4. **Tagowanie:** Używaj tagów dla lepszej organizacji
5. **Testowanie:** Testuj migrację na środowisku testowym

## 🔮 Przyszłe Rozszerzenia

- **Elasticsearch:** Pełnotekstowe wyszukiwanie
- **Redis:** Cache dla często używanych analiz
- **PostgreSQL:** Relacyjna baza dla złożonych zapytań
- **Kubernetes:** Skalowanie w chmurze
- **Machine Learning:** Automatyczne tagowanie i kategoryzacja 