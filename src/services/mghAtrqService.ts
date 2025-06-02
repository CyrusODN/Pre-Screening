// ============================================================================
// MGH-ATRQ SERVICE - Unified MGH-ATRQ Compliance Assessment
// ============================================================================

import { PREDEFINED_PROTOCOLS } from '../data/protocols';
import type { PharmacotherapyItem, PatientData } from '../types/index';
import { parseISO, differenceInDays, isValid } from 'date-fns';

// ============================================================================
// MGH-ATRQ TYPES & INTERFACES
// ============================================================================

export interface MGHATRQAssessmentResult {
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
    protocolMedication?: any; // Matching medication from protocol
  };
  episodeStartDate?: string | null;
  failureCount?: number;
  adequateTrials?: Array<{
    id: string;
    drugName: string;
    dose: string;
    duration: number;
    adequate: boolean;
    reasoning: string;
  }>;
}

export interface MGHATRQTrialAnalysis {
  drugName: string;
  dose: string;
  duration: number;
  startDate: string;
  endDate: string;
  adequate: boolean;
  reasoning: string;
  protocolMedication?: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract numeric dose from dose string
 */
export const extractDoseFromString = (doseStr: string): number => {
  if (!doseStr) return 0;
  
  // ULEPSZENIE: Lepsze parsowanie dawek w różnych formatach
  const originalDose = doseStr;
  
  // Sprawdź czy jest format typu "50mg (2x25mg)" - weź pierwszą wartość
  const mainDoseMatch = doseStr.match(/^(\d+(?:[.,]\d+)?)\s*mg/i);
  if (mainDoseMatch) {
    const dose = parseFloat(mainDoseMatch[1].replace(',', '.'));
    console.log(`🔍 [Dose Parsing] "${originalDose}" -> ${dose}mg (main dose format)`);
    return dose;
  }
  
  // Sprawdź format typu "2x25mg" - pomnóż
  const multiplyDoseMatch = doseStr.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*mg/i);
  if (multiplyDoseMatch) {
    const multiplier = parseInt(multiplyDoseMatch[1]);
    const singleDose = parseFloat(multiplyDoseMatch[2].replace(',', '.'));
    const totalDose = multiplier * singleDose;
    console.log(`🔍 [Dose Parsing] "${originalDose}" -> ${totalDose}mg (${multiplier}x${singleDose}mg)`);
    return totalDose;
  }
  
  // Fallback - standardowe parsowanie
  const cleaned = doseStr.toLowerCase()
    .replace(/mg|ml|g|mcg|μg|units?|iu|tabs?|tabl?\.?/g, '')
    .replace(/[^0-9.,]/g, '');
  
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  const dose = match ? parseFloat(match[1].replace(',', '.')) : 0;
  
  console.log(`🔍 [Dose Parsing] "${originalDose}" -> ${dose}mg (fallback parsing)`);
  return dose;
};

/**
 * Get MGH-ATRQ medications from protocol
 */
export const getMGHATRQMedications = () => {
  const comp006Protocol = PREDEFINED_PROTOCOLS['COMP006'];
  const ic6Criterion = comp006Protocol?.criteria.inclusion?.find((c: any) => c.id === 'IC6');
  return ic6Criterion?.mghAtrqPoland?.medications || [];
};

/**
 * Find matching medication in MGH-ATRQ protocol
 * UJEDNOLICENIE: Updated to use same mapping logic as clinicalAnalysisService
 */
