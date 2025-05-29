// ============================================================================
// MGH-ATRQ SERVICE - Enhanced with Intelligent Drug Name Translation
// ============================================================================

import { PREDEFINED_PROTOCOLS } from '../data/protocols';
import type { PharmacotherapyItem, PatientData } from '../types/index';
import { parseISO, differenceInDays, isValid } from 'date-fns';

// ============================================================================
// INTELLIGENT DRUG NAME TRANSLATION FOR MGH-ATRQ COMPLIANCE
// ============================================================================

/**
 * Enhanced drug name variants generation with intelligent cross-language mapping
 * This function ensures that Polish/Latin drug names can be found in English MGH-ATRQ protocol
 */
export function generateIntelligentDrugNameVariants(drugName: string): Set<string> {
  const variants = new Set<string>();
  const cleaned = drugName.toLowerCase().trim();
  
  // Add original name
  variants.add(drugName);
  variants.add(cleaned);
  
  // Enhanced pharmaceutical term removal
  const pharmaceuticalTerms = [
    // Polish terms
    'hydrochloridum', 'hydrobromidum', 'hemihydricum', 'hemihydrate',
    'dihydricum', 'monohydricum', 'anhydricum', 'sesquihydricum',
    'besilat', 'besylat', 'maleat', 'sukcinat', 'tartrazyna',
    'laktozy monohydrat', 'celuloza mikrokrystaliczna',
    // Strengths and forms
    'mg', 'mcg', 'μg', 'g', 'ml', 'tabl', 'tabletki', 'kapsułki',
    'retard', 'sr', 'xl', 'er', 'cr', 'la', 'od',
    // Numbers and doses
    /\d+(\.\d+)?\s*(mg|mcg|μg|g|ml)/g,
    /\d+/g
  ];
  
  let cleanedDrug = cleaned;
  pharmaceuticalTerms.forEach(term => {
    if (typeof term === 'string') {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      cleanedDrug = cleanedDrug.replace(regex, '').trim();
    } else {
      cleanedDrug = cleanedDrug.replace(term, '').trim();
    }
  });
  
  // Remove extra spaces
  cleanedDrug = cleanedDrug.replace(/\s+/g, ' ').trim();
  if (cleanedDrug) variants.add(cleanedDrug);
  
  // ============================================================================
  // ENHANCED CROSS-LANGUAGE DRUG NAME MAPPING FOR MGH-ATRQ
  // ============================================================================
  
  // Latin to English translations (comprehensive psychiatric drugs)
  const latinToEnglish: Record<string, string> = {
    'sertralinum': 'sertraline',
    'sertralini': 'sertraline',
    'escitalopramum': 'escitalopram',
    'escitalopram': 'escitalopram',
    'citalopramum': 'citalopram',
    'fluoxetinum': 'fluoxetine',
    'paroxetinum': 'paroxetine',
    'paroxetini': 'paroxetine',
    'venlafaxinum': 'venlafaxine',
    'venlafaxini': 'venlafaxine',
    'wenlafaksyna': 'venlafaxine',
    'duloxetinum': 'duloxetine',
    'duloxetini': 'duloxetine',
    'mirtazapinum': 'mirtazapine',
    'mirtazapini': 'mirtazapine',
    'bupropionum': 'bupropion',
    'bupropionis': 'bupropion',
    'vortioxetinum': 'vortioxetine',
    'vortioxetini': 'vortioxetine',
    'trazodonum': 'trazodone',
    'trazodoni': 'trazodone',
    'quetiapinum': 'quetiapine',
    'quetiapini': 'quetiapine',
    'olanzapinum': 'olanzapine',
    'olanzapini': 'olanzapine',
    'risperidonum': 'risperidone',
    'risperidoni': 'risperidone',
    'aripiprazolum': 'aripiprazole',
    'aripiprazoli': 'aripiprazole',
    'methylphenidatum': 'methylphenidate',
    'methylphenidati': 'methylphenidate',
    'atomoxetinum': 'atomoxetine',
    'atomoxetini': 'atomoxetine',
    'pregabalinum': 'pregabalin',
    'pregabalini': 'pregabalin',
    'gabapentinum': 'gabapentin',
    'gabapentini': 'gabapentin',
    'lamotriginum': 'lamotrigine',
    'lamotrigini': 'lamotrigine',
    'lithium': 'lithium',
    'lithii': 'lithium',
    'valproicum': 'valproic acid',
    'valproate': 'valproic acid',
    'carbamazepinum': 'carbamazepine',
    'carbamazepini': 'carbamazepine'
  };
  
  // English to Polish translations
  const englishToPolish: Record<string, string> = {
    'duloxetine': 'duloksetyna',
    'sertraline': 'sertralina',
    'citalopram': 'citalopram',
    'escitalopram': 'escitalopram',
    'venlafaxine': 'wenlafaksyna',
    'bupropion': 'bupropion',
    'vortioxetine': 'wortioksetyna',
    'quetiapine': 'kwetiapina',
    'mirtazapine': 'mirtazapina',
    'fluoxetine': 'fluoksetyna',
    'paroxetine': 'paroksetyna',
    'trazodone': 'trazodon',
    'methylphenidate': 'metylofenidat',
    'atomoxetine': 'atomoksetyna',
    'olanzapine': 'olanzapina',
    'risperidone': 'risperydol',
    'aripiprazole': 'arypiprazol',
    'pregabalin': 'pregabalina',
    'gabapentin': 'gabapentyna',
    'lamotrigine': 'lamotrygin'
  };
  
  // Apply all translations to current variants
  const currentVariants = Array.from(variants);
  for (const variant of currentVariants) {
    const lowerVariant = variant.toLowerCase();
    
    // Latin to English
    for (const [latin, english] of Object.entries(latinToEnglish)) {
      if (lowerVariant.includes(latin)) {
        variants.add(english);
        variants.add(english.charAt(0).toUpperCase() + english.slice(1));
        
        // Create compound variations
        const replaced = lowerVariant.replace(latin, english);
        variants.add(replaced);
        variants.add(replaced.charAt(0).toUpperCase() + replaced.slice(1));
      }
    }
    
    // English to Polish
    for (const [english, polish] of Object.entries(englishToPolish)) {
      if (lowerVariant.includes(english)) {
        variants.add(polish);
        variants.add(polish.charAt(0).toUpperCase() + polish.slice(1));
        
        // Create compound variations
        const replaced = lowerVariant.replace(english, polish);
        variants.add(replaced);
        variants.add(replaced.charAt(0).toUpperCase() + replaced.slice(1));
      }
    }
  }
  
  // ============================================================================
  // BRAND NAME TO GENERIC MAPPING FOR MAJOR PSYCHIATRIC DRUGS
  // ============================================================================
  
  const brandToGeneric: Record<string, string> = {
    // Antidepressants
    'brintellix': 'vortioxetine',
    'trintellix': 'vortioxetine',
    'zoloft': 'sertraline',
    'asentra': 'sertraline',
    'stimuloton': 'sertraline',
    'cipralex': 'escitalopram',
    'lexapro': 'escitalopram',
    'escitalopram': 'escitalopram',
    'cipramil': 'citalopram',
    'celexa': 'citalopram',
    'prozac': 'fluoxetine',
    'fluoksetin': 'fluoxetine',
    'paxil': 'paroxetine',
    'seroxat': 'paroxetine',
    'effexor': 'venlafaxine',
    'venlafaxin': 'venlafaxine',
    'wenlafaksyna': 'venlafaxine',
    'cymbalta': 'duloxetine',
    'dulsevia': 'duloxetine',
    'remeron': 'mirtazapine',
    'mirtagen': 'mirtazapine',
    'wellbutrin': 'bupropion',
    'elontril': 'bupropion',
    'desyrel': 'trazodone',
    'depratal': 'trazodone',
    
    // Antipsychotics
    'seroquel': 'quetiapine',
    'ketrel': 'quetiapine',
    'zyprexa': 'olanzapine',
    'olanzapin': 'olanzapine',
    'risperdal': 'risperidone',
    'risperidol': 'risperidone',
    'abilify': 'aripiprazole',
    'arypiprazol': 'aripiprazole',
    
    // ADHD medications  
    'concerta': 'methylphenidate',
    'medikinet': 'methylphenidate',
    'ritalin': 'methylphenidate',
    'strattera': 'atomoxetine',
    'auroxetyn': 'atomoxetine',
    
    // Mood stabilizers & others
    'lyrica': 'pregabalin',
    'pregabalin': 'pregabalin',
    'neurontin': 'gabapentin',
    'gabapentyna': 'gabapentin',
    'lamictal': 'lamotrigine',
    'lamotrygin': 'lamotrigine',
    'xanax': 'alprazolam',
    'alpram': 'alprazolam'
  };
  
  // Apply brand name mapping
  for (const variant of Array.from(variants)) {
    const lowerVariant = variant.toLowerCase();
    for (const [brand, generic] of Object.entries(brandToGeneric)) {
      if (lowerVariant.includes(brand)) {
        variants.add(generic);
        variants.add(generic.charAt(0).toUpperCase() + generic.slice(1));
        
        // Create substitution
        const replaced = lowerVariant.replace(brand, generic);
        variants.add(replaced);
        variants.add(replaced.charAt(0).toUpperCase() + replaced.slice(1));
      }
    }
  }
  
  // ============================================================================
  // FINAL CLEANUP AND VALIDATION
  // ============================================================================
  
  // Remove empty strings and normalize
  const finalVariants = new Set<string>();
  for (const variant of variants) {
    const cleaned = variant.trim();
    if (cleaned && cleaned.length > 1) {
      finalVariants.add(cleaned);
      // Add capitalized version
      finalVariants.add(cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase());
    }
  }
  
  return finalVariants;
}

