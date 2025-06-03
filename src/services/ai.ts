// src/services/ai.ts
import { getAIConfig, getModelSystemPrompt } from '../config/aiConfig';
// Poprawiona ścieżka importu typów
import type { PatientData, Criterion, SupportedAIModel, AIConfig, GeminiAIConfig, ClaudeAIConfig, PharmacotherapyItem } from '../types/index'; 
import { initialPatientData } from '../data/mockData';
// Usunięto nieużywany import 'differenceInDays'
import { addDays, formatISO, isValid, parseISO } from 'date-fns'; 
import drugMappingClient from './drugMappingClient';

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel,
  enableSpecialistAnalysis: boolean = true
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

      console.log('✅ [AI Service] Analysis completed successfully');
      
      return processedResponse;

    } catch (fetchError) {
      console.error(`❌ [AI Service] Fetch error (${selectedModel}):`, fetchError);
      throw new Error(`Błąd komunikacji z API ${selectedModel}: ${fetchError instanceof Error ? fetchError.message : 'Nieznany błąd'}`);
    }

  } catch (error) {
    console.error('❌ [AI Service] Analysis failed:', error);
    
    // Return fallback data on error
    const fallbackData = {
      ...initialPatientData,
      isMockData: true,
      analyzedAt: new Date().toISOString(),
      modelUsed: selectedModel,
    };
    return fallbackData;
  }
}

