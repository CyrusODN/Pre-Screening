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
    const processedData = await processAIResponse(data);
    return { ...processedData, isMockData: false };
  } catch (error) {
    console.error('Error during AI analysis:', error);
    return { ...initialPatientData, isMockData: true, analyzedAt: new Date().toISOString() };
  }
}

// ... reszta funkcji pozostaje bez zmian