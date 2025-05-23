// src/services/ai.ts
import { getAIConfig, getModelSystemPrompt } from '../config/aiConfig';
import { PatientData, Criterion, SupportedAIModel, AIConfig, GeminiAIConfig } from '../types';
import { initialPatientData } from '../data/mockData';

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
        responseMimeType: "application/json", // Ważne dla Gemini, aby zwracał JSON
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
      max_tokens: o3Conf.maxCompletionTokens, 
    };
    const isReasoningModel = /^o[134]/.test(o3Conf.model);
    if (!isReasoningModel) {
      requestBody.temperature = o3Conf.temperature;
      requestBody.top_p = o3Conf.topP;
      requestBody.frequency_penalty = o3Conf.frequencyPenalty;
      requestBody.presence_penalty = o3Conf.presencePenalty;
    }
    // Dla modeli OpenAI-compatible, które mają zwracać JSON, można dodać response_format
    // if (o3Conf.model.includes('gpt-4') || o3Conf.model.includes('gpt-3.5')) { // Przykładowe sprawdzenie
    //   requestBody.response_format = { type: "json_object" }; 
    // }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({error: {message: response.statusText}})); 
      const errorMessage = errorData.error?.message || response.statusText;
      console.error(`API Error Data (${selectedModel}):`, errorData); // Logowanie szczegółów błędu
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

/* ---------- helpers ---------- */

function validateAIResponse(parsedData: any): void {
  const required = [
    'summary',
    'episodeEstimation',
    'trdAnalysis',
    'inclusionCriteria',
    'psychiatricExclusionCriteria',
    'medicalExclusionCriteria',
    'reportConclusion',
  ];
  required.forEach((f) => {
    if (parsedData[f] === undefined || parsedData[f] === null) { 
        throw new Error(`Brak wymaganego pola: ${f} w odpowiedzi AI.`);
    }
  });

  const p = parsedData.reportConclusion?.estimatedProbability;
  if (typeof p !== 'number' || p < 0 || p > 100) {
    throw new Error(`Nieprawidłowa wartość estimatedProbability: ${p}`);
  }
}

function toNullIfEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() === '' ? null : (value as string);
}

function mapCriterion(c: any): Criterion {
  return {
    id: c.id ?? `unknown-${Math.random().toString(36).substring(7)}`, 
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
  try {
    // Usuń potencjalne znaczniki ```json na początku i ``` na końcu stringa, które mogą dodać niektóre modele
    const cleanedJsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleanedJsonString);
    validateAIResponse(parsed);

    return {
      summary: {
        id: parsed.summary?.id ?? generatePatientId(),
        age: parsed.summary?.age ?? 0,
        mainDiagnosis: parsed.summary?.mainDiagnosis ?? 'Brak danych',
        comorbidities: Array.isArray(parsed.summary?.comorbidities) ? parsed.summary.comorbidities : [],
      },
      episodeEstimation: {
        scenarios: Array.isArray(parsed.episodeEstimation?.scenarios) ? parsed.episodeEstimation.scenarios : [],
        conclusion: parsed.episodeEstimation?.conclusion ?? 'Brak danych',
      },
      trdAnalysis: {
        episodeStartDate: toNullIfEmpty(parsed.trdAnalysis?.episodeStartDate),
        pharmacotherapy:
          Array.isArray(parsed.trdAnalysis?.pharmacotherapy) ? parsed.trdAnalysis.pharmacotherapy.map((p: any) => ({
            ...p,
            startDate: toNullIfEmpty(p.startDate),
            endDate: toNullIfEmpty(p.endDate),
          })) : [],
        conclusion: parsed.trdAnalysis?.conclusion ?? 'Brak danych',
      },
      inclusionCriteria: Array.isArray(parsed.inclusionCriteria) ? parsed.inclusionCriteria.map(mapCriterion) : [],
      psychiatricExclusionCriteria:
        Array.isArray(parsed.psychiatricExclusionCriteria) ? parsed.psychiatricExclusionCriteria.map(mapCriterion) : [],
      medicalExclusionCriteria:
        Array.isArray(parsed.medicalExclusionCriteria) ? parsed.medicalExclusionCriteria.map(mapCriterion) : [],
      reportConclusion: {
        overallQualification: parsed.reportConclusion?.overallQualification ?? 'Brak danych',
        mainIssues: Array.isArray(parsed.reportConclusion?.mainIssues) ? parsed.reportConclusion.mainIssues : [],
        criticalInfoNeeded: Array.isArray(parsed.reportConclusion?.criticalInfoNeeded) ? parsed.reportConclusion.criticalInfoNeeded : [],
        estimatedProbability: parsed.reportConclusion?.estimatedProbability ?? 0,
      },
      analyzedAt: new Date().toISOString(),
      isMockData: false,
      modelUsed: modelUsed,
    };
  } catch (error) {
    console.error('Error processing AI response (JSON parsing or validation):', error);
    console.error('Original JSON string from AI:', jsonString); // Logowanie oryginalnego stringa
    if (error instanceof SyntaxError) {
      throw new Error(`Otrzymano nieprawidłowy format odpowiedzi JSON z API (${modelUsed}). Sprawdź konsolę po więcej szczegółów.`);
    }
    throw error;
  }
}