function createFallbackPatientData(content: string, model: SupportedAIModel): PatientData {
  return {
    ...initialPatientData,
    summary: {
      id: generatePatientId(),
      age: 35,
      mainDiagnosis: 'Analiza wymaga uzupełnienia',
      comorbidities: []
    },
    reportConclusion: {
      overallQualification: 'Błąd parsowania odpowiedzi AI',
      mainIssues: ['Błąd parsowania odpowiedzi AI'],
      criticalInfoNeeded: ['Ponowna analiza wymagana'],
      estimatedProbability: 0
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
      let startDateStr = toNullIfEmpty(p.startDate);
      let endDateStr = toNullIfEmpty(p.endDate);
      let notes = p.notes || '';

      let parsedStartDate = startDateStr ? parseISO(startDateStr) : null;
      let parsedEndDate = endDateStr ? parseISO(endDateStr) : null;

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
        dose: p.dose ?? 'N/A',
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
        age: Number(parsed.summary?.age) || 35,
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
        overallQualification: parsed.reportConclusion?.overallQualification ?? 'Wymaga weryfikacji',
        mainIssues: Array.isArray(parsed.reportConclusion?.mainIssues) ? parsed.reportConclusion.mainIssues : [],
        criticalInfoNeeded: Array.isArray(parsed.reportConclusion?.criticalInfoNeeded) ? parsed.reportConclusion.criticalInfoNeeded : [],
        estimatedProbability: Number(parsed.reportConclusion?.estimatedProbability) || 50,
        riskFactors: Array.isArray(parsed.reportConclusion?.riskFactors) ? parsed.reportConclusion.riskFactors : undefined,
      },
      analyzedAt: new Date().toISOString(),
      modelUsed,
      isMockData: false,
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
 */
async function preprocessMedicalHistoryForDrugMapping(medicalHistory: string): Promise<{
  processedHistory: string;
  drugMappings: Array<{original: string; mapped: string; confidence: number}>;
}> {
  console.log('🔍 [AI Service] Preprocessing medical history for drug mapping...');
  
  const drugMappings: Array<{original: string; mapped: string; confidence: number}> = [];
  let processedHistory = medicalHistory;
  
  // POPRAWIONE WZORCE - bardziej precyzyjne wykrywanie nazw leków
  const drugPatterns = [
    // Wzorce dla nazw leków z dawkami (najwyższy priorytet)
    /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\s+(?:\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|IU|j\.m\.))/gi,
    
    // Wzorce dla znanych nazw handlowych leków (lista sprawdzonych nazw)
    /\b(Escitalopram|Elicea|Efevelon|Hydroxyzinum|Lamitrin|Pregabalin|Wellbutrin|Egzysta|Oreos|Lamotrix|Brintellix|Dulsevia|Neurovit|Welbox|Preato|Asertin|Dekristol|Mirtagen)\b/gi,
    
    // Wzorce dla nazw z typowymi końcówkami farmaceutycznymi (tylko jeśli mają sens)
    /\b([A-Z][a-z]{3,}(?:ina|ine|ol|um|an|on|ex|al|yl|il|ium))\b(?=\s+(?:\d+|tabl|kaps|mg|ml|dawka|rano|wieczór|na noc))/gi,
    
    // Wzorce dla nazw po słowach kluczowych
    /(?:lek|preparat|medication|drug|stosuje|przyjmuje|zażywa|podaje)[\s:]+([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)/gi,
    
    // Wzorce dla nazw w nawiasach (tylko jeśli wyglądają jak leki)
    /\(([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)\)/gi
  ];
  
  const potentialDrugs = new Set<string>();
  
  // Lista słów do wykluczenia (nie są lekami)
  const excludeWords = new Set([
    'Centrum', 'Szpital', 'Oddział', 'Gmina', 'Telefon', 'Stan', 'Hemoglobina', 
    'Cholesterol', 'Kreatynina', 'Witamina', 'Marcina', 'Nadal', 'Roste',
    'Zawiesina', 'Regon', 'Hormon', 'Kontrola', 'Skan', 'Mail', 'Dialog',
    'Terapia', 'Centrum', 'Ograniczon', 'Orygina', 'Zmian', 'Wspomina',
    'Spowodowan', 'Koleina', 'Ealan', 'Trijodotyronina', 'Tyreotropina',
    'Creatinine', 'Evevelon', 'Dulsevic', 'Elsay', 'Ntrum', 'Orycina',
    // Nazwy miesięcy - polskie i angielskie
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    // Inne często występujące słowa
    'Ubezpieczony', 'Pacjent', 'Diagnoza', 'Leczenie', 'Wizyta', 'Hospitalizacja',
    'Konsultacja', 'Poradnia', 'Ambulatorium', 'Klinika', 'Ośrodek', 'Zakład',
    'Instytut', 'Uniwersytet', 'Akademia', 'Medycyna', 'Zdrowie', 'Choroba',
    'Zespół', 'Syndrom', 'Objawy', 'Wywiad', 'Badanie', 'Wynik', 'Ocena',
    'Czas', 'Data', 'Godzina', 'Doba', 'Tydzień', 'Miesiąc', 'Rok'
  ]);
  
  // Wyciągnij potencjalne nazwy leków
  drugPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(medicalHistory)) !== null) {
      const drugName = match[1].trim();
      
      // Sprawdź czy to nie jest słowo do wykluczenia
      if (drugName.length > 3 && 
          !excludeWords.has(drugName) && 
          !excludeWords.has(drugName.toLowerCase()) &&
          // Sprawdź czy nie zawiera cyfr (prawdopodobnie nie jest lekiem)
          !/\d/.test(drugName) &&
          // Sprawdź czy nie jest zbyt długie (prawdopodobnie fragment tekstu)
          drugName.length < 25 &&
          // Sprawdź czy nie zawiera typowych słów niefarmaceutycznych
          !/(?:pacjent|leczenie|terapia|badanie|wizyta|kontrola|szpital|oddział|centrum|telefon|mail|adres|ulica|miasto)/i.test(drugName)) {
        potentialDrugs.add(drugName);
      }
    }
  });
  
  console.log(`🔍 [AI Service] Found ${potentialDrugs.size} potential drug names:`, Array.from(potentialDrugs));
  
  // Mapuj każdą potencjalną nazwę leku
  for (const drugName of potentialDrugs) {
    try {
      const mappingResult = await drugMappingClient.mapDrugToStandard(drugName);
      
      if (mappingResult.found && mappingResult.confidence > 0.7) { // Zwiększony próg confidence
        const standardName = mappingResult.standardName;
        const activeSubstance = mappingResult.activeSubstance;
        
        // Użyj substancji czynnej jako głównej nazwy
        const mappedName = activeSubstance || standardName;
        
        drugMappings.push({
          original: drugName,
          mapped: mappedName,
          confidence: mappingResult.confidence
        });
        
        // Zamień w tekście wszystkie wystąpienia nazwy handlowej na substancję czynną
        const regex = new RegExp(`\\b${drugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        processedHistory = processedHistory.replace(regex, `${mappedName} (${drugName})`);
        
        console.log(`✅ [AI Service] Mapped: ${drugName} → ${mappedName} (confidence: ${Math.round(mappingResult.confidence * 100)}%)`);
      } else {
        console.log(`⚠️ [AI Service] No mapping found for: ${drugName} (confidence: ${mappingResult.confidence})`);
      }
    } catch (error) {
      console.error(`❌ [AI Service] Error mapping drug ${drugName}:`, error);
    }
  }
  
  console.log(`✅ [AI Service] Drug mapping completed. Mapped ${drugMappings.length} drugs.`);
  
  return {
    processedHistory,
    drugMappings
  };
}