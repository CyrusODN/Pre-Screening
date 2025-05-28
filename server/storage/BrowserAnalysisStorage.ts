// ============================================================================
// BROWSER ANALYSIS STORAGE - Przechowywanie analiz w przeglądarce (IndexedDB)
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

export class BrowserAnalysisStorage implements AnalysisStorage {
  private dbName: string = 'MedicalAnalysisDB';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.initializeDB();
  }

  // ============================================================================
  // INICJALIZACJA INDEXEDDB
  // ============================================================================

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new StorageError(
          'Failed to open IndexedDB',
          'PERMISSION_DENIED',
          request.error
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`📁 [BrowserStorage] IndexedDB initialized: ${this.dbName}`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store dla metadanych
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metadataStore.createIndex('patientId', 'patientId', { unique: false });
          metadataStore.createIndex('analysisType', 'analysisType', { unique: false });
          metadataStore.createIndex('modelUsed', 'modelUsed', { unique: false });
          metadataStore.createIndex('status', 'status', { unique: false });
          metadataStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store dla pełnych danych
        if (!db.objectStoreNames.contains('analyses')) {
          db.createObjectStore('analyses', { keyPath: 'metadata.id' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new StorageError('Database not initialized', 'NETWORK_ERROR');
    }
    return this.db;
  }

  // ============================================================================
  // PODSTAWOWE OPERACJE CRUD
  // ============================================================================

  async save(analysis: StoredAnalysis): Promise<string> {
    try {
      const db = await this.ensureDB();
      const id = analysis.metadata.id || this.generateId();
      const now = new Date().toISOString();

      // Przygotuj metadane
      const metadata: AnalysisMetadata = {
        ...analysis.metadata,
        id,
        createdAt: analysis.metadata.createdAt || now,
        updatedAt: now,
        version: import.meta.env.VITE_APP_VERSION || '1.0.0'
      };

      // Przygotuj dane do zapisu
      const dataToSave: StoredAnalysis = {
        ...analysis,
        metadata
      };

      // Sprawdź rozmiar danych
      const dataString = JSON.stringify(dataToSave);
      if (this.config.maxFileSize && new Blob([dataString]).size > this.config.maxFileSize) {
        throw new StorageError(
          `Analysis data exceeds maximum size: ${this.config.maxFileSize} bytes`,
          'STORAGE_FULL'
        );
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata', 'analyses'], 'readwrite');
        
        transaction.onerror = () => {
          reject(new StorageError(
            `Failed to save analysis: ${transaction.error}`,
            'INVALID_DATA',
            transaction.error
          ));
        };

        transaction.oncomplete = () => {
          console.log(`💾 [BrowserStorage] Saved analysis: ${id} (${metadata.analysisType})`);
          resolve(id);
        };

        // Zapisz metadane
        const metadataStore = transaction.objectStore('metadata');
        metadataStore.put(metadata);

        // Zapisz pełne dane
        const analysisStore = transaction.objectStore('analyses');
        analysisStore.put(dataToSave);
      });

    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to save analysis: ${error}`,
        'INVALID_DATA',
        error
      );
    }
  }

  async load(id: string): Promise<StoredAnalysis | null> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['analyses'], 'readonly');
        const store = transaction.objectStore('analyses');
        const request = store.get(id);

        request.onerror = () => {
          reject(new StorageError(
            `Failed to load analysis ${id}: ${request.error}`,
            'NOT_FOUND',
            request.error
          ));
        };

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log(`📖 [BrowserStorage] Loaded analysis: ${id}`);
          }
          resolve(result || null);
        };
      });

    } catch (error) {
      throw new StorageError(
        `Failed to load analysis ${id}: ${error}`,
        'NOT_FOUND',
        error
      );
    }
  }

  async update(id: string, updates: Partial<StoredAnalysis>): Promise<boolean> {
    try {
      const existing = await this.load(id);
      if (!existing) return false;

      const updated: StoredAnalysis = {
        ...existing,
        ...updates,
        metadata: {
          ...existing.metadata,
          ...updates.metadata,
          id,
          updatedAt: new Date().toISOString()
        }
      };

      await this.save(updated);
      console.log(`🔄 [BrowserStorage] Updated analysis: ${id}`);
      return true;

    } catch (error) {
      throw new StorageError(
        `Failed to update analysis ${id}: ${error}`,
        'INVALID_DATA',
        error
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata', 'analyses'], 'readwrite');
        let deleted = false;

        transaction.onerror = () => {
          reject(new StorageError(
            `Failed to delete analysis ${id}: ${transaction.error}`,
            'PERMISSION_DENIED',
            transaction.error
          ));
        };

        transaction.oncomplete = () => {
          if (deleted) {
            console.log(`🗑️ [BrowserStorage] Deleted analysis: ${id}`);
          }
          resolve(deleted);
        };

        // Usuń metadane
        const metadataStore = transaction.objectStore('metadata');
        const metadataRequest = metadataStore.delete(id);
        metadataRequest.onsuccess = () => { deleted = true; };

        // Usuń dane
        const analysisStore = transaction.objectStore('analyses');
        const analysisRequest = analysisStore.delete(id);
        analysisRequest.onsuccess = () => { deleted = true; };
      });

    } catch (error) {
      throw new StorageError(
        `Failed to delete analysis ${id}: ${error}`,
        'PERMISSION_DENIED',
        error
      );
    }
  }

  // ============================================================================
  // OPERACJE LISTOWANIA I WYSZUKIWANIA
  // ============================================================================

  async list(options: SearchOptions = {}): Promise<AnalysisList> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.getAll();

        request.onerror = () => {
          reject(new StorageError(
            `Failed to list analyses: ${request.error}`,
            'NETWORK_ERROR',
            request.error
          ));
        };

        request.onsuccess = () => {
          let allMetadata: AnalysisMetadata[] = request.result;

          // Filtruj według opcji
          let filtered = this.filterMetadata(allMetadata, options);

          // Sortuj
          filtered = this.sortMetadata(filtered, options);

          // Paginacja
          const page = options.page || 1;
          const pageSize = options.pageSize || 50;
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedResults = filtered.slice(startIndex, endIndex);

          resolve({
            analyses: paginatedResults,
            total: filtered.length,
            page,
            pageSize
          });
        };
      });

    } catch (error) {
      throw new StorageError(
        `Failed to list analyses: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<AnalysisList> {
    try {
      const allResults = await this.list(options);
      
      // Wyszukaj w metadanych
      const searchResults = allResults.analyses.filter(metadata => {
        const searchableText = [
          metadata.patientId,
          metadata.analysisType,
          metadata.modelUsed,
          metadata.notes || '',
          ...(metadata.tags || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(query.toLowerCase());
      });

      return {
        analyses: searchResults,
        total: searchResults.length,
        page: options.page,
        pageSize: options.pageSize
      };

    } catch (error) {
      throw new StorageError(
        `Failed to search analyses: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // OPERACJE NA METADANYCH
  // ============================================================================

  async getMetadata(id: string): Promise<AnalysisMetadata | null> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(id);

        request.onerror = () => {
          reject(new StorageError(
            `Failed to get metadata for ${id}: ${request.error}`,
            'NOT_FOUND',
            request.error
          ));
        };

        request.onsuccess = () => {
          resolve(request.result || null);
        };
      });

    } catch (error) {
      throw new StorageError(
        `Failed to get metadata for ${id}: ${error}`,
        'NOT_FOUND',
        error
      );
    }
  }

  async updateMetadata(id: string, updates: Partial<AnalysisMetadata>): Promise<boolean> {
    try {
      const existing = await this.getMetadata(id);
      if (!existing) return false;

      const updated: AnalysisMetadata = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      };

      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        const request = store.put(updated);

        request.onerror = () => {
          reject(new StorageError(
            `Failed to update metadata for ${id}: ${request.error}`,
            'INVALID_DATA',
            request.error
          ));
        };

        request.onsuccess = () => {
          console.log(`🏷️ [BrowserStorage] Updated metadata: ${id}`);
          resolve(true);
        };
      });

    } catch (error) {
      throw new StorageError(
        `Failed to update metadata for ${id}: ${error}`,
        'INVALID_DATA',
        error
      );
    }
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
        console.warn(`⚠️ [BrowserStorage] Failed to delete ${id}: ${error}`);
      }
    }

    console.log(`🗑️ [BrowserStorage] Bulk deleted ${deletedCount}/${ids.length} analyses`);
    return deletedCount;
  }

  async export(ids: string[]): Promise<StoredAnalysis[]> {
    const results: StoredAnalysis[] = [];

    for (const id of ids) {
      try {
        const analysis = await this.load(id);
        if (analysis) {
          results.push(analysis);
        }
      } catch (error) {
        console.warn(`⚠️ [BrowserStorage] Failed to export ${id}: ${error}`);
      }
    }

    console.log(`📤 [BrowserStorage] Exported ${results.length}/${ids.length} analyses`);
    return results;
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
      const allResults = await this.list();
      const analyses = allResults.analyses;

      const stats = {
        total: analyses.length,
        byType: {} as Record<string, number>,
        byModel: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        recentCount: 0
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const analysis of analyses) {
        // Statystyki według typu
        stats.byType[analysis.analysisType] = (stats.byType[analysis.analysisType] || 0) + 1;
        
        // Statystyki według modelu
        stats.byModel[analysis.modelUsed] = (stats.byModel[analysis.modelUsed] || 0) + 1;
        
        // Statystyki według statusu
        stats.byStatus[analysis.status] = (stats.byStatus[analysis.status] || 0) + 1;
        
        // Ostatnie 7 dni
        if (new Date(analysis.createdAt) >= sevenDaysAgo) {
          stats.recentCount++;
        }
      }

      return stats;

    } catch (error) {
      throw new StorageError(
        `Failed to get statistics: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // ZARZĄDZANIE PRZESTRZENIĄ
  // ============================================================================

  async cleanup(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const allResults = await this.list();
      const toDelete = allResults.analyses
        .filter(analysis => new Date(analysis.createdAt) < cutoffDate)
        .map(analysis => analysis.id);

      const deletedCount = await this.bulkDelete(toDelete);
      
      console.log(`🧹 [BrowserStorage] Cleanup: deleted ${deletedCount} analyses older than ${olderThanDays} days`);
      return deletedCount;

    } catch (error) {
      throw new StorageError(
        `Failed to cleanup old analyses: ${error}`,
        'PERMISSION_DENIED',
        error
      );
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      // Przybliżone obliczenie rozmiaru w IndexedDB
      const allResults = await this.list();
      let totalSize = 0;

      for (const metadata of allResults.analyses) {
        const analysis = await this.load(metadata.id);
        if (analysis) {
          const dataString = JSON.stringify(analysis);
          totalSize += new Blob([dataString]).size;
        }
      }

      return totalSize;

    } catch (error) {
      throw new StorageError(
        `Failed to calculate storage size: ${error}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `analysis_${timestamp}_${random}`;
  }

  private filterMetadata(metadata: AnalysisMetadata[], options: SearchOptions): AnalysisMetadata[] {
    return metadata.filter(item => {
      if (options.patientId && item.patientId !== options.patientId) return false;
      if (options.analysisType && item.analysisType !== options.analysisType) return false;
      if (options.modelUsed && item.modelUsed !== options.modelUsed) return false;
      if (options.status && item.status !== options.status) return false;
      
      if (options.dateFrom && new Date(item.createdAt) < new Date(options.dateFrom)) return false;
      if (options.dateTo && new Date(item.createdAt) > new Date(options.dateTo)) return false;
      
      if (options.tags && options.tags.length > 0) {
        const itemTags = item.tags || [];
        if (!options.tags.some(tag => itemTags.includes(tag))) return false;
      }
      
      return true;
    });
  }

  private sortMetadata(metadata: AnalysisMetadata[], options: SearchOptions): AnalysisMetadata[] {
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    return metadata.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // Konwersja dat
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }
} 