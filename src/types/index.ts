// src/types/index.ts
export type SupportedAIModel = 'o3' | 'gemini' | 'claude-opus';

// ============================================================================
// BASIC CONFIGURATION TYPES
// ============================================================================

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

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

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

// ============================================================================
// MAIN PATIENT DATA STRUCTURE
// ============================================================================

// Basic data structures
export interface PatientSummary {
  id: string;
  age: number;
  mainDiagnosis: string;
  comorbidities: string[];
}

export interface ReportConclusion {
  overallQualification: string;
  mainIssues: string[];
  criticalInfoNeeded: string[];
  estimatedProbability: number;
  riskFactors?: string[];
}

export interface EpisodeEstimation {
  scenarios: Array<{
    id: number;
    description: string;
    evidence: string;
    startDate?: string;
    endDate?: string | null;
    confidence?: number;
  }>;
  conclusion: string;
}

export interface TRDAnalysis {
  episodeStartDate: string | null;
  pharmacotherapy: Array<PharmacotherapyItem>;
  conclusion: string;
}

export interface PatientData {
  summary?: PatientSummary;
  inclusionCriteria: Criterion[];
  psychiatricExclusionCriteria: Criterion[];
  medicalExclusionCriteria: Criterion[];
  reportConclusion?: ReportConclusion;
  episodeEstimation?: EpisodeEstimation;
  trdAnalysis?: TRDAnalysis;
  
  // Meta informacje
  analyzedAt: string;
  modelUsed?: SupportedAIModel;
  isMockData?: boolean;
  
  // Multi-agent system fields
  drugMappingInfo?: {
    mappingsApplied: number;
    mappings: Array<{original: string; mapped: string; confidence: number}>;
    preprocessedAt: string;
  };
  
  historicalContext?: {
    previousMedications: string;
    familyHistory: string;
    otherTreatments: string;
    patientBackground: string;
  };
  
  // NEW: Psychotherapeutic analysis (supplementary to clinical analysis)
  psychotherapeuticAnalysis?: PsychotherapeuticAnalysis;
  
  // LEGACY: Specialist analysis alias (for backward compatibility with App.tsx)
  specialistAnalysis?: PsychotherapeuticAnalysis;
  
  // OLD: Narrative-based psychedelic analysis (keep for backward compatibility)
  analizaGotowosciPsychodelicznej?: AnalizaGotowosciPsychodelicznej;
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
    riskFactors?: string[];
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

// ============================================================================
// LEGACY NARRATIVE PSYCHEDELIC ANALYSIS (keep for compatibility)
// ============================================================================

export interface CytatZEHR {
  tekst: string;
  zrodlo: string;       // "wizyta 15.03.2023"
  kontekst: string;     // Dodatkowy kontekst
  znaczenie: string;    // Dlaczego ważne
}

export interface Wskaznik {
  typ: 'pozytywny' | 'negatywny' | 'mieszany';
  opis: string;
  cytat?: CytatZEHR;
}

export interface AnalizaObszaru {
  nazwa: string;
  analiza: string;          // Główna analiza narracyjna
  wspierajaceCytaty: CytatZEHR[]; // Cytaty z EHR
  wskazniki: Wskaznik[];    // Pozytywne/negatywne wskaźniki
  poziomRyzyka: 'niskie' | 'umiarkowane' | 'wysokie';
  podsumowanie: string;     // Krótkie podsumowanie obszaru
}

export interface AnalizaGotowosciPsychodelicznej {
  // Dane strukturalne dla spójności
  ogolnaGotowosc: 'doskonala' | 'dobra' | 'umiarkowana' | 'slaba' | 'przeciwwskazana';
  poziomPewnosci: number; // 0-100
  
  // Analiza narracyjna (nowe podejście)
  obszary: {
    motywacjaIOczekiwania: AnalizaObszaru;
    introspekacjaIUpsychologicznienie: AnalizaObszaru;
    elastycznoscPoznawcza: AnalizaObszaru;
    silaEgo: AnalizaObszaru;
    przymierzeTerapeutyczne: AnalizaObszaru;
    wsparcieSpoleczne: AnalizaObszaru;
  };
  
  // Podsumowanie końcowe
  ogolnaOcena: string;
  klucoweZalecenia: string[];
  duchBadania: 'bardzo_zgodny' | 'zgodny' | 'czescciowo_zgodny' | 'niezgodny';
  
