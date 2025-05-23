// src/services/ai.ts
import { aiConfig } from '../config/aiConfig';
import { PatientData, Criterion } from '../types';
import { initialPatientData } from '../data/mockData';

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  if (!aiConfig.apiKey || !aiConfig.endpoint || !aiConfig.model) {
    console.warn('Brak pełnej konfiguracji AI – używam danych testowych');
    return {
      ...initialPatientData,
      isMockData: true,
      analyzedAt: new Date().toISOString(),
    };
  }

  /* reasoning-modele (o1/o3/o4) nie wspierają temperature/top_p */
  const isReasoningModel = /^o[134]/.test(aiConfig.model);
  const body: Record<string, unknown> = {
    model: aiConfig.model,
    messages: [
      { role: 'system', content: aiConfig.systemPrompt },
      {
        role: 'user',
        content: `Przeanalizuj następującą historię medyczną i protokół badania dla oceny pre-screeningowej:
              
Historia Medyczna:
${medicalHistory}

Protokół Badania:
${studyProtocol}`,
      },
    ],
    max_completion_tokens: aiConfig.maxCompletionTokens,
  };

  if (!isReasoningModel) {
    body.temperature = aiConfig.temperature;
    body.top_p = aiConfig.topP;
    body.frequency_penalty = aiConfig.frequencyPenalty;
    body.presence_penalty = aiConfig.presencePenalty;
  }

  try {
    const response = await fetch(aiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Błąd API: ${response.status} – ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Nieprawidłowa odpowiedź API');
    }

    return processAIResponse(data);
  } catch (error) {
    console.error('Error during AI analysis:', error);

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
    if (!parsedData[f]) throw new Error(`Brak wymaganego pola: ${f}`);
  });

  const p = parsedData.reportConclusion?.estimatedProbability;
  if (typeof p !== 'number' || p < 0 || p > 100) {
    throw new Error('Nieprawidłowa wartość estimatedProbability');
  }
}

function toNullIfEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() === '' ? null : (value as string);
}

function mapCriterion(c: any): Criterion {
  return {
    id: c.id ?? '',
    name: c.name ?? '',
    status: c.status ?? 'weryfikacja',
    details: c.details ?? '',
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

function processAIResponse(aiResponse: any): PatientData {
  try {
    const content = aiResponse.choices[0].message.content;
    const parsed = JSON.parse(content);
    validateAIResponse(parsed);

    return {
      summary: {
        id: parsed.summary?.id ?? generatePatientId(),
        age: parsed.summary?.age ?? 0,
        mainDiagnosis: parsed.summary?.mainDiagnosis ?? '',
        comorbidities: parsed.summary?.comorbidities ?? [],
      },
      episodeEstimation: {
        scenarios: parsed.episodeEstimation?.scenarios ?? [],
        conclusion: parsed.episodeEstimation?.conclusion ?? '',
      },
      trdAnalysis: {
        episodeStartDate: toNullIfEmpty(parsed.trdAnalysis?.episodeStartDate),
        pharmacotherapy:
          parsed.trdAnalysis?.pharmacotherapy?.map((p: any) => ({
            ...p,
            startDate: toNullIfEmpty(p.startDate),
            endDate: toNullIfEmpty(p.endDate),
          })) ?? [],
        conclusion: parsed.trdAnalysis?.conclusion ?? '',
      },
      inclusionCriteria: parsed.inclusionCriteria?.map(mapCriterion) ?? [],
      psychiatricExclusionCriteria:
        parsed.psychiatricExclusionCriteria?.map(mapCriterion) ?? [],
      medicalExclusionCriteria:
        parsed.medicalExclusionCriteria?.map(mapCriterion) ?? [],
      reportConclusion: {
        overallQualification: parsed.reportConclusion?.overallQualification ?? '',
        mainIssues: parsed.reportConclusion?.mainIssues ?? [],
        criticalInfoNeeded: parsed.reportConclusion?.criticalInfoNeeded ?? [],
        estimatedProbability: parsed.reportConclusion?.estimatedProbability ?? 0,
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