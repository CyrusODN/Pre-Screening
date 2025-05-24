import { MultiAgentCoordinatorImpl } from '../agents/coordination/MultiAgentCoordinator';
import type { PatientData, SupportedAIModel } from '../types/index';

let coordinatorInstance: MultiAgentCoordinatorImpl | null = null;

function getCoordinator(): MultiAgentCoordinatorImpl {
  if (!coordinatorInstance) {
    coordinatorInstance = new MultiAgentCoordinatorImpl();
  }
  return coordinatorInstance;
}

/**
 * Główna funkcja analizująca dane pacjenta przy użyciu systemu wieloagentowego
 */
export async function analyzePatientDataMultiAgent(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel
): Promise<PatientData> {
  const coordinator = getCoordinator();
  
  console.log('🤖 Rozpoczynanie analizy wieloagentowej...');
  
  try {
    const result = await coordinator.executeAgentPipeline(
      medicalHistory,
      studyProtocol,
      selectedModel
    );
    
    console.log('✅ Analiza wieloagentowa zakończona pomyślnie');
    console.log('📊 Logi wykonania:', result.executionLog);
    console.log('🔍 Wyniki agentów:', result.agentResults);
    
    return result.finalResult;
    
  } catch (error) {
    console.error('❌ Błąd podczas analizy wieloagentowej:', error);
    
    // Zwróć fallback wynik
    return {
      summary: {
        id: generatePatientId(),
        age: 0,
        mainDiagnosis: 'Błąd podczas analizy wieloagentowej',
        comorbidities: []
      },
      episodeEstimation: {
        scenarios: [],
        conclusion: 'Błąd systemu wieloagentowego - wymagana ręczna weryfikacja'
      },
      trdAnalysis: {
        episodeStartDate: null,
        pharmacotherapy: [],
        conclusion: 'Błąd podczas oceny TRD - nie można przeprowadzić analizy'
      },
      inclusionCriteria: [],
      psychiatricExclusionCriteria: [],
      medicalExclusionCriteria: [],
      reportConclusion: {
        overallQualification: 'Błąd systemu - wymagana ręczna weryfikacja',
        mainIssues: [
          'Błąd systemu wieloagentowego',
          error instanceof Error ? error.message : 'Nieznany błąd'
        ],
        criticalInfoNeeded: [
          'Kompletna ręczna weryfikacja wszystkich danych',
          'Sprawdzenie konfiguracji API',
          'Kontakt z administratorem systemu'
        ],
        estimatedProbability: 0
      },
      analyzedAt: new Date().toISOString(),
      isMockData: true,
      modelUsed: selectedModel
    };
  }
}

/**
 * Funkcja diagnostyczna do testowania poszczególnych agentów
 */
export async function testAgentPipeline(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel
): Promise<{
  success: boolean;
  agentResults: Record<string, any>;
  executionLog: string[];
  error?: string;
}> {
  const coordinator = getCoordinator();
  
  try {
    const result = await coordinator.executeAgentPipeline(
      medicalHistory,
      studyProtocol,
      selectedModel
    );
    
    return {
      success: true,
      agentResults: result.agentResults,
      executionLog: result.executionLog
    };
    
  } catch (error) {
    return {
      success: false,
      agentResults: {},
      executionLog: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sprawdza czy system wieloagentowy jest dostępny
 */
export function isMultiAgentAvailable(): boolean {
  try {
    getCoordinator();
    return true;
  } catch {
    return false;
  }
}

/**
 * Zwraca informacje o dostępnych agentach
 */
export function getAvailableAgents(): string[] {
  return [
    'clinical-synthesis',
    'episode-analysis', 
    'pharmacotherapy-analysis',
    'trd-assessment'
  ];
}

function generatePatientId(): string {
  const d = new Date();
  return `PAT/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}/${Math.floor(
    Math.random() * 1000
  ).toString().padStart(3, '0')}`;
} 