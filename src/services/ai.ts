import { config } from '../config/config';
import { PatientData } from '../types';

const AI_PROMPT = `Jesteś zaawansowanym narzędziem AI, emulującym doświadczonego, wnikliwego i wysoce profesjonalnego badacza klinicznego...`; // Reszta promptu pozostaje bez zmian

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  try {
    if (!config.ai.endpoint || !config.ai.apiKey || !config.ai.model) {
      console.error('Brak pełnej konfiguracji AI. Sprawdź zmienne środowiskowe.');
      throw new Error('Brak konfiguracji AI');
    }

    console.log('Rozpoczynam analizę z użyciem AI...', {
      endpoint: config.ai.endpoint,
      model: config.ai.model,
      hasApiKey: !!config.ai.apiKey
    });

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
      console.error('Błąd odpowiedzi AI:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Błąd API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Otrzymano odpowiedź z AI:', data);
    
    const processedData = processAIResponse(data);
    return {
      ...processedData,
      isMockData: false
    };
  } catch (error) {
    console.error('Błąd podczas analizy danych pacjenta:', error);
    const mockData = getMockPatientData();
    return {
      ...mockData,
      isMockData: true
    };
  }
}

function processAIResponse(aiResponse: any): PatientData {
  // Tu dodaj właściwą logikę przetwarzania odpowiedzi AI
  // Tymczasowo zwracamy mock data
  return getMockPatientData();
}

function getMockPatientData(): PatientData {
  return {
    summary: {
      id: "Pacjent XYZ/05/2025",
      age: 33,
      mainDiagnosis: "F33.1 Zaburzenie depresyjne nawracające, obecnie epizod depresyjny umiarkowany",
      comorbidities: ["F42 Zaburzenia obsesyjno-kompulsyjne (OCD) - przewlekłe, objawowe", "Astma oskrzelowa"],
    },
    // ... reszta mock data pozostaje bez zmian
  };
}