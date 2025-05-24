// src/agents/coordination/MultiAgentCoordinator.ts

import type { 
  MultiAgentCoordinator, 
  SharedContext, 
  AgentResult,
  ExecutionStrategy
} from '../../types/agents';
import type { PatientData, SupportedAIModel } from '../../types/index';

// Import wszystkich agentów
import { ClinicalSynthesisAgent } from '../core/ClinicalSynthesisAgent';
import { EpisodeAnalysisAgent } from '../core/EpisodeAnalysisAgent';
import { PharmacotherapyAgent } from '../core/PharmacotherapyAgent';
import { TRDAssessmentAgent } from '../core/TRDAssessmentAgent';
import { CriteriaAssessmentAgent } from '../core/CriteriaAssessmentAgent';
import { RiskAssessmentAgent } from '../core/RiskAssessmentAgent';

export class MultiAgentCoordinatorImpl implements MultiAgentCoordinator {
  private readonly agents: Map<string, any> = new Map();
  private readonly executionLog: string[] = [];

  constructor() {
    // Inicjalizacja wszystkich agentów
    this.agents.set('clinical-synthesis', new ClinicalSynthesisAgent());
    this.agents.set('episode-analysis', new EpisodeAnalysisAgent());
    this.agents.set('pharmacotherapy-analysis', new PharmacotherapyAgent());
    this.agents.set('trd-assessment', new TRDAssessmentAgent());
    this.agents.set('criteria-assessment', new CriteriaAssessmentAgent());
    this.agents.set('risk-assessment', new RiskAssessmentAgent());
  }

