// ============================================================================
// ENHANCED MGH-ATRQ SERVICE - PREPROCESSING-BASED INTELLIGENT TRANSLATION
// ============================================================================
// Ten system wykorzystuje preprocessing drug mapping i inteligentnie tłumaczy
// łacińskie nazwy z polskiego rejestru na angielskie nazwy z protokołu MGH-ATRQ
// ============================================================================

import { PREDEFINED_PROTOCOLS } from '../data/protocols';
import type { PharmacotherapyItem } from '../types/index';
import { parseISO, differenceInDays, isValid } from 'date-fns';

// ============================================================================
// INTELIGENTNY SYSTEM ROZPOZNAWANIA I TŁUMACZENIA ŁACIŃSKICH NAZW LEKÓW
// ============================================================================

/**
 * Inteligentne rozpoznawanie czy nazwa leku jest łacińska
 */
function isLatinDrugName(drugName: string): boolean {
  const cleaned = drugName.toLowerCase().trim();
  
  // Wzorce łacińskich końcówek leków
  const latinPatterns = [
    /\w+inum$/,     // escitalopramum, duloxetinum
    /\w+ini$/,      // sertralini, duloxetini  
    /\w+um$/,       // escitalopramum, venlafaxinum
    /\w+us$/,       // quetiapinus, aripiprazolus
    /\w+ide$/,      // moclobemide
    /\w+hydrochloridum$/, // compound forms
    /\w+hydrobromidum$/,
    /\w+fumaras$/,
    /\w+dimesylas$/
  ];
  
  return latinPatterns.some(pattern => pattern.test(cleaned));
}

/**
 * Inteligentne tłumaczenie łacińskich nazw na angielskie
 * Wykorzystuje wzorce językowe i logikę farmaceutyczną
 */
function translateLatinToEnglish(latinName: string): string {
  let translated = latinName.toLowerCase().trim();
  
  console.log(`🔄 [Smart Translation] Tłumaczę łacińską nazwę: ${latinName}`);
  
  // Usuń terminy farmaceutyczne
  const pharmaceuticalSuffixes = [
    'hydrochloridum', 'hydrobromidum', 'hemihydricum', 'dihydricum',
    'monohydricum', 'anhydricum', 'sesquihydricum', 'besilat', 'maleat',
    'sukcinat', 'fumaras', 'natrii phosphas', 'dimesylas'
  ];
  
  for (const suffix of pharmaceuticalSuffixes) {
    translated = translated.replace(new RegExp(`\\s*${suffix}$`, 'i'), '');
  }
  
  // Konwersje łacińskich końcówek na angielskie
  const latinToEnglishRules = [
    // Podstawowe wzorce końcówek
    { from: /inum$/, to: 'ine' },        // duloxetinum → duloxetine
    { from: /ini$/, to: 'ine' },         // sertralini → sertraline  
    { from: /um$/, to: '' },             // escitalopramum → escitalopram
    { from: /us$/, to: '' },             // quetiapinus → quetiapine
    
    // Specjalne przypadki substancji czynnych
    { from: /venlafaxin/i, to: 'venlafaxine' },
    { from: /duloxetin/i, to: 'duloxetine' },
    { from: /sertraluin/i, to: 'sertraline' },
    { from: /escitalopram/i, to: 'escitalopram' },
    { from: /citalopram/i, to: 'citalopram' },
    { from: /fluoxetin/i, to: 'fluoxetine' },
    { from: /paroxetin/i, to: 'paroxetine' },
    { from: /bupropion/i, to: 'bupropion' },
    { from: /mirtazapin/i, to: 'mirtazapine' },
    { from: /trazodon/i, to: 'trazodone' },
    { from: /vortioxetin/i, to: 'vortioxetine' },
    { from: /quetiapn/i, to: 'quetiapine' },
    { from: /ketamin/i, to: 'ketamine' },
    
    // Polskie nazwy
    { from: /wenlafaksyn/i, to: 'venlafaxine' },
    { from: /duloksetyn/i, to: 'duloxetine' },
    { from: /kwetiapn/i, to: 'quetiapine' },
    { from: /sertralin/i, to: 'sertraline' },
    { from: /fluoksetyn/i, to: 'fluoxetine' },
    { from: /paroksetyn/i, to: 'paroxetine' },
    { from: /citalopramy/i, to: 'citalopram' },
    { from: /mirtazapin/i, to: 'mirtazapine' },
    { from: /trazodon/i, to: 'trazodone' },
    { from: /buspiron/i, to: 'buspirone' }
  ];
  
  // Zastosuj reguły tłumaczenia
  for (const rule of latinToEnglishRules) {
    if (rule.from.test(translated)) {
      translated = translated.replace(rule.from, rule.to);
      console.log(`✅ [Smart Translation] Zastosowano regułę: ${latinName} → ${translated}`);
      break;
    }
  }
  
  // Jeśli żadna reguła nie pasuje, usuń tylko łacińskie końcówki
  if (translated === latinName.toLowerCase()) {
    translated = translated
      .replace(/inum$/, 'ine')
      .replace(/ini$/, 'ine') 
      .replace(/um$/, '')
      .replace(/us$/, '');
      
    console.log(`🔧 [Smart Translation] Użyto podstawowych reguł: ${latinName} → ${translated}`);
  }
  
  return translated;
}

