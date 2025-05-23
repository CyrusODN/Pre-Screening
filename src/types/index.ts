export interface PatientData {
  summary: {
    id: string;
    age: number;
    mainDiagnosis: string;
    comorbidities: string[];
  };
  episodeEstimation: {
    scenarios: {
      id: number;
      description: string;
      evidence: string;
    }[];
    conclusion: string;
  };
  trdAnalysis: {
    episodeStartDate: string;
    pharmacotherapy: {
      id: string;
      drugName: string;
      shortName: string;
      startDate: string;
      endDate: string;
      dose: string;
      attemptGroup: number;
      notes?: string;
      isAugmentation?: boolean;
      baseDrug?: string;
    }[];
    conclusion: string;
  };
  inclusionCriteria: Criterion[];
  psychiatricExclusionCriteria: Criterion[];
  medicalExclusionCriteria: Criterion[];
  reportConclusion: {
    overallQualification: string;
    mainIssues: string[];
    criticalInfoNeeded: string[];
    estimatedProbability: number;
  };
  analyzedAt?: string;
}

export interface PatientHistoryEntry {
  id: string;
  analyzedAt: string;
  summary: PatientData['summary'];
  reportConclusion: PatientData['reportConclusion'];
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

export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

export interface AppConfig {
  ai: AIConfig;
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