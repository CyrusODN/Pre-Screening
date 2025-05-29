// src/services/ai.ts
import { getAIConfig, getModelSystemPrompt } from '../config/aiConfig';
// Poprawiona ścieżka importu typów
import type { PatientData, Criterion, SupportedAIModel, AIConfig, GeminiAIConfig, ClaudeAIConfig, PharmacotherapyItem } from '../types/index'; 
import { initialPatientData } from '../data/mockData';
// Usunięto nieużywany import 'differenceInDays'
import { addDays, formatISO, isValid, parseISO } from 'date-fns'; 
import drugMappingClient from './drugMappingClient';
import type { DrugRecord } from './drugMappingService';
import PrescriptionParser from '../utils/prescriptionParser';

// PERFORMANCE: Cache dla preprocessingu leków
let drugNamesCache: Map<string, {standardName: string, activeSubstance: string, confidence: number}> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minut cache

async function getDrugNamesMap(): Promise<Map<string, {standardName: string, activeSubstance: string, confidence: number}>> {
  const now = Date.now();
  
  // Sprawdź czy cache jest aktualny
  if (drugNamesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log(`📋 [AI Service] Using cached drug names map (${drugNamesCache.size} entries)`);
    return drugNamesCache;
  }
  
  console.log('📊 [AI Service] Building drug names cache - this may take a moment...');
  const startTime = Date.now();
  
  // Pobierz WSZYSTKIE leki (nie tylko przeciwdepresyjne)
  const allDrugs = await drugMappingClient.getAllDrugs();
  console.log(`📋 [AI Service] Loaded ${allDrugs.length} drugs from national registry`);
  
  // Stwórz mapę ALL POSSIBLE NAME VARIANTS → standardName + activeSubstance
  const drugNameMap = new Map<string, {standardName: string, activeSubstance: string, confidence: number}>();
  
  allDrugs.forEach((drug: DrugRecord) => {
    // 1. Dodaj nazwę produktu (handlową)
    if (drug.productName) {
      const cleanName = drug.productName.replace(/\s+\d+.*$/, '').trim(); // Usuń dawki
      drugNameMap.set(cleanName.toLowerCase(), {
        standardName: drug.commonName || drug.productName,
        activeSubstance: drug.activeSubstance || drug.commonName || drug.productName,
        confidence: 0.98 // Wysoka pewność - bezpośrednio z bazy
      });
    }
    
    // 2. Dodaj nazwę powszechną (łacińską)
    if (drug.commonName) {
      const baseName = drug.commonName.toLowerCase();
      drugNameMap.set(baseName, {
        standardName: drug.commonName,
        activeSubstance: drug.activeSubstance || drug.commonName,
        confidence: 0.99 // Najwyższa pewność - oficjalna nazwa
      });
      
      // 3. INTELIGENTNE GENEROWANIE WARIANTÓW NAZW (Latin → English → Polish)
      const nameVariants = generateIntelligentDrugNameVariants(drug.commonName);
      nameVariants.forEach(variant => {
        if (!drugNameMap.has(variant.name.toLowerCase())) {
          drugNameMap.set(variant.name.toLowerCase(), {
            standardName: drug.commonName,
            activeSubstance: drug.activeSubstance || drug.commonName,
            confidence: variant.confidence
          });
        }
      });
    }
  });
  
  // Zapisz w cache
  drugNamesCache = drugNameMap;
  cacheTimestamp = now;
  
  const buildTime = Date.now() - startTime;
  console.log(`🧠 [AI Service] Built drug names cache: ${drugNameMap.size} variants in ${buildTime}ms`);
  
  return drugNameMap;
}

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel
): Promise<PatientData> {
  console.log(`🤖 [AI Service] Starting patient analysis with model: ${selectedModel}`);
  
  try {
    // NOWE: Preprocessuj historię medyczną dla mapowania leków
    const { processedHistory, drugMappings } = await preprocessMedicalHistoryForDrugMapping(medicalHistory);
    
    // Dodaj informację o mapowaniu do kontekstu
    let enhancedHistory = processedHistory;
    if (drugMappings.length > 0) {
      enhancedHistory += '\n\n--- INFORMACJE O MAPOWANIU LEKÓW ---\n';
      enhancedHistory += 'Następujące nazwy handlowe zostały automatycznie zmapowane na substancje czynne:\n';
      drugMappings.forEach(mapping => {
        enhancedHistory += `• ${mapping.original} → ${mapping.mapped} (pewność: ${Math.round(mapping.confidence * 100)}%)\n`;
      });
      enhancedHistory += 'Proszę używać nazw substancji czynnych w analizie dla większej precyzji.\n';
    }

    const currentConfig = getAIConfig(selectedModel);

    if (!currentConfig.apiKey || !currentConfig.model) {
      console.warn(`Brak pełnej konfiguracji dla modelu ${selectedModel} – używam danych testowych`);
      const mockData = {
        ...initialPatientData,
        isMockData: true,
        analyzedAt: new Date().toISOString(),
        modelUsed: selectedModel,
        drugMappingInfo: {
          mappingsApplied: drugMappings.length,
          mappings: drugMappings,
          preprocessedAt: new Date().toISOString()
        }
      };
      return mockData;
    }

    const systemPrompt = `${getModelSystemPrompt(selectedModel)}

WAŻNE: W historii medycznej nazwy handlowe leków zostały automatycznie zmapowane na substancje czynne dla większej precyzji. Używaj nazw substancji czynnych w swojej analizie.`;

    const userContent = `Przeanalizuj następującą historię medyczną i protokół badania dla oceny pre-screeningowej:
              
Historia Medyczna (z automatycznym mapowaniem leków):
${enhancedHistory}

Protokół Badania:
${studyProtocol}`;

    let requestBody: Record<string, unknown>;
    let apiUrl: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (selectedModel === 'gemini') {
      const geminiConf = currentConfig as GeminiAIConfig;
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiConf.model}:generateContent?key=${geminiConf.apiKey}`;
      requestBody = {
        contents: [{
          role: "user", 
          parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
        }],
        generationConfig: {
          temperature: geminiConf.temperature,
          maxOutputTokens: geminiConf.maxOutputTokens,
          topP: geminiConf.topP,
          responseMimeType: "application/json",
        }
      };
    } else if (selectedModel === 'claude-opus') {
      const claudeConf = currentConfig as ClaudeAIConfig;
      apiUrl = '/api/anthropic/v1/messages';
      headers['x-api-key'] = claudeConf.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      
      requestBody = {
        model: claudeConf.model,
        max_tokens: claudeConf.maxTokens,
        temperature: claudeConf.temperature,
        top_p: claudeConf.topP,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userContent }
        ]
      };
    } else { 
      const o3Conf = currentConfig as AIConfig;
      apiUrl = o3Conf.endpoint;
      headers['Authorization'] = `Bearer ${o3Conf.apiKey}`;
      
      requestBody = {
        model: o3Conf.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_completion_tokens: o3Conf.maxCompletionTokens, 
      };
      const isReasoningModel = /^o[134]/.test(o3Conf.model);
      if (!isReasoningModel) {
        requestBody.temperature = o3Conf.temperature;
        requestBody.top_p = o3Conf.topP;
        requestBody.frequency_penalty = o3Conf.frequencyPenalty;
        requestBody.presence_penalty = o3Conf.presencePenalty;
      }
      if (o3Conf.model.includes("gpt-3.5-turbo-1106") || o3Conf.model.includes("gpt-4") || o3Conf.model.startsWith("o3") || o3Conf.model.startsWith("o4")) {
         if(o3Conf.model !== "o3" && o3Conf.model !== "o4"){
          requestBody.response_format = { type: "json_object" };
         }
      }
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error(`API Error Response Text (${selectedModel}, ${response.status}):`, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText || response.statusText }};
        }
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(
          `Błąd API (${selectedModel}): ${response.status} – ${errorMessage}`
        );
      }

      const data = await response.json();
      let processedResponse: PatientData;

      if (selectedModel === 'gemini') {
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
              console.error('Invalid Gemini API response structure:', data);
              throw new Error('Nieprawidłowa odpowiedź API Gemini: brak oczekiwanej treści.');
          }
          processedResponse = processAIResponse(data.candidates[0].content.parts[0].text, selectedModel);
      } else if (selectedModel === 'claude-opus') {
          if (!data.content?.[0]?.text) {
              console.error('Invalid Claude API response structure:', data);
              throw new Error('Nieprawidłowa odpowiedź API Claude: brak oczekiwanej treści.');
          }
          
          // Check for refusal stop reason in Claude 4 models
          if (data.stop_reason === 'refusal') {
              console.warn('Claude 4 model refused to generate content for safety reasons:', data);
              throw new Error('Model Claude 4 odmówił wygenerowania odpowiedzi ze względów bezpieczeństwa. Spróbuj zmodyfikować prompt lub dane wejściowe.');
          }
          
          processedResponse = processAIResponse(data.content[0].text, selectedModel);
      } else { 
          if (!data.choices?.[0]?.message?.content) {
              console.error('Invalid o3 API response structure:', data);
              throw new Error('Nieprawidłowa odpowiedź API o3: brak oczekiwanej treści.');
          }
          processedResponse = processAIResponse(data.choices[0].message.content, selectedModel);
      }
      
      // Dodaj metadane o mapowaniu leków
      processedResponse.drugMappingInfo = {
        mappingsApplied: drugMappings.length,
        mappings: drugMappings,
        preprocessedAt: new Date().toISOString()
      };
      
      console.log("Final processed PatientData (after processAIResponse):", processedResponse);
      console.log(`✅ [AI Service] Analysis completed successfully with ${drugMappings.length} drug mappings applied`);
      return { ...processedResponse, modelUsed: selectedModel };

    } catch (error) {
      console.error(`Error during AI analysis with ${selectedModel}:`, error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          'Błąd połączenia z serwerem AI. Sprawdź połączenie internetowe.'
        );
      }
      if (error instanceof Error) throw error; 
      throw new Error('Wystąpił nieoczekiwany błąd podczas analizy'); 
    }
  } catch (error) {
    console.error('💥 [AI Service] Error during analysis:', error);
    throw error;
  }
}

function createFallbackPatientData(content: string, model: SupportedAIModel): PatientData {
  return {
    ...initialPatientData,
    summary: {
      ...initialPatientData.summary,
      id: generatePatientId()
    },
    reportConclusion: {
      ...initialPatientData.reportConclusion,
      mainIssues: ['Błąd parsowania odpowiedzi AI'],
      criticalInfoNeeded: ['Ponowna analiza wymagana']
    },
    analyzedAt: new Date().toISOString(),
    modelUsed: model,
    isMockData: false
  };
}

function validateAIResponse(parsedData: any): void {
  const requiredTopLevel = [
    'summary', 'episodeEstimation', 'trdAnalysis', 
    'inclusionCriteria', 'psychiatricExclusionCriteria', 'medicalExclusionCriteria', 
    'reportConclusion',
  ];
  requiredTopLevel.forEach((f) => {
    if (parsedData[f] === undefined || parsedData[f] === null) { 
        throw new Error(`Brak wymaganego pola najwyższego poziomu: ${f} w odpowiedzi AI.`);
    }
  });

  if (!parsedData.summary || typeof parsedData.summary.age !== 'number') {
     console.warn("AI response: summary.age is missing or not a number. Defaulting to 0.", parsedData.summary);
     // Ensure summary object exists before assigning to its properties
     if (!parsedData.summary) parsedData.summary = {};
     parsedData.summary.age = Number(parsedData.summary.age) || 0;
  }
  if (!parsedData.trdAnalysis || !Array.isArray(parsedData.trdAnalysis.pharmacotherapy)) {
    console.warn("AI response: trdAnalysis.pharmacotherapy is missing or not an array. Defaulting to [].", parsedData.trdAnalysis);
    if (!parsedData.trdAnalysis) parsedData.trdAnalysis = {};
    parsedData.trdAnalysis.pharmacotherapy = [];
  }

  const p = parsedData.reportConclusion?.estimatedProbability;
  if (typeof p !== 'number' || p < 0 || p > 100) {
    console.warn(`AI response: reportConclusion.estimatedProbability is invalid (${p}). Defaulting to 0.`);
    if(!parsedData.reportConclusion) parsedData.reportConclusion = {};
    parsedData.reportConclusion.estimatedProbability = 0;
  }
}

function toNullIfEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// Dodano typy dla parametrów c (criterion object from AI) i i (index)
function mapCriterion(c: any, type: string, index: number): Criterion {
  return {
    id: c.id ?? `${type.substring(0,2).toUpperCase()}${index + 1}`, 
    name: c.name ?? 'Nieznane kryterium',
    status: c.status ?? 'weryfikacja',
    details: c.details ?? 'Brak szczegółów',
    userStatus: null,
    userComment: null,
    userOverrideTimestamp: null,
  };
}

function generatePatientId(): string {
  const d = new Date();
  return `PAT/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}/${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;
}

function processAIResponse(jsonString: string, modelUsed: SupportedAIModel): PatientData {
  console.log("Raw JSON string from AI for processing:", jsonString);
  try {
    const cleanedJsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleanedJsonString);
    console.log("Parsed AI response for processing:", parsed);
    validateAIResponse(parsed); 

    // Dodano typy dla parametrów p (pharmacotherapy item from AI) i index
    const mapPharmacotherapy = (p: any, index: number): PharmacotherapyItem => {
      let parsedStartDate = null;
      let parsedEndDate = null;
      let startDateStr = null;
      let endDateStr = null;
      let notes = p.notes || '';

      // ENHANCED: Parse prescription to separate dose from clinical instructions
      let finalDose = p.dose;
      if (p.dose && typeof p.dose === 'string' && p.dose.length > 10) {
        // If dose field contains long text, likely it's prescription text
        const prescriptionResult = PrescriptionParser.parsePrescription(p.dose);
        
        if (prescriptionResult.dose !== 'N/A') {
          finalDose = prescriptionResult.dose;
          
          // Add clinical instructions to notes if they exist
          if (prescriptionResult.clinicalNotes && prescriptionResult.clinicalNotes.trim()) {
            notes = notes 
              ? `${notes}; ${prescriptionResult.clinicalNotes}` 
              : prescriptionResult.clinicalNotes;
          }
          
          console.log(`💊 [Prescription Parser] "${p.dose}" → Dose: "${finalDose}", Notes: "${prescriptionResult.clinicalNotes}"`);
        }
      }

      // Try to parse dates safely
      if (p.startDate) {
        if (typeof p.startDate === 'string') {
          if (p.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedStartDate = parseISO(p.startDate);
          } else {
            const attemptedDate = parseISO(p.startDate);
            if (isValid(attemptedDate)) {
              parsedStartDate = attemptedDate;
            }
          }
        } else if (p.startDate instanceof Date) {
          parsedStartDate = p.startDate;
        }
      }

      if (p.endDate) {
        if (typeof p.endDate === 'string') {
          if (p.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedEndDate = parseISO(p.endDate);
          } else {
            const attemptedDate = parseISO(p.endDate);
            if (isValid(attemptedDate)) {
              parsedEndDate = attemptedDate;
            }
          }
        } else if (p.endDate instanceof Date) {
          parsedEndDate = p.endDate;
        }
      }

      if (!parsedStartDate || !isValid(parsedStartDate)) {
        console.warn(`Drug "${p.drugName || 'Nieznany'}" (ID: ${p.id || index}): Invalid or missing startDate: "${p.startDate}". Cannot process this item for chart.`);
        startDateStr = null; 
        endDateStr = null;
        notes = (notes ? notes + "; " : "") + "Nieprawidłowa lub brakująca data rozpoczęcia.";
      } else {
        startDateStr = formatISO(parsedStartDate, { representation: 'date' }); 
        
        if (!parsedEndDate || !isValid(parsedEndDate) || parsedEndDate < parsedStartDate) {
          const estimatedDurationDays = 28; 
          parsedEndDate = addDays(parsedStartDate, estimatedDurationDays - 1); 
          endDateStr = formatISO(parsedEndDate, { representation: 'date' });
          notes = (notes ? notes + "; " : "") + `Data końcowa oszacowana na ${estimatedDurationDays} dni (brak lub nieprawidłowa).`;
          console.warn(`Drug "${p.drugName || 'Nieznany'}" (ID: ${p.id || index}): Invalid, missing, or illogical endDate: "${p.endDate}". Estimated to ${endDateStr}.`);
        } else {
          endDateStr = formatISO(parsedEndDate, { representation: 'date' }); 
        }
      }
      
      return {
        id: p.id ?? `drug-${index}-${Date.now()}`,
        drugName: p.drugName ?? 'Nieznany lek',
        shortName: p.shortName ?? (p.drugName ? p.drugName.substring(0,3).toUpperCase() : 'N/A'),
        startDate: startDateStr, 
        endDate: endDateStr,   
        dose: finalDose ?? 'N/A', // Use the parsed dose instead of raw prescription text
        attemptGroup: typeof p.attemptGroup === 'number' ? p.attemptGroup : 0,
        notes: notes,
        isAugmentation: typeof p.isAugmentation === 'boolean' ? p.isAugmentation : undefined,
        baseDrug: p.baseDrug ?? undefined,
      };
    };
    
    const processedPharmacotherapy = Array.isArray(parsed.trdAnalysis?.pharmacotherapy) 
      ? parsed.trdAnalysis.pharmacotherapy.map(mapPharmacotherapy) 
      : [];
    console.log("Processed pharmacotherapy before returning from processAIResponse:", processedPharmacotherapy);


    return {
      summary: {
        id: parsed.summary?.id ?? generatePatientId(),
        age: Number(parsed.summary?.age) || 0,
        mainDiagnosis: parsed.summary?.mainDiagnosis ?? 'Brak danych',
        comorbidities: Array.isArray(parsed.summary?.comorbidities) ? parsed.summary.comorbidities : [],
      },
      episodeEstimation: {
        scenarios: Array.isArray(parsed.episodeEstimation?.scenarios) ? parsed.episodeEstimation.scenarios : [],
        conclusion: parsed.episodeEstimation?.conclusion ?? 'Brak danych',
      },
      trdAnalysis: {
        episodeStartDate: toNullIfEmpty(parsed.trdAnalysis?.episodeStartDate),
        pharmacotherapy: processedPharmacotherapy,
        conclusion: parsed.trdAnalysis?.conclusion ?? 'Brak danych',
      },
      // Dodano typy dla parametrów c (criterion object from AI) i i (index) w wywołaniach mapCriterion
      inclusionCriteria: Array.isArray(parsed.inclusionCriteria) ? parsed.inclusionCriteria.map((c: any, i: number) => mapCriterion(c, 'IC', i)) : [],
      psychiatricExclusionCriteria:
        Array.isArray(parsed.psychiatricExclusionCriteria) ? parsed.psychiatricExclusionCriteria.map((c: any, i: number) => mapCriterion(c, 'EC', i)) : [],
      medicalExclusionCriteria:
        Array.isArray(parsed.medicalExclusionCriteria) ? parsed.medicalExclusionCriteria.map((c: any, i: number) => mapCriterion(c, 'GMEC', i)) : [],
      reportConclusion: {
        overallQualification: parsed.reportConclusion?.overallQualification ?? 'Brak danych',
        mainIssues: Array.isArray(parsed.reportConclusion?.mainIssues) ? parsed.reportConclusion.mainIssues : [],
        criticalInfoNeeded: Array.isArray(parsed.reportConclusion?.criticalInfoNeeded) ? parsed.reportConclusion.criticalInfoNeeded : [],
        estimatedProbability: Number(parsed.reportConclusion?.estimatedProbability) ?? 0,
      },
      analyzedAt: new Date().toISOString(),
      isMockData: false,
      modelUsed: modelUsed,
    };
  } catch (error) {
    console.error('Error processing AI response (JSON parsing or validation):', error);
    if (error instanceof SyntaxError) {
      throw new Error(`Otrzymano nieprawidłowy format odpowiedzi JSON z API (${modelUsed}). Sprawdź konsolę po więcej szczegółów. Oryginalna odpowiedź (fragment): ${jsonString.substring(0,500)}...`);
    }
    throw error;
  }
}

