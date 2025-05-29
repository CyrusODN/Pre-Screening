// ============================================================================
// CLINICAL ANALYSIS SERVICE - AI-Powered Clinical Research Functions
// ============================================================================

import { 
  parseISO, 
  differenceInDays, 
  isValid 
} from 'date-fns';
import type { PharmacotherapyItem, PatientData, SupportedAIModel } from '../types/index';
import { PREDEFINED_PROTOCOLS } from '../data/protocols';
import drugMappingClient from './drugMappingClient';
// UJEDNOLICENIE: Import z nowego MGH-ATRQ serwisu
import { enhancedMGHATRQService } from './enhancedMghAtrqService';
import { analysisHistoryService } from './AnalysisHistoryService';
// Import funkcji AI
import { analyzePatientData as analyzePatientDataAI } from './ai';
import type { EnhancedMGHATRQResult } from './enhancedMghAtrqService';

// ============================================================================
// CLINICAL RESEARCH TYPES & INTERFACES
// ============================================================================

// Enhanced clinical analysis interfaces
export interface ClinicalAnalysisResult {
  mghAtrqCompliance: MGHATRQAssessmentResult;
  adverseEvents: AdverseEventAnalysis;
  treatmentResponse: TreatmentResponseAnalysis;
  protocolEligibility: ProtocolEligibilityAnalysis;
  drugInteractions: DrugInteractionAnalysis;
  clinicalSignificance: ClinicalSignificanceAnalysis;
}

export interface AdverseEventAnalysis {
  hasAdverseEvents: boolean;
  severity: 'mild' | 'moderate' | 'severe' | 'unknown';
  events: AdverseEvent[];
  impactOnTreatment: 'none' | 'dose_reduction' | 'discontinuation' | 'switch';
  confidence: number;
}

export interface AdverseEvent {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  timeToOnset: number; // days from start
  resolved: boolean;
  actionTaken: string;
  confidence: number;
}

export interface TreatmentResponseAnalysis {
  responseType: 'full_response' | 'partial_response' | 'no_response' | 'unknown';
  timeToResponse: number; // days
  sustainedResponse: boolean;
  reasonForDiscontinuation: string;
  efficacyScore: number; // 0-10
  confidence: number;
}

export interface ProtocolEligibilityAnalysis {
  eligibleForCOMP006: boolean;
  inclusionCriteriaMet: string[];
  exclusionCriteriaViolated: string[];
  riskFactors: string[];
  recommendations: string[];
}

export interface DrugInteractionAnalysis {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  clinicalRelevance: 'low' | 'moderate' | 'high';
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  interactionType: 'pharmacokinetic' | 'pharmacodynamic' | 'additive' | 'synergistic';
  severity: 'minor' | 'moderate' | 'major';
  clinicalEffect: string;
}

export interface ClinicalSignificanceAnalysis {
  overallSignificance: 'low' | 'moderate' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  flagsForReview: string[];
}

// Enhanced drug episode with clinical analysis
export interface ProcessedDrugEpisode extends PharmacotherapyItem {
  parsedStartDate: Date; 
  parsedEndDate: Date;   
  originalIndex?: number;
  
  // Clinical Analysis Results
  clinicalAnalysis: ClinicalAnalysisResult;
  
  // Enhanced classification
  drugClassification: DrugClassificationResult;
  
  // Treatment context
  treatmentContext: TreatmentContext;
  
  // Quality indicators
  dataQuality: DataQualityAssessment;
}

export interface DrugClassificationResult {
  primaryClass: string;
  subclass?: string;
  mechanism: string[];
  isAntidepressant: boolean;
  isAugmentationAgent: boolean;
  isProtocolRelevant: boolean;
  confidence: number;
}

export interface TreatmentContext {
  episodeNumber: number;
  isFirstLine: boolean;
  isMonotherapy: boolean;
  isAugmentation: boolean;
  isCombination: boolean;
  previousFailures: number;
  washoutPeriod?: number;
  reasonForStart: string;
  reasonForStop: string;
}

export interface DataQualityAssessment {
  completeness: number; // 0-1
  reliability: number; // 0-1
  missingFields: string[];
  inconsistencies: string[];
  confidence: number; // 0-1
}

// ============================================================================
// CLINICAL RESEARCH CONSTANTS
// ============================================================================

// MGH-ATRQ minimum doses (from protocol) - DEPRECATED: Now using protocol data directly
// This constant is kept for reference but analyzeMGHATRQCompliance now uses protocol data

// ============================================================================
// ADVANCED CLINICAL ANALYSIS FUNCTIONS
// ============================================================================

