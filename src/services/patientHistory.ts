// src/services/patientHistory.ts
import type { PatientData, PatientHistoryEntry, SupportedAIModel } from '../types';

const STORAGE_KEY = 'patient-history';

export const saveToHistory = (patientData: PatientData): void => {
  try {
    const history = getHistory();
    const entry: PatientHistoryEntry = {
      id: patientData.summary?.id || `BrakID-${Date.now()}`, 
      analyzedAt: patientData.analyzedAt || new Date().toISOString(),
      summary: patientData.summary || { id: '', age: 0, mainDiagnosis: 'Brak danych', comorbidities: [] },
      reportConclusion: patientData.reportConclusion || { overallQualification: 'Brak danych', mainIssues: [], criticalInfoNeeded: [], estimatedProbability: 0 },
      modelUsed: patientData.modelUsed || 'o3', 
    };
    
    const cleanedHistory = history.filter(h => h.id && h.summary && h.reportConclusion);
    const updatedHistory = [entry, ...cleanedHistory].slice(0, 50); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

export const getHistory = (): PatientHistoryEntry[] => {
  try {
    const historyString = localStorage.getItem(STORAGE_KEY);
    if (historyString) {
      const parsedHistory = JSON.parse(historyString) as PatientHistoryEntry[];
      return parsedHistory.filter(entry => 
        entry && 
        entry.id && 
        entry.summary && 
        entry.reportConclusion &&
        typeof entry.summary.id === 'string' && 
        typeof entry.reportConclusion.estimatedProbability === 'number'
      );
    }
    return [];
  } catch (error) {
    console.error('Error reading history:', error);
    localStorage.removeItem(STORAGE_KEY); 
    return [];
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
};