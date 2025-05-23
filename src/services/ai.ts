import { config } from '../config/config';
import { PatientData } from '../types';

const AI_PROMPT = `Jesteś zaawansowanym narzędziem AI, emulującym doświadczonego, wnikliwego i wysoce profesjonalnego badacza klinicznego...`; // Reszta promptu pozostaje bez zmian

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  if (!config.ai.endpoint || !config.ai.apiKey || !config.ai.model) {
    throw new Error('Brak pełnej konfiguracji AI. Sprawdź zmienne środowiskowe.');
  }

  const response = await fetch(config.ai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.ai.model,
      messages: [
        {
          role: 'system',
          content: AI_PROMPT,
        },
        {
          role: 'user',
          content: `Przeanalizuj następującą historię medyczną i protokół badania dla oceny pre-screeningowej:
            
            Historia Medyczna:
            ${medicalHistory}
            
            Protokół Badania:
            ${studyProtocol}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Błąd API: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return processAIResponse(data);
}

function processAIResponse(aiResponse: any): PatientData {
  // Przetwarzamy odpowiedź z API na format PatientData
  const content = aiResponse.choices[0].message.content;
  
  try {
    // Próbujemy sparsować odpowiedź jako JSON
    const parsedContent = JSON.parse(content);
    
    // Mapujemy odpowiedź na strukturę PatientData
    return {
      summary: {
        id: parsedContent.id || `Patient/${new Date().toISOString()}`,
        age: parsedContent.age || 0,
        mainDiagnosis: parsedContent.mainDiagnosis || '',
        comorbidities: parsedContent.comorbidities || [],
      },
      episodeEstimation: {
        scenarios: parsedContent.episodeEstimation?.scenarios || [],
        conclusion: parsedContent.episodeEstimation?.conclusion || '',
      },
      trdAnalysis: {
        episodeStartDate: parsedContent.trdAnalysis?.episodeStartDate || '',
        pharmacotherapy: parsedContent.trdAnalysis?.pharmacotherapy || [],
        conclusion: parsedContent.trdAnalysis?.conclusion || '',
      },
      inclusionCriteria: parsedContent.inclusionCriteria?.map(mapCriterion) || [],
      psychiatricExclusionCriteria: parsedContent.psychiatricExclusionCriteria?.map(mapCriterion) || [],
      medicalExclusionCriteria: parsedContent.medicalExclusionCriteria?.map(mapCriterion) || [],
      reportConclusion: {
        overallQualification: parsedContent.reportConclusion?.overallQualification || '',
        mainIssues: parsedContent.reportConclusion?.mainIssues || [],
        criticalInfoNeeded: parsedContent.reportConclusion?.criticalInfoNeeded || [],
        estimatedProbability: parsedContent.reportConclusion?.estimatedProbability || 0,
      },
      analyzedAt: new Date().toISOString(),
      isMockData: false,
    };
  } catch (error) {
    console.error('Błąd podczas przetwarzania odpowiedzi AI:', error);
    throw new Error('Nieprawidłowy format odpowiedzi z API');
  }
}

function mapCriterion(criterion: any) {
  return {
    id: criterion.id || '',
    name: criterion.name || '',
    status: criterion.status || 'weryfikacja',
    details: criterion.details || '',
    userStatus: null,
    userComment: null,
    userOverrideTimestamp: null,
  };
}