  // Metadane
  dataAnalzy: string;
  jakoscDanych: 'wysoka' | 'umiarkowana' | 'niska';
  logPrzetwarzania: string[];
}

// ============================================================================
// NEW: SUPPLEMENTARY PSYCHOTHERAPEUTIC ANALYSIS 
// (Assumes clinical analysis is already done)
// ============================================================================

export type PsychotherapeuticReadiness = 'Bardzo dobra' | 'Dobra' | 'Średnia' | 'Słaba' | 'Przeciwwskazana';
export type PersonalityStructure = 'Dojrzała i stabilna' | 'Dość stabilna z obszarami trudności' | 'Krucha z znacznymi problemami' | 'Bardzo krucha/niestabilna';
export type TraumaProcessing = 'Bardzo dobra' | 'Zadowalająca' | 'Częściowa' | 'Słaba' | 'Brak/przeciwwskazania';
export type IntegrationCapacity = 'Bardzo wysoka' | 'Wysoka' | 'Średnia' | 'Niska' | 'Bardzo niska';
export type TherapeuticAlliance = 'Znakomita' | 'Bardzo dobra' | 'Dobra' | 'Problematyczna' | 'Trudna do nawiązania';

export interface PsychotherapeuticFactor<T> {
  value: T;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number; // 0-100
  redFlags?: string[];
  greenFlags?: string[];
}

// Core psychotherapeutic readiness factors (not medical/clinical)
export interface PsychotherapeuticIndicators {
  personalityStructure: PsychotherapeuticFactor<PersonalityStructure>;
  egoStrength: PsychotherapeuticFactor<'Bardzo silne' | 'Silne' | 'Średnie' | 'Słabe' | 'Bardzo słabe'>;
  traumaProcessingCapacity: PsychotherapeuticFactor<TraumaProcessing>;
  defensePatterns: PsychotherapeuticFactor<'Adaptacyjne' | 'Mieszane' | 'Regresywne' | 'Patologiczne'>;
  integrationCapacity: PsychotherapeuticFactor<IntegrationCapacity>;
  therapeuticAlliance: PsychotherapeuticFactor<TherapeuticAlliance>;
  openness: PsychotherapeuticFactor<'Bardzo wysoka' | 'Wysoka' | 'Średnia' | 'Niska' | 'Bardzo niska'>;
  copingFlexibility: PsychotherapeuticFactor<'Bardzo elastyczne' | 'Elastyczne' | 'Sztywne' | 'Bardzo sztywne'>;
}

// Set & Setting considerations for psychedelic therapy
export interface SetSettingFactors {
  motivationalReadiness: PsychotherapeuticFactor<PsychotherapeuticReadiness>;
  expectationRealism: PsychotherapeuticFactor<'Bardzo realistyczne' | 'Realistyczne' | 'Nieco magiczne' | 'Magiczne/nierzeczywiste'>;
  surrenderCapacity: PsychotherapeuticFactor<'Bardzo wysoka' | 'Wysoka' | 'Średnia' | 'Niska' | 'Bardzo niska'>;
  environmentalStability: PsychotherapeuticFactor<'Bardzo stabilne' | 'Stabilne' | 'Średnie' | 'Niestabilne' | 'Chaotyczne'>;
  supportSystem: PsychotherapeuticFactor<'Bardzo silne' | 'Silne' | 'Średnie' | 'Słabe' | 'Brak'>;
}

// Specific psychedelic therapy considerations
export interface PsychedelicSpecificFactors {
  dissociativeExperienceHandling: PsychotherapeuticFactor<'Bardzo dobra' | 'Dobra' | 'Średnia' | 'Słaba' | 'Bardzo słaba'>;
  altereredStatesComfort: PsychotherapeuticFactor<'Bardzo komfortowe' | 'Komfortowe' | 'Neutralne' | 'Dyskomfort' | 'Silny dyskomfort'>;
  controlRelinquishing: PsychotherapeuticFactor<'Naturalne' | 'Możliwe' | 'Trudne' | 'Bardzo trudne' | 'Niemożliwe'>;
  mindfulnessSkills: PsychotherapeuticFactor<'Zaawansowane' | 'Dobre' | 'Podstawowe' | 'Minimalne' | 'Brak'>;
  previousPsychedelicExperience: PsychotherapeuticFactor<'Bardzo pozytywne' | 'Pozytywne' | 'Mieszane' | 'Negatywne' | 'Brak doświadczenia'>;
}

export interface PsychotherapeuticSummary {
  overallReadiness: PsychotherapeuticReadiness;
  keyStrengths: string[];
  keyRisks: string[];
  therapeuticRecommendations: string[];
  preparationNeeds: string[];
  contraindications: string[];
  integrationSupport: string[];
}

export interface PsychotherapeuticAnalysisMetadata {
  analysisDate: string;
  clinicianId?: string;
  basedOnClinicalAnalysis: boolean; // Always true for this type
  dataQuality: 'wysoka' | 'umiarkowana' | 'niska';
  confidence: number; // 0-100
  processingNotes: string[];
}

// Main supplementary psychotherapeutic analysis interface
export interface PsychotherapeuticAnalysis {
  metadata: PsychotherapeuticAnalysisMetadata;
  
  // Core psychotherapeutic assessment
  psychotherapeuticReadiness: PsychotherapeuticIndicators;
  
  // Context-specific factors
  setSettingFactors: SetSettingFactors;
  
  // Psychedelic-specific considerations
  psychedelicFactors: PsychedelicSpecificFactors;
  
  // Clinical summary and recommendations
  summary: PsychotherapeuticSummary;
  
  // Rich narrative analysis (markdown)
  narrativeAssessment: {
    personalityDynamics: string;
    traumaAndDefenses: string;
    therapeuticRelationship: string;
    readinessAssessment: string;
    riskMitigation: string;
    preparationPlan: string;
  };
}