// Advanced drug classification with AI-ready variables
export const classifyDrugForClinicalResearch = (drugName: string, dose?: string | null, notes?: string | null): DrugClassificationResult => {
  const name = drugName.toLowerCase().trim();
  const normalizedName = name.replace(/[^a-z]/g, '');
  
  // Get medications from COMP006 protocol instead of hardcoded lists
  const comp006Protocol = PREDEFINED_PROTOCOLS['COMP006'];
  const ic6Criterion = comp006Protocol?.criteria.inclusion?.find((c: any) => c.id === 'IC6');
  const mghAtrqMedications = ic6Criterion?.mghAtrqPoland?.medications || [];
  
  // Check against COMP006 protocol classifications
  let primaryClass = 'Unknown';
  let isAntidepressant = false;
  let isAugmentationAgent = false;
  let isProtocolRelevant = false;
  let mechanism: string[] = [];
  let confidence = 0.5;
  
  // Create variations for better matching (Polish/English names)
  const drugVariations = [
    normalizedName,
    drugName.toLowerCase().replace(/[^a-z]/g, ''),
    // Common Polish-English variations
    normalizedName.replace('wenlafaksyna', 'venlafaxine'),
    normalizedName.replace('venlafaxine', 'wenlafaksyna'),
    normalizedName.replace('kwetiapina', 'quetiapine'),
    normalizedName.replace('quetiapine', 'kwetiapina'),
    normalizedName.replace('escitalopram', 'escitalopram'), // same in both
    normalizedName.replace('mirtazapina', 'mirtazapine'),
    normalizedName.replace('mirtazapine', 'mirtazapina'),
    // NAPRAWA: Dodanie mapowania dla duloksetyny
    normalizedName.replace('duloksetyna', 'duloxetine'),
    normalizedName.replace('duloxetine', 'duloksetyna'),
    normalizedName.replace('sertralina', 'sertraline'),
    normalizedName.replace('sertraline', 'sertralina'),
    normalizedName.replace('fluoksetyna', 'fluoxetine'),
    normalizedName.replace('fluoxetine', 'fluoksetyna'),
    normalizedName.replace('paroksetyna', 'paroxetine'),
    normalizedName.replace('paroxetine', 'paroksetyna'),
    normalizedName.replace('citalopram', 'citalopram'), // same in both
    normalizedName.replace('bupropion', 'bupropion'), // same in both
    normalizedName.replace('trazodon', 'trazodone'),
    normalizedName.replace('trazodone', 'trazodon')
  ];
  
  // Find matching medication in protocol
  const matchingMedication = mghAtrqMedications.find((med: any) => {
    const medName = med.drugName.toLowerCase().replace(/[^a-z]/g, '');
    const brandName = med.brandName?.toLowerCase().replace(/[^a-z]/g, '') || '';
    
    return drugVariations.some(variation => 
      medName.includes(variation) || 
      variation.includes(medName) ||
      (brandName && (variation.includes(brandName) || brandName.includes(variation)))
    );
  });
  
  if (matchingMedication) {
    isProtocolRelevant = true;
    confidence = 0.95;
    
    // Classify based on notes in protocol
    const medNotes = matchingMedication.notes?.toLowerCase() || '';
    const drugNameLower = matchingMedication.drugName.toLowerCase();
    
    if (medNotes.includes('ssri')) {
      primaryClass = 'SSRI';
      isAntidepressant = true;
      mechanism = ['Selective Serotonin Reuptake Inhibition'];
    } else if (medNotes.includes('snri')) {
      primaryClass = 'SNRI';
      isAntidepressant = true;
      mechanism = ['Serotonin-Norepinephrine Reuptake Inhibition'];
    } else if (medNotes.includes('maoi')) {
      primaryClass = 'MAOI';
      isAntidepressant = true;
      mechanism = ['Monoamine Oxidase Inhibition'];
    } else if (drugNameLower.includes('kwetiapina') || drugNameLower.includes('quetiapine') || 
               medNotes.includes('adjuwantowe')) {
      primaryClass = 'Antipsychotic';
      isAugmentationAgent = true;
      mechanism = ['Dopamine Receptor Antagonism', 'Augmentation Strategy'];
    } else {
      // NAPRAWA: Lepsze mapowanie dla leków bez explicit notes
      if (drugNameLower.includes('mirtazapine') || drugNameLower.includes('mirtazapina')) {
        primaryClass = 'NaSSA';
        isAntidepressant = true;
        mechanism = ['Noradrenergic and Specific Serotonergic Antidepressant'];
      } else if (drugNameLower.includes('bupropion')) {
        primaryClass = 'NDRI';
        isAntidepressant = true;
        mechanism = ['Norepinephrine-Dopamine Reuptake Inhibition'];
      } else if (drugNameLower.includes('trazodone') || drugNameLower.includes('trazodon')) {
        primaryClass = 'SARI';
        isAntidepressant = true;
        mechanism = ['Serotonin Antagonist and Reuptake Inhibitor'];
      } else if (drugNameLower.includes('agomelatine')) {
        primaryClass = 'Melatonergic';
        isAntidepressant = true;
        mechanism = ['Melatonin Receptor Agonist, 5-HT2C Antagonist'];
      } else if (drugNameLower.includes('tianeptine')) {
        primaryClass = 'Atypical';
        isAntidepressant = true;
        mechanism = ['Atypical Antidepressant Mechanism'];
      } else if (drugNameLower.includes('reboxetine')) {
        primaryClass = 'NRI';
        isAntidepressant = true;
        mechanism = ['Norepinephrine Reuptake Inhibition'];
      } else if (drugNameLower.includes('mianserin')) {
        primaryClass = 'TeCA';
        isAntidepressant = true;
        mechanism = ['Tetracyclic Antidepressant'];
      } else if (drugNameLower.includes('opipramol')) {
        primaryClass = 'Tricyclic';
        isAntidepressant = true;
        mechanism = ['Tricyclic Antidepressant'];
      } else {
        // Default for other antidepressants in protocol
        primaryClass = 'Antidepressant';
        isAntidepressant = true;
        mechanism = ['Antidepressant Mechanism'];
      }
    }
  }
  
  // AI Variable: Detect from clinical notes if classification is unclear
  if (notes && confidence < 0.8) {
    const notesLower = notes.toLowerCase();
    
    // Look for clinical context clues
    if (notesLower.includes('antydepresyjny') || notesLower.includes('depresja')) {
      isAntidepressant = true;
      confidence = Math.max(confidence, 0.7);
    }
    
    if (notesLower.includes('augmentacja') || notesLower.includes('wzmocnienie')) {
      isAugmentationAgent = true;
      confidence = Math.max(confidence, 0.7);
    }
    
    // Mechanism inference from notes
    if (notesLower.includes('serotonina')) mechanism.push('Serotonin System');
    if (notesLower.includes('noradrenalina')) mechanism.push('Norepinephrine System');
    if (notesLower.includes('dopamina')) mechanism.push('Dopamine System');
  }
  
  return {
    primaryClass,
    subclass: isAugmentationAgent ? 'Augmentation' : isAntidepressant ? 'Primary' : undefined,
    mechanism,
    isAntidepressant,
    isAugmentationAgent,
    isProtocolRelevant,
    confidence
  };
};

