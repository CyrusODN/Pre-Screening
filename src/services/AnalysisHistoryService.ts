// ============================================================================
// ANALYSIS HISTORY SERVICE - Główny serwis zarządzania historią analiz
// ============================================================================

import { 
  AnalysisStorage, 
  StoredAnalysis, 
  AnalysisMetadata, 
  AnalysisList, 
  SearchOptions, 
  StorageConfig,
  StorageError 
} from '../types/storage';
import type { PatientData } from '../types/index';
import { StorageFactory } from './storage/StorageFactory';

/**
 * Główny serwis do zarządzania historią analiz
 * Zapewnia jednolity interfejs do zapisywania, wczytywania i zarządzania analizami
 */
export class AnalysisHistoryService {
  private storage: AnalysisStorage;
  private config: StorageConfig;

  constructor(config?: StorageConfig) {
    // Użyj przekazanej konfiguracji lub stwórz z zmiennych środowiskowych
    this.config = config || StorageFactory.createConfigFromEnv();
    
    // Waliduj konfigurację
    StorageFactory.validateConfig(this.config);
    
    // Stwórz storage
    this.storage = StorageFactory.createStorage(this.config);
    
    console.log(`📚 [HistoryService] Initialized with ${this.config.type} storage`);
  }

  // ============================================================================
  // ZAPISYWANIE ANALIZ
  // ============================================================================

  /**
   * Zapisuje analizę wieloagentową
   */
  async saveMultiAgentAnalysis(
    patientData: PatientData,
    agentResults: Record<string, any>,
    medicalHistory: string,
    studyProtocol: string,
    rawResponse?: string
  ): Promise<string> {
    try {
      const analysis: StoredAnalysis = {
        metadata: {
          id: '', // Zostanie wygenerowane
          patientId: patientData.summary?.id || this.generatePatientId(patientData),
          analysisType: 'multi-agent',
          modelUsed: patientData.modelUsed || 'unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'completed',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          tags: this.generateTags(patientData, 'multi-agent'),
          notes: `Analiza wieloagentowa pacjenta ${patientData.summary?.age || 'N/A'} lat`
        },
        patientData,
        agentResults,
        medicalHistory,
        studyProtocol,
        rawResponse
      };

      const analysisId = await this.storage.save(analysis);
      
      console.log(`💾 [HistoryService] Saved multi-agent analysis: ${analysisId}`);
      return analysisId;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to save multi-agent analysis:', error);
      throw new StorageError(
        `Failed to save multi-agent analysis: ${error}`,
        'INVALID_DATA',
        error
      );
    }
  }

  /**
   * Zapisuje analizę monoagentową (klasyczną)
   */
  async saveSingleAgentAnalysis(
    patientData: PatientData,
    medicalHistory: string,
    studyProtocol: string,
    rawResponse?: string
  ): Promise<string> {
    try {
      const analysis: StoredAnalysis = {
        metadata: {
          id: '', // Zostanie wygenerowane
          patientId: patientData.summary?.id || this.generatePatientId(patientData),
          analysisType: 'single-agent',
          modelUsed: patientData.modelUsed || 'unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'completed',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          tags: this.generateTags(patientData, 'single-agent'),
          notes: `Analiza klasyczna pacjenta ${patientData.summary?.age || 'N/A'} lat`
        },
        patientData,
        medicalHistory,
        studyProtocol,
        rawResponse
      };

      const analysisId = await this.storage.save(analysis);
      
      console.log(`💾 [HistoryService] Saved single-agent analysis: ${analysisId}`);
      return analysisId;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to save single-agent analysis:', error);
      throw new StorageError(
        `Failed to save single-agent analysis: ${error}`,
        'INVALID_DATA',
        error
      );
    }
  }

