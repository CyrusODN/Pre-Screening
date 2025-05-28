// ============================================================================
// STORAGE FACTORY - Factory do tworzenia implementacji storage'u
// ============================================================================

import { AnalysisStorage, StorageConfig, StorageError } from '../../types/storage';
import { BrowserAnalysisStorage } from './BrowserAnalysisStorage';
import { BackendAnalysisStorage } from './BackendAnalysisStorage';
import { AwsAnalysisStorage } from './AwsAnalysisStorage';

/**
 * Factory do tworzenia odpowiedniej implementacji storage'u
 * na podstawie konfiguracji
 */
export class StorageFactory {
  /**
   * Tworzy instancję storage'u na podstawie konfiguracji
   */
  static createStorage(config: StorageConfig): AnalysisStorage {
    switch (config.type) {
      case 'local':
        // Lokalne storage przez backend API
        return new BackendAnalysisStorage({
          ...config,
          baseUrl: 'http://localhost:3001'
        });
      
      case 'browser':
        // W przeglądarce używamy IndexedDB
        return new BrowserAnalysisStorage(config);
      
      case 'aws-s3':
      case 'aws-dynamodb':
        return new AwsAnalysisStorage(config);
      
      default:
        throw new StorageError(
          `Unsupported storage type: ${config.type}`,
          'INVALID_DATA'
        );
    }
  }

  /**
   * Tworzy domyślną konfigurację przeglądarki (IndexedDB)
   */
  static createDefaultBrowserConfig(dbName?: string): StorageConfig {
    return {
      type: 'browser',
      basePath: dbName || 'MedicalAnalysisDB', // Nazwa bazy IndexedDB
      compression: false,
      encryption: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      retentionDays: 365 // 1 rok
    };
  }

  /**
   * Tworzy domyślną konfigurację lokalnego storage'u (IndexedDB w przeglądarce)
   */
  static createDefaultLocalConfig(basePath?: string): StorageConfig {
    return this.createDefaultBrowserConfig(basePath);
  }

  /**
   * Tworzy konfigurację AWS storage'u
   */
  static createAwsConfig(
    region: string,
    bucket: string,
    tableName: string,
    accessKeyId?: string,
    secretAccessKey?: string
  ): StorageConfig {
    return {
      type: 'aws-s3',
      awsConfig: {
        region,
        bucket,
        tableName,
        accessKeyId,
        secretAccessKey
      },
      compression: true,
      encryption: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      retentionDays: 2555 // 7 lat (wymagania medyczne)
    };
  }

  /**
   * Waliduje konfigurację storage'u
   */
  static validateConfig(config: StorageConfig): void {
    if (!config.type) {
      throw new StorageError('Storage type is required', 'INVALID_DATA');
    }

    switch (config.type) {
      case 'local':
      case 'browser':
        // Lokalne storage i browser storage nie wymagają dodatkowej walidacji
        break;
      
      case 'aws-s3':
      case 'aws-dynamodb':
        if (!config.awsConfig) {
          throw new StorageError('AWS configuration is required for AWS storage', 'INVALID_DATA');
        }
        if (!config.awsConfig.region) {
          throw new StorageError('AWS region is required', 'INVALID_DATA');
        }
        if (config.type === 'aws-s3' && !config.awsConfig.bucket) {
          throw new StorageError('S3 bucket name is required', 'INVALID_DATA');
        }
        if (config.type === 'aws-dynamodb' && !config.awsConfig.tableName) {
          throw new StorageError('DynamoDB table name is required', 'INVALID_DATA');
        }
        break;
      
      default:
        throw new StorageError(`Unsupported storage type: ${config.type}`, 'INVALID_DATA');
    }

    // Walidacja opcjonalnych parametrów
    if (config.maxFileSize && config.maxFileSize <= 0) {
      throw new StorageError('Max file size must be positive', 'INVALID_DATA');
    }

    if (config.retentionDays && config.retentionDays <= 0) {
      throw new StorageError('Retention days must be positive', 'INVALID_DATA');
    }
  }

