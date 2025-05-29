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
        // NAPRAWIONO: Drastycznie zmniejszony limit dla Gemini żeby uniknąć obcinania JSONów
        return Math.min(this.config.maxTokens || 8000, 8000); // Bardzo niski limit dla pełnych odpowiedzi
      case 'o3':
        return Math.min(this.config.maxTokens || 65000, 65000); // O3 ma wysokie limity
      default:
        return this.config.maxTokens || 32000;
    }
  }

  // Pomocnicza metoda do parsowania JSON z obsługą błędów
  protected parseJSONResponse<T>(jsonString: string): T {
    console.log(`🔍 [${this.name}] Parsowanie odpowiedzi JSON (${jsonString.length} znaków)...`);
    
    if (!jsonString || jsonString.trim().length === 0) {
      throw new Error(`Pusta odpowiedź JSON z agenta ${this.name}`);
    }

    let cleanedJson = jsonString;
    
    // KROK 1: Wyciągnij JSON z markdown
    const jsonMatch = cleanedJson.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      cleanedJson = jsonMatch[1];
      console.log(`🔍 [${this.name}] Znaleziono blok JSON w markdown`);
    }

    // KROK 2: PODSTAWOWE CZYSZCZENIE
    console.log(`🔧 [${this.name}] Podstawowe naprawy JSON...`);
    
    // Usuń BOM i control characters
    cleanedJson = cleanedJson.replace(/^\uFEFF/, '');
    cleanedJson = cleanedJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    cleanedJson = cleanedJson.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // KROK 3: NAPRAW ESCAPE'OWANIE STRINGÓW
    cleanedJson = cleanedJson.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content) => {
      if (!content) return '""';
      
      let escaped = content
        .replace(/\\\\/g, '\\')     // Napraw podwójne escape'y
        .replace(/\\/g, '\\\\')     // Escape backslashes
        .replace(/"/g, '\\"')       // Escape quotes
        .replace(/\n/g, ' ')        // Zamień newlines
        .replace(/\r/g, ' ')        // Zamień returns
        .replace(/\t/g, ' ')        // Zamień tabs
        .replace(/[\x00-\x1F\x7F]/g, ''); // Usuń control chars
        
      if (escaped.length > 300) {
        escaped = escaped.substring(0, 297) + '...';
      }
      
      return `"${escaped}"`;
    });
    
    // KROK 4: NAPRAW PODSTAWOWE BŁĘDY SKŁADNI
    cleanedJson = cleanedJson.replace(/":\s*(\d+)"/g, '": $1');
    cleanedJson = cleanedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');
    
    // KROK 5: NAPRAW PRZECINKI W TABLICACH I OBIEKTACH
    cleanedJson = cleanedJson.replace(/"\s*\n\s*"/g, '",\n    "');
    cleanedJson = cleanedJson.replace(/\}\s*\n\s*\{/g, '},\n    {');
    cleanedJson = cleanedJson.replace(/\}\s*\n\s*"/g, '},\n    "');
    cleanedJson = cleanedJson.replace(/\]\s*\n\s*"/g, '],\n    "');
    
    // KROK 6: NAPRAW NIEDOMKNIĘTE STRINGI W TABLICACH
    cleanedJson = cleanedJson.replace(/([^"])\)\s*,?\s*\n/g, '$1)",\n');
    cleanedJson = cleanedJson.replace(/([^"]\)")\s*(?=,|\])/g, '$1');
    
    // KROK 6.5: SPECJALNA NAPRAWA NIEDOMKNIĘTYCH STRINGÓW Z CUDZYSŁOWAMI WEWNĘTRZNYMI
    // Napraw fragmenty jak: "tekst \"escaped\" bez końcowego cudzysłowu),
    cleanedJson = cleanedJson.replace(/("[^"]*\\")([^"]*)\),?\s*(?=\n|\]|,)/g, '$1$2"),');
    
    console.log(`🔍 [${this.name}] Oczyszczony JSON (pierwsze 500 znaków): ${cleanedJson.substring(0, 500)}...`);

    // KROK 7: Próba parsowania
    try {
      const parsed = JSON.parse(cleanedJson);
      console.log(`✅ [${this.name}] JSON sparsowany pomyślnie`);
      return parsed;
    } catch (error) {
      console.log(`🔧 [${this.name}] Podstawowe parsowanie nie powiodło się, desperackie naprawy...`);
      console.log(`🔧 [${this.name}] Błąd parsowania: ${(error as Error).message}`);
      
      // KROK 8: DESPERACKIE NAPRAWY
      let desperateJson = this.desperateJsonFix(cleanedJson);
      
      try {
        const parsed = JSON.parse(desperateJson);
        console.log(`✅ [${this.name}] JSON naprawiony przez desperackie naprawy`);
        return parsed;
      } catch (finalError) {
        const finalErr = finalError as Error;
        console.log(`💥 [${this.name}] Błąd parsowania JSON: ${finalErr.constructor.name}: ${finalErr.message}`);
        console.log(`💥 [${this.name}] Oryginalna odpowiedź (pierwsze 1000 znaków): ${jsonString.substring(0, 1000)}...`);
        
        const position = finalErr.message.match(/position (\d+)/);
        if (position) {
          const pos = parseInt(position[1]);
          console.log(`💥 [${this.name}] Błąd w pozycji ${pos}: ${cleanedJson.substring(Math.max(0, pos-30), pos+30)}`);
        }
        
        throw new Error(`Błąd parsowania odpowiedzi ${this.name}: ${finalErr.message}`);
      }
    }
  }

  // NOWA FUNKCJA: Desperackie naprawy JSON
  private desperateJsonFix(json: string): string {
    console.log(`🆘 [${this.name}] Desperackie naprawy JSON`);
    
    let fixed = json;
    
    // 1. Usuń wszystko po ostatnim poprawnym } lub ]
    const lastValidEnd = Math.max(
      fixed.lastIndexOf('"}'),
      fixed.lastIndexOf('"}]'),
      fixed.lastIndexOf('"}}}'),
      fixed.lastIndexOf('"}}')
    );
    
    if (lastValidEnd > 0 && lastValidEnd < fixed.length - 10) {
      console.log(`🔧 [${this.name}] Obcinam JSON od pozycji ${lastValidEnd + 2}`);
      fixed = fixed.substring(0, lastValidEnd + 2);
    }
    
    // 2. Upewnij się że JSON kończy się poprawnie
    if (!fixed.endsWith('}') && !fixed.endsWith(']')) {
      if (fixed.includes('{')) {
        fixed += '}';
      } else if (fixed.includes('[')) {
        fixed += ']';
      }
    }
    
    // 3. Usuń niepełne linie na końcu
    const lines = fixed.split('\n');
    while (lines.length > 0) {
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine === '' || 
          lastLine.endsWith(',') || 
          lastLine.endsWith(':') ||
          (lastLine.includes('"') && !lastLine.includes(':'))) {
        lines.pop();
      } else {
        break;
      }
    }
    
    fixed = lines.join('\n');
    
    // 4. Dodaj brakujące nawiasy
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += ']';
    }
    
    return fixed;
  }
} 