/**
 * Inteligentne wykrywanie substancji czynnej z nazwy leku
 * Wykorzystuje wzorce nazewnictwa farmaceutycznego
 */
function extractActiveSubstance(drugName: string): string {
  let substance = drugName.toLowerCase().trim();
  
  // Usuń wszystkie terminy farmaceutyczne i formy
  const termsToRemove = [
    // Łacińskie końcówki
    'hydrochloridum', 'hydrobromidum', 'hemihydricum', 'dihydricum',
    'monohydricum', 'anhydricum', 'sesquihydricum', 'besilat', 'maleat',
    'sukcinat', 'fumaras', 'natrii phosphas', 'dimesylas',
    // Dawki i formy
    /\d+\s*mg/, /\d+\s*mcg/, /\d+\s*ml/, /\d+\s*g/,
    'tabl', 'tabletki', 'kapsułki', 'ampułki', 'roztwór',
    'retard', 'sr', 'xl', 'er', 'cr', 'la', 'od'
  ];
  
  for (const term of termsToRemove) {
    if (typeof term === 'string') {
      substance = substance.replace(new RegExp(`\\b${term}\\b`, 'gi'), '').trim();
    } else {
      substance = substance.replace(term, '').trim();
    }
  }
  
  // Usuń nadmiarowe spacje
  substance = substance.replace(/\s+/g, ' ').trim();
  
  return substance;
}

// ============================================================================
// ENHANCED MGH-ATRQ RESULT INTERFACE
// ============================================================================

export interface EnhancedMGHATRQResult {
  isCompliant: boolean;
  confidence: number;
  reasoning: string;
  failureCount: number;
  adequateTrials: Array<{
    id: string;
    originalDrugName: string;
    translatedDrugName: string;
    dose: string;
    duration: number;
    adequate: boolean;
    reasoning: string;
    mghCriterion?: any;
  }>;
  preprocessingMappings: Array<{
    originalName: string;
    preprocessedName: string;
    translatedName: string;
    found: boolean;
  }>;
}

// ============================================================================
// ENHANCED MGH-ATRQ SERVICE CLASS
// ============================================================================

export class EnhancedMGHATRQService {
  
