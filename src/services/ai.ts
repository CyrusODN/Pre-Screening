// src/services/ai.ts
import { getAIConfig, getModelSystemPrompt } from '../config/aiConfig';
// Poprawiona ścieżka importu typów
import type { PatientData, Criterion, SupportedAIModel, AIConfig, GeminiAIConfig, PharmacotherapyItem } from '../types/index'; 
import { initialPatientData } from '../data/mockData';
// Usunięto nieużywany import 'differenceInDays'
import { addDays, formatISO, isValid, parseISO } from 'date-fns'; 

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string,
  selectedModel: SupportedAIModel
): Promise<PatientData> {
  const currentConfig = getAIConfig(selectedModel);

  if (!currentConfig.apiKey || !currentConfig.model) {
    console.warn(`Brak pełnej konfiguracji dla modelu ${selectedModel} – używam danych testowych`);
    return {
      ...initialPatientData,
      isMockData: true,
      analyzedAt: new Date().toISOString(),
      modelUsed: selectedModel,
    };
  }

  const systemPrompt = getModelSystemPrompt(selectedModel);
  const userContent = `Przeanalizuj następującą historię medyczną i protokół badania dla oceny pre-screeningowej:
              
Historia Medyczna:
${medicalHistory}

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
    } else { 
        if (!data.choices?.[0]?.message?.content) {
            console.error('Invalid o3 API response structure:', data);
            throw new Error('Nieprawidłowa odpowiedź API o3: brak oczekiwanej treści.');
        }
        processedResponse = processAIResponse(data.choices[0].message.content, selectedModel);
    }
    console.log("Final processed PatientData (after processAIResponse):", processedResponse);
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
