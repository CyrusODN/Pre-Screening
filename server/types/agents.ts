// src/types/agents.ts

import type { PatientData, PharmacotherapyItem, SupportedAIModel } from './index';

// Podstawowe typy dla systemu wieloagentowego

export interface AgentConfig {
  name: string;
  description: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  dependencies?: string[]; // nazwy agentów od których zależy
}

export interface AgentResult<T = any> {
  agentName: string;
  data: T;
  confidence: number; // 0-1
  warnings: string[];
  processingTime: number;
  timestamp: string;
}

export interface AgentError {
  agentName: string;
  error: string;
  timestamp: string;
}

// Specyficzne typy wyników dla każdego agenta

export interface ClinicalSynthesisResult {
  patientOverview: string;
  mainDiagnosis: string; // Główne rozpoznanie - najważniejsza diagnoza w kontekście leczenia
  comorbidities: string[]; // Choroby towarzyszące - inne diagnozy medyczne
  clinicalTimeline: string[];
  keyObservations: string[];
  treatmentHistory: string;
  riskFactors: string[];
}

export interface EpisodeAnalysisResult {
  scenarios: Array<{
    id: number;
    description: string;
    evidence: string;
    startDate: string | null;
    endDate: string | null;
    confidence: number;
  }>;
  mostLikelyScenario: number;
  conclusion: string;
  remissionPeriods: Array<{
    startDate: string | null;
    endDate: string | null;
    evidence: string;
    confidence: number;
    notes: string;
  }>;
}

export interface PharmacotherapyAnalysisResult {
  timeline: PharmacotherapyItem[];
  drugMappings: Array<{
    originalName: string;
    standardName: string;
    activeSubstance: string;
  }>;
  gaps: string[];
  notes: string[];
  prohibitedDrugs: Array<{
    drugName: string;
    lastUsed: string | null;
    washoutRequired: string;
    status: 'compliant' | 'violation' | 'verification';
  }>;
  clinicalClaimsVerification: string;
  historicalContext?: {
    previousMedications: string;
    familyHistory: string;
    otherTreatments: string;
    patientBackground: string;
  };
}

export interface TRDAssessmentResult {
  episodeStartDate: string | null;
  adequateTrials: Array<{
    id: string;
    drugName: string;
    dose: string;
    duration: number;
    adequate: boolean;
    reasoning: string;
  }>;
  trdStatus: 'confirmed' | 'not_confirmed' | 'insufficient_data';
  failureCount: number;
  conclusion: string;
}

export interface CriteriaAssessmentResult {
  inclusionCriteria: Array<{
    id: string;
    name: string;
    status: 'spełnione' | 'niespełnione' | 'weryfikacja';
    confidence: number;
    reasoning: string;
    evidenceFromHistory: string[];
    recommendedVerification?: string;
  }>;
  psychiatricExclusionCriteria: Array<{
    id: string;
    name: string;
    status: 'spełnione' | 'niespełnione' | 'weryfikacja';
    confidence: number;
    reasoning: string;
    evidenceFromHistory: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  medicalExclusionCriteria: Array<{
    id: string;
    name: string;
    status: 'spełnione' | 'niespełnione' | 'weryfikacja';
    confidence: number;
    reasoning: string;
    evidenceFromHistory: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  overallAssessment: {
    eligibilityScore: number; // 0-100
    majorConcerns: string[];
    minorConcerns: string[];
    strengthsForInclusion: string[];
  };
}

export interface RiskAssessmentResult {
  patientRiskProfile: {
    suicidalRisk: {
      level: 'low' | 'medium' | 'high' | 'critical';
      indicators: string[];
      mitigationStrategies: string[];
    };
    adherenceRisk: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      recommendations: string[];
    };
    adverseEventRisk: {
      level: 'low' | 'medium' | 'high';
      potentialEvents: string[];
      monitoringNeeds: string[];
    };
    dropoutRisk: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      retentionStrategies: string[];
    };
  };
  studySpecificRisks: {
    protocolCompliance: number; // 0-100
    dataQuality: number; // 0-100
    ethicalConcerns: string[];
  };
  inclusionProbability: {
    score: number; // 0-100
    confidence: number; // 0-100
    keyFactors: {
      positive: string[];
      negative: string[];
      neutral: string[];
    };
    recommendation: 'include' | 'exclude' | 'further_evaluation';
    reasoning: string;
  };
}

// Kontekst współdzielony między agentami
export interface SharedContext {
  medicalHistory: string;
  studyProtocol: string;
  modelUsed: SupportedAIModel;
  
  // Informacje o mapowaniu leków
  drugMappingInfo?: {
    mappingsApplied: number;
    mappings: Array<{original: string; mapped: string; confidence: number}>;
    preprocessedAt: string;
  };
  
  // Wyniki z poprzednich agentów
  clinicalSynthesis?: AgentResult<ClinicalSynthesisResult>;
  episodeAnalysis?: AgentResult<EpisodeAnalysisResult>;
  pharmacotherapyAnalysis?: AgentResult<PharmacotherapyAnalysisResult>;
  trdAssessment?: AgentResult<TRDAssessmentResult>;
  inclusionCriteriaAssessment?: AgentResult<CriteriaAssessmentResult>;
  exclusionCriteriaAssessment?: AgentResult<CriteriaAssessmentResult>;
  riskAssessment?: AgentResult<RiskAssessmentResult>;
  
  // Wzbogacony kontekst dla agentów
  previousAgentResults?: string;
}

// Interface dla podstawowego agenta
export interface BaseAgent<TResult = any> {
  name: string;
  config: AgentConfig;
  
  process(context: SharedContext): Promise<AgentResult<TResult>>;
  validate(result: TResult): boolean;
}

// Interface dla koordynatora
export interface MultiAgentCoordinator {
  executeAgentPipeline(
    medicalHistory: string,
    studyProtocol: string,
    selectedModel: SupportedAIModel
  ): Promise<{
    finalResult: PatientData;
    agentResults: Record<string, AgentResult>;
    executionLog: string[];
  }>;
}

// Interface dla chatbot agenta
export interface ChatbotQuery {
  question: string;
  context: SharedContext;
  focusArea?: 'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general';
}

export interface ChatbotResponse {
  answer: string;
  confidence: number;
  references: string[];
  suggestedFollowUps: string[];
}

export interface ChatbotResult {
  response: string;
  confidence: number;
  referencedSections: string[];
  suggestedFollowUp: string[];
}

// Enums dla statusów
export enum AgentStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional'
} 