// UJEDNOLICENIE: Delegacja do nowego serwisu MGH-ATRQ
// USUNIĘTO: export const extractDoseFromString = mghAtrqService.extractDoseFromString;

// Advanced MGH-ATRQ compliance analysis with AI variables
// UJEDNOLICENIE: Delegacja do nowego ujednoliconego serwisu MGH-ATRQ
export const analyzeMGHATRQCompliance = async (
  drugName: string, 
  dose: string, 
  duration: number, 
  notes?: string, 
  patientData?: PatientData
): Promise<MGHATRQAssessmentResult> => {
  console.log(`🔄 [Clinical Analysis] Delegating MGH-ATRQ assessment to unified service`);
  
  // Przekonwertuj parametry na format oczekiwany przez Enhanced MGH-ATRQ service
  const pharmacotherapyItem: PharmacotherapyItem = {
    id: `temp-${Date.now()}`,
    drugName,
    dose,
    startDate: null,
    endDate: null,
    notes: notes || undefined,
    attemptGroup: 1,
    shortName: drugName.substring(0, 3).toUpperCase()
  };
  
  // NAPRAWIONO: Użyj Enhanced MGH-ATRQ service z AI-powered tłumaczeniem
  const enhancedResult = await enhancedMGHATRQService.assessTRDWithPreprocessing(
    [pharmacotherapyItem], 
    null, // episodeStartDate
    [] // preprocessing mappings - puste dla pojedynczej oceny
  );
  
  // Konwertuj wynik Enhanced service na format oczekiwany przez legacy interface
  return {
    isCompliant: enhancedResult.isCompliant,
    confidence: enhancedResult.confidence,
    reasoning: enhancedResult.reasoning,
    failureCount: enhancedResult.failureCount
  };
};

