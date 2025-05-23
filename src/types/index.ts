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
  isMockData?: boolean; // Dodane nowe pole
}

// ... reszta interfejsów pozostaje bez zmian