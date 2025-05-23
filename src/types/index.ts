// src/types/index.ts
export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  /** reasoning-modele (o-series) – max_completion_tokens */
  maxCompletionTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
}

export interface AppConfig {
  defaultLanguage: string;
  theme: 'light' | 'dark';
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  criteria: {
    inclusion: Array<{
      id: string;
      name: string;
      details: string;
    }>;
    psychiatricExclusion: Array<{
      id: string;
      name: string;
      details: string;
    }>;
    medicalExclusion: Array<{
      id: string;
      name: string;
      details: string;
    }>;
  };
}

export interface PatientData {
  summary: {
    id: string;
    age: number;
    mainDiagnosis: string;
    comorbidities: string[];
  };
  episodeEstimation: {
    scenarios: Array<{
      id: number;
      description: string;
      evidence: string;
    }>;
    conclusion: string;
  };
  trdAnalysis: {
    episodeStartDate: string | null;
    pharmacotherapy: Array<{
      id: string;
      drugName: string;
      shortName: string;
      startDate: string | null;
      endDate: string | null;
      dose: string;
      attemptGroup: number;
      notes?: string;
      isAugmentation?: boolean;
      baseDrug?: string;
    }>;
    conclusion: string;
  };
  inclusionCriteria: Array<Criterion>;
  psychiatricExclusionCriteria: Array<Criterion>;
  medicalExclusionCriteria: Array<Criterion>;
  reportConclusion: {
    overallQualification: string;
    mainIssues: string[];
    criticalInfoNeeded: string[];
    estimatedProbability: number;
  };
  analyzedAt?: string;
  isMockData?: boolean;
}

export interface PatientHistoryEntry {
  id: string;
  analyzedAt: string;
  summary: {
    id: string;
    age: number;
    mainDiagnosis: string;
    comorbidities: string[];
  };
  reportConclusion: {
    overallQualification: string;
    mainIssues: string[];
    criticalInfoNeeded: string[];
    estimatedProbability: number;
  };
}

export interface Criterion {
  id: string;
  name: string;
  status: string;
  details: string;
  userStatus: string | null;
  userComment: string | null;
  userOverrideTimestamp: string | null;
}