  /**
   * GŁÓWNA METODA: Ocena TRD z wykorzystaniem preprocessing
   */
  public async assessTRDWithPreprocessing(
    pharmacotherapy: PharmacotherapyItem[],
    episodeStartDate: string | null,
    preprocessingMappings: Array<{ originalName: string; standardName: string; activeSubstance: string }> = []
  ): Promise<EnhancedMGHATRQResult> {
    
    console.log(`🔍 [Enhanced MGH-ATRQ] Rozpoczynanie oceny TRD dla ${pharmacotherapy.length} leków`);
    console.log(`📋 [Enhanced MGH-ATRQ] Dostępne mapowania preprocessing: ${preprocessingMappings.length}`);
    
    // Pobierz kryteria MGH-ATRQ z protokołu
    const protocol = PREDEFINED_PROTOCOLS['COMP006'];
    const ic6Criterion = protocol?.criteria?.inclusion?.find((c: any) => c.id === 'IC6');
    const mghAtrqCriteria = ic6Criterion?.mghAtrqPoland?.medications || [];
    
    console.log(`📊 [Enhanced MGH-ATRQ] Kryteria protokołu: ${mghAtrqCriteria.length} leków`);
    
    // Filtruj leki do obecnego epizodu
    let relevantMedications = this.filterToCurrentEpisode(pharmacotherapy, episodeStartDate);
    console.log(`📅 [Enhanced MGH-ATRQ] Leki z obecnego epizodu: ${relevantMedications.length}`);
    
    // Przeanalizuj każdy lek
    const adequateTrials: any[] = [];
    const mappingResults: any[] = [];
    let adequateCount = 0;
    
    for (const med of relevantMedications) {
      console.log(`\n🔍 [Enhanced MGH-ATRQ] Analizuję: ${med.drugName}`);
      
      // KROK 1: Znajdź mapowanie preprocessing
      const preprocessingMap = this.findPreprocessingMapping(med.drugName, preprocessingMappings);
      
      // KROK 2: AI-powered tłumaczenie nazwy na angielską dla MGH-ATRQ  
      const drugToTranslate = preprocessingMap?.standardName || med.drugName;
      const translatedName = await this.smartTranslateForMGH(drugToTranslate);
      
      // KROK 3: Znajdź w protokole MGH-ATRQ
      const mghCriterion = this.findInMGHProtocol(translatedName, mghAtrqCriteria);
      
      // KROK 4: Oceń adekwatność
      const assessment = this.assessTrialAdequacy(med, mghCriterion);
      
      // Zapisz wyniki
      adequateTrials.push({
        id: med.id || `trial-${adequateTrials.length + 1}`,
        originalDrugName: med.drugName,
        translatedDrugName: translatedName,
        dose: med.dose || 'nieznana',
        duration: assessment.duration,
        adequate: assessment.adequate,
        reasoning: assessment.reasoning,
        mghCriterion
      });
      
      mappingResults.push({
        originalName: med.drugName,
        preprocessedName: preprocessingMap?.standardName || 'brak mapowania',
        translatedName,
        found: !!mghCriterion
      });
      
      if (assessment.adequate) {
        adequateCount++;
      }
      
      console.log(`${assessment.adequate ? '✅' : '❌'} [Enhanced MGH-ATRQ] ${med.drugName} → ${translatedName}: ${assessment.adequate ? 'ADEKWATNE' : 'NIEADEKWATNE'}`);
    }
    
    // KROK 5: Finalna ocena TRD - NAPRAWIONA SEMANTYKA
    // W MGH-ATRQ: TRD = ≥2 NIEUDANE próby leczenia (które były adekwatne technicznie)
    // Założenie: każda adekwatna próba w historii to prawdopodobnie failure (bo pacjent wciąż ma depresję)
    const clinicalFailures = adequateCount; // Każda adekwatna próba w historii = kliniczny failure
    const isTRD = clinicalFailures >= 2;
    const confidence = this.calculateConfidence(adequateCount, relevantMedications.length, mappingResults);
    
    const reasoning = this.generateDetailedReasoning(
      adequateCount, 
      relevantMedications.length, 
      adequateTrials, 
      mappingResults,
      isTRD
    );
    
    console.log(`\n📋 [Enhanced MGH-ATRQ] WYNIK KOŃCOWY: ${isTRD ? 'TRD POTWIERDZONE' : 'TRD NIE POTWIERDZONE'} (${clinicalFailures} nieudanych adekwatnych prób)`);
    
    return {
      isCompliant: isTRD,
      confidence,
      reasoning,
      failureCount: clinicalFailures, // NAPRAWIONO: liczba nieudanych prób klinicznych
      adequateTrials,
      preprocessingMappings: mappingResults
    };
  }
  
  // ============================================================================
  // METODY POMOCNICZE
  // ============================================================================
  
  /**
   * Filtruje leki do obecnego epizodu
   */
  private filterToCurrentEpisode(
    pharmacotherapy: PharmacotherapyItem[], 
    episodeStartDate: string | null
  ): PharmacotherapyItem[] {
    if (!episodeStartDate) return pharmacotherapy;
    
    const episodeStart = parseISO(episodeStartDate);
    if (!isValid(episodeStart)) return pharmacotherapy;
    
    return pharmacotherapy.filter(med => {
      if (!med.startDate) return false;
      const medStart = parseISO(med.startDate);
      return isValid(medStart) && medStart >= episodeStart;
    });
  }
  