export const findMatchingMedication = (drugName: string) => {
  const mghAtrqMedications = getMGHATRQMedications();
  const normalizedDrugName = drugName.toLowerCase().replace(/[^a-z]/g, '');
  
  // UJEDNOLICENIE: Enhanced variations with pharmaceutical/Latin names
  const drugVariations = [
    normalizedDrugName,
    drugName.toLowerCase().replace(/[^a-z]/g, ''),
    // Common Polish-English variations (same as clinicalAnalysisService)
    normalizedDrugName.replace('wenlafaksyna', 'venlafaxine'),
    normalizedDrugName.replace('venlafaxine', 'wenlafaksyna'),
    normalizedDrugName.replace('kwetiapina', 'quetiapine'),
    normalizedDrugName.replace('quetiapine', 'kwetiapina'),
    normalizedDrugName.replace('escitalopram', 'escitalopram'), // same in both
    normalizedDrugName.replace('mirtazapina', 'mirtazapine'),
    normalizedDrugName.replace('mirtazapine', 'mirtazapina'),
    normalizedDrugName.replace('duloksetyna', 'duloxetine'),
    normalizedDrugName.replace('duloxetine', 'duloksetyna'),
    normalizedDrugName.replace('sertralina', 'sertraline'),
    normalizedDrugName.replace('sertraline', 'sertralina'),
    normalizedDrugName.replace('fluoksetyna', 'fluoxetine'),
    normalizedDrugName.replace('fluoxetine', 'fluoksetyna'),
    normalizedDrugName.replace('paroksetyna', 'paroxetine'),
    normalizedDrugName.replace('paroxetine', 'paroksetyna'),
    normalizedDrugName.replace('citalopram', 'citalopram'), // same in both
    normalizedDrugName.replace('bupropion', 'bupropion'), // same in both
    normalizedDrugName.replace('trazodon', 'trazodone'),
    normalizedDrugName.replace('trazodone', 'trazodon'),
    
    // NAPRAWA: Pharmaceutical/Latin names with "hydrochloridum" and other salts
    normalizedDrugName.replace('sertralinihydrochloridum', 'sertralina'),
    normalizedDrugName.replace('sertralinihydrochloridum', 'sertraline'),
    normalizedDrugName.replace('sertralinehydrochloride', 'sertralina'),
    normalizedDrugName.replace('sertralinehydrochloride', 'sertraline'),
    normalizedDrugName.replace('escitalopramiumoxalas', 'escitalopram'),
    normalizedDrugName.replace('escitalopramoxalate', 'escitalopram'),
    normalizedDrugName.replace('fluoxetinihydrochloridum', 'fluoksetyna'),
    normalizedDrugName.replace('fluoxetinihydrochloridum', 'fluoxetine'),
    normalizedDrugName.replace('paroxetinihydrochloridum', 'paroksetyna'),
    normalizedDrugName.replace('paroxetinihydrochloridum', 'paroxetine'),
    normalizedDrugName.replace('citalopramihydrobromidum', 'citalopram'),
    normalizedDrugName.replace('citaloprambromide', 'citalopram'),
    normalizedDrugName.replace('venlafaxinihydrochloridum', 'wenlafaksyna'),
    normalizedDrugName.replace('venlafaxinihydrochloridum', 'venlafaxine'),
    normalizedDrugName.replace('duloxetinihydrochloridum', 'duloksetyna'),
    normalizedDrugName.replace('duloxetinihydrochloridum', 'duloxetine'),
    normalizedDrugName.replace('mirtazapinum', 'mirtazapina'),
    normalizedDrugName.replace('mirtazapinum', 'mirtazapine'),
    normalizedDrugName.replace('bupropionihydrochloridum', 'bupropion'),
    normalizedDrugName.replace('bupropionhydrochloride', 'bupropion'),
    normalizedDrugName.replace('trazodonihydrochloridum', 'trazodon'),
    normalizedDrugName.replace('trazodonihydrochloridum', 'trazodone'),
    normalizedDrugName.replace('quetiapinifumaras', 'kwetiapina'),
    normalizedDrugName.replace('quetiapinifumaras', 'quetiapine'),
    
    // Common salt variants
    normalizedDrugName.replace('hydrochloridum', ''),
    normalizedDrugName.replace('hydrochloride', ''),
    normalizedDrugName.replace('fumaras', ''),
    normalizedDrugName.replace('fumarate', ''),
    normalizedDrugName.replace('oxalas', ''),
    normalizedDrugName.replace('oxalate', ''),
    normalizedDrugName.replace('hydrobromidum', ''),
    normalizedDrugName.replace('bromide', ''),
    normalizedDrugName.replace('besylas', ''),
    normalizedDrugName.replace('besylate', ''),
    normalizedDrugName.replace('maleas', ''),
    normalizedDrugName.replace('maleate', ''),
    normalizedDrugName.replace('succinas', ''),
    normalizedDrugName.replace('succinate', '')
  ];
  
  return mghAtrqMedications.find((med: any) => {
    const medName = med.drugName.toLowerCase().replace(/[^a-z]/g, '');
    const brandName = med.brandName?.toLowerCase().replace(/[^a-z]/g, '') || '';
    
    return drugVariations.some(variation => 
      medName.includes(variation) || 
      variation.includes(medName) ||
      (brandName && (variation.includes(brandName) || brandName.includes(variation)))
    );
  });
};