  public async executeAgentPipeline(
    medicalHistory: string,
    studyProtocol: string,
    selectedModel: SupportedAIModel
  ): Promise<{
    finalResult: PatientData;
    agentResults: Record<string, AgentResult>;
    executionLog: string[];
  }> {
    this.executionLog.length = 0; // Wyczyść logi
    
    // Inicjalizacja kontekstu współdzielonego
    const context: SharedContext = {
      medicalHistory,
      studyProtocol,
      modelUsed: selectedModel
    };

    const agentResults: Record<string, AgentResult> = {};

    try {
      // FAZA 1: Analiza podstawowa (równolegle)
      this.log('🚀 FAZA 1: Rozpoczynanie analizy podstawowej...');
      
      const phase1Results = await Promise.allSettled([
        this.executeAgent('clinical-synthesis', context),
        this.executeAgent('episode-analysis', context),
        this.executeAgent('pharmacotherapy-analysis', context)
      ]);

      // Przetwórz wyniki fazy 1
      const [clinicalResult, episodeResult, pharmacoResult] = phase1Results;
      
      if (clinicalResult.status === 'fulfilled') {
        agentResults['clinical-synthesis'] = clinicalResult.value;
        context.clinicalSynthesis = clinicalResult.value;
        this.log('✅ Agent Syntezy Klinicznej zakończony pomyślnie');
      } else {
        this.log(`❌ Agent Syntezy Klinicznej: ${clinicalResult.reason}`);
      }

      if (episodeResult.status === 'fulfilled') {
        agentResults['episode-analysis'] = episodeResult.value;
        context.episodeAnalysis = episodeResult.value;
        this.log('✅ Agent Analizy Epizodów zakończony pomyślnie');
      } else {
        this.log(`❌ Agent Analizy Epizodów: ${episodeResult.reason}`);
      }

      if (pharmacoResult.status === 'fulfilled') {
        agentResults['pharmacotherapy-analysis'] = pharmacoResult.value;
        context.pharmacotherapyAnalysis = pharmacoResult.value;
        this.log('✅ Agent Farmakoterapii zakończony pomyślnie');
      } else {
        this.log(`❌ Agent Farmakoterapii: ${pharmacoResult.reason}`);
      }

      // FAZA 2: Analiza TRD (zależy od fazy 1)
      this.log('🔬 FAZA 2: Rozpoczynanie analizy TRD...');
      
      try {
        const trdResult = await this.executeAgent('trd-assessment', context);
        agentResults['trd-assessment'] = trdResult;
        context.trdAssessment = trdResult;
        this.log('✅ Agent TRD zakończony pomyślnie');
      } catch (error) {
        this.log(`❌ Agent TRD: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // FAZA 3: Ocena kryteriów (zależy od faz 1-2)
      this.log('📋 FAZA 3: Rozpoczynanie oceny kryteriów...');
      
      try {
        const criteriaResult = await this.executeAgent('criteria-assessment', context);
        agentResults['criteria-assessment'] = criteriaResult;
        context.inclusionCriteriaAssessment = criteriaResult;
        this.log('✅ Agent Oceny Kryteriów zakończony pomyślnie');
      } catch (error) {
        this.log(`❌ Agent Oceny Kryteriów: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // FAZA 4: Ocena ryzyka (zależy od wszystkich poprzednich)
      this.log('⚠️ FAZA 4: Rozpoczynanie oceny ryzyka...');
      
      try {
        const riskResult = await this.executeAgent('risk-assessment', context);
        agentResults['risk-assessment'] = riskResult;
        context.riskAssessment = riskResult;
        this.log('✅ Agent Oceny Ryzyka zakończony pomyślnie');
      } catch (error) {
        this.log(`❌ Agent Oceny Ryzyka: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // FAZA 5: Synteza końcowa
      this.log('🎯 FAZA 5: Synteza wyników...');
      
      const finalResult = this.synthesizeFinalResult(agentResults, context);
      
      this.log('✅ Analiza wieloagentowa zakończona pomyślnie');
      
      return {
        finalResult,
        agentResults,
        executionLog: [...this.executionLog]
      };

    } catch (error) {
      this.log(`💥 Krytyczny błąd w pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async executeAgent(agentName: string, context: SharedContext): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} nie został znaleziony`);
    }

    this.log(`🔄 Wykonywanie agenta: ${agentName}`);
    const startTime = Date.now();
    
    try {
      const result = await agent.process(context);
      const duration = Date.now() - startTime;
      this.log(`⏱️ Agent ${agentName} zakończony w ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`💥 Agent ${agentName} zakończony błędem po ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private synthesizeFinalResult(
    agentResults: Record<string, AgentResult>, 
    context: SharedContext
  ): PatientData {
    // Pobierz wyniki z agentów
    const clinicalSynthesis = agentResults['clinical-synthesis']?.data;
    const episodeAnalysis = agentResults['episode-analysis']?.data;
    const pharmacotherapyAnalysis = agentResults['pharmacotherapy-analysis']?.data;
    const trdAssessment = agentResults['trd-assessment']?.data;
    const criteriaAssessment = agentResults['criteria-assessment']?.data;
    const riskAssessment = agentResults['risk-assessment']?.data;

    // Generuj ID pacjenta
    const patientId = this.generatePatientId();

    // Synteza danych pacjenta
    const patientData: PatientData = {
      summary: {
        id: patientId,
        age: this.extractAge(clinicalSynthesis) || 0,
        mainDiagnosis: this.extractMainDiagnosis(clinicalSynthesis) || 'Depresja lekoopora (TRD)',
        comorbidities: this.extractComorbidities(clinicalSynthesis) || []
      },
      
      episodeEstimation: {
        scenarios: episodeAnalysis?.scenarios?.map((scenario: any) => ({
          id: scenario.id,
          description: scenario.description,
          evidence: scenario.evidence,
          startDate: scenario.startDate,
          endDate: scenario.endDate,
          confidence: scenario.confidence
        })) || [],
        conclusion: episodeAnalysis?.conclusion || 'Brak danych o epizodach'
      },

      trdAnalysis: {
        episodeStartDate: this.extractEpisodeStartDate(episodeAnalysis, trdAssessment),
        pharmacotherapy: pharmacotherapyAnalysis?.timeline || [],
        conclusion: trdAssessment?.overallTRDAssessment?.recommendedScenario || 'Brak oceny TRD'
      },

      inclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.inclusionCriteria || []),
      psychiatricExclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.psychiatricExclusionCriteria || []),
      medicalExclusionCriteria: this.convertCriteriaToLegacyFormat(criteriaAssessment?.medicalExclusionCriteria || []),

      reportConclusion: {
        overallQualification: this.generateOverallQualification(riskAssessment, criteriaAssessment),
        mainIssues: this.extractMainIssues(riskAssessment, criteriaAssessment),
        criticalInfoNeeded: this.extractCriticalInfo(riskAssessment, criteriaAssessment),
        estimatedProbability: riskAssessment?.inclusionProbability?.score || 0
      },

      analyzedAt: new Date().toISOString(),
      isMockData: false,
      modelUsed: context.modelUsed
    };

    return patientData;
  }

  // Metody pomocnicze do ekstrakcji danych
  private extractAge(clinicalSynthesis: any): number | null {
    if (!clinicalSynthesis?.patientOverview) return null;
    const ageMatch = clinicalSynthesis.patientOverview.match(/(\d+)\s*lat/i);
    return ageMatch ? parseInt(ageMatch[1]) : null;
  }

  private extractMainDiagnosis(clinicalSynthesis: any): string | null {
    return clinicalSynthesis?.patientOverview?.split('.')[0] || null;
  }

  private extractComorbidities(clinicalSynthesis: any): string[] {
    return clinicalSynthesis?.riskFactors || [];
  }

  private extractEpisodeStartDate(episodeAnalysis: any, trdAssessment: any): string | null {
    if (episodeAnalysis?.scenarios?.length > 0) {
      return episodeAnalysis.scenarios[0].startDate;
    }
    return null;
  }

  private convertCriteriaToLegacyFormat(criteria: any[]): any[] {
    return criteria.map(criterion => ({
      id: criterion.id,
      name: criterion.name,
      details: criterion.reasoning,
      status: criterion.status,
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }));
  }

  private generateOverallQualification(riskAssessment: any, criteriaAssessment: any): string {
    const recommendation = riskAssessment?.inclusionProbability?.recommendation;
    const score = riskAssessment?.inclusionProbability?.score || 0;
    
    if (recommendation === 'include' && score >= 70) {
      return 'Kandydat kwalifikuje się do badania';
    } else if (recommendation === 'further_evaluation' || (score >= 40 && score < 70)) {
      return 'Kandydat wymaga dodatkowej oceny';
    } else {
      return 'Kandydat prawdopodobnie nie kwalifikuje się do badania';
    }
  }

  private extractMainIssues(riskAssessment: any, criteriaAssessment: any): string[] {
    const issues: string[] = [];
    
    if (criteriaAssessment?.overallAssessment?.majorConcerns) {
      issues.push(...criteriaAssessment.overallAssessment.majorConcerns);
    }
    
    if (riskAssessment?.inclusionProbability?.keyFactors?.negative) {
      issues.push(...riskAssessment.inclusionProbability.keyFactors.negative);
    }
    
    return issues;
  }

  private extractCriticalInfo(riskAssessment: any, criteriaAssessment: any): string[] {
    const info: string[] = [];
    
    if (criteriaAssessment?.overallAssessment?.minorConcerns) {
      info.push(...criteriaAssessment.overallAssessment.minorConcerns);
    }
    
    // Dodaj informacje o wysokim ryzyku
    if (riskAssessment?.patientRiskProfile?.suicidalRisk?.level === 'high' || 
        riskAssessment?.patientRiskProfile?.suicidalRisk?.level === 'critical') {
      info.push('Wymagana szczegółowa ocena ryzyka samobójczego');
    }
    
    return info;
  }

  private generatePatientId(): string {
    const d = new Date();
    return `PAT/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}/${Math.floor(
      Math.random() * 1000
    ).toString().padStart(3, '0')}`;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.executionLog.push(logEntry);
    console.log(logEntry);
  }
} 