// ============================================================================
// STORAGE TYPES - System przechowywania analiz
// ============================================================================

import type { PatientData } from './index';

// Metadane analizy
export interface AnalysisMetadata {
  id: string;
  patientId: string;
  analysisType: 'single-agent' | 'multi-agent';
  modelUsed: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  status: 'completed' | 'failed' | 'in_progress';
  version: string; // wersja systemu
  tags?: string[];
  notes?: string;
}

// Pełne dane analizy do zapisu
export interface StoredAnalysis {
  metadata: AnalysisMetadata;
  patientData: PatientData;
  agentResults?: Record<string, any>; // Wyniki wieloagentowe
  medicalHistory: string;
  studyProtocol: string;
  rawResponse?: string; // Surowa odpowiedź AI (dla debugowania)
}

// Lista analiz z metadanymi
export interface AnalysisList {
  analyses: AnalysisMetadata[];
  total: number;
  page?: number;
  pageSize?: number;
}

// Opcje wyszukiwania
export interface SearchOptions {
  patientId?: string;
  analysisType?: 'single-agent' | 'multi-agent';
  modelUsed?: string;
  status?: 'completed' | 'failed' | 'in_progress';
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'patientId';
  sortOrder?: 'asc' | 'desc';
}

// Abstrakcyjny interfejs storage'u
export interface AnalysisStorage {
  // Podstawowe operacje CRUD
  save(analysis: StoredAnalysis): Promise<string>; // zwraca ID
  load(id: string): Promise<StoredAnalysis | null>;
  update(id: string, analysis: Partial<StoredAnalysis>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  
  // Operacje listowania i wyszukiwania
  list(options?: SearchOptions): Promise<AnalysisList>;
  search(query: string, options?: SearchOptions): Promise<AnalysisList>;
  
  // Operacje na metadanych
  getMetadata(id: string): Promise<AnalysisMetadata | null>;
  updateMetadata(id: string, metadata: Partial<AnalysisMetadata>): Promise<boolean>;
  
  // Operacje masowe
  bulkDelete(ids: string[]): Promise<number>; // zwraca liczbę usuniętych
  export(ids: string[]): Promise<StoredAnalysis[]>;
  
  // Statystyki
  getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byModel: Record<string, number>;
    byStatus: Record<string, number>;
    recentCount: number; // ostatnie 7 dni
  }>;
  
  // Zarządzanie przestrzenią
  cleanup(olderThanDays: number): Promise<number>; // zwraca liczbę usuniętych
  getStorageSize(): Promise<number>; // rozmiar w bajtach
}

// Konfiguracja storage'u
export interface StorageConfig {
  type: 'local' | 'browser' | 'aws-s3' | 'aws-dynamodb';
  basePath?: string; // dla local storage (IndexedDB database name w przeglądarce)
  awsConfig?: {
    region: string;
    bucket?: string; // dla S3
    tableName?: string; // dla DynamoDB
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  compression?: boolean;
  encryption?: boolean;
  maxFileSize?: number; // w bajtach
  retentionDays?: number; // automatyczne usuwanie starych analiz
}

// Błędy storage'u
export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'STORAGE_FULL' | 'INVALID_DATA' | 'NETWORK_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Utility types
export type AnalysisId = string;
export type PatientId = string; 