  /**
   * Tworzy konfigurację z zmiennych środowiskowych
   */
  static createConfigFromEnv(): StorageConfig {
    // W przeglądarce używamy import.meta.env zamiast process.env
    const env = typeof window !== 'undefined' ? import.meta.env : process?.env || {};
    
    const storageType = env.STORAGE_TYPE || env.VITE_STORAGE_TYPE || 'browser'; // Domyślnie browser dla frontend
    
    switch (storageType) {
      case 'local':
        // Lokalne storage przez backend API
        return {
          type: 'local',
          basePath: env.STORAGE_PATH || env.VITE_STORAGE_PATH || './History',
          compression: (env.STORAGE_COMPRESSION || env.VITE_STORAGE_COMPRESSION) === 'true',
          encryption: (env.STORAGE_ENCRYPTION || env.VITE_STORAGE_ENCRYPTION) === 'true',
          maxFileSize: parseInt(env.STORAGE_MAX_FILE_SIZE || env.VITE_STORAGE_MAX_FILE_SIZE || '52428800'), // 50MB
          retentionDays: parseInt(env.STORAGE_RETENTION_DAYS || env.VITE_STORAGE_RETENTION_DAYS || '365')
        };
      
      case 'browser':
        // Browser storage używa IndexedDB
        return {
          type: 'browser',
          basePath: env.STORAGE_PATH || env.VITE_STORAGE_PATH || 'MedicalAnalysisDB',
          compression: (env.STORAGE_COMPRESSION || env.VITE_STORAGE_COMPRESSION) === 'true',
          encryption: (env.STORAGE_ENCRYPTION || env.VITE_STORAGE_ENCRYPTION) === 'true',
          maxFileSize: parseInt(env.STORAGE_MAX_FILE_SIZE || env.VITE_STORAGE_MAX_FILE_SIZE || '52428800'), // 50MB
          retentionDays: parseInt(env.STORAGE_RETENTION_DAYS || env.VITE_STORAGE_RETENTION_DAYS || '365')
        };
      
      case 'aws-s3':
        return {
          type: 'aws-s3',
          awsConfig: {
            region: env.AWS_REGION || env.VITE_AWS_REGION || 'us-east-1',
            bucket: env.AWS_S3_BUCKET || env.VITE_AWS_S3_BUCKET || 'medical-analysis-storage',
            tableName: env.AWS_DYNAMODB_TABLE || env.VITE_AWS_DYNAMODB_TABLE || 'medical-analysis-metadata',
            accessKeyId: env.AWS_ACCESS_KEY_ID || env.VITE_AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.VITE_AWS_SECRET_ACCESS_KEY
          },
          compression: (env.STORAGE_COMPRESSION || env.VITE_STORAGE_COMPRESSION) !== 'false', // domyślnie true dla AWS
          encryption: (env.STORAGE_ENCRYPTION || env.VITE_STORAGE_ENCRYPTION) !== 'false', // domyślnie true dla AWS
          maxFileSize: parseInt(env.STORAGE_MAX_FILE_SIZE || env.VITE_STORAGE_MAX_FILE_SIZE || '104857600'), // 100MB
          retentionDays: parseInt(env.STORAGE_RETENTION_DAYS || env.VITE_STORAGE_RETENTION_DAYS || '2555') // 7 lat
        };
      
      default:
        throw new StorageError(`Unsupported storage type in environment: ${storageType}`, 'INVALID_DATA');
    }
  }

  /**
   * Testuje połączenie ze storage'em
   */
  static async testConnection(storage: AnalysisStorage): Promise<boolean> {
    try {
      // Spróbuj pobrać statystyki - to jest bezpieczna operacja testowa
      await storage.getStats();
      return true;
    } catch (error) {
      console.error('Storage connection test failed:', error);
      return false;
    }
  }

  /**
   * Migruje dane między różnymi storage'ami
   */
  static async migrateData(
    sourceStorage: AnalysisStorage,
    targetStorage: AnalysisStorage,
    batchSize: number = 10
  ): Promise<{
    migrated: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      migrated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Pobierz wszystkie analizy ze źródła
      const sourceList = await sourceStorage.list({ pageSize: 1000 });
      const totalAnalyses = sourceList.analyses;

      console.log(`🔄 [Migration] Starting migration of ${totalAnalyses.length} analyses`);

      // Migruj w partiach
      for (let i = 0; i < totalAnalyses.length; i += batchSize) {
        const batch = totalAnalyses.slice(i, i + batchSize);
        
        for (const metadata of batch) {
          try {
            // Wczytaj pełne dane
            const analysis = await sourceStorage.load(metadata.id);
            if (!analysis) {
              result.failed++;
              result.errors.push(`Failed to load analysis: ${metadata.id}`);
              continue;
            }

            // Zapisz w docelowym storage
            await targetStorage.save(analysis);
            result.migrated++;

            console.log(`✅ [Migration] Migrated: ${metadata.id} (${result.migrated}/${totalAnalyses.length})`);

          } catch (error) {
            result.failed++;
            result.errors.push(`Failed to migrate ${metadata.id}: ${error}`);
            console.error(`❌ [Migration] Failed: ${metadata.id}`, error);
          }
        }

        // Krótka pauza między partiami
        if (i + batchSize < totalAnalyses.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`🎉 [Migration] Completed: ${result.migrated} migrated, ${result.failed} failed`);

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      console.error('❌ [Migration] Critical error:', error);
    }

    return result;
  }
} 