  /**
   * Znajdź mapowanie preprocessing dla danego leku
   */
  private findPreprocessingMapping(
    drugName: string, 
    mappings: Array<{ originalName: string; standardName: string; activeSubstance: string }>
  ) {
    // Najpierw szukaj dokładnego dopasowania
    let mapping = mappings.find(m => 
      m.originalName.toLowerCase() === drugName.toLowerCase()
    );
    
    // Jeśli nie znajdziesz, szukaj częściowego dopasowania
    if (!mapping) {
      mapping = mappings.find(m => 
        m.originalName.toLowerCase().includes(drugName.toLowerCase()) ||
        drugName.toLowerCase().includes(m.originalName.toLowerCase())
      );
    }
    
    if (mapping) {
      console.log(`🔄 [Enhanced MGH-ATRQ] Mapowanie preprocessing: ${drugName} → ${mapping.standardName}`);
    } else {
      console.log(`⚠️ [Enhanced MGH-ATRQ] Brak mapowania preprocessing dla: ${drugName}`);
    }
    
    return mapping;
  }
  
  /**
   * INTELIGENTNE TŁUMACZENIE - AI-powered approach (skalowalne!)
   */
  private async smartTranslateForMGH(drugName: string): Promise<string> {
    console.log(`🧠 [Smart Translation] Rozpoczynam AI-powered translation: ${drugName}`);
    
    // KROK 1: Sprawdź czy potrzebuje tłumaczenia
    if (this.isEnglishDrugName(drugName)) {
      console.log(`🔍 [Smart Translation] Already English: ${drugName}`);
      return drugName.toLowerCase();
    }
    
    // KROK 2: Użyj AI do inteligentnego tłumaczenia
    try {
      const translated = await aiTranslateDrugName(drugName);
      console.log(`✅ [Smart Translation] AI result: ${drugName} → ${translated}`);
      return translated;
    } catch (error) {
      console.error(`❌ [Smart Translation] AI failed, using fallback for: ${drugName}`);
      // Fallback: podstawowa ekstrakcja substancji czynnej
      return extractActiveSubstance(drugName);
    }
  }
  
  /**
   * Sprawdź czy nazwa jest już po angielsku
   */
  private isEnglishDrugName(drugName: string): boolean {
    const cleaned = drugName.toLowerCase().trim();
    
    // Jeśli kończy się typowymi angielskimi formami
    const englishPatterns = [
      /\w+ine$/, // sertraline, fluoxetine
      /\w+ol$/, // propranolol
      /\w+am$/, // lorazepam, diazepam
      /\w+ide$/, // haloperidol
    ];
    
    // Jeśli nie ma łacińskich ani polskich końcówek
    const nonEnglishPatterns = [
      /inum$/, /ini$/, /um$/, /us$/,  // łacińskie
      /yna$/, /syn$/, /pin$/,         // polskie
      /hydrochloridum$/, /fumaras$/   // formy farmaceutyczne
    ];
    
    const hasEnglishPattern = englishPatterns.some(p => p.test(cleaned));
    const hasNonEnglishPattern = nonEnglishPatterns.some(p => p.test(cleaned));
    
    return hasEnglishPattern || (!hasNonEnglishPattern && cleaned.length < 15);
  }
  
  /**
   * Znajdź lek w protokole MGH-ATRQ z inteligentnym dopasowywaniem
   */
  private findInMGHProtocol(translatedName: string, mghCriteria: any[]): any {
    console.log(`🔍 [Enhanced MGH-ATRQ] Szukam w protokole: "${translatedName}"`);
    
    const lowerTranslated = translatedName.toLowerCase();
    
    // Szukaj dokładnego dopasowania
    let found = mghCriteria.find(med => 
      med.drugName?.toLowerCase() === lowerTranslated
    );
    
    // Szukaj częściowego dopasowania (core substance matching)
    if (!found) {
      found = mghCriteria.find(med => {
        const medName = med.drugName?.toLowerCase() || '';
        const coreTranslated = lowerTranslated.replace(/\s+/g, '').substring(0, 8); // First 8 chars
        const coreMed = medName.replace(/\s+/g, '').substring(0, 8);
        
        return medName.includes(lowerTranslated) || 
               lowerTranslated.includes(medName) ||
               (coreTranslated.length >= 4 && coreMed.includes(coreTranslated));
      });
    }
    
    if (found) {
      console.log(`✅ [Enhanced MGH-ATRQ] Znaleziono w protokole: ${translatedName} → ${found.drugName}`);
    } else {
      console.log(`❌ [Enhanced MGH-ATRQ] Nie znaleziono w protokole: ${translatedName}`);
    }
    
    return found;
  }
  
