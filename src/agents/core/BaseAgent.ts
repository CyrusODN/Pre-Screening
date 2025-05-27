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

  // Pomocnicza metoda do wywoływania API AI
  protected async callAI(userPrompt: string, systemPrompt: string, model: SupportedAIModel): Promise<string> {
    const backendUrl = 'http://localhost:3001';
    
    try {
      console.log(`🔄 [${this.name}] Wysyłanie żądania do backend proxy dla modelu: ${model}`);
      
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          systemPrompt,
          userPrompt,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend API Error (${model}): ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log(`✅ [${this.name}] Otrzymano odpowiedź z backend proxy dla modelu: ${model}`);
      return data.content || '';
      
    } catch (error) {
      console.error(`💥 [${this.name}] BŁĄD podczas komunikacji z backend:`, error);
      
      // Sprawdź czy backend jest dostępny
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Backend server is not running. Please start it with: npm run server`);
      }
      
      throw error;
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