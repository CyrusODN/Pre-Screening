import { AppConfig } from '../types';

export const config: AppConfig = {
  ai: {
    apiKey: import.meta.env.VITE_AI_API_KEY || '',
    endpoint: import.meta.env.VITE_AI_ENDPOINT || '',
    model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
  },
  defaultLanguage: 'pl',
  theme: 'light',
};

// Sprawdź czy zmienne środowiskowe są dostępne
if (!import.meta.env.VITE_AI_API_KEY || !import.meta.env.VITE_AI_ENDPOINT) {
  console.warn('Brak konfiguracji AI. Sprawdź zmienne środowiskowe VITE_AI_API_KEY i VITE_AI_ENDPOINT');
}