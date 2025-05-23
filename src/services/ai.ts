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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return processAIResponse(data);
  } catch (error) {
    console.error('Error during AI analysis:', error);
    throw error;
  }
}

function processAIResponse(aiResponse: any): PatientData {
  try {
    // Przykładowa implementacja przetwarzania odpowiedzi AI
    // W rzeczywistej implementacji należy dostosować to do formatu odpowiedzi AI
    const content = aiResponse.choices[0].message.content;
    
    // Parsowanie odpowiedzi AI do formatu PatientData
    const parsedData = JSON.parse(content);
    
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
    throw new Error('Failed to process AI response');
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