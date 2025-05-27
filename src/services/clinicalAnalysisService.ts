// ============================================================================
// CLINICAL ANALYSIS SERVICE - AI-Powered Clinical Research Functions
// ============================================================================

import { 
  parseISO, 
  differenceInDays, 
  isValid 
} from 'date-fns';
import type { PharmacotherapyItem, PatientData } from '../types/index';

// ============================================================================
// CLINICAL RESEARCH TYPES & INTERFACES
// ============================================================================

// Enhanced clinical analysis interfaces
export interface ClinicalAnalysisResult {
  mghAtrqCompliance: MGHATRQAnalysis;
  adverseEvents: AdverseEventAnalysis;
  treatmentResponse: TreatmentResponseAnalysis;
  protocolEligibility: ProtocolEligibilityAnalysis;
  drugInteractions: DrugInteractionAnalysis;
  clinicalSignificance: ClinicalSignificanceAnalysis;
}

export interface MGHATRQAnalysis {
  isCompliant: boolean;
  confidence: number; // 0-1
  reasoning: string;
  minDoseReached: boolean;
  minDurationReached: boolean;
  adequateTrial: boolean;
  specificFindings: {
    drugFound: boolean;
    doseAdequate: boolean;
    durationAdequate: boolean;
    augmentationUsed: boolean;
  };
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

// Protocol-specific drug classifications
const COMP006_DRUG_CLASSIFICATIONS = {
  // SSRI medications from MGH-ATRQ
  ssri: [
    'escitalopram', 'lexapro', 'fluvoxamine', 'luvox', 'paroxetine', 'paxil',
    'fluoxetine', 'prozac', 'sertraline', 'zoloft', 'citalopram', 'celexa'
  ],
  
  // SNRI medications from MGH-ATRQ
  snri: [
    'venlafaxine', 'effexor', 'duloxetine', 'cymbalta', 'desvenlafaxine', 'pristiq',
    'milnacipran', 'savella', 'levomilnacipran', 'fetzima'
  ],
  
  // TCA medications from MGH-ATRQ
  tca: [
    'doxepin', 'adapin', 'sinequan', 'clomipramine', 'anafranil', 'amoxapine', 'asendin',
    'amitriptyline', 'endep', 'elavil', 'maprotiline', 'ludiomil', 'desipramine', 'norpramin',
    'nortriptyline', 'pamelor', 'trimipramine', 'surmontil', 'imipramine', 'tofranil',
    'protriptyline', 'vivactil', 'pipofezine', 'azafen', 'noxiptiline', 'agedal', 'elronon'
  ],
  
  // MAOI medications from MGH-ATRQ
  maoi: [
    'isocarboxazid', 'marplan', 'phenelzine', 'nardil', 'tranylcypromine', 'parnate',
    'selegiline', 'emsam', 'moclobemide', 'aurorix', 'pirlindole', 'pirazidol'
  ],
  
  // Atypical antidepressants from MGH-ATRQ
  atypical: [
    'trazodone', 'desyrel', 'nefazodone', 'serzone', 'bupropion', 'wellbutrin',
    'mirtazapine', 'remeron', 'agomelatine', 'valdoxan', 'tianeptine', 'stablon',
    'reboxetine', 'edronax', 'mianserin', 'bolvidon', 'depnon', 'norval', 'tolvon',
    'opipramol', 'insidon', 'vilazodone', 'viibryd', 'vortioxetine', 'brintellix'
  ],
  
  // Augmentation agents (Poland-specific)
  augmentation: [
    'kwetiapina', 'quetiapine', 'seroquel', 'lithium', 'aripiprazole', 'abilify',
    'olanzapine', 'zyprexa', 'risperidone', 'risperdal'
  ]
} as const;

// MGH-ATRQ minimum doses (from protocol)
const MGH_ATRQ_MIN_DOSES = {
  // Tricyclic Antidepressants
  'doxepin': 150,
  'clomipramine': 150,
  'amoxapine': 150,
  'amitriptyline': 150,
  'maprotiline': 150,
  'desipramine': 150,
  'nortriptyline': 75,
  'trimipramine': 150,
  'imipramine': 150,
  'protriptyline': 30,
  'pipofezine': 150,
  'noxiptiline': 100,
  
  // MAOIs
  'isocarboxazid': 30,
  'phenelzine': 45,
  'tranylcypromine': 30,
  'selegiline': 6, // mg/24hrs patch
  'moclobemide': 300,
  'pirlindole': 200,
  
  // SSRIs
  'escitalopram': 10,
  'fluvoxamine': 50,
  'paroxetine': 20, // or 25
  'fluoxetine': 20,
  'sertraline': 50,
  'citalopram': 20,
  
  // SNRIs
  'venlafaxine': 150,
  'duloxetine': 60,
  'desvenlafaxine': 50,
  'milnacipran': 100,
  'levomilnacipran': 40,
  
  // Atypical
  'trazodone': 300,
  'nefazodone': 300,
  'bupropion': 300,
  'mirtazapine': 15,
  'agomelatine': 25,
  'tianeptine': 37.5,
  'reboxetine': 4,
  'mianserin': 30,
  'opipramol': 150,
  'vilazodone': 40,
  'vortioxetine': 10,
  
  // Poland-specific augmentation
  'kwetiapina': 150,
  'quetiapine': 150
} as const;

// ============================================================================
// ADVANCED CLINICAL ANALYSIS FUNCTIONS
// ============================================================================

// Advanced drug classification with AI-ready variables
export const classifyDrugForClinicalResearch = (drugName: string, dose?: string, notes?: string): DrugClassificationResult => {
  const name = drugName.toLowerCase().trim();
  const normalizedName = name.replace(/[^a-z]/g, '');
  
  // Check against COMP006 protocol classifications
  let primaryClass = 'Unknown';
  let isAntidepressant = false;
  let isAugmentationAgent = false;
  let isProtocolRelevant = false;
  let mechanism: string[] = [];
  let confidence = 0.5;
  
  // SSRI Classification
  if (COMP006_DRUG_CLASSIFICATIONS.ssri.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'SSRI';
    isAntidepressant = true;
    isProtocolRelevant = true;
    mechanism = ['Selective Serotonin Reuptake Inhibition'];
    confidence = 0.95;
  }
  
  // SNRI Classification
  else if (COMP006_DRUG_CLASSIFICATIONS.snri.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'SNRI';
    isAntidepressant = true;
    isProtocolRelevant = true;
    mechanism = ['Serotonin-Norepinephrine Reuptake Inhibition'];
    confidence = 0.95;
  }
  
  // TCA Classification
  else if (COMP006_DRUG_CLASSIFICATIONS.tca.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'TCA';
    isAntidepressant = true;
    isProtocolRelevant = true;
    mechanism = ['Tricyclic Antidepressant', 'Multiple Neurotransmitter Systems'];
    confidence = 0.95;
  }
  
  // MAOI Classification
  else if (COMP006_DRUG_CLASSIFICATIONS.maoi.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'MAOI';
    isAntidepressant = true;
    isProtocolRelevant = true;
    mechanism = ['Monoamine Oxidase Inhibition'];
    confidence = 0.95;
  }
  
  // Atypical Antidepressants
  else if (COMP006_DRUG_CLASSIFICATIONS.atypical.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'Atypical';
    isAntidepressant = true;
    isProtocolRelevant = true;
    mechanism = ['Atypical Antidepressant Mechanism'];
    confidence = 0.90;
  }
  
  // Augmentation Agents
  else if (COMP006_DRUG_CLASSIFICATIONS.augmentation.some(drug => 
    normalizedName.includes(drug.replace(/[^a-z]/g, '')) || 
    name.includes(drug))) {
    primaryClass = 'Antipsychotic';
    isAugmentationAgent = true;
    isProtocolRelevant = true;
    mechanism = ['Dopamine Receptor Antagonism', 'Augmentation Strategy'];
    confidence = 0.90;
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

// AI Variable: Extract numeric dose from string
export const extractDoseFromString = (doseStr: string): number => {
  if (!doseStr) return 0;
  
  // Remove common units and extract first number
  const cleaned = doseStr.toLowerCase()
    .replace(/mg|ml|g|mcg|μg|units?|iu|tabs?|tabl?\.?/g, '')
    .replace(/[^\d.,]/g, '');
  
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
};

// Advanced MGH-ATRQ compliance analysis with AI variables
export const analyzeMGHATRQCompliance = (
  drugName: string, 
  dose: string, 
  duration: number, 
  notes?: string, 
  patientData?: PatientData
): MGHATRQAnalysis => {
  const drugClassification = classifyDrugForClinicalResearch(drugName, dose, notes);
  
  // AI Variable: Extract dose from string
  const extractedDose = extractDoseFromString(dose);
  const normalizedDrugName = drugName.toLowerCase().replace(/[^a-z]/g, '');
  
  // Check if drug is in MGH-ATRQ list
  const drugFound = Object.keys(MGH_ATRQ_MIN_DOSES).some(drug => 
    normalizedDrugName.includes(drug.replace(/[^a-z]/g, ''))
  );
  
  // Get minimum required dose
  const minDoseKey = Object.keys(MGH_ATRQ_MIN_DOSES).find(drug => 
    normalizedDrugName.includes(drug.replace(/[^a-z]/g, ''))
  );
  
  const minRequiredDose = minDoseKey ? MGH_ATRQ_MIN_DOSES[minDoseKey as keyof typeof MGH_ATRQ_MIN_DOSES] : 0;
  const doseAdequate = extractedDose >= minRequiredDose;
  
  // Duration check (minimum 8 weeks = 56 days)
  const durationAdequate = duration >= 56;
  
  // AI Variable: Check for augmentation context
  const augmentationUsed = drugClassification.isAugmentationAgent || 
    (notes?.toLowerCase().includes('augmentacja') || false) ||
    (notes?.toLowerCase().includes('wzmocnienie') || false);
  
  // AI Variable: Analyze clinical notes for compliance indicators
  let notesBasedCompliance = false;
  let confidence = 0.5;
  
  if (notes) {
    const notesLower = notes.toLowerCase();
    
    // Explicit compliance mentions
    if (notesLower.includes('adekwatna wg kryt. mgh-atrq') || 
        notesLower.includes('zgodny z mgh-atrq') ||
        notesLower.includes('spełnia kryteria mgh-atrq')) {
      notesBasedCompliance = true;
      confidence = 0.95;
    }
    
    // Explicit non-compliance mentions
    if (notesLower.includes('nieadekwatna wg kryt. mgh-atrq') || 
        notesLower.includes('niezgodny z mgh-atrq') ||
        notesLower.includes('nie spełnia kryteriów mgh-atrq')) {
      notesBasedCompliance = false;
      confidence = 0.95;
    }
    
    // Infer from treatment context
    if (notesLower.includes('niewystarczająca dawka') || 
        notesLower.includes('za krótko') ||
        notesLower.includes('przedwczesne przerwanie')) {
      confidence = Math.max(confidence, 0.8);
    }
  }
  
  // AI Variable: Check patient data for AI agent analysis
  if (patientData && !patientData.isMockData) {
    const ic6Criterion = patientData.inclusionCriteria?.find(c => c.id === 'IC6');
    if (ic6Criterion?.details) {
      const details = ic6Criterion.details.toLowerCase();
      const drugNameLower = drugName.toLowerCase();
      
      if (details.includes(drugNameLower)) {
        if (details.includes('adekwatna') || details.includes('adequate')) {
          notesBasedCompliance = true;
          confidence = 0.98; // High confidence from AI analysis
        } else if (details.includes('nieadekwatna') || details.includes('inadequate')) {
          notesBasedCompliance = false;
          confidence = 0.98;
        }
      }
    }
  }
  
  // Final compliance determination
  const adequateTrial = (drugFound && doseAdequate && durationAdequate) || notesBasedCompliance;
  const isCompliant = adequateTrial;
  
  // Generate reasoning
  let reasoning = '';
  if (drugFound) {
    reasoning += `Lek ${drugName} znajduje się w protokole MGH-ATRQ. `;
  } else {
    reasoning += `Lek ${drugName} nie został znaleziony w standardowym protokole MGH-ATRQ. `;
  }
  
  if (doseAdequate) {
    reasoning += `Dawka ${dose} jest adekwatna (min. ${minRequiredDose}mg). `;
  } else {
    reasoning += `Dawka ${dose} może być nieadekwatna (min. ${minRequiredDose}mg). `;
  }
  
  if (durationAdequate) {
    reasoning += `Czas trwania ${duration} dni jest adekwatny (min. 56 dni). `;
  } else {
    reasoning += `Czas trwania ${duration} dni jest nieadekwatny (min. 56 dni). `;
  }
  
  if (notesBasedCompliance) {
    reasoning += 'Notatki kliniczne wskazują na zgodność z kryteriami. ';
  }
  
  return {
    isCompliant,
    confidence,
    reasoning: reasoning.trim(),
    minDoseReached: doseAdequate,
    minDurationReached: durationAdequate,
    adequateTrial,
    specificFindings: {
      drugFound,
      doseAdequate,
      durationAdequate,
      augmentationUsed
    }
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
      reasonForDiscontinuation: 'brak danych',
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
  
  // AI Variable: Response pattern recognition
  if (notesLower.includes('remisja') || 
      notesLower.includes('pełna odpowiedź') ||
      notesLower.includes('znacząca poprawa') ||
      notesLower.includes('całkowita poprawa')) {
    responseType = 'full_response';
    efficacyScore = 8 + Math.random() * 2;
    confidence = 0.9;
  } else if (notesLower.includes('częściowa odpowiedź') || 
             notesLower.includes('minimalna poprawa') ||
             notesLower.includes('niewielka poprawa') ||
             notesLower.includes('umiarkowana poprawa')) {
    responseType = 'partial_response';
    efficacyScore = 4 + Math.random() * 3;
    confidence = 0.85;
  } else if (notesLower.includes('brak odpowiedzi') || 
             notesLower.includes('bez poprawy') ||
             notesLower.includes('pogorszenie') ||
             notesLower.includes('nieskuteczny')) {
    responseType = 'no_response';
    efficacyScore = 1 + Math.random() * 3;
    confidence = 0.9;
  }
  
  // AI Variable: Time to response extraction
  if (notesLower.includes('po tygodniu')) timeToResponse = 7;
  else if (notesLower.includes('po 2 tygodniach')) timeToResponse = 14;
  else if (notesLower.includes('po miesiącu')) timeToResponse = 30;
  else if (notesLower.includes('po 6 tygodniach')) timeToResponse = 42;
  else if (notesLower.includes('po 8 tygodniach')) timeToResponse = 56;
  
  // AI Variable: Sustained response indicators
  sustainedResponse = duration > 84 && (responseType === 'full_response' || responseType === 'partial_response');
  if (notesLower.includes('utrzymująca się poprawa') || 
      notesLower.includes('stabilna odpowiedź')) {
    sustainedResponse = true;
  }
  
  // AI Variable: Reason for discontinuation
  if (notesLower.includes('działania niepożądane')) {
    reasonForDiscontinuation = 'działania niepożądane';
  } else if (notesLower.includes('brak skuteczności')) {
    reasonForDiscontinuation = 'brak skuteczności';
  } else if (notesLower.includes('decyzja pacjenta')) {
    reasonForDiscontinuation = 'decyzja pacjenta';
  } else if (notesLower.includes('zmiana protokołu')) {
    reasonForDiscontinuation = 'zmiana protokołu leczenia';
  } else if (notesLower.includes('koniec leczenia')) {
    reasonForDiscontinuation = 'planowe zakończenie';
  } else {
    reasonForDiscontinuation = 'nieznany powód';
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
export const performClinicalAnalysis = (
  episode: PharmacotherapyItem, 
  duration: number, 
  patientData?: PatientData
): ClinicalAnalysisResult => {
  const drugName = episode.drugName || '';
  const dose = episode.dose || '';
  const notes = episode.notes || '';
  const attemptGroup = episode.attemptGroup || 0;
  
  // Perform all analyses
  const mghAtrqCompliance = analyzeMGHATRQCompliance(drugName, dose, duration, notes, patientData);
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
export const enrichPharmacotherapyData = (
  pharmacotherapy: PharmacotherapyItem[], 
  patientData: PatientData
): ProcessedDrugEpisode[] => {
  console.log('🔬 Starting clinical analysis for', pharmacotherapy.length, 'episodes');
  
  return pharmacotherapy
    .map((drug, index) => {
      const parsedStartDate = safeDate(drug.startDate);
      const parsedEndDate = safeDate(drug.endDate);
      
      if (!parsedStartDate || !parsedEndDate) {
        console.warn('⚠️ Invalid dates for episode:', drug.drugName);
        return null;
      }
      
      const duration = differenceInDays(parsedEndDate, parsedStartDate);
      
      // Perform comprehensive clinical analysis
      const clinicalAnalysis = performClinicalAnalysis(drug, duration, patientData);
      const drugClassification = classifyDrugForClinicalResearch(drug.drugName || '', drug.dose, drug.notes);
      
      // Create treatment context
      const treatmentContext: TreatmentContext = {
        episodeNumber: drug.attemptGroup || index + 1,
        isFirstLine: (drug.attemptGroup || index + 1) === 1,
        isMonotherapy: !drugClassification.isAugmentationAgent,
        isAugmentation: drugClassification.isAugmentationAgent,
        isCombination: false, // TODO: Detect from concurrent medications
        previousFailures: Math.max(0, (drug.attemptGroup || index + 1) - 1),
        washoutPeriod: 0, // TODO: Calculate from previous episode
        reasonForStart: drug.notes?.includes('rozpoczęcie') ? 'nowy epizod' : 'zmiana leczenia',
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
      
      return {
        ...drug,
        originalIndex: index,
        parsedStartDate,
        parsedEndDate,
        clinicalAnalysis,
        drugClassification,
        treatmentContext,
        dataQuality
      } as ProcessedDrugEpisode;
    })
    .filter((drug): drug is ProcessedDrugEpisode => drug !== null);
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
  extractDoseFromString
};

export default clinicalAnalysisService; 