// ============================================================================
// CORE MGH-ATRQ ASSESSMENT FUNCTIONS
// ============================================================================

/**
 * Assess single drug trial for MGH-ATRQ compliance
 */
export const assessSingleTrial = (
  drugName: string,
  dose: string,
  duration: number,
  notes?: string
): MGHATRQTrialAnalysis => {
  const extractedDose = extractDoseFromString(dose);
  const matchingMedication = findMatchingMedication(drugName);
  
  console.log(`🔍 [MGH-ATRQ Single Trial] Drug: ${drugName}, Dose: ${dose} -> ${extractedDose}mg, Duration: ${duration} days`);
  
  let adequate = false;
  let reasoning = '';
  
  if (matchingMedication) {
    // Get minimum required dose from protocol
    const minDoseStr = matchingMedication.minDose;
    const doseMatch = minDoseStr.match(/(\d+(?:\.\d+)?)/);
    const minRequiredDose = doseMatch ? parseFloat(doseMatch[1]) : 0;
    
    const doseAdequate = extractedDose >= minRequiredDose;
    const durationAdequate = duration >= 56; // 8 weeks minimum
    
    adequate = doseAdequate && durationAdequate;
    
    // NAPRAWA: Improved reasoning that aligns with the final decision
    reasoning = `Próba leczenia lekiem ${drugName}`;
    
    // Add drug recognition info
    if (matchingMedication.drugName !== drugName) {
      reasoning += ` (rozpoznany jako ${matchingMedication.drugName})`;
    }
    
    reasoning += ` jest uwzględniona w protokole MGH-ATRQ COMP006. `;
    
    // Dose assessment
    if (doseAdequate) {
      reasoning += `Dawka ${dose} spełnia minimalne wymagania protokołu (≥${minRequiredDose}mg). `;
    } else {
      reasoning += `Dawka ${dose} jest poniżej minimalnego progu protokołu (wymagane ≥${minRequiredDose}mg). `;
    }
    
    // Duration assessment
    if (durationAdequate) {
      reasoning += `Czas trwania ${duration} dni spełnia minimalne wymagania (≥8 tygodni).`;
    } else {
      reasoning += `Czas trwania ${duration} dni jest niewystarczający (wymagane ≥8 tygodni).`;
    }
    
    // Final assessment
    if (adequate) {
      reasoning += ` Próba uznana za adekwatną zgodnie z kryteriami MGH-ATRQ.`;
    } else {
      reasoning += ` Próba nie spełnia kryteriów adekwatności MGH-ATRQ.`;
    }
    
  } else {
    // NAPRAWA: More informative message for unrecognized drugs
    reasoning = `Lek ${drugName} nie jest uwzględniony w standardowym protokole MGH-ATRQ COMP006. `;
    reasoning += `Ocena adekwatności będzie oparta na dostępnych danych klinicznych i kontekście terapeutycznym. `;
    
    // For unrecognized drugs, we can't assess adequacy by protocol standards
    adequate = false;
    
    // But add clinical context if available
    if (notes) {
      const notesLower = notes.toLowerCase();
      if (notesLower.includes('adekwatna') || notesLower.includes('adequate')) {
        reasoning += `Uwagi kliniczne wskazują na adekwatność terapii.`;
      } else if (notesLower.includes('nieadekwatna') || notesLower.includes('inadequate')) {
        reasoning += `Uwagi kliniczne wskazują na nieadekwatność terapii.`;
      } else {
        reasoning += `Brak jednoznacznych wskazań dotyczących adekwatności w uwagach klinicznych.`;
      }
    } else {
      reasoning += `Brak dodatkowych informacji klinicznych do oceny.`;
    }
  }
  
  return {
    drugName,
    dose,
    duration,
    startDate: '', // Will be filled by caller
    endDate: '', // Will be filled by caller
    adequate,
    reasoning: reasoning.trim(),
    protocolMedication: matchingMedication
  };
};