// AI Variable: Analyze adverse events from clinical notes
export const analyzeAdverseEvents = (notes: string, drugClass: string, duration: number): AdverseEventAnalysis => {
  if (!notes) {
    return {
      hasAdverseEvents: false,
      severity: 'unknown',
      events: [],
      impactOnTreatment: 'none',
      confidence: 0.3
    };
  }
  
  const notesLower = notes.toLowerCase();
  const events: AdverseEvent[] = [];
  let hasAdverseEvents = false;
  let maxSeverity: 'mild' | 'moderate' | 'severe' = 'mild';
  let impactOnTreatment: 'none' | 'dose_reduction' | 'discontinuation' | 'switch' = 'none';
  
  // AI Variable: Common adverse event patterns
  const adverseEventPatterns = {
    'nudności': { type: 'Nudności', severity: 'mild' as const },
    'wymioty': { type: 'Wymioty', severity: 'moderate' as const },
    'zawroty głowy': { type: 'Zawroty głowy', severity: 'mild' as const },
    'senność': { type: 'Senność', severity: 'mild' as const },
    'bezsenność': { type: 'Bezsenność', severity: 'moderate' as const },
    'suchość w ustach': { type: 'Suchość w ustach', severity: 'mild' as const },
    'przyrost masy': { type: 'Przyrost masy ciała', severity: 'moderate' as const },
    'zaparcia': { type: 'Zaparcia', severity: 'mild' as const },
    'drżenia': { type: 'Drżenia', severity: 'moderate' as const },
    'tachykardia': { type: 'Tachykardia', severity: 'moderate' as const },
    'hipotensja': { type: 'Hipotensja ortostatyczna', severity: 'moderate' as const },
    'dysfunkcja seksualna': { type: 'Dysfunkcja seksualna', severity: 'moderate' as const },
    'zespół serotoninowy': { type: 'Zespół serotoninowy', severity: 'severe' as const },
    'myśli samobójcze': { type: 'Myśli samobójcze', severity: 'severe' as const },
    'agresja': { type: 'Agresja', severity: 'severe' as const },
    'mania': { type: 'Epizod maniakalny', severity: 'severe' as const },
    'hipomania': { type: 'Epizod hipomaniakalny', severity: 'moderate' as const }
  };
  
  // Scan for adverse events
  Object.entries(adverseEventPatterns).forEach(([pattern, eventInfo]) => {
    if (notesLower.includes(pattern)) {
      hasAdverseEvents = true;
      
      // Estimate time to onset (AI variable)
      let timeToOnset = Math.floor(duration * 0.2); // Default to 20% of treatment duration
      if (notesLower.includes('natychmiast') || notesLower.includes('od razu')) {
        timeToOnset = 1;
      } else if (notesLower.includes('po tygodniu') || notesLower.includes('tydzień')) {
        timeToOnset = 7;
      } else if (notesLower.includes('po miesiącu') || notesLower.includes('miesiąc')) {
        timeToOnset = 30;
      }
      
      // Check if resolved
      const resolved = notesLower.includes('ustąpiło') || 
                      notesLower.includes('rozwiązało się') ||
                      notesLower.includes('przeszło');
      
      // Determine action taken
      let actionTaken = 'kontynuacja leczenia';
      if (notesLower.includes('zmniejszenie dawki')) {
        actionTaken = 'zmniejszenie dawki';
        impactOnTreatment = 'dose_reduction';
      } else if (notesLower.includes('przerwanie') || notesLower.includes('odstawienie')) {
        actionTaken = 'przerwanie leczenia';
        impactOnTreatment = 'discontinuation';
      } else if (notesLower.includes('zmiana leku') || notesLower.includes('switch')) {
        actionTaken = 'zmiana leku';
        impactOnTreatment = 'switch';
      }
      
      events.push({
        type: eventInfo.type,
        severity: eventInfo.severity,
        timeToOnset,
        resolved,
        actionTaken,
        confidence: 0.8
      });
      
      if (eventInfo.severity === 'severe') maxSeverity = 'severe';
      else if (eventInfo.severity === 'moderate' && maxSeverity !== 'severe') maxSeverity = 'moderate';
    }
  });
  
  return {
    hasAdverseEvents,
    severity: hasAdverseEvents ? maxSeverity : 'unknown',
    events,
    impactOnTreatment,
    confidence: hasAdverseEvents ? 0.8 : 0.6
  };
};

