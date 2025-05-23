import { aiConfig } from '../config/aiConfig';
import { PatientData } from '../types';
import { initialPatientData } from '../data/mockData';

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  if (!aiConfig.apiKey || !aiConfig.endpoint || !aiConfig.model) {
    console.warn('Brak pełnej konfiguracji AI - używam danych testowych');
    return { ...initialPatientData, isMockData: true, analyzedAt: new Date().toISOString() };
  }

  try {
    const response = await fetch(aiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: aiConfig.systemPrompt,
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
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        top_p: aiConfig.topP,
        frequency_penalty: aiConfig.frequencyPenalty,
        presence_penalty: aiConfig.presencePenalty,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Błąd API: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Nieprawidłowa odpowiedź API');
    }

    return processAIResponse(data);
  } catch (error) {
    console.error('Error during AI analysis:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Błąd połączenia z serwerem AI. Sprawdź połączenie internetowe.');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Wystąpił nieoczekiwany błąd podczas analizy');
  }
}

function validateAIResponse(parsedData: any): void {
  const requiredFields = ['summary', 'episodeEstimation', 'trdAnalysis', 'inclusionCriteria', 
    'psychiatricExclusionCriteria', 'medicalExclusionCriteria', 'reportConclusion'];
  
  for (const field of requiredFields) {
    if (!parsedData[field]) {
      throw new Error(`Brak wymaganego pola: ${field}`);
    }
  }

  if (typeof parsedData.reportConclusion.estimatedProbability !== 'number' ||
      parsedData.reportConclusion.estimatedProbability < 0 ||
      parsedData.reportConclusion.estimatedProbability > 100) {
    throw new Error('Nieprawidłowa wartość estimatedProbability');
  }
}

function processAIResponse(aiResponse: any): PatientData {
  try {
    const content = aiResponse.choices[0].message.content;
    const parsedData = JSON.parse(content);
    
    validateAIResponse(parsedData);
    
    return {
      summary: {
        id: parsedData.summary?.id || generatePatientId(),
        age: parsedData.summary?.age || 0,
        mainDiagnosis: parsedData.summary?.mainDiagnosis || '',
        comorbidities: parsedData.summary?.comorbidities || [],
      },
      episodeEstimation: {
        scenarios: parsedData.episodeEstimation?.scenarios || [],
        conclusion: parsedData.episodeEstimation?.conclusion || '',
      },
      trdAnalysis: {
        episodeStartDate: parsedData.trdAnalysis?.episodeStartDate || '',
        pharmacotherapy: parsedData.trdAnalysis?.pharmacotherapy || [],
        conclusion: parsedData.trdAnalysis?.conclusion || '',
      },
      inclusionCriteria: parsedData.inclusionCriteria?.map(mapCriterion) || [],
      psychiatricExclusionCriteria: parsedData.psychiatricExclusionCriteria?.map(mapCriterion) || [],
      medicalExclusionCriteria: parsedData.medicalExclusionCriteria?.map(mapCriterion) || [],
      reportConclusion: {
        overallQualification: parsedData.reportConclusion?.overallQualification || '',
        mainIssues: parsedData.reportConclusion?.mainIssues || [],
        criticalInfoNeeded: parsedData.reportConclusion?.criticalInfoNeeded || [],
        estimatedProbability: parsedData.reportConclusion?.estimatedProbability || 0,
      },
      analyzedAt: new Date().toISOString(),
      isMockData: false,
    };
  } catch (error) {
    console.error('Error processing AI response:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Otrzymano nieprawidłowy format odpowiedzi z API');
    }
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

function generatePatientId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAT/${year}${month}/${random}`;
}