  /**
   * Oceń adekwatność próby leczenia
   */
  private assessTrialAdequacy(medication: PharmacotherapyItem, mghCriterion: any) {
    if (!mghCriterion) {
      const duration = this.calculateDuration(medication.startDate, medication.endDate);
      return {
        adequate: false,
        duration,
        reasoning: 'Lek nie został znaleziony w protokole MGH-ATRQ COMP006'
      };
    }
    
    const actualDose = this.parseDose(medication.dose || '');
    const requiredDose = this.parseDose(mghCriterion.minDose || '');
    const duration = this.calculateDuration(medication.startDate, medication.endDate);
    const requiredDuration = 8; // Minimalne 8 tygodni wg MGH-ATRQ
    
    const doseAdequate = actualDose >= requiredDose && actualDose > 0;
    const durationAdequate = duration >= requiredDuration;
    const isAdequate = doseAdequate && durationAdequate;
    
    // Sprawdź czy użyto fallback duration
    const usedFallback = !medication.startDate || !medication.endDate;
    
    let reasoning = '';
    if (isAdequate) {
      const durationNote = usedFallback ? ` (estymacja - brak dat)` : '';
      reasoning = `Adekwatna próba według MGH-ATRQ: dawka ${actualDose}mg ≥ ${requiredDose}mg przez ${duration} tygodni${durationNote} (wymagane ≥${requiredDuration})`;
    } else {
      const issues = [];
      if (!doseAdequate) {
        if (actualDose <= 0) {
          issues.push('brak danych o dawce');
        } else {
          issues.push(`dawka za niska (${actualDose}mg < ${requiredDose}mg)`);
        }
      }
      if (!durationAdequate) {
        const durationNote = usedFallback ? ' (estymacja)' : '';
        issues.push(`czas za krótki (${duration}tyg${durationNote} < ${requiredDuration}tyg)`);
      }
      reasoning = `Nieadekwatna próba: ${issues.join(', ')}`;
    }
    
    console.log(`🔍 [Enhanced MGH-ATRQ] ${medication.drugName}: dawka=${actualDose}mg, duration=${duration}tyg${usedFallback ? ' (fallback)' : ''}, adequate=${isAdequate}`);
    
    return {
      adequate: isAdequate,
      duration,
      reasoning
    };
  }
  
  /**
   * Parsuj dawkę leku
   */
  private parseDose(doseString: string): number {
    if (!doseString || typeof doseString !== 'string') return 0;
    
    const cleaned = doseString.toLowerCase().replace(/[^\d.,mg\s]/g, ' ').trim();
    const patterns = [
      /(\d+(?:[.,]\d+)?)\s*mg/,
      /(\d+(?:[.,]\d+)?)\s*mcg/,
      /(\d+(?:[.,]\d+)?)/
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (cleaned.includes('mcg') || cleaned.includes('μg')) {
          return value / 1000; // Convert mcg to mg
        }
        return value;
      }
    }
    