// AI Variable: Analyze treatment response patterns
export const analyzeTreatmentResponse = (notes: string, duration: number, attemptGroup: number): TreatmentResponseAnalysis => {
  if (!notes) {
    // Infer from attempt group and duration
    const responseType = attemptGroup > 3 ? 'no_response' : 
                        attemptGroup > 1 ? 'partial_response' : 'full_response';
    
    return {
      responseType,
      timeToResponse: Math.floor(duration * 0.3),
      sustainedResponse: duration > 84,
      reasonForDiscontinuation: 'Brak szczegółowych danych klinicznych. Analiza oparta na numerze próby leczenia i czasie trwania.',
      efficacyScore: attemptGroup > 3 ? 3 : attemptGroup > 1 ? 5 : 7,
      confidence: 0.4
    };
  }
  
  const notesLower = notes.toLowerCase();
  let responseType: 'full_response' | 'partial_response' | 'no_response' | 'unknown' = 'unknown';
  let timeToResponse = Math.floor(duration * 0.3); // Default estimate
  let sustainedResponse = false;
  let reasonForDiscontinuation = '';
  let efficacyScore = 5;
  let confidence = 0.5;
  
  // ULEPSZENIE: Bardziej szczegółowa analiza uwag klinicznych
  const clinicalObservations: string[] = [];
  
  // AI Variable: Response pattern recognition
  if (notesLower.includes('remisja') || 
      notesLower.includes('pełna odpowiedź') ||
      notesLower.includes('znacząca poprawa') ||
      notesLower.includes('całkowita poprawa')) {
    responseType = 'full_response';
    efficacyScore = 8 + Math.random() * 2;
    confidence = 0.9;
    clinicalObservations.push('Dokumentowana pełna odpowiedź na leczenie');
  } else if (notesLower.includes('częściowa odpowiedź') || 
             notesLower.includes('minimalna poprawa') ||
             notesLower.includes('niewielka poprawa') ||
             notesLower.includes('umiarkowana poprawa')) {
    responseType = 'partial_response';
    efficacyScore = 4 + Math.random() * 3;
    confidence = 0.85;
    clinicalObservations.push('Częściowa odpowiedź na leczenie z ograniczoną poprawą');
  } else if (notesLower.includes('brak odpowiedzi') || 
             notesLower.includes('bez poprawy') ||
             notesLower.includes('pogorszenie') ||
             notesLower.includes('nieskuteczny')) {
    responseType = 'no_response';
    efficacyScore = 1 + Math.random() * 3;
    confidence = 0.9;
    clinicalObservations.push('Brak odpowiedzi terapeutycznej lub pogorszenie stanu');
  }
  
  // ULEPSZENIE: Analiza specyficznych objawów i poprawy
  if (notesLower.includes('poprawa nastroju')) {
    clinicalObservations.push('Poprawa nastroju');
  }
  if (notesLower.includes('zmniejszenie lęku')) {
    clinicalObservations.push('Redukcja objawów lękowych');
  }
  if (notesLower.includes('poprawa snu')) {
    clinicalObservations.push('Normalizacja wzorca snu');
  }
  if (notesLower.includes('zwiększenie energii')) {
    clinicalObservations.push('Wzrost poziomu energii');
  }
  if (notesLower.includes('poprawa apetytu')) {
    clinicalObservations.push('Normalizacja apetytu');
  }
  if (notesLower.includes('poprawa koncentracji')) {
    clinicalObservations.push('Poprawa funkcji poznawczych');
  }
  
  // AI Variable: Time to response extraction
  if (notesLower.includes('po tygodniu')) {
    timeToResponse = 7;
    clinicalObservations.push('Szybka odpowiedź (1 tydzień)');
  } else if (notesLower.includes('po 2 tygodniach')) {
    timeToResponse = 14;
    clinicalObservations.push('Wczesna odpowiedź (2 tygodnie)');
  } else if (notesLower.includes('po miesiącu')) {
    timeToResponse = 30;
    clinicalObservations.push('Standardowy czas odpowiedzi (4 tygodnie)');
  } else if (notesLower.includes('po 6 tygodniach')) {
    timeToResponse = 42;
    clinicalObservations.push('Opóźniona odpowiedź (6 tygodni)');
  } else if (notesLower.includes('po 8 tygodniach')) {
    timeToResponse = 56;
    clinicalObservations.push('Późna odpowiedź (8 tygodni)');
  }
  
  // AI Variable: Sustained response indicators
  sustainedResponse = duration > 84 && (responseType === 'full_response' || responseType === 'partial_response');
  if (notesLower.includes('utrzymująca się poprawa') || 
      notesLower.includes('stabilna odpowiedź')) {
    sustainedResponse = true;
    clinicalObservations.push('Utrzymująca się stabilna odpowiedź');
  }
  
  // ULEPSZENIE: Szczegółowa analiza powodów przerwania leczenia
  if (notesLower.includes('działania niepożądane')) {
    reasonForDiscontinuation = 'Przerwanie z powodu działań niepożądanych';
    if (notesLower.includes('nudności')) clinicalObservations.push('Nietolerowane nudności');
    if (notesLower.includes('senność')) clinicalObservations.push('Nadmierna sedacja');
    if (notesLower.includes('przyrost masy')) clinicalObservations.push('Niepożądany przyrost masy ciała');
    if (notesLower.includes('dysfunkcja seksualna')) clinicalObservations.push('Dysfunkcja seksualna');
  } else if (notesLower.includes('brak skuteczności')) {
    reasonForDiscontinuation = 'Przerwanie z powodu braku skuteczności po adekwatnej próbie';
    clinicalObservations.push('Potwierdzona lekooporność');
  } else if (notesLower.includes('decyzja pacjenta')) {
    reasonForDiscontinuation = 'Przerwanie na życzenie pacjenta';
    clinicalObservations.push('Niezgoda pacjenta na kontynuację');
  } else if (notesLower.includes('zmiana protokołu')) {
    reasonForDiscontinuation = 'Zmiana strategii leczenia zgodnie z protokołem';
    clinicalObservations.push('Planowa modyfikacja terapii');
  } else if (notesLower.includes('koniec leczenia')) {
    reasonForDiscontinuation = 'Planowe zakończenie po osiągnięciu celów terapeutycznych';
    clinicalObservations.push('Sukces terapeutyczny');
  } else if (notesLower.includes('przerwanie') || notesLower.includes('odstawienie')) {
    reasonForDiscontinuation = 'Przerwanie leczenia - przyczyna niespecyfikowana w dokumentacji';
  } else {
    reasonForDiscontinuation = clinicalObservations.length > 0 ? 
      `Analiza kliniczna: ${clinicalObservations.join(', ')}` : 
      'Nieznany powód przerwania - wymagana weryfikacja dokumentacji';
  }
  
  return {
    responseType,
    timeToResponse,
    sustainedResponse,
    reasonForDiscontinuation,
    efficacyScore,
    confidence
  };
};

