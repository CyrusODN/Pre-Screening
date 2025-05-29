// ============================================================================
// LOCAL ANALYSIS STORAGE - Lokalne przechowywanie analiz
// ============================================================================

import { promises as fs } from 'fs';
import path from 'path';

// Klasa błędu storage
export class StorageError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class LocalAnalysisStorage {
  constructor(config) {
    this.config = config;
    this.basePath = config.basePath || './History';
    this.metadataPath = path.join(this.basePath, 'metadata');
    this.dataPath = path.join(this.basePath, 'data');
    
    this.ensureDirectories();
  }

  // ============================================================================
  // INICJALIZACJA
  // ============================================================================

  async ensureDirectories() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(this.metadataPath, { recursive: true });
      await fs.mkdir(this.dataPath, { recursive: true });
      
      console.log(`📁 [LocalStorage] Initialized directories: ${this.basePath}`);
      console.log(`📁 [LocalStorage] Metadata path: ${path.resolve(this.metadataPath)}`);
      console.log(`📁 [LocalStorage] Data path: ${path.resolve(this.dataPath)}`);
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

  async save(analysis) {
    try {
      const id = analysis.metadata?.id || this.generateId();
      const now = new Date().toISOString();
      
      // Przygotuj metadane
      const metadata = {
        ...analysis.metadata,
        id,
        createdAt: analysis.metadata?.createdAt || now,
        updatedAt: now,
        version: process.env.npm_package_version || '1.0.0'
      };

      // Przygotuj dane do zapisu
      const dataToSave = {
        ...analysis,
        metadata
      };

      // Sprawdź rozmiar pliku
      const dataString = JSON.stringify(dataToSave, null, 2);
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

  async load(id) {
    try {
      const dataFile = path.join(this.dataPath, `${id}.json`);
      
      // Sprawdź czy plik istnieje
      try {
        await fs.access(dataFile);
      } catch {
        return null;
      }

      // Wczytaj dane
      const dataString = await fs.readFile(dataFile, 'utf-8');
      const analysis = JSON.parse(dataString);
      
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

  async delete(id) {
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

  async list(options = {}) {
    try {
      // Wczytaj wszystkie metadane
      const metadataFiles = await fs.readdir(this.metadataPath);
      const allMetadata = [];

      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(this.metadataPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata = JSON.parse(content);
          allMetadata.push(metadata);
        } catch (error) {
          console.warn(`⚠️ [LocalStorage] Failed to read metadata file: ${file}`);
        }
      }

      // Sortuj według daty utworzenia (najnowsze pierwsze)
      allMetadata.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Paginacja
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedMetadata = allMetadata.slice(offset, offset + limit);

      return {
        analyses: paginatedMetadata,
        total: allMetadata.length,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalPages: Math.ceil(allMetadata.length / limit)
      };

    } catch (error) {
      throw new StorageError(
        `Failed to list analyses: ${error}`,
        'PERMISSION_DENIED',
        error
      );
    }
  }

  async getStats() {
    try {
      console.log(`📊 [LocalStorage] Getting stats from: ${this.metadataPath}`);
      const metadataFiles = await fs.readdir(this.metadataPath);
      console.log(`📊 [LocalStorage] Found ${metadataFiles.length} files:`, metadataFiles);
      const allMetadata = [];

      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) {
          console.log(`📊 [LocalStorage] Skipping non-JSON file: ${file}`);
          continue;
        }
        
        try {
          const filePath = path.join(this.metadataPath, file);
          console.log(`📊 [LocalStorage] Reading file: ${filePath}`);
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata = JSON.parse(content);
          console.log(`📊 [LocalStorage] Parsed metadata for ${file}:`, {
            id: metadata.id,
            type: metadata.analysisType,
            model: metadata.modelUsed || metadata.aiModel
          });
          allMetadata.push(metadata);
        } catch (error) {
          console.warn(`⚠️ [LocalStorage] Failed to read metadata file: ${file}`, error.message);
        }
      }

      console.log(`📊 [LocalStorage] Total metadata loaded: ${allMetadata.length}`);

      // Oblicz statystyki
      const byType = {};
      const byModel = {};
      const byStatus = {};
      let recentCount = 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      for (const metadata of allMetadata) {
        // Według typu
        const type = metadata.analysisType || 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        // Według modelu
        const model = metadata.modelUsed || metadata.aiModel || 'unknown';
        byModel[model] = (byModel[model] || 0) + 1;

        // Według statusu
        const status = metadata.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Ostatnie 7 dni
        if (new Date(metadata.createdAt) > weekAgo) {
          recentCount++;
        }
      }

      return {
        total: allMetadata.length,
        byType,
        byModel,
        byStatus,
        recentCount
      };

    } catch (error) {
      throw new StorageError(
        `Failed to get stats: ${error}`,
        'PERMISSION_DENIED',
        error
      );
    }
  }

  // ============================================================================
  // POMOCNICZE METODY
  // ============================================================================

  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `analysis_${timestamp}_${random}`;
  }
} 