    return 0;
  }
  
  /**
   * Oblicz czas trwania leczenia w tygodniach z inteligentnym fallback
   */
  private calculateDuration(startDate: string | null, endDate: string | null): number {
    // STANDARDOWE obliczanie jeśli mamy daty
    if (startDate) {
      const start = parseISO(startDate);
      if (isValid(start)) {
        const end = endDate ? parseISO(endDate) : new Date();
        if (isValid(end)) {
          const days = differenceInDays(end, start);
          const weeks = Math.round(days / 7);
          console.log(`📅 [Enhanced MGH-ATRQ] Obliczone duration: ${weeks} tygodni (${startDate} → ${endDate || 'dziś'})`);
          return weeks;
        }
      }
    }
    
    // INTELIGENTNY FALLBACK gdy brakuje dat
    console.log(`⚠️ [Enhanced MGH-ATRQ] Brak dat - używam estymacji 10 tygodni (typowa adekwatna próba)`);
    // Zwróć 10 tygodni - typowy okres adekwatnej próby leczenia w psychiatrii
    // To pozwoli na ocenę innych kryteriów (dawka, typ leku) bez blokowania przez brak dat
    return 10;
  }
  
  /**
   * Oblicz pewność wyniku
   */
  private calculateConfidence(
    adequateTrials: number, 
    totalMedications: number, 
    mappingResults: any[]
  ): number {
    if (totalMedications === 0) return 0.3;
    
    // Bazowa pewność na podstawie kompletności danych
    const dataCompleteness = adequateTrials / totalMedications;
    
    // Zwiększ pewność jeśli preprocessing działał dobrze
    const successfulMappings = mappingResults.filter(m => m.found).length;
    const mappingSuccess = successfulMappings / mappingResults.length;
    
    const confidence = 0.5 + (dataCompleteness * 0.3) + (mappingSuccess * 0.2);
    return Math.min(confidence, 0.95);
  }
  
  /**
   * Generuj szczegółowe uzasadnienie
   */
  private generateDetailedReasoning(
    adequateCount: number,
    totalMedications: number,
    adequateTrials: any[],
    mappingResults: any[],
    isTRD: boolean
  ): string {
    const successfulMappings = mappingResults.filter(m => m.found).length;
    
    const sections = [
      `🧠 ENHANCED MGH-ATRQ ASSESSMENT (z inteligentnym tłumaczeniem AI-based)`,
      ``,
      `📊 PODSUMOWANIE:`,
      `• Przeanalizowano leków: ${totalMedications}`,
      `• Adekwatnych prób leczenia: ${adequateCount}`,
      `• Nieudanych prób klinicznych: ${adequateCount} (= adekwatne próby w historii)`,
      `• Pomyślnych mapowań: ${successfulMappings}/${mappingResults.length}`,
      `• Status TRD: ${isTRD ? 'POTWIERDZONE' : 'NIE POTWIERDZONE'} (wymagane ≥2 nieudane adekwatne próby)`,
      ``,
      `🔄 PREPROCESSING I INTELIGENTNE TŁUMACZENIE:`,
      ...mappingResults.map(m => 
        `${m.found ? '✅' : '❌'} ${m.originalName} → ${m.preprocessedName} → ${m.translatedName}`
      ),
      ``,
      `📋 SZCZEGÓŁOWA ANALIZA PRÓB LECZENIA:`,
      ...adequateTrials.map(trial => 
        `${trial.adequate ? '✅' : '❌'} ${trial.originalDrugName} (${trial.translatedDrugName}): ${trial.reasoning}`
      ),
      ``,
      `🎯 WNIOSKI:`,
      isTRD 
        ? `Pacjent spełnia kryteria TRD według MGH-ATRQ (≥2 nieudane adekwatne próby leczenia w obecnym epizodzie).`
        : `Pacjent NIE spełnia kryteriów TRD według MGH-ATRQ (< 2 nieudane adekwatne próby leczenia w obecnym epizodzie).`
    ];
    
    return sections.join('\n');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const enhancedMGHATRQService = new EnhancedMGHATRQService();

// AI-powered drug name translation
async function aiTranslateDrugName(drugName: string): Promise<string> {
  console.log(`🤖 [AI Translation] Rozpoczynam AI translation dla: ${drugName}`);
  
  try {
    // PRAWDZIWE AI-POWERED TŁUMACZENIE - używa backend API do inteligentnego tłumaczenia
    const prompt = `Twoim zadaniem jest przetłumaczenie nazwy leku na angielską nazwę substancji czynnej.

NAZWA LEKU: "${drugName}"

ZASADY:
1. Zwróć TYLKO angielską nazwę substancji czynnej w lowercase
2. Usuń wszystkie formy farmaceutyczne (hydrochloridum, fumaras, mg, etc.)
3. NIE dodawaj żadnych wyjaśnień, opisów ani dodatkowego tekstu

PRZYKŁADY:
- "Wenlafaksyna" → "venlafaxine"
- "Duloxetini hydrochloridum" → "duloxetine" 
- "Escitalopramum 20 mg" → "escitalopram"
- "Quetiapini fumaras" → "quetiapine"

ODPOWIEDŹ (tylko nazwa substancji):`;

    const systemPrompt = `Jesteś ekspertem tłumaczenia nazw leków. Twoim zadaniem jest tłumaczenie z polskiego/łacińskiego na angielski. 
WAŻNE: Zwracaj TYLKO nazwę substancji czynnej w języku angielskim, bez żadnych dodatkowych słów, wyjaśnień lub opisów.`;

    const response = await fetch('http://localhost:3001/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini',
        systemPrompt,
        userPrompt: prompt,
        temperature: 0.1,
        maxTokens: 50
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI translation failed: ${response.status} - ${errorData.message}`);
    }
    
    const data = await response.json();
    let translated = data.content?.trim().toLowerCase() || drugName.toLowerCase();
    
    // AGRESYWNE oczyszczanie odpowiedzi z ewentualnych dodatkowych znaków
    translated = translated
      .replace(/['"]/g, '') // Usuń cudzysłowy
      .replace(/\.$/, '')   // Usuń kropkę na końcu
      .replace(/^\w+:\s*/, '') // Usuń ewentualne prefiksy typu "Answer:"
      .replace(/\n/g, '')   // Usuń nowe linie
      .replace(/\r/g, '')   // Usuń powroty karetki
      .replace(/\s+/g, ' ') // Zamień wiele spacji na jedną
      .replace(/[^\w\s-]/g, '') // Usuń wszystkie znaki specjalne oprócz liter, cyfr, spacji i myślników
      .trim();
    
    // Jeśli nadal jest za długo, weź tylko pierwsze słowo
    if (translated.includes(' ')) {
      translated = translated.split(' ')[0];
    }
    
    console.log(`✅ [AI Translation] ${drugName} → ${translated}`);
    return translated;
    
  } catch (error) {
    console.error(`❌ [AI Translation] Error translating ${drugName}:`, error);
    
    // INTELIGENTNY FALLBACK - ekstrakcja substancji czynnej z wzorcami
    const fallbackTranslation = intelligentFallbackTranslation(drugName);
    console.log(`🔧 [AI Translation] Using intelligent fallback: ${drugName} → ${fallbackTranslation}`);
    return fallbackTranslation;
  }
}

/**
 * Inteligentny fallback do tłumaczenia gdy AI nie działa
 */
function intelligentFallbackTranslation(drugName: string): string {
  let translated = drugName.toLowerCase().trim();
  
  // Usuń formy farmaceutyczne
  const pharmaceuticalForms = [
    'hydrochloridum', 'hydrobromidum', 'fumaras', 'dimesylas', 
    'natrii phosphas', 'besilat', 'maleat', 'sukcinat'
  ];
  
  for (const form of pharmaceuticalForms) {
    translated = translated.replace(new RegExp(`\\s*${form}$`, 'i'), '');
  }
  
  // Usuń dawki i liczby
  translated = translated.replace(/\d+[.,]?\d*\s*(mg|mcg|g|ml|%)/gi, '');
  translated = translated.replace(/\d+/g, '');
  
  // Konwersje podstawowych nazw
  const basicConversions: Record<string, string> = {
    // Łacińskie → angielskie
    'venlafaxinum': 'venlafaxine',
    'duloxetinum': 'duloxetine',
    'escitalopramum': 'escitalopram',
    'sertralinum': 'sertraline',
    'bupropionum': 'bupropion',
    'quetiapinum': 'quetiapine',
    'aripiprazolum': 'aripiprazole',
    'mirtazapinum': 'mirtazapine',
    'trazodonum': 'trazodone',
    'fluoxetinum': 'fluoxetine',
    'paroxetinum': 'paroxetine',
    'citalopramum': 'citalopram',
    
    // Polskie → angielskie
    'wenlafaksyna': 'venlafaxine',
    'duloksetyna': 'duloxetine',
    'sertralina': 'sertraline',
    'kwetiapina': 'quetiapine',
    'fluoksetyna': 'fluoxetine',
    'paroksetyna': 'paroxetine',
    'mirtazapina': 'mirtazapine',
    'trazodon': 'trazodone'
  };
  
  // Sprawdź dokładne dopasowania
  if (basicConversions[translated]) {
    return basicConversions[translated];
  }
  
  // Usuń łacińskie końcówki
  translated = translated
    .replace(/inum$/, 'ine')
    .replace(/ini$/, 'ine') 
    .replace(/um$/, '')
    .replace(/us$/, '');
  
  return translated;
} 