// AI Variable: Comprehensive clinical analysis
export const performClinicalAnalysis = async (
  episode: PharmacotherapyItem, 
  duration: number, 
  patientData?: PatientData
): Promise<ClinicalAnalysisResult> => {
  const drugName = episode.drugName || '';
  const dose = episode.dose || '';
  const notes = episode.notes || '';
  const attemptGroup = episode.attemptGroup || 0;
  
  // Perform all analyses with async MGH-ATRQ
  const mghAtrqCompliance = await analyzeMGHATRQCompliance(drugName, dose, duration, notes, patientData);
  const adverseEvents = analyzeAdverseEvents(notes, '', duration);
  const treatmentResponse = analyzeTreatmentResponse(notes, duration, attemptGroup);
  
  // Protocol eligibility analysis (AI Variable)
  const protocolEligibility: ProtocolEligibilityAnalysis = {
    eligibleForCOMP006: mghAtrqCompliance.isCompliant,
    inclusionCriteriaMet: mghAtrqCompliance.isCompliant ? ['IC6'] : [],
    exclusionCriteriaViolated: [],
    riskFactors: adverseEvents.hasAdverseEvents ? ['adverse_events_history'] : [],
    recommendations: []
  };
  
  // Drug interactions analysis (placeholder for AI enhancement)
  const drugInteractions: DrugInteractionAnalysis = {
    hasInteractions: false,
    interactions: [],
    clinicalRelevance: 'low'
  };
  
  // Clinical significance analysis
  const clinicalSignificance: ClinicalSignificanceAnalysis = {
    overallSignificance: adverseEvents.severity === 'severe' ? 'critical' :
                        treatmentResponse.responseType === 'no_response' ? 'high' :
                        mghAtrqCompliance.isCompliant ? 'moderate' : 'low',
    factors: [],
    recommendations: [],
    flagsForReview: []
  };
  
  return {
    mghAtrqCompliance,
    adverseEvents,
    treatmentResponse,
    protocolEligibility,
    drugInteractions,
    clinicalSignificance
  };
};

// Optimized date parsing with caching
const dateCache = new Map<string, Date | null>();
const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  if (dateCache.has(dateStr)) {
    return dateCache.get(dateStr)!;
  }
  
  const parsed = parseISO(dateStr);
  const result = isValid(parsed) ? parsed : null;
  dateCache.set(dateStr, result);
  return result;
};

// ============================================================================
// MAIN SERVICE FUNCTION - Enrich Pharmacotherapy Data
// ============================================================================

/**
 * Main function to enrich pharmacotherapy data with AI-powered clinical analysis
 * @param pharmacotherapy - Raw pharmacotherapy data from AI agents
 * @param patientData - Complete patient data for context
 * @returns Enhanced pharmacotherapy data with clinical insights
 */
