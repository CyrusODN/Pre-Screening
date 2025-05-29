// ============================================================================
// LOCAL ANALYSIS STORAGE - Lokalne przechowywanie analiz
// ============================================================================

import { promises as fs } from 'fs';
import path from 'path';
import { 
  AnalysisStorage, 
  StoredAnalysis, 
  AnalysisMetadata, 
  AnalysisList, 
  SearchOptions, 
  StorageConfig,
  StorageError 
} from '../../types/storage';

export class LocalAnalysisStorage implements AnalysisStorage {
  private basePath: string;
  private metadataPath: string;
  private dataPath: string;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.basePath = config.basePath || './History';
    this.metadataPath = path.join(this.basePath, 'metadata');
    this.dataPath = path.join(this.basePath, 'data');
    
    this.ensureDirectories();
  }

  // ============================================================================
  // INICJALIZACJA
  // ============================================================================

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(this.metadataPath, { recursive: true });
      await fs.mkdir(this.dataPath, { recursive: true });
      
      console.log(`📁 [LocalStorage] Initialized directories: ${this.basePath}`);
    } catch (error) {
      throw new StorageError(
        `Failed to create storage directories: ${error}`,
        'PERMISSION_DENIED',
        error
      );
    }
  }

  // ============================================================================
  // PODSTAWOWE OPERACJE CRUD
  // ============================================================================

  async save(analysis: StoredAnalysis): Promise<string> {
    try {
      const id = analysis.metadata.id || this.generateId();
      const now = new Date().toISOString();
      
      // Przygotuj metadane
      const metadata: AnalysisMetadata = {
        ...analysis.metadata,
        id,
        createdAt: analysis.metadata.createdAt || now,
        updatedAt: now,
        version: process.env.npm_package_version || '1.0.0'
      };

      // Przygotuj dane do zapisu
      const dataToSave: StoredAnalysis = {
        ...analysis,
        metadata
      };

      // Kompresja jeśli włączona
      let dataString = JSON.stringify(dataToSave, null, 2);
      if (this.config.compression) {
        dataString = await this.compress(dataString);
      }

      // Sprawdź rozmiar pliku
      if (this.config.maxFileSize && Buffer.byteLength(dataString) > this.config.maxFileSize) {
        throw new StorageError(
          `Analysis data exceeds maximum file size: ${this.config.maxFileSize} bytes`,
          'STORAGE_FULL'
        );
      }

      // Zapisz metadane
      const metadataFile = path.join(this.metadataPath, `${id}.json`);
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      // Zapisz pełne dane
      const dataFile = path.join(this.dataPath, `${id}.json`);
      await fs.writeFile(dataFile, dataString);

      console.log(`💾 [LocalStorage] Saved analysis: ${id} (${metadata.analysisType})`);
      return id;

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
      const dataFile = path.join(this.dataPath, `${id}.json`);
      
      // Sprawdź czy plik istnieje
      try {
        await fs.access(dataFile);
      } catch {
        return null;
      }

      // Wczytaj dane
      let dataString = await fs.readFile(dataFile, 'utf-8');
      
      // Dekompresja jeśli potrzebna
      if (this.config.compression) {
        dataString = await this.decompress(dataString);
      }

      const analysis: StoredAnalysis = JSON.parse(dataString);
      
      console.log(`📖 [LocalStorage] Loaded analysis: ${id}`);
      return analysis;

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
          id, // Zachowaj oryginalne ID
          updatedAt: new Date().toISOString()
        }
      };

      await this.save(updated);
      console.log(`🔄 [LocalStorage] Updated analysis: ${id}`);
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
      const metadataFile = path.join(this.metadataPath, `${id}.json`);
      const dataFile = path.join(this.dataPath, `${id}.json`);

      let deleted = false;

      // Usuń metadane
      try {
        await fs.unlink(metadataFile);
        deleted = true;
      } catch (error) {
        // Plik może nie istnieć
      }

      // Usuń dane
      try {
        await fs.unlink(dataFile);
        deleted = true;
      } catch (error) {
        // Plik może nie istnieć
      }

      if (deleted) {
        console.log(`🗑️ [LocalStorage] Deleted analysis: ${id}`);
      }

      return deleted;

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
      // Wczytaj wszystkie metadane
      const metadataFiles = await fs.readdir(this.metadataPath);
      const allMetadata: AnalysisMetadata[] = [];

      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(this.metadataPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata: AnalysisMetadata = JSON.parse(content);
          allMetadata.push(metadata);
        } catch (error) {
          console.warn(`⚠️ [LocalStorage] Failed to read metadata file: ${file}`);
        }
      }

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

      return {
        analyses: paginatedResults,
        total: filtered.length,
        page,
        pageSize
      };

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
      const metadataFile = path.join(this.metadataPath, `${id}.json`);
      
      try {
        await fs.access(metadataFile);
      } catch {
        return null;
      }

      const content = await fs.readFile(metadataFile, 'utf-8');
      return JSON.parse(content);

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
        id, // Zachowaj oryginalne ID
        updatedAt: new Date().toISOString()
      };

      const metadataFile = path.join(this.metadataPath, `${id}.json`);
      await fs.writeFile(metadataFile, JSON.stringify(updated, null, 2));

      console.log(`🏷️ [LocalStorage] Updated metadata: ${id}`);
      return true;

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
        console.warn(`⚠️ [LocalStorage] Failed to delete ${id}: ${error}`);
      }
    }

    console.log(`🗑️ [LocalStorage] Bulk deleted ${deletedCount}/${ids.length} analyses`);
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
        console.warn(`⚠️ [LocalStorage] Failed to export ${id}: ${error}`);
      }
    }

    console.log(`📤 [LocalStorage] Exported ${results.length}/${ids.length} analyses`);
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
      
      console.log(`🧹 [LocalStorage] Cleanup: deleted ${deletedCount} analyses older than ${olderThanDays} days`);
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
      let totalSize = 0;

      // Rozmiar metadanych
      const metadataFiles = await fs.readdir(this.metadataPath);
      for (const file of metadataFiles) {
        const filePath = path.join(this.metadataPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      // Rozmiar danych
      const dataFiles = await fs.readdir(this.dataPath);
      for (const file of dataFiles) {
        const filePath = path.join(this.dataPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
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

  private async compress(data: string): Promise<string> {
    // Placeholder dla kompresji - można dodać zlib lub inne
    // Na razie zwracamy dane bez zmian
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // Placeholder dla dekompresji
    return data;
  }
} 