/**
 * Assess MGH-ATRQ compliance for single drug episode
 */
export const assessMGHATRQCompliance = (
  drugName: string,
  dose: string,
  duration: number,
  notes?: string,
  patientData?: PatientData
): MGHATRQAssessmentResult => {
  const trialAnalysis = assessSingleTrial(drugName, dose, duration, notes);
  const matchingMedication = trialAnalysis.protocolMedication;
  
  // Check for augmentation context
  const augmentationUsed = 
    (notes?.toLowerCase().includes('augmentacja') || false) ||
    (notes?.toLowerCase().includes('wzmocnienie') || false) ||
    (matchingMedication?.notes?.includes('adjuwantowe') || false);
  
  // Analyze clinical notes for compliance indicators
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
  
  // Check patient data for AI agent analysis
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
  let adequateTrial = false;
  let isCompliant = false;
  
  if (matchingMedication) {
    // If drug is in protocol, it must meet all criteria
    adequateTrial = trialAnalysis.adequate;
    isCompliant = adequateTrial;
    
    // Clinical notes can only confirm, but not override actual assessment
    if (notesBasedCompliance && !adequateTrial) {
      // Conflict between notes and actual assessment - priority for actual assessment
      confidence = Math.max(confidence, 0.7);
    }
  } else {
    // If drug is not in protocol, can rely on clinical notes
    adequateTrial = notesBasedCompliance;
    isCompliant = adequateTrial;
  }
  
  console.log(`🔍 [MGH-ATRQ] Final decision: isCompliant=${isCompliant}, adequateTrial=${adequateTrial}, notesBasedCompliance=${notesBasedCompliance}`);
  
  return {
    isCompliant,
    confidence,
    reasoning: trialAnalysis.reasoning,
    minDoseReached: trialAnalysis.adequate && !!matchingMedication,
    minDurationReached: duration >= 56,
    adequateTrial,
    specificFindings: {
      drugFound: !!matchingMedication,
      doseAdequate: trialAnalysis.adequate && !!matchingMedication,
      durationAdequate: duration >= 56,
      augmentationUsed,
      protocolMedication: matchingMedication
    }
  };
};

/**
 * Comprehensive MGH-ATRQ assessment for multiple trials (TRD assessment)
 */
