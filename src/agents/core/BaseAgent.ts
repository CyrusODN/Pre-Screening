import type { 
  BaseAgent, 
  AgentConfig, 
  AgentResult, 
  SharedContext 
} from '../../types/agents';
import type { SupportedAIModel } from '../../types/index';
import { getAIConfig } from '../../config/aiConfig';

export abstract class AbstractBaseAgent<TResult = any> implements BaseAgent<TResult> {
  public readonly name: string;
  public readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.config = config;
  }

  // Główna metoda przetwarzania - musi być zaimplementowana przez każdy agent
  public async process(context: SharedContext): Promise<AgentResult<TResult>> {
    const startTime = Date.now();
    
    try {
      // Sprawdź zależności
      this.validateDependencies(context);
      
      // Wykonaj logikę specyficzną dla agenta
      const result = await this.executeLogic(context);
      
      // Waliduj wynik
      const isValid = this.validate(result);
      if (!isValid) {
        throw new Error(`Validation failed for agent ${this.name}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        agentName: this.name,
        data: result,
        confidence: this.calculateConfidence(result, context),
        warnings: this.generateWarnings(result, context),
        processingTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        agentName: this.name,
        data: this.getErrorFallback(),
        confidence: 0,
        warnings: [`Error in ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processingTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Abstrakcyjne metody do implementacji przez konkretne agenty
  protected abstract executeLogic(context: SharedContext): Promise<TResult>;
  protected abstract getErrorFallback(): TResult;
  
  // Walidacja - domyślna implementacja, może być przesłonięta
  public validate(result: TResult): boolean {
    return result !== null && result !== undefined;
  }

  // Sprawdzenie zależności
  protected validateDependencies(context: SharedContext): void {
    if (!this.config.dependencies) return;
    
    for (const dependency of this.config.dependencies) {
      const contextKey = this.mapAgentNameToContextKey(dependency);
      if (!context[contextKey as keyof SharedContext]) {
        throw new Error(`Missing dependency: ${dependency} is required for ${this.name}`);
      }
    }
  }

  // Mapowanie nazw agentów na klucze kontekstu
  private mapAgentNameToContextKey(agentName: string): string {
    const mapping: Record<string, string> = {
      'clinical-synthesis': 'clinicalSynthesis',
      'episode-analysis': 'episodeAnalysis',
      'pharmacotherapy-analysis': 'pharmacotherapyAnalysis',
      'trd-assessment': 'trdAssessment',
      'inclusion-criteria': 'inclusionCriteriaAssessment',
      'exclusion-criteria': 'exclusionCriteriaAssessment',
      'risk-assessment': 'riskAssessment'
    };
    
    return mapping[agentName] || agentName;
  }

  // Obliczanie pewności - domyślna implementacja
  protected calculateConfidence(result: TResult, context: SharedContext): number {
    // Domyślnie zwracamy 0.8, ale każdy agent może to przesłonić
    return 0.8;
  }

  // Generowanie ostrzeżeń - domyślna implementacja
  protected generateWarnings(result: TResult, context: SharedContext): string[] {
    return [];
  }

  // Pomocnicza metoda do wywoływania API AI
  protected async callAI(
    prompt: string, 
    systemPrompt: string, 
    modelType: SupportedAIModel
  ): Promise<string> {
    const currentConfig = getAIConfig(modelType);

    if (!currentConfig.apiKey || !currentConfig.model) {
      throw new Error(`Incomplete configuration for model ${modelType}`);
    }

    let requestBody: Record<string, unknown>;
    let apiUrl: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (modelType === 'gemini') {
      const geminiConf = currentConfig as any;
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiConf.model}:generateContent?key=${geminiConf.apiKey}`;
      requestBody = {
        contents: [{
          role: "user", 
          parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
        }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: 1.0,
        }
      };
    } else if (modelType === 'claude-opus') {
      const claudeConf = currentConfig as any;
      apiUrl = '/api/anthropic/v1/messages';
      headers['x-api-key'] = claudeConf.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      
      requestBody = {
        model: claudeConf.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: 1.0,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      };
    } else { 
      const o3Conf = currentConfig as any;
      apiUrl = o3Conf.endpoint;
      headers['Authorization'] = `Bearer ${o3Conf.apiKey}`;
      
      requestBody = {
        model: o3Conf.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${modelType}): ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (modelType === 'gemini') {
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid Gemini API response structure');
      }
      return data.candidates[0].content.parts[0].text;
    } else if (modelType === 'claude-opus') {
      if (!data.content?.[0]?.text) {
        throw new Error('Invalid Claude API response structure');
      }
      return data.content[0].text;
    } else {
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid O3 API response structure');
      }
      return data.choices[0].message.content;
    }
  }

  // Pomocnicza metoda do parsowania JSON z obsługą błędów
  protected parseJSONResponse<T>(jsonString: string): T {
    try {
      const cleanedJsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      return JSON.parse(cleanedJsonString);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 