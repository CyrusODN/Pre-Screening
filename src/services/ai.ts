import { config } from '../config/config';
import { PatientData } from '../types';
import { initialPatientData } from '../data/mockData';

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  // Sprawdzamy konfigurację AI
  if (!config.ai.apiKey || !config.ai.endpoint || !config.ai.model) {
    console.warn('Brak pełnej konfiguracji AI - używam danych testowych');
    return { ...initialPatientData, analyzedAt: new Date().toISOString() };
  }

  try {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processedData = await processAIResponse(data);
    return { ...processedData, isMockData: false };
  } catch (error) {
    console.error('Error during AI analysis:', error);
    return { ...initialPatientData, analyzedAt: new Date().toISOString() };
  }
}

async function processAIResponse(aiResponse: any): Promise<PatientData> {
  try {
    const content = aiResponse.choices[0].message.content;
    // Próbujemy sparsować odpowiedź jako JSON
    const parsedContent = JSON.parse(content);
    
    return {
      summary: {
        id: parsedContent.summary?.id || `Patient/${new Date().toISOString()}`,
        age: parsedContent.summary?.age || 0,
        mainDiagnosis: parsedContent.summary?.mainDiagnosis || '',
        comorbidities: parsedContent.summary?.comorbidities || [],
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
      inclusionCriteria: (parsedContent.inclusionCriteria || []).map(mapCriterion),
      psychiatricExclusionCriteria: (parsedContent.psychiatricExclusionCriteria || []).map(mapCriterion),
      medicalExclusionCriteria: (parsedContent.medicalExclusionCriteria || []).map(mapCriterion),
      reportConclusion: {
        overallQualification: parsedContent.reportConclusion?.overallQualification || '',
        mainIssues: parsedContent.reportConclusion?.mainIssues || [],
        criticalInfoNeeded: parsedContent.reportConclusion?.criticalInfoNeeded || [],
        estimatedProbability: parsedContent.reportConclusion?.estimatedProbability || 0,
      },
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error processing AI response:', error);
    throw error;
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

// Eksportujemy prompt dla celów testowych
export const AI_PROMPT = `Jesteś zaawansowanym narzędziem AI, emulującym doświadczonego, wnikliwego i wysoce profesjonalnego badacza klinicznego. Twoją podstawową funkcją jest przeprowadzanie skrupulatnego pre-screeningu potencjalnych uczestników badań klinicznych w dziedzinie psychiatrii.

[...reszta promptu...]`;