/**
 * Preprocessuje historię medyczną, mapując nazwy handlowe leków na substancje czynne
 * WYEKSPORTOWANA FUNKCJA - używana również w MultiAgentCoordinator
 * NOWA WERSJA: Skalowalne rozwiązanie hybrydowe - WSZYSTKIE leki + inteligentne tłumaczenie nazw
 */
export async function preprocessMedicalHistoryForDrugMapping(medicalHistory: string): Promise<{
  processedHistory: string;
  drugMappings: Array<{original: string; mapped: string; confidence: number}>;
}> {
  console.log('🔍 [AI Service] Preprocessing medical history for drug mapping...');
  
  const drugMappings: Array<{original: string; mapped: string; confidence: number}> = [];
  let processedHistory = medicalHistory;
  
  // NOWE PODEJŚCIE: Użyj WSZYSTKICH leków z bazy + inteligentne tłumaczenie nazw
  try {
    console.log('📊 [AI Service] Loading ALL drugs from Polish national registry...');
    
    // Pobierz WSZYSTKIE leki (nie tylko przeciwdepresyjne)
    const allDrugs = await drugMappingClient.getAllDrugs();
    
    console.log(`📋 [AI Service] Loaded ${allDrugs.length} drugs from national registry`);
    
    // Stwórz mapę ALL POSSIBLE NAME VARIANTS → standardName + activeSubstance
    const drugNameMap = new Map<string, {standardName: string, activeSubstance: string, confidence: number}>();
    
    allDrugs.forEach((drug: DrugRecord) => {
      // 1. Dodaj nazwę produktu (handlową)
      if (drug.productName) {
        const cleanName = drug.productName.replace(/\s+\d+.*$/, '').trim(); // Usuń dawki
        drugNameMap.set(cleanName.toLowerCase(), {
          standardName: drug.commonName || drug.productName,
          activeSubstance: drug.activeSubstance || drug.commonName || drug.productName,
          confidence: 0.98 // Wysoka pewność - bezpośrednio z bazy
        });
      }
      
      // 2. Dodaj nazwę powszechną (łacińską)
      if (drug.commonName) {
        const baseName = drug.commonName.toLowerCase();
        drugNameMap.set(baseName, {
          standardName: drug.commonName,
          activeSubstance: drug.activeSubstance || drug.commonName,
          confidence: 0.99 // Najwyższa pewność - oficjalna nazwa
        });
        
        // 3. INTELIGENTNE GENEROWANIE WARIANTÓW NAZW (Latin → English → Polish)
        const nameVariants = generateIntelligentDrugNameVariants(drug.commonName);
        nameVariants.forEach(variant => {
          if (!drugNameMap.has(variant.name.toLowerCase())) {
            drugNameMap.set(variant.name.toLowerCase(), {
              standardName: drug.commonName,
              activeSubstance: drug.activeSubstance || drug.commonName,
              confidence: variant.confidence
            });
          }
        });
      }
    });
    
    console.log(`🧠 [AI Service] Generated ${drugNameMap.size} total name variants (Latin/English/Polish)`);
    
    // BARDZO PRECYZYJNE WYSZUKIWANIE - używaj wszystkich wariantów nazw
    const allVerifiedNames = Array.from(drugNameMap.keys()).filter(name => 
      name.length >= 4 && // Minimalna długość nazwy
      !isObviousTextFragment(name) // Odfiltruj oczywiste fragmenty tekstu
    );
    
    const drugPattern = new RegExp(`\\b(${allVerifiedNames.map(name => escapeRegex(name)).join('|')})\\b`, 'gi');
    
    console.log(`🔍 [AI Service] Created search pattern for ${allVerifiedNames.length} verified drug name variants`);
    
    // Znajdź wszystkie dopasowania w tekście
    const foundDrugs = new Set<string>();
    let match;
    while ((match = drugPattern.exec(medicalHistory)) !== null) {
      const drugName = match[1].trim();
      foundDrugs.add(drugName);
    }
    
    console.log(`🔍 [AI Service] Found ${foundDrugs.size} verified drug names in text:`, Array.from(foundDrugs));
    
    // Mapuj każdą znalezioną nazwę leku
    for (const drugName of foundDrugs) {
      try {
        // Sprawdź w lokalnej mapie (z inteligentnie wygenerowanymi wariantami)
        const localMapping = drugNameMap.get(drugName.toLowerCase());
        if (localMapping) {
          drugMappings.push({
            original: drugName,
            mapped: localMapping.activeSubstance,
            confidence: localMapping.confidence
          });
          
          // Zamień w tekście: [nazwa handlowa] → [substancja czynna (nazwa handlowa)]
          const regex = new RegExp(`\\b${escapeRegex(drugName)}\\b`, 'gi');
          processedHistory = processedHistory.replace(regex, `${localMapping.activeSubstance} (${drugName})`);
          
          console.log(`✅ [AI Service] Local mapping: ${drugName} → ${localMapping.activeSubstance} (confidence: ${Math.round(localMapping.confidence * 100)}%)`);
        } else {
          // FALLBACK: Inteligentne tłumaczenie przez AI (tylko dla wysokiej pewności)
          if (drugName.length >= 5 && isLikelyPharmaceuticalName(drugName)) {
            const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
            
            if (mappingResult.found && mappingResult.confidence > 0.90) { // Wyższy próg dla fallback
              const activeSubstance = mappingResult.activeSubstance || mappingResult.standardName;
              
              drugMappings.push({
                original: drugName,
                mapped: activeSubstance,
                confidence: mappingResult.confidence
              });
              
              const regex = new RegExp(`\\b${escapeRegex(drugName)}\\b`, 'gi');
              processedHistory = processedHistory.replace(regex, `${activeSubstance} (${drugName})`);
              
              console.log(`✅ [AI Service] AI fallback mapping: ${drugName} → ${activeSubstance} (confidence: ${Math.round(mappingResult.confidence * 100)}%)`);
            } else {
              console.log(`⚠️ [AI Service] Low confidence AI mapping rejected: ${drugName} (confidence: ${mappingResult.confidence})`);
            }
          } else {
            console.log(`⚠️ [AI Service] Skipped unlikely drug name: ${drugName}`);
          }
        }
      } catch (error) {
        console.error(`❌ [AI Service] Error mapping drug ${drugName}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ [AI Service] Error accessing Polish drug registry:', error);
    console.log('⚠️ [AI Service] Fallback to conservative mapping...');
    
    // EMERGENCY FALLBACK: Tylko najbardziej pewne farmaceutyczne wzorce
    const conservativePharmaceuticalPattern = new RegExp(
      `\\b(${KNOWN_PHARMACEUTICAL_BRANDS.map(name => escapeRegex(name)).join('|')})\\b`, 
      'gi'
    );
    
    const foundDrugs = new Set<string>();
    let match;
    while ((match = conservativePharmaceuticalPattern.exec(medicalHistory)) !== null) {
      foundDrugs.add(match[1].trim());
    }
    
    for (const drugName of foundDrugs) {
      try {
        if (drugName.length >= 5 && isLikelyPharmaceuticalName(drugName)) {
          const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
          
          if (mappingResult.found && mappingResult.confidence > 0.95) { // Bardzo wysoki próg dla emergency
            const activeSubstance = mappingResult.activeSubstance || mappingResult.standardName;
            
            drugMappings.push({
              original: drugName,
              mapped: activeSubstance,
              confidence: mappingResult.confidence
            });
            
            const regex = new RegExp(`\\b${escapeRegex(drugName)}\\b`, 'gi');
            processedHistory = processedHistory.replace(regex, `${activeSubstance} (${drugName})`);
            
            console.log(`✅ [AI Service] Emergency mapping: ${drugName} → ${activeSubstance} (confidence: ${Math.round(mappingResult.confidence * 100)}%)`);
          }
        }
      } catch (error) {
        console.error(`❌ [AI Service] Error in emergency mapping for ${drugName}:`, error);
      }
    }
  }
  
  console.log(`✅ [AI Service] Drug mapping completed. Mapped ${drugMappings.length} drugs with high confidence.`);
  
  return {
    processedHistory,
    drugMappings
  };
}

/**
 * Inteligentnie generuje warianty nazw leków: Latin ↔ English ↔ Polish
 * Wykorzystuje farmaceutyczne wzorce językowe i nomenklaturę międzynarodową
 */
function generateIntelligentDrugNameVariants(latinName: string): Array<{name: string, confidence: number}> {
  const variants: Array<{name: string, confidence: number}> = [];
  const lower = latinName.toLowerCase();
  
  // FARMACEUTYCZNE TRANSFORMACJE JĘZYKOWE
  const linguisticTransformations = [
    // Łacińskie końcówki → Angielskie INN (International Nonproprietary Names)
    { from: /um$/, to: 'e', confidence: 0.95 },           // Sertralinum → Sertraline
    { from: /inum$/, to: 'ine', confidence: 0.94 },       // Fluoxetinum → Fluoxetine
    { from: /olum$/, to: 'ol', confidence: 0.93 },        // Atenololum → Atenolol
    { from: /anum$/, to: 'ane', confidence: 0.92 },       // 
    
    // Angielskie INN → Polskie końcówki
    { from: /ine$/, to: 'ina', confidence: 0.90 },        // Sertraline → Sertralina
    { from: /ol$/, to: 'olol', confidence: 0.89 },        // Atenolol → Atenolol (bez zmiany ale dodaje wariant)
    { from: /ane$/, to: 'an', confidence: 0.88 },         //
    
    // Specjalne przypadki farmaceutyczne
    { from: /prazol$/, to: 'prazole', confidence: 0.95 }, // Omeprazol → Omeprazole
    { from: /statin$/, to: 'statinum', confidence: 0.94 },// Simvastatin → Simvastatinum
  ];
  
  // Stosuj transformacje językowe
  for (const transform of linguisticTransformations) {
    if (transform.from.test(lower)) {
      const stem = lower.replace(transform.from, '');
      const transformedName = stem + transform.to;
      const capitalizedName = transformedName.charAt(0).toUpperCase() + transformedName.slice(1);
      
      variants.push({
        name: capitalizedName,
        confidence: transform.confidence
      });
    }
  }
  
  // RĘCZNE MAPOWANIA dla najważniejszych leków psychiatrycznych
  const psychiatricDrugMappings: Record<string, Array<{name: string, confidence: number}>> = {
    // Antydepresanty SSRI
    'sertralinum': [
      { name: 'Sertraline', confidence: 0.98 },
      { name: 'Sertralina', confidence: 0.97 }
    ],
    'escitalopram': [
      { name: 'Escitalopramum', confidence: 0.98 }
    ],
    'fluoxetinum': [
      { name: 'Fluoxetine', confidence: 0.98 },
      { name: 'Fluoksetyna', confidence: 0.96 }
    ],
    'paroxetinum': [
      { name: 'Paroxetine', confidence: 0.98 },
      { name: 'Paroksetyna', confidence: 0.96 }
    ],
    'citalopram': [
      { name: 'Citalopramum', confidence: 0.98 }
    ],
    
    // Antydepresanty SNRI
    'venlafaxinum': [
      { name: 'Venlafaxine', confidence: 0.98 },
      { name: 'Wenlafaksyna', confidence: 0.96 }
    ],
    'duloxetinum': [
      { name: 'Duloxetine', confidence: 0.98 },
      { name: 'Duloksetyna', confidence: 0.96 }
    ],
    
    // Antydepresanty atypowe
    'mirtazapinum': [
      { name: 'Mirtazapine', confidence: 0.98 },
      { name: 'Mirtazapina', confidence: 0.96 }
    ],
    'trazodone': [
      { name: 'Trazodon', confidence: 0.97 },
      { name: 'Trazodoni', confidence: 0.95 }
    ],
    
    // Benzodiazepiny
    'alprazolam': [
      { name: 'Alprazolamum', confidence: 0.98 }
    ],
    'lorazepam': [
      { name: 'Lorazepamum', confidence: 0.98 }
    ],
    
    // Neuroleptyki
    'quetiapinum': [
      { name: 'Quetiapine', confidence: 0.98 },
      { name: 'Kwetiapina', confidence: 0.96 }
    ],
    'olanzapinum': [
      { name: 'Olanzapine', confidence: 0.98 },
      { name: 'Olanzapina', confidence: 0.96 }
    ],
    'risperidonum': [
      { name: 'Risperidone', confidence: 0.98 },
      { name: 'Risperidon', confidence: 0.96 }
    ],
    
    // ADHD
    'atomoxetinum': [
      { name: 'Atomoxetine', confidence: 0.98 },
      { name: 'Atomoksetyna', confidence: 0.96 }
    ],
    'methylphenidate': [
      { name: 'Methylphenidatum', confidence: 0.98 }
    ]
  };
  
  const baseNameLower = lower.trim();
  if (psychiatricDrugMappings[baseNameLower]) {
    variants.push(...psychiatricDrugMappings[baseNameLower]);
  }
  
  // Usuń duplikaty i zwróć
  const uniqueVariants = variants.filter((variant, index, self) => 
    index === self.findIndex(v => v.name.toLowerCase() === variant.name.toLowerCase())
  );
  
  return uniqueVariants;
}

/**
 * Lista znaných marek farmaceutycznych (emergency fallback)
 */
const KNOWN_PHARMACEUTICAL_BRANDS = [
  // Antydepresanty - nazwy handlowe
  'Brintellix', 'Dulsevia', 'Welbox', 'Auroxetyn', 'Depratal', 'Elicea', 'Efevelon',
  'Cipralex', 'Lexapro', 'Prozac', 'Paxil', 'Zoloft', 'Cymbalta', 'Effexor',
  
  // Benzodiazepiny
  'Xanax', 'Ativan', 'Valium', 'Klonopin', 'Rivotril',
  
  // Neuroleptyki
  'Abilify', 'Risperdal', 'Zyprexa', 'Seroquel', 'Geodon',
  
  // ADHD
  'Concerta', 'Ritalin', 'Medikinet', 'Strattera',
  
  // Inne psychiatryczne
  'Lamictal', 'Depakine', 'Lithium', 'Pregabalin', 'Lyrica'
];

/**
 * Sprawdza czy string wygląda na nazwę farmaceutyczną (nie fragment tekstu)
 */
function isLikelyPharmaceuticalName(name: string): boolean {
  // Odrzuć oczywiste fragmenty tekstu polskiego
  const textFragmentBlacklist = [
    'obecnie', 'leku', 'dawki', 'dawka', 'dawce', 'podano', 'otrzymał', 
    'przyjmuje', 'stosuje', 'minimalna', 'pierwsza', 'kolejna', 'dotychczas',
    'docelowej', 'gnieciu', 'dni do', 'poprawa', 'leczenie', 'terapia',
    'pacjent', 'choroba', 'objawy', 'diagnoza', 'historia'
  ];
  
  const lowerName = name.toLowerCase();
  if (textFragmentBlacklist.some(word => lowerName.includes(word))) {
    return false;
  }
  
  // Pozytywne wskaźniki nazwy farmaceutycznej
  const pharmaceuticalIndicators = [
    /.*ine$/i,    // końcówki farmaceutyczne
    /.*inum$/i,
    /.*ina$/i,
    /.*yna$/i,
    /.*pram$/i,
    /.*olol$/i,
    /.*pine$/i,
    /.*zole$/i,
    /.*statin$/i,
    /.*prazol$/i,
    /.*mab$/i,    // monoklonalne przeciwciała
    /.*vir$/i,    // antywirusowe
    /.*mycin$/i   // antybiotyki
  ];
  
  return pharmaceuticalIndicators.some(pattern => pattern.test(name)) || 
         name.length >= 6; // Długie nazwy prawdopodobnie to leki
}

/**
 * Sprawdza czy to oczywisty fragment tekstu (nie nazwa leku)
 */
function isObviousTextFragment(name: string): boolean {
  const obviousFragments = [
    'obecnie', 'leku', 'dawki', 'dawka', 'dawce', 'podano', 'otrzymał', 
    'przyjmuje', 'stosuje', 'minimalna', 'pierwsza', 'kolejna', 'dotychczas',
    'docelowej', 'gnieciu', 'dni do', 'poprawa', 'leczenie', 'terapia',
    'pacjent', 'choroba', 'objawy', 'diagnoza', 'historia', 'raport',
    'badanie', 'wynik', 'ocena', 'analiza', 'wniosek'
  ];
  
  return obviousFragments.includes(name.toLowerCase());
}

/**
 * Escapuje specjalne znaki regex
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}