export const assessTRDCompliance = (
  pharmacotherapy: PharmacotherapyItem[],
  episodeStartDate?: string | null
): MGHATRQAssessmentResult => {
  console.log(`🔬 [TRD Assessment] Analyzing ${pharmacotherapy.length} trials, episode start: ${episodeStartDate}`);
  
  const adequateTrials: Array<{
    id: string;
    drugName: string;
    dose: string;
    duration: number;
    adequate: boolean;
    reasoning: string;
  }> = [];
  
  let failureCount = 0;
  
  // Filter trials by episode date if provided
  let relevantTrials = pharmacotherapy;
  if (episodeStartDate) {
    const episodeStart = parseISO(episodeStartDate);
    if (isValid(episodeStart)) {
      relevantTrials = pharmacotherapy.filter(trial => {
        const trialStart = parseISO(trial.startDate || '');
        return isValid(trialStart) && trialStart >= episodeStart;
      });
      console.log(`🔍 [TRD] Filtered to ${relevantTrials.length} trials in current episode`);
    }
  }
  
  // Assess each trial
  for (const trial of relevantTrials) {
    const startDate = parseISO(trial.startDate || '');
    const endDate = parseISO(trial.endDate || '');
    
    if (!isValid(startDate) || !isValid(endDate)) {
      console.warn(`⚠️ [TRD] Invalid dates for trial: ${trial.drugName}`);
      continue;
    }
    
    const duration = differenceInDays(endDate, startDate);
    const assessment = assessSingleTrial(
      trial.drugName || '',
      trial.dose || '',
      duration,
      trial.notes
    );
    
    adequateTrials.push({
      id: `trial-${adequateTrials.length + 1}`,
      drugName: trial.drugName || '',
      dose: trial.dose || '',
      duration,
      adequate: assessment.adequate,
      reasoning: assessment.reasoning
    });
    
    if (assessment.adequate) {
      failureCount++;
      console.log(`✅ [TRD] Adequate trial ${failureCount}: ${trial.drugName} ${trial.dose} for ${duration} days`);
    } else {
      console.log(`❌ [TRD] Inadequate trial: ${trial.drugName} ${trial.dose} for ${duration} days - ${assessment.reasoning}`);
    }
  }
  
  // Determine TRD status
  const trdConfirmed = failureCount >= 2 && failureCount < 5;
  
  // Generate conclusion
  let conclusion = `Na podstawie Kryteriów MGH-ATRQ Badania, zidentyfikowano ${failureCount} nieudanych, adekwatnych prób leczenia:`;
  adequateTrials.filter(t => t.adequate).forEach((trial, index) => {
    conclusion += `\n- Próba ${index + 1}: ${trial.drugName} ${trial.dose} przez ${Math.round(trial.duration / 7)} tygodni.`;
  });
  
  if (trdConfirmed) {
    conclusion += `\nPacjent spełnia kryterium TRD (≥2 niepowodzenia adekwatnych prób).`;
  } else if (failureCount < 2) {
    conclusion += `\nPacjent NIE spełnia kryterium TRD (< 2 niepowodzenia adekwatnych prób).`;
  } else {
    conclusion += `\nPacjent NIE spełnia kryterium TRD (≥5 niepowodzeń - przekroczenie limitu).`;
  }
  
  return {
    isCompliant: trdConfirmed,
    confidence: adequateTrials.length > 0 ? 0.9 : 0.3,
    reasoning: conclusion,
    minDoseReached: adequateTrials.some(t => t.adequate),
    minDurationReached: adequateTrials.some(t => t.duration >= 56),
    adequateTrial: adequateTrials.some(t => t.adequate),
    specificFindings: {
      drugFound: adequateTrials.length > 0,
      doseAdequate: adequateTrials.some(t => t.adequate),
      durationAdequate: adequateTrials.some(t => t.duration >= 56),
      augmentationUsed: adequateTrials.some(t => t.reasoning.includes('adjuwantowe'))
    },
    episodeStartDate,
    failureCount,
    adequateTrials
  };
};

// ============================================================================
// EXPORT SERVICE INTERFACE
// ============================================================================

export const mghAtrqService = {
  // Core assessment functions
  assessSingleTrial,
  assessMGHATRQCompliance,
  assessTRDCompliance,
  
  // Utility functions
  extractDoseFromString,
  getMGHATRQMedications,
  findMatchingMedication,
  
  // Legacy compatibility (for gradual migration)
  analyzeMGHATRQCompliance: assessMGHATRQCompliance
};

export default mghAtrqService; 