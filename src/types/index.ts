export interface AIConfig {
  // Podstawowa konfiguracja
  apiKey: string;
  endpoint: string;
  model: string;
  
  // Parametry modelu
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  
  // Prompt systemowy
  systemPrompt: string;
}

export interface AppConfig {
  defaultLanguage: string;
  theme: 'light' | 'dark';
}

// ... reszta interfejsów pozostaje bez zmian