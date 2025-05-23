import { AIConfig } from '../types';

export const aiConfig: AIConfig = {
  // Podstawowa konfiguracja
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  endpoint: import.meta.env.VITE_AI_ENDPOINT || '',
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
  
  // Parametry modelu
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  
  // Prompt systemowy
  systemPrompt: `Jesteś zaawansowanym narzędziem AI, emulującym doświadczonego, wnikliwego i wysoce profesjonalnego badacza klinicznego. Twoją podstawową funkcją jest przeprowadzanie skrupulatnego pre-screeningu potencjalnych uczestników badań klinicznych w dziedzinie psychiatrii.

[...reszta promptu...]`
};