export const enrichPharmacotherapyData = async (
  pharmacotherapy: PharmacotherapyItem[], 
  patientData: PatientData
): Promise<ProcessedDrugEpisode[]> => {
  console.log('🔬 Starting clinical analysis for', pharmacotherapy.length, 'episodes');
  
  const results: ProcessedDrugEpisode[] = [];
  
  for (let index = 0; index < pharmacotherapy.length; index++) {
    const drug = pharmacotherapy[index];
    const parsedStartDate = safeDate(drug.startDate);
    const parsedEndDate = safeDate(drug.endDate);
    
    if (!parsedStartDate || !parsedEndDate) {
      console.warn('⚠️ Invalid dates for episode:', drug.drugName);
      continue;
    }
    
    const duration = differenceInDays(parsedEndDate, parsedStartDate);
    
    // Perform comprehensive clinical analysis (now async)
    const clinicalAnalysis = await performClinicalAnalysis(drug, duration, patientData);
    const drugClassification = classifyDrugForClinicalResearch(
      drug.drugName || '', 
      drug.dose, 
      drug.notes === null ? undefined : drug.notes // NAPRAWIONO: konwersja null → undefined
    );
    
    // Create treatment context
    const treatmentContext: TreatmentContext = {
      episodeNumber: drug.attemptGroup || index + 1,
      isFirstLine: (drug.attemptGroup || index + 1) === 1,
      isMonotherapy: !drugClassification.isAugmentationAgent,
      isAugmentation: drugClassification.isAugmentationAgent,
      isCombination: false, // TODO: Detect from concurrent medications
      previousFailures: Math.max(0, (drug.attemptGroup || index + 1) - 1),
      washoutPeriod: 0, // TODO: Calculate from previous episode
      reasonForStart: (drug.notes ?? '').includes('rozpoczęcie') ? 'nowy epizod' : 'zmiana leczenia', // NAPRAWIONO: nullish coalescing
      reasonForStop: clinicalAnalysis.treatmentResponse.reasonForDiscontinuation
    };
    
    // Assess data quality
    const dataQuality: DataQualityAssessment = {
      completeness: [drug.drugName, drug.dose, drug.startDate, drug.endDate].filter(Boolean).length / 4,
      reliability: drug.notes ? 0.8 : 0.6,
      missingFields: [
        !drug.drugName && 'drugName',
        !drug.dose && 'dose',
        !drug.startDate && 'startDate',
        !drug.endDate && 'endDate',
        !drug.notes && 'notes'
      ].filter(Boolean) as string[],
      inconsistencies: [],
      confidence: clinicalAnalysis.mghAtrqCompliance.confidence
    };
    
    console.log(`✅ Analyzed ${drug.drugName}: ${drugClassification.primaryClass}, MGH-ATRQ: ${clinicalAnalysis.mghAtrqCompliance.isCompliant}`);
    
    results.push({
      ...drug,
      originalIndex: index,
      parsedStartDate,
      parsedEndDate,
      clinicalAnalysis,
      drugClassification,
      treatmentContext,
      dataQuality
    } as ProcessedDrugEpisode);
  }
  
  return results;
};

// ============================================================================
// EXPORT SERVICE INTERFACE
// ============================================================================

export const clinicalAnalysisService = {
  enrichPharmacotherapyData,
  classifyDrugForClinicalResearch,
  analyzeMGHATRQCompliance,
  analyzeAdverseEvents,
  analyzeTreatmentResponse,
  performClinicalAnalysis,
  
  // UJEDNOLICENIE: Referencja do nowego serwisu MGH-ATRQ
  enhancedMGHATRQService
};

export default clinicalAnalysisService;

/**
 * Enhanced drug classification using local drug database
 */
