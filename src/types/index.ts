// src/types/index.ts
export type SupportedAIModel = 'o3' | 'gemini' | 'claude-opus';

export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxCompletionTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
}

export interface GeminiAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  systemPrompt: string;
}

export interface ClaudeAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
}

export interface AppConfig {
  defaultLanguage: string;
  theme: 'light' | 'dark';
}

// Definicja struktury dla mghAtrqPoland
interface MghAtrqPolandDetails {
  minTrialDurationWeeks: string;
  medications: Array<{
    drugName: string;
    brandName?: string; // Nazwa handlowa jest opcjonalna
    minDose: string;
    notes?: string; // Notatki są opcjonalne
  }>;
  generalNotes: string[];
}

// Definicja typu dla pojedynczego kryterium protokołu
// To jest kluczowa zmiana - dodajemy opcjonalne pole mghAtrqPoland
export interface ProtocolCriterion {
  id: string;
  name: string;
  details: string;
  mghAtrqPoland?: MghAtrqPolandDetails; // Opcjonalne pole dla IC6
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  criteria: {
    inclusion: Array<ProtocolCriterion>; // Używamy nowego typu ProtocolCriterion
    psychiatricExclusion: Array<ProtocolCriterion>; // Używamy nowego typu ProtocolCriterion
    medicalExclusion: Array<ProtocolCriterion>; // Używamy nowego typu ProtocolCriterion
  };
}

export interface PharmacotherapyItem {
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
    pharmacotherapy: Array<PharmacotherapyItem>;
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
  modelUsed?: SupportedAIModel;
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
  modelUsed?: SupportedAIModel;
}

export interface Criterion { // Ten typ jest używany dla danych pacjenta, nie dla definicji protokołu
  id: string;
  name: string;
  status: string;
  details: string;
  userStatus: string | null;
  userComment: string | null;
  userOverrideTimestamp: string | null;
}
