// ============================================================================
// BACKEND ANALYSIS STORAGE - Adapter do komunikacji z backend API
// ============================================================================

import { 
  AnalysisStorage, 
  StoredAnalysis, 
  AnalysisMetadata, 
  AnalysisList, 
  SearchOptions, 
  StorageConfig,
  StorageError 
} from '../../types/storage';

// Rozszerzony config dla backend storage
interface BackendStorageConfig extends StorageConfig {
  baseUrl?: string;
}

export class BackendAnalysisStorage implements AnalysisStorage {
  private baseUrl: string;
  private config: BackendStorageConfig;

  constructor(config: BackendStorageConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'http://localhost:3001';
  }

  // ============================================================================
  // PODSTAWOWE OPERACJE CRUD
  // ============================================================================

  async save(analysis: StoredAnalysis): Promise<string> {
    try {
      console.log('💾 [BackendStorage] Saving analysis via API...');
      
      const response = await fetch(`${this.baseUrl}/api/analysis/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysis)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          `Backend save failed: ${errorData.error}`,
          'NETWORK_ERROR',
          errorData
        );
      }

      const result = await response.json();
      console.log(`✅ [BackendStorage] Analysis saved with ID: ${result.id}`);
      return result.id;

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to save analysis via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async load(id: string): Promise<StoredAnalysis | null> {
    try {
      console.log(`📖 [BackendStorage] Loading analysis: ${id}`);
      
      const response = await fetch(`${this.baseUrl}/api/analysis/load/${id}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          `Backend load failed: ${errorData.error}`,
          'NETWORK_ERROR',
          errorData
        );
      }

      const analysis = await response.json();
      console.log(`✅ [BackendStorage] Analysis loaded: ${id}`);
      return analysis;

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to load analysis via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async update(id: string, updates: Partial<StoredAnalysis>): Promise<boolean> {
    try {
      // Najpierw wczytaj istniejącą analizę
      const existing = await this.load(id);
      if (!existing) return false;

      // Połącz z aktualizacjami
      const updated: StoredAnalysis = {
        ...existing,
        ...updates,
        metadata: {
          ...existing.metadata,
          ...updates.metadata,
          id, // Zachowaj oryginalne ID
          updatedAt: new Date().toISOString()
        }
      };

      // Zapisz zaktualizowaną wersję
      await this.save(updated);
      console.log(`🔄 [BackendStorage] Updated analysis: ${id}`);
      return true;

    } catch (error) {
      throw new StorageError(
        `Failed to update analysis via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ [BackendStorage] Deleting analysis: ${id}`);
      
      const response = await fetch(`${this.baseUrl}/api/analysis/delete/${id}`, {
        method: 'DELETE'
      });

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          `Backend delete failed: ${errorData.error}`,
          'NETWORK_ERROR',
          errorData
        );
      }

      console.log(`✅ [BackendStorage] Analysis deleted: ${id}`);
      return true;

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to delete analysis via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // OPERACJE LISTOWANIA I WYSZUKIWANIA
  // ============================================================================

  async list(options: SearchOptions = {}): Promise<AnalysisList> {
    try {
      console.log('📋 [BackendStorage] Listing analyses...');
      
      const params = new URLSearchParams();
      if (options.pageSize) params.append('limit', options.pageSize.toString());
      if (options.page) {
        const offset = (options.page - 1) * (options.pageSize || 50);
        params.append('offset', offset.toString());
      }
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await fetch(`${this.baseUrl}/api/analysis/list?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          `Backend list failed: ${errorData.error}`,
          'NETWORK_ERROR',
          errorData
        );
      }

      const analysesList = await response.json();
      console.log(`✅ [BackendStorage] Listed ${analysesList.analyses.length} analyses`);
      return analysesList;

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to list analyses via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<AnalysisList> {
    // Dla uproszczenia, używamy list() z filtrowaniem po stronie klienta
    const allAnalyses = await this.list(options);
    
    // Filtruj wyniki według query
    const filteredAnalyses = allAnalyses.analyses.filter(analysis => 
      analysis.patientId.toLowerCase().includes(query.toLowerCase()) ||
      analysis.notes?.toLowerCase().includes(query.toLowerCase()) ||
      analysis.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return {
      ...allAnalyses,
      analyses: filteredAnalyses,
      total: filteredAnalyses.length
    };
  }

  // ============================================================================
  // OPERACJE NA METADANYCH
  // ============================================================================

  async getMetadata(id: string): Promise<AnalysisMetadata | null> {
    const analysis = await this.load(id);
    return analysis?.metadata || null;
  }

  async updateMetadata(id: string, updates: Partial<AnalysisMetadata>): Promise<boolean> {
    // Sprawdź czy analiza istnieje
    const existing = await this.load(id);
    if (!existing) return false;

    // Utwórz zaktualizowane metadane
    const updatedMetadata: AnalysisMetadata = {
      ...existing.metadata,
      ...updates,
      id, // Zachowaj oryginalne ID
      updatedAt: new Date().toISOString()
    };

    return this.update(id, { metadata: updatedMetadata });
  }

  // ============================================================================
  // OPERACJE MASOWE
  // ============================================================================

  async bulkDelete(ids: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const id of ids) {
      try {
        const deleted = await this.delete(id);
        if (deleted) deletedCount++;
      } catch (error) {
        console.warn(`⚠️ [BackendStorage] Failed to delete ${id}:`, error);
      }
    }

    return deletedCount;
  }

  async export(ids: string[]): Promise<StoredAnalysis[]> {
    const analyses: StoredAnalysis[] = [];
    
    for (const id of ids) {
      try {
        const analysis = await this.load(id);
        if (analysis) analyses.push(analysis);
      } catch (error) {
        console.warn(`⚠️ [BackendStorage] Failed to export ${id}:`, error);
      }
    }

    return analyses;
  }

  // ============================================================================
  // STATYSTYKI
  // ============================================================================

  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byModel: Record<string, number>;
    byStatus: Record<string, number>;
    recentCount: number;
  }> {
    try {
      console.log('📊 [BackendStorage] Getting stats...');
      
      const response = await fetch(`${this.baseUrl}/api/analysis/stats`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          `Backend stats failed: ${errorData.error}`,
          'NETWORK_ERROR',
          errorData
        );
      }

      const stats = await response.json();
      console.log(`✅ [BackendStorage] Stats retrieved: ${stats.total} total analyses`);
      return stats;

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to get stats via backend: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // ZARZĄDZANIE PRZESTRZENIĄ
  // ============================================================================

  async cleanup(olderThanDays: number): Promise<number> {
    // Implementacja cleanup przez backend API (do dodania w przyszłości)
    console.warn('⚠️ [BackendStorage] Cleanup not implemented via API yet');
    return 0;
  }

  async getStorageSize(): Promise<number> {
    // Implementacja getStorageSize przez backend API (do dodania w przyszłości)
    console.warn('⚠️ [BackendStorage] Storage size calculation not implemented via API yet');
    return 0;
  }
} 