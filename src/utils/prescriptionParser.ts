// ============================================================================
// PRESCRIPTION PARSER - Intelligent Dosage and Clinical Information Extraction
// ============================================================================

export interface PrescriptionParsingResult {
  dosage: string | null;
  numericalDose: number;
  unit: string;
  frequency: string | null;
  duration: string | null;
  instructions: string;
  quantity: number | null;
  isValidPrescription: boolean;
  confidence: number;
}

/**
 * Advanced prescription text parser for Polish medical prescriptions
 * Separates actual dosage from clinical instructions
 */
export class PrescriptionParser {
  
  /**
   * Extract numerical dose from complex prescription text
   */
  static extractDosageFromPrescription(text: string): PrescriptionParsingResult {
    if (!text || typeof text !== 'string') {
      return this.createEmptyResult('', 0);
    }

    const originalText = text.trim();
    let bestDose = 0;
    let bestDosageStr = null;
    let unit = 'mg';
    let confidence = 0;
    let frequency = null;
    let duration = null;
    let quantity = null;

    // Pattern 1: Clear dosage statements "60mg", "120mg", "150mg"
    const clearDosePattern = /(\d+(?:[.,]\d+)?)\s*(mg|g|ml|mcg|μg|units?|iu)/gi;
    const clearMatches = Array.from(originalText.matchAll(clearDosePattern));
    
    if (clearMatches.length > 0) {
      // Take the highest dose found (usually the target dose)
      for (const match of clearMatches) {
        const dose = parseFloat(match[1].replace(',', '.'));
        if (dose > bestDose) {
          bestDose = dose;
          bestDosageStr = `${dose}${match[2]}`;
          unit = match[2];
          confidence = 0.95;
        }
      }
    }

    // Pattern 2: Dosage calculations "2x25mg", "3x20mg"
    const calculationPattern = /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(mg|g|ml|mcg|μg)/gi;
    const calcMatches = Array.from(originalText.matchAll(calculationPattern));
    
    for (const match of calcMatches) {
      const multiplier = parseInt(match[1]);
      const singleDose = parseFloat(match[2].replace(',', '.'));
      const totalDose = multiplier * singleDose;
      
      if (totalDose > bestDose) {
        bestDose = totalDose;
        bestDosageStr = `${totalDose}${match[3]}`;
        unit = match[3];
        frequency = `${multiplier}x dziennie`;
        confidence = 0.9;
      }
    }

    // Pattern 3: Complex instructions with target dose
    // "do dawki 60mg", "docelowej dawki 90mg"
    const targetDosePattern = /(?:do\s+(?:dawki\s+)?|docelowej\s+dawki\s+)(\d+(?:[.,]\d+)?)\s*(mg|g|ml)/gi;
    const targetMatches = Array.from(originalText.matchAll(targetDosePattern));
    
    for (const match of targetMatches) {
      const dose = parseFloat(match[1].replace(',', '.'));
      if (dose > bestDose || confidence < 0.8) {
        bestDose = dose;
        bestDosageStr = `${dose}${match[2]}`;
        unit = match[2];
        confidence = 0.85;
      }
    }

    // Pattern 4: Dosing schedules "1-0-1", "2-0-0"
    const schedulePattern = /(\d+)-(\d+)-(\d+)/g;
    const scheduleMatch = originalText.match(schedulePattern);
    if (scheduleMatch) {
      frequency = scheduleMatch[0];
    }

    // Pattern 5: Extract quantity "30 tabl", "60 kaps"
    const quantityPattern = /(\d+)\s*(?:tabl|kaps|ampułek|ml)/gi;
    const quantityMatch = originalText.match(quantityPattern);
    if (quantityMatch) {
      quantity = parseInt(quantityMatch[0]);
    }

    // Pattern 6: Duration indicators "przez 30 dni", "na 2 tygodnie"
    const durationPattern = /(?:przez|na)\s+(\d+)\s*(dni?|tygodni?|miesięcy?)/gi;
    const durationMatch = originalText.match(durationPattern);
    if (durationMatch) {
      duration = durationMatch[0];
    }

    // If no clear dose found, try to extract from tablet strength
    if (bestDose === 0) {
      // "30mg 1-0-0" style
      const strengthPattern = /(\d+(?:[.,]\d+)?)\s*(mg|g|ml)\s+[\d-]+/gi;
      const strengthMatch = originalText.match(strengthPattern);
      if (strengthMatch) {
        const dose = parseFloat(strengthMatch[0].replace(',', '.'));
        bestDose = dose;
        bestDosageStr = `${dose}mg`;
        confidence = 0.7;
      }
    }

    // Extract clinical instructions (everything that's not dosage)
    let instructions = originalText;
    if (bestDosageStr) {
      // Remove the dosage part from instructions
      instructions = instructions
        .replace(new RegExp(bestDosageStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
        .replace(/^\s*[,;-]\s*/, '')
        .trim();
    }

    // Clean up instructions
    instructions = this.cleanInstructions(instructions);

    return {
      dosage: bestDosageStr,
      numericalDose: bestDose,
      unit: unit,
      frequency: frequency,
      duration: duration,
      instructions: instructions,
      quantity: quantity,
      isValidPrescription: bestDose > 0,
      confidence: confidence
    };
  }

  /**
   * Clean up prescription instructions text
   */
  private static cleanInstructions(text: string): string {
    return text
      .replace(/^\s*[,;.-]\s*/, '') // Remove leading punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Create empty result for invalid input
   */
  private static createEmptyResult(text: string, confidence: number): PrescriptionParsingResult {
    return {
      dosage: null,
      numericalDose: 0,
      unit: 'mg',
      frequency: null,
      duration: null,
      instructions: text,
      quantity: null,
      isValidPrescription: false,
      confidence: confidence
    };
  }

  /**
   * Validate if the extracted dosage makes clinical sense
   */
  static validateDosage(drugName: string, dose: number, unit: string): boolean {
    const normalizedDrug = drugName.toLowerCase();
    
    // Basic sanity checks for common psychiatric medications
    const dosageRanges: Record<string, { min: number, max: number, unit: string }> = {
      'duloxetine': { min: 20, max: 120, unit: 'mg' },
      'duloksetyna': { min: 20, max: 120, unit: 'mg' },
      'sertraline': { min: 25, max: 200, unit: 'mg' },
      'sertralina': { min: 25, max: 200, unit: 'mg' },
      'escitalopram': { min: 5, max: 20, unit: 'mg' },
      'venlafaxine': { min: 37.5, max: 375, unit: 'mg' },
      'wenlafaksyna': { min: 37.5, max: 375, unit: 'mg' },
      'quetiapine': { min: 25, max: 800, unit: 'mg' },
      'kwetiapina': { min: 25, max: 800, unit: 'mg' }
    };

    for (const [drugKey, range] of Object.entries(dosageRanges)) {
      if (normalizedDrug.includes(drugKey)) {
        return dose >= range.min && dose <= range.max && unit === range.unit;
      }
    }

    // If drug not in list, basic sanity check
    return dose > 0 && dose < 10000 && ['mg', 'g', 'ml', 'mcg'].includes(unit);
  }

  /**
   * Main parsing function - separates dose from clinical notes
   */
  static parsePrescription(prescriptionText: string): {
    dose: string;
    clinicalNotes: string;
    confidence: number;
  } {
    const result = this.extractDosageFromPrescription(prescriptionText);
    
    return {
      dose: result.dosage || 'N/A',
      clinicalNotes: result.instructions || prescriptionText,
      confidence: result.confidence
    };
  }
}

export default PrescriptionParser; 