// ============================================================================
// MGH-ATRQ TYPES & INTERFACES (Updated)
// ============================================================================

export interface MGHATRQAssessmentResult {
  isCompliant: boolean;
  confidence: number;
  reasoning: string;
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

// ============================================================================
// ENHANCED MGH-ATRQ SERVICE WITH INTELLIGENT DRUG TRANSLATION
// ============================================================================

class MGHATRQService {
  
/**
   * Enhanced findMatchingMedication with intelligent drug name translation
   * This resolves the issue where "Duloxetini hydrochloridum" cannot be found as "Duloxetine" in MGH-ATRQ
   */
  private findMatchingMedication(drugName: string, mghAtrqCriteria: any[]): any {
    console.log(`🔍 [MGH-ATRQ] Searching for medication: "${drugName}"`);
    
    // Generate all possible name variants using intelligent translation
    const drugVariants = generateIntelligentDrugNameVariants(drugName);
    console.log(`🔄 [MGH-ATRQ] Generated ${drugVariants.size} variants:`, Array.from(drugVariants).slice(0, 10));
    
    // Search through all criteria for any matching variant
    for (const variant of drugVariants) {
      const medication = mghAtrqCriteria.find(med => {
        // Flexible matching strategy
        const medName = med.medication?.toLowerCase() || '';
        const variantLower = variant.toLowerCase();
        
        // Exact match
        if (medName === variantLower) return true;
        
        // Partial match (medication contains variant or vice versa)
        if (medName.includes(variantLower) || variantLower.includes(medName)) {
          // Additional validation for partial matches (avoid false positives)
          const minLength = Math.min(medName.length, variantLower.length);
          if (minLength >= 4) { // Only allow partial matches for reasonable length
            return true;
          }
        }
        
        return false;
      });
      
      if (medication) {
        console.log(`✅ [MGH-ATRQ] Found match: "${drugName}" → "${variant}" → "${medication.medication}"`);
        return medication;
      }
    }
    
    console.log(`❌ [MGH-ATRQ] No match found for: "${drugName}" in protocol`);
    return null;
  }

/**
   * Enhanced drug dose parsing with intelligent unit conversion
   */
  private parseDose(doseString: string): number {
    if (!doseString || typeof doseString !== 'string') return 0;
  
    // Remove common Polish terms and clean the string
    const cleaned = doseString
      .toLowerCase()
      .replace(/[^\d.,mg\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract numeric values with units
    const patterns = [
      /(\d+(?:[.,]\d+)?)\s*mg/,
      /(\d+(?:[.,]\d+)?)\s*mcg/,
      /(\d+(?:[.,]\d+)?)\s*μg/,
      /(\d+(?:[.,]\d+)?)/
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        
        // Convert to mg if needed
        if (cleaned.includes('mcg') || cleaned.includes('μg')) {
          return value / 1000; // Convert mcg to mg
        }
        
        return value;
      }
    }
    
    return 0;
    }

  /**
   * Enhanced TRD compliance assessment with intelligent drug mapping
   */
  assessTRDCompliance(
  pharmacotherapy: PharmacotherapyItem[],
    episodeStartDate: string | null
  ): MGHATRQAssessmentResult {
    
    console.log(`🔍 [MGH-ATRQ Enhanced] Assessing TRD compliance for ${pharmacotherapy.length} medications`);
    
    // Get MGH-ATRQ criteria from protocol
    const protocol = PREDEFINED_PROTOCOLS['COMP006'];
    const ic6Criterion = protocol?.criteria?.inclusion?.find((c: any) => c.id === 'IC6');
    const mghAtrqCriteria = ic6Criterion?.mghAtrqPoland?.medications || [];
    
    console.log(`📋 [MGH-ATRQ Enhanced] Protocol has ${mghAtrqCriteria.length} drug criteria`);
    
    let adequateTrialCount = 0;
    const adequateTrials: any[] = [];
    const reasoning: string[] = [];
    
    // Filter medications to current episode if date provided
    let relevantMedications = pharmacotherapy;
  if (episodeStartDate) {
    const episodeStart = parseISO(episodeStartDate);
    if (isValid(episodeStart)) {
        relevantMedications = pharmacotherapy.filter(med => {
          if (!med.startDate) return false;
          const medStart = parseISO(med.startDate);
          return isValid(medStart) && medStart >= episodeStart;
      });
        console.log(`📅 [MGH-ATRQ Enhanced] Filtered to ${relevantMedications.length} medications from current episode (${episodeStartDate})`);
    }
  }
  
    // Assess each medication
    for (const med of relevantMedications) {
      console.log(`🔍 [MGH-ATRQ Enhanced] Assessing: ${med.drugName}, dose: ${med.dose}`);
      
      // Use enhanced findMatchingMedication with intelligent translation
      const matchingCriterion = this.findMatchingMedication(med.drugName, mghAtrqCriteria);
      
      if (!matchingCriterion) {
        reasoning.push(`❌ ${med.drugName}: Nie znaleziono w protokole MGH-ATRQ`);
        adequateTrials.push({
          id: med.id || `trial-${adequateTrials.length + 1}`,
          drugName: med.drugName,
          dose: med.dose || 'nieznana',
          duration: this.calculateDuration(med.startDate, med.endDate),
          adequate: false,
          reasoning: `Lek nie został znaleziony w protokole MGH-ATRQ COMP006`
        });
      continue;
    }
    
      // Parse doses
      const actualDose = this.parseDose(med.dose || '');
      const requiredDose = this.parseDose(matchingCriterion.minDose || '');
      const duration = this.calculateDuration(med.startDate, med.endDate);
      const requiredDuration = matchingCriterion.minTrialDurationWeeks || 8;
      
      // Assess adequacy
      const doseAdequate = actualDose >= requiredDose;
      const durationAdequate = duration >= requiredDuration;
      const isAdequate = doseAdequate && durationAdequate && actualDose > 0;
      
      console.log(`📊 [MGH-ATRQ Enhanced] ${med.drugName}: dose ${actualDose}≥${requiredDose}=${doseAdequate}, duration ${duration}≥${requiredDuration}=${durationAdequate}`);
      
      if (isAdequate) {
        adequateTrialCount++;
        reasoning.push(`✅ ${med.drugName}: Adekwatna próba (${actualDose}mg≥${requiredDose}mg, ${duration}tyg≥${requiredDuration}tyg)`);
      } else {
        const reasons = [];
        if (!doseAdequate && actualDose > 0) reasons.push(`dawka nieadekwatna (${actualDose}mg<${requiredDose}mg)`);
        if (!durationAdequate) reasons.push(`czas nieadekwatny (${duration}tyg<${requiredDuration}tyg)`);
        if (actualDose <= 0) reasons.push('brak informacji o dawce');
        
        reasoning.push(`❌ ${med.drugName}: ${reasons.join(', ')}`);
      }
    
    adequateTrials.push({
        id: med.id || `trial-${adequateTrials.length + 1}`,
        drugName: med.drugName,
        dose: med.dose || 'nieznana',
      duration,
        adequate: isAdequate,
        reasoning: isAdequate 
          ? `Adekwatna próba według MGH-ATRQ: dawka ${actualDose}mg ≥ ${requiredDose}mg przez ${duration} tygodni (wymagane ≥${requiredDuration})` 
          : `Nieadekwatna próba: ${!doseAdequate && actualDose > 0 ? `dawka za niska (${actualDose}mg<${requiredDose}mg)` : ''} ${!durationAdequate ? `czas za krótki (${duration}tyg<${requiredDuration}tyg)` : ''} ${actualDose <= 0 ? 'brak danych o dawce' : ''}`.trim()
      });
  }
  
    // Determine TRD status (need ≥2 adequate trials that failed)
    const isTRD = adequateTrialCount >= 2;
    const confidence = this.calculateConfidence(adequateTrialCount, relevantMedications.length);
    
    const finalReasoning = [
      `Analiza TRD (MGH-ATRQ Enhanced z inteligentnym mapowaniem leków):`,
      `📊 Przeanalizowano ${relevantMedications.length} leków z obecnego epizodu`,
      `✅ Adekwatnych prób: ${adequateTrialCount}`,
      ``,
      `Szczegóły:`,
      ...reasoning,
      ``,
      `🔬 Wniosek: ${isTRD ? 'TRD POTWIERDZONE' : 'TRD NIE POTWIERDZONE'} (≥2 adekwatne próby: ${adequateTrialCount}≥2 = ${isTRD})`
    ].join('\n');
    
    console.log(`📋 [MGH-ATRQ Enhanced] Final result: ${isTRD ? 'TRD CONFIRMED' : 'TRD NOT CONFIRMED'} (${adequateTrialCount} adequate trials)`);
  
  return {
      isCompliant: isTRD,
      confidence,
      reasoning: finalReasoning,
      failureCount: adequateTrialCount,
    adequateTrials
  };
  }

  private calculateDuration(startDate: string | null, endDate: string | null): number {
    if (!startDate) return 0;
    
    const start = parseISO(startDate);
    if (!isValid(start)) return 0;
    
    const end = endDate ? parseISO(endDate) : new Date();
    if (!isValid(end)) return 0;
    
    const days = differenceInDays(end, start);
    return Math.round(days / 7); // Convert to weeks
  }

  private calculateConfidence(adequateTrials: number, totalMedications: number): number {
    if (totalMedications === 0) return 0.3;
    
    // Base confidence on data completeness
    const dataCompleteness = adequateTrials / totalMedications;
    return Math.min(0.5 + (dataCompleteness * 0.4), 0.9);
  }
}

// Export singleton instance
export const mghAtrqService = new MGHATRQService(); 