import { PatientData, PatientHistoryEntry } from '../types';

const STORAGE_KEY = 'patient-history';

export const saveToHistory = (patientData: PatientData): void => {
  try {
    const history = getHistory();
    const entry: PatientHistoryEntry = {
      id: patientData.summary.id,
      analyzedAt: new Date().toISOString(),
      summary: patientData.summary,
      reportConclusion: patientData.reportConclusion,
    };
    
    const updatedHistory = [entry, ...history].slice(0, 50); // Keep last 50 entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

export const getHistory = (): PatientHistoryEntry[] => {
  try {
    const historyString = localStorage.getItem(STORAGE_KEY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};