  /**
   * Zapisuje analizę z błędem
   */
  async saveFailedAnalysis(
    patientData: Partial<PatientData>,
    medicalHistory: string,
    studyProtocol: string,
    error: string,
    analysisType: 'single-agent' | 'multi-agent' = 'single-agent'
  ): Promise<string> {
    try {
      const analysis: StoredAnalysis = {
        metadata: {
          id: '', // Zostanie wygenerowane
          patientId: patientData.summary?.id || 'unknown',
          analysisType,
          modelUsed: patientData.modelUsed || 'unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'failed',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          tags: ['failed', analysisType],
          notes: `Analiza nieudana: ${error}`
        },
        patientData: patientData as PatientData,
        medicalHistory,
        studyProtocol,
        rawResponse: error
      };

      const analysisId = await this.storage.save(analysis);
      
      console.log(`💾 [HistoryService] Saved failed analysis: ${analysisId}`);
      return analysisId;

    } catch (saveError) {
      console.error('❌ [HistoryService] Failed to save failed analysis:', saveError);
      throw new StorageError(
        `Failed to save failed analysis: ${saveError}`,
        'INVALID_DATA',
        saveError
      );
    }
  }

  // ============================================================================
  // WCZYTYWANIE ANALIZ
  // ============================================================================

  /**
   * Wczytuje analizę po ID
   */
  async loadAnalysis(id: string): Promise<StoredAnalysis | null> {
    try {
      const analysis = await this.storage.load(id);
      
      if (analysis) {
        console.log(`📖 [HistoryService] Loaded analysis: ${id} (${analysis.metadata.analysisType})`);
      }
      
      return analysis;

    } catch (error) {
      console.error(`❌ [HistoryService] Failed to load analysis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Pobiera listę analiz z opcjami filtrowania
   */
  async getAnalysesList(options: SearchOptions = {}): Promise<AnalysisList> {
    try {
      const result = await this.storage.list(options);
      
      console.log(`📋 [HistoryService] Listed ${result.analyses.length}/${result.total} analyses`);
      return result;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to list analyses:', error);
      throw error;
    }
  }

  /**
   * Wyszukuje analizy po zapytaniu tekstowym
   */
  async searchAnalyses(query: string, options: SearchOptions = {}): Promise<AnalysisList> {
    try {
      const result = await this.storage.search(query, options);
      
      console.log(`🔍 [HistoryService] Found ${result.analyses.length} analyses for query: "${query}"`);
      return result;

    } catch (error) {
      console.error(`❌ [HistoryService] Failed to search analyses for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Pobiera analizy dla konkretnego pacjenta
   */
  async getPatientAnalyses(patientId: string, options: SearchOptions = {}): Promise<AnalysisList> {
    const searchOptions: SearchOptions = {
      ...options,
      patientId,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    return this.getAnalysesList(searchOptions);
  }

  /**
   * Pobiera ostatnie analizy
   */
  async getRecentAnalyses(limit: number = 10): Promise<AnalysisList> {
    const options: SearchOptions = {
      pageSize: limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    return this.getAnalysesList(options);
  }

  // ============================================================================
  // ZARZĄDZANIE ANALIZAMI
  // ============================================================================

  /**
   * Aktualizuje metadane analizy
   */
  async updateAnalysisMetadata(
    id: string, 
    updates: Partial<AnalysisMetadata>
  ): Promise<boolean> {
    try {
      const success = await this.storage.updateMetadata(id, updates);
      
      if (success) {
        console.log(`🏷️ [HistoryService] Updated metadata for analysis: ${id}`);
      }
      
      return success;

    } catch (error) {
      console.error(`❌ [HistoryService] Failed to update metadata for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Dodaje tagi do analizy
   */
  async addTagsToAnalysis(id: string, tags: string[]): Promise<boolean> {
    try {
      const metadata = await this.storage.getMetadata(id);
      if (!metadata) return false;

      const existingTags = metadata.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])]; // Usuń duplikaty

      return this.updateAnalysisMetadata(id, { tags: newTags });

    } catch (error) {
      console.error(`❌ [HistoryService] Failed to add tags to ${id}:`, error);
      throw error;
    }
  }

  /**
   * Usuwa analizę
   */
  async deleteAnalysis(id: string): Promise<boolean> {
    try {
      const success = await this.storage.delete(id);
      
      if (success) {
        console.log(`🗑️ [HistoryService] Deleted analysis: ${id}`);
      }
      
      return success;

    } catch (error) {
      console.error(`❌ [HistoryService] Failed to delete analysis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Usuwa wiele analiz
   */
  async deleteMultipleAnalyses(ids: string[]): Promise<number> {
    try {
      const deletedCount = await this.storage.bulkDelete(ids);
      
      console.log(`🗑️ [HistoryService] Bulk deleted ${deletedCount}/${ids.length} analyses`);
      return deletedCount;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to bulk delete analyses:', error);
      throw error;
    }
  }

  // ============================================================================
  // EKSPORT I IMPORT
  // ============================================================================

  /**
   * Eksportuje analizy do pliku JSON
   */
  async exportAnalyses(ids: string[]): Promise<StoredAnalysis[]> {
    try {
      const analyses = await this.storage.export(ids);
      
      console.log(`📤 [HistoryService] Exported ${analyses.length} analyses`);
      return analyses;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to export analyses:', error);
      throw error;
    }
  }

  /**
   * Importuje analizy z danych JSON
   */
  async importAnalyses(analyses: StoredAnalysis[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      imported: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const analysis of analyses) {
      try {
        await this.storage.save(analysis);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import analysis ${analysis.metadata.id}: ${error}`);
      }
    }

    console.log(`📥 [HistoryService] Imported ${result.imported}/${analyses.length} analyses`);
    return result;
  }

  // ============================================================================
  // STATYSTYKI I ZARZĄDZANIE
  // ============================================================================

  /**
   * Pobiera statystyki analiz
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byModel: Record<string, number>;
    byStatus: Record<string, number>;
    recentCount: number;
    storageSize: number;
  }> {
    try {
      const stats = await this.storage.getStats();
      const storageSize = await this.storage.getStorageSize();

      return {
        ...stats,
        storageSize
      };

    } catch (error) {
      console.error('❌ [HistoryService] Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Czyści stare analizy
   */
  async cleanupOldAnalyses(olderThanDays?: number): Promise<number> {
    try {
      const days = olderThanDays || this.config.retentionDays || 365;
      const deletedCount = await this.storage.cleanup(days);
      
      console.log(`🧹 [HistoryService] Cleaned up ${deletedCount} analyses older than ${days} days`);
      return deletedCount;

    } catch (error) {
      console.error('❌ [HistoryService] Failed to cleanup old analyses:', error);
      throw error;
    }
  }

  /**
   * Testuje połączenie ze storage'em
   */
  async testConnection(): Promise<boolean> {
    try {
      return await StorageFactory.testConnection(this.storage);
    } catch (error) {
      console.error('❌ [HistoryService] Storage connection test failed:', error);
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generatePatientId(patientData: PatientData): string {
    // Generuj ID pacjenta na podstawie dostępnych danych
    const age = patientData.summary?.age || 'unknown';
    const diagnosis = patientData.summary?.mainDiagnosis || 'unknown';
    const timestamp = Date.now().toString(36);
    
    return `patient_${age}_${diagnosis.replace(/\s+/g, '_').toLowerCase()}_${timestamp}`;
  }

  private generateTags(patientData: PatientData, analysisType: string): string[] {
    const tags: string[] = [analysisType];

    // Dodaj tagi na podstawie danych pacjenta
    if (patientData.summary?.mainDiagnosis) {
      tags.push('diagnosis:' + patientData.summary.mainDiagnosis.toLowerCase().replace(/\s+/g, '_'));
    }

    if (patientData.summary?.age) {
      const age = parseInt(patientData.summary.age.toString());
      if (age < 30) tags.push('age:young');
      else if (age < 60) tags.push('age:middle');
      else tags.push('age:senior');
    }

    if (patientData.modelUsed) {
      tags.push('model:' + patientData.modelUsed);
    }

    if (patientData.trdAnalysis?.conclusion?.toLowerCase().includes('trd')) {
      tags.push('trd:confirmed');
    }

    return tags;
  }

  /**
   * Pobiera konfigurację storage'u
   */
  getStorageConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Zmienia storage (np. podczas migracji)
   */
  async changeStorage(newConfig: StorageConfig): Promise<void> {
    StorageFactory.validateConfig(newConfig);
    
    const newStorage = StorageFactory.createStorage(newConfig);
    
    // Test połączenia
    const connectionOk = await StorageFactory.testConnection(newStorage);
    if (!connectionOk) {
      throw new StorageError('Failed to connect to new storage', 'NETWORK_ERROR');
    }

    this.storage = newStorage;
    this.config = newConfig;
    
    console.log(`🔄 [HistoryService] Changed storage to: ${newConfig.type}`);
  }
}

// Singleton instance
export const analysisHistoryService = new AnalysisHistoryService();
export default analysisHistoryService; 