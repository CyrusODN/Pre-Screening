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
      console.log(`🚀 [${this.name}] Rozpoczynanie przetwarzania...`);
      
      // Sprawdź zależności
      this.validateDependencies(context);
      console.log(`✅ [${this.name}] Zależności sprawdzone`);
      
      // Wykonaj logikę specyficzną dla agenta
      const result = await this.executeLogic(context);
      console.log(`✅ [${this.name}] executeLogic zakończone`, result);
      
      // Waliduj wynik
      const isValid = this.validate(result);
      if (!isValid) {
        console.error(`❌ [${this.name}] Walidacja nie powiodła się:`, result);
        throw new Error(`Validation failed for agent ${this.name}`);
      }
      console.log(`✅ [${this.name}] Walidacja zakończona pomyślnie`);
      
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
      
      console.error(`💥 [${this.name}] BŁĄD podczas przetwarzania:`, error);
      console.error(`💥 [${this.name}] Stack trace:`, error instanceof Error ? error.stack : 'Brak stack trace');
      
      // Zwracamy fallback zamiast rzucać błąd
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
      'criteria-assessment': 'inclusionCriteriaAssessment',
      'risk-assessment': 'riskAssessment'
    };
    
    return mapping[agentName] || agentName;
  }

  // Obliczanie pewności - domyślna implementacja
  protected calculateConfidence(_result: TResult, _context: SharedContext): number {
    // Domyślnie zwracamy 0.8, ale każdy agent może to przesłonić
    return 0.8;
  }

  // Generowanie ostrzeżeń - domyślna implementacja
  protected generateWarnings(_result: TResult, _context: SharedContext): string[] {
    return [];
  }

  // Pomocnicza metoda do wywoływania API AI z automatycznym fallback
  protected async callAI(userPrompt: string, systemPrompt: string, model: SupportedAIModel): Promise<string> {
    const backendUrl = 'http://localhost:3001';
    
    // Lista modeli do wypróbowania w kolejności preferencji
    const modelFallbackChain: SupportedAIModel[] = [
      model, // Pierwotnie wybrany model
      'gemini', // Fallback 1: Gemini (ma wysokie limity)
      'o3' // Fallback 2: OpenAI o3 (jako ostateczność)
    ];
    
    // Usuń duplikaty z listy fallback
    const uniqueModels = [...new Set(modelFallbackChain)];
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < uniqueModels.length; i++) {
      const currentModel = uniqueModels[i];
      
      try {
        console.log(`🔄 [${this.name}] Wysyłanie żądania do backend proxy dla modelu: ${currentModel}${i > 0 ? ' (fallback)' : ''}`);
        
        const response = await fetch(`${backendUrl}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: currentModel,
            systemPrompt,
            userPrompt,
            temperature: this.config.temperature,
            maxTokens: this.getMaxTokensForModel(currentModel)
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = `Backend API Error (${currentModel}): ${response.status} - ${errorData.message || JSON.stringify(errorData)}`;
          
          // Sprawdź czy to błąd rate limit Claude
          const isClaudeRateLimit = currentModel === 'claude-opus' && 
            (response.status === 429 || 
             errorData.message?.includes('rate_limit_error') ||
             errorData.message?.includes('rate limit'));
          
          if (isClaudeRateLimit && i < uniqueModels.length - 1) {
            console.warn(`⚠️ [${this.name}] Claude rate limit detected, trying fallback model: ${uniqueModels[i + 1]}`);
            lastError = new Error(errorMessage);
            continue; // Spróbuj następny model
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`✅ [${this.name}] Otrzymano odpowiedź z backend proxy dla modelu: ${currentModel}${i > 0 ? ' (fallback)' : ''}`);
        
        if (i > 0) {
          console.log(`🔄 [${this.name}] Użyto fallback model ${currentModel} zamiast ${model}`);
        }
        
        return data.content || '';
        
      } catch (error) {
        lastError = error as Error;
        console.error(`💥 [${this.name}] BŁĄD podczas komunikacji z backend (${currentModel}):`, error);
        
        // Jeśli to nie jest ostatni model w łańcuchu, spróbuj następny
        if (i < uniqueModels.length - 1) {
          console.log(`🔄 [${this.name}] Próbuję fallback model: ${uniqueModels[i + 1]}`);
          continue;
        }
      }
    }
    
    // Jeśli wszystkie modele zawiodły
    console.error(`💥 [${this.name}] Wszystkie modele fallback zawiodły. Ostatni błąd:`, lastError);
    
    // Sprawdź czy backend jest dostępny
    if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
      throw new Error(`Backend server is not running. Please start it with: npm run server`);
    }
    
    throw lastError || new Error('All AI models failed');
  }

  // Pomocnicza metoda do określania maksymalnej liczby tokenów dla różnych modeli
  private getMaxTokensForModel(model: SupportedAIModel): number {
    switch (model) {
      case 'claude-opus':
        return Math.min(this.config.maxTokens || 32000, 32000); // Claude ma limit 32k
      case 'gemini':
        return Math.min(this.config.maxTokens || 65000, 65000); // Gemini ma wyższy limit
      case 'o3':
        return Math.min(this.config.maxTokens || 65000, 65000); // O3 ma wysokie limity
      default:
        return this.config.maxTokens || 32000;
    }
  }

  // Pomocnicza metoda do parsowania JSON z obsługą błędów
  protected parseJSONResponse<T>(jsonString: string): T {
    try {
      console.log(`🔍 [${this.name}] Parsowanie odpowiedzi JSON...`);
      
      // Usuń białe znaki na początku i końcu
      let cleanedString = jsonString.trim();
      
      // Znajdź i wytnij JSON z bloków markdown ```json```
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = cleanedString.match(jsonBlockRegex);
      
      if (jsonMatch) {
        cleanedString = jsonMatch[1].trim();
        console.log(`🔍 [${this.name}] Znaleziono blok JSON w markdown`);
      } else {
        // Spróbuj znaleźć JSON między nawiasami klamrowymi
        const jsonObjectRegex = /\{[\s\S]*\}/;
        const objectMatch = cleanedString.match(jsonObjectRegex);
        
        if (objectMatch) {
          cleanedString = objectMatch[0];
          console.log(`🔍 [${this.name}] Znaleziono obiekt JSON w tekście`);
        }
      }
      
      // NAPRAW PROBLEM Z UNDEFINED - zamień na null
      cleanedString = cleanedString.replace(/:\s*undefined\b/g, ': null');
      cleanedString = cleanedString.replace(/,\s*undefined\b/g, ', null');
      cleanedString = cleanedString.replace(/\[\s*undefined\b/g, '[null');
      cleanedString = cleanedString.replace(/undefined\s*,/g, 'null,');
      cleanedString = cleanedString.replace(/undefined\s*\]/g, 'null]');
      
      console.log(`🔍 [${this.name}] Oczyszczony JSON:`, cleanedString.substring(0, 200) + '...');
      
      try {
        const parsed = JSON.parse(cleanedString);
        console.log(`✅ [${this.name}] JSON sparsowany pomyślnie`);
        return parsed;
      } catch (parseError) {
        // PRÓBA NAPRAWY: Jeśli JSON jest uszkodzony, spróbuj obciąć na ostatnim poprawnym miejscu
        console.log(`🔧 [${this.name}] Próba naprawy uszkodzonego JSON...`);
        
        // Znajdź ostatni poprawny nawias zamykający
        const lastValidBrace = this.findLastValidJsonEnd(cleanedString);
        if (lastValidBrace > 0) {
          const repairedJson = cleanedString.substring(0, lastValidBrace + 1);
          console.log(`🔧 [${this.name}] Próba parsowania naprawionego JSON (${repairedJson.length} znaków)`);
          
          try {
            const parsed = JSON.parse(repairedJson);
            console.log(`✅ [${this.name}] Naprawiony JSON sparsowany pomyślnie`);
            return parsed;
          } catch (repairError) {
            console.log(`❌ [${this.name}] Naprawa JSON nie powiodła się`);
          }
        }
        
        throw parseError;
      }
      
    } catch (error) {
      console.error(`💥 [${this.name}] Błąd parsowania JSON:`, error);
      console.error(`💥 [${this.name}] Oryginalna odpowiedź:`, jsonString.substring(0, 500) + '...');
      throw new Error(`Błąd parsowania odpowiedzi ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Pomocnicza metoda do znajdowania ostatniego poprawnego końca JSON
  private findLastValidJsonEnd(jsonString: string): number {
    let braceCount = 0;
    let lastValidEnd = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidEnd = i;
        }
      }
    }
    
    return lastValidEnd;
  }
} 