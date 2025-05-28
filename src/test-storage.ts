// ============================================================================
// TEST STORAGE - Test systemu przechowywania w przeglądarce
// ============================================================================

import { analysisHistoryService } from './services/AnalysisHistoryService';
import type { PatientData } from './types/index';

// Test funkcji storage
export async function testBrowserStorage(): Promise<void> {
  console.log('🧪 [Test] Starting browser storage test...');
  console.log('🧪 [Test] IndexedDB support:', 'indexedDB' in window);

  try {
    // Test konfiguracji
    const config = analysisHistoryService.getStorageConfig();
    console.log('⚙️ [Test] Storage config:', config);

    // Test połączenia
    console.log('🔗 [Test] Testing connection...');
    const isConnected = await analysisHistoryService.testConnection();
    console.log('🔗 [Test] Storage connection:', isConnected ? 'OK' : 'FAILED');

    if (!isConnected) {
      throw new Error('Storage connection failed');
    }

    // Test podstawowych statystyk
    console.log('📊 [Test] Getting initial statistics...');
    const initialStats = await analysisHistoryService.getStatistics();
    console.log('📊 [Test] Initial statistics:', initialStats);

    // Test zapisywania analizy
    console.log('💾 [Test] Creating test analysis...');
    const testPatientData: PatientData = {
      summary: {
        id: 'TEST_PATIENT_001',
        age: 45,
        mainDiagnosis: 'Depresja major',
        comorbidities: ['Lęk uogólniony']
      },
      episodeEstimation: {
        scenarios: [],
        conclusion: 'Test episode estimation'
      },
      trdAnalysis: {
        episodeStartDate: null,
        pharmacotherapy: [],
        conclusion: 'Test TRD analysis'
      },
      inclusionCriteria: [],
      psychiatricExclusionCriteria: [],
      medicalExclusionCriteria: [],
      reportConclusion: {
        overallQualification: 'Test qualification',
        mainIssues: [],
        criticalInfoNeeded: [],
        estimatedProbability: 0.8
      },
      analyzedAt: new Date().toISOString(),
      isMockData: true,
      modelUsed: 'o3' as const
    };

    // Zapisz test analizę
    console.log('💾 [Test] Saving test analysis...');
    const analysisId = await analysisHistoryService.saveSingleAgentAnalysis(
      testPatientData,
      'Test medical history',
      'Test study protocol',
      'Test raw response'
    );
    console.log('💾 [Test] Saved test analysis with ID:', analysisId);

    // Wczytaj analizę
    console.log('📖 [Test] Loading analysis...');
    const loadedAnalysis = await analysisHistoryService.loadAnalysis(analysisId);
    console.log('📖 [Test] Loaded analysis:', loadedAnalysis ? 'OK' : 'FAILED');
    if (loadedAnalysis) {
      console.log('📖 [Test] Loaded analysis data:', {
        id: loadedAnalysis.metadata.id,
        patientId: loadedAnalysis.metadata.patientId,
        type: loadedAnalysis.metadata.analysisType
      });
    }

    // Pobierz listę analiz
    console.log('📋 [Test] Getting analyses list...');
    const analysesList = await analysisHistoryService.getAnalysesList({ pageSize: 10 });
    console.log('📋 [Test] Listed analyses:', analysesList.total, 'total');
    console.log('📋 [Test] First few analyses:', analysesList.analyses.slice(0, 3));

    // Pobierz statystyki
    console.log('📊 [Test] Getting final statistics...');
    const finalStats = await analysisHistoryService.getStatistics();
    console.log('📊 [Test] Final statistics:', finalStats);

    // Usuń test analizę
    console.log('🗑️ [Test] Deleting test analysis...');
    const deleted = await analysisHistoryService.deleteAnalysis(analysisId);
    console.log('🗑️ [Test] Deleted test analysis:', deleted ? 'OK' : 'FAILED');

    console.log('✅ [Test] Browser storage test completed successfully!');

  } catch (error) {
    console.error('❌ [Test] Browser storage test failed:', error);
    console.error('❌ [Test] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Automatycznie uruchom test w środowisku deweloperskim
if (import.meta.env.DEV) {
  // Uruchom test po załadowaniu strony
  if (typeof window !== 'undefined') {
    console.log('🧪 [Test] Storage test module loaded');
    
    // Dodaj funkcję testową do globalnego obiektu window dla łatwego dostępu z konsoli
    (window as any).testStorage = testBrowserStorage;
    
    // Opcjonalnie uruchom test automatycznie po załadowaniu
    window.addEventListener('load', () => {
      console.log('🧪 [Test] Page loaded. You can run storage test by calling: testStorage()');
      console.log('🧪 [Test] Or wait for automatic test in 3 seconds...');
      
      setTimeout(() => {
        console.log('🧪 [Test] Starting automatic storage test...');
        testBrowserStorage().catch(error => {
          console.error('🧪 [Test] Automatic storage test failed:', error);
        });
      }, 3000); // Opóźnienie 3s, aby aplikacja się w pełni załadowała
    });
  }
}

export default testBrowserStorage; 