export async function classifyDrugForClinicalResearchEnhanced(drugName: string): Promise<{
  primaryClass: string;
  isAntidepressant: boolean;
  mechanism: string[];
  atcCode: string;
  standardName: string;
  confidence: number;
  alternatives: string[];
}> {
  try {
    // Najpierw spróbuj mapowania przez lokalną bazę danych
    const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
    
    if (mappingResult.found && mappingResult.confidence > 0.7) {
      // Użyj danych z lokalnej bazy
      const isAntidepressant = mappingResult.atcCode.startsWith('N06A');
      
      let primaryClass = 'Unknown';
      let mechanism: string[] = [];
      
      if (isAntidepressant) {
        // Klasyfikuj na podstawie kodu ATC
        if (mappingResult.atcCode.startsWith('N06AA')) {
          primaryClass = 'Tricyclic';
          mechanism = ['Tricyclic Antidepressant'];
        } else if (mappingResult.atcCode.startsWith('N06AB')) {
          primaryClass = 'SSRI';
          mechanism = ['Selective Serotonin Reuptake Inhibition'];
        } else if (mappingResult.atcCode.startsWith('N06AC')) {
          primaryClass = 'TeCA';
          mechanism = ['Tetracyclic Antidepressant'];
        } else if (mappingResult.atcCode.startsWith('N06AD')) {
          primaryClass = 'MAOI';
          mechanism = ['Monoamine Oxidase Inhibition'];
        } else if (mappingResult.atcCode.startsWith('N06AF')) {
          primaryClass = 'MAOI-A';
          mechanism = ['Monoamine Oxidase A Inhibition'];
        } else if (mappingResult.atcCode.startsWith('N06AG')) {
          primaryClass = 'MAOI-A';
          mechanism = ['Monoamine Oxidase A Inhibition'];
        } else if (mappingResult.atcCode.startsWith('N06AX')) {
          // Inne leki przeciwdepresyjne - sprawdź substancję czynną
          const substanceLower = mappingResult.activeSubstance.toLowerCase();
          
          if (substanceLower.includes('venlafaxine') || substanceLower.includes('wenlafaksyna')) {
            primaryClass = 'SNRI';
            mechanism = ['Serotonin-Norepinephrine Reuptake Inhibition'];
          } else if (substanceLower.includes('duloxetine') || substanceLower.includes('duloksetyna')) {
            primaryClass = 'SNRI';
            mechanism = ['Serotonin-Norepinephrine Reuptake Inhibition'];
          } else if (substanceLower.includes('mirtazapine') || substanceLower.includes('mirtazapina')) {
            primaryClass = 'NaSSA';
            mechanism = ['Noradrenergic and Specific Serotonergic Antidepressant'];
          } else if (substanceLower.includes('bupropion')) {
            primaryClass = 'NDRI';
            mechanism = ['Norepinephrine-Dopamine Reuptake Inhibition'];
          } else if (substanceLower.includes('trazodone') || substanceLower.includes('trazodon')) {
            primaryClass = 'SARI';
            mechanism = ['Serotonin Antagonist and Reuptake Inhibitor'];
          } else if (substanceLower.includes('agomelatine') || substanceLower.includes('agomelatyna')) {
            primaryClass = 'Melatonergic';
            mechanism = ['Melatonin Receptor Agonist and 5-HT2C Antagonist'];
          } else if (substanceLower.includes('reboxetine') || substanceLower.includes('reboksetyna')) {
            primaryClass = 'NRI';
            mechanism = ['Norepinephrine Reuptake Inhibition'];
          } else {
            primaryClass = 'Other Antidepressant';
            mechanism = ['Other Antidepressant Mechanism'];
          }
        }
      } else {
        // Nie jest lekiem przeciwdepresyjnym
        primaryClass = 'Non-Antidepressant';
        mechanism = ['Non-Antidepressant Medication'];
      }
      
      return {
        primaryClass,
        isAntidepressant,
        mechanism,
        atcCode: mappingResult.atcCode,
        standardName: mappingResult.standardName,
        confidence: mappingResult.confidence,
        alternatives: mappingResult.alternatives
      };
    }
  } catch (error) {
    console.warn('Enhanced drug classification failed, falling back to legacy method:', error);
  }
  
  // Fallback do starej metody jeśli nowa nie zadziała
  const legacyResult = classifyDrugForClinicalResearch(drugName);
  return {
    ...legacyResult,
    atcCode: '',
    standardName: drugName,
    confidence: 0.5,
    alternatives: []
  };
}

// Wrapper function for AI analysis with history saving
export async function analyzePatientDataWithHistory(
  medicalHistory: string,
  studyProtocol: string,
  modelUsed: SupportedAIModel = 'o3'
): Promise<PatientData> {
  try {
    console.log(`🔬 [ClinicalAnalysis] Starting analysis with model: ${modelUsed}`);
    
    // Wywołaj oryginalną funkcję AI
    const patientData = await analyzePatientDataAI(medicalHistory, studyProtocol, modelUsed);
    
    // 💾 ZAPISZ ANALIZĘ DO HISTORII
    try {
      const analysisId = await analysisHistoryService.saveSingleAgentAnalysis(
        patientData,
        medicalHistory,
        studyProtocol
      );
      
      console.log(`💾 [ClinicalAnalysis] Analysis saved to history: ${analysisId}`);
    } catch (saveError) {
      console.warn(`⚠️ [ClinicalAnalysis] Failed to save analysis to history:`, saveError);
      // Nie przerywaj analizy jeśli zapis się nie powiódł
    }

    console.log(`✅ [ClinicalAnalysis] Analysis completed successfully`);
    return patientData;

  } catch (error) {
    console.error(`❌ [ClinicalAnalysis] Analysis failed:`, error);
    
    // 💾 ZAPISZ NIEUDANĄ ANALIZĘ
    try {
      await analysisHistoryService.saveFailedAnalysis(
        { modelUsed } as Partial<PatientData>,
        medicalHistory,
        studyProtocol,
        error instanceof Error ? error.message : String(error),
        'single-agent'
      );
    } catch (saveError) {
      console.warn(`⚠️ [ClinicalAnalysis] Failed to save failed analysis:`, saveError);
    }

    throw error;
  }
}

// Fallback interface for compatibility
export interface MGHATRQAssessmentResult {
  isCompliant: boolean;
  confidence: number;
  reasoning: string;
  failureCount: number;
  adequateTrials?: Array<{
    id: string;
    drugName: string;
    dose: string;
    duration: number;
    adequate: boolean;
    reasoning: string;
  }>;
} 