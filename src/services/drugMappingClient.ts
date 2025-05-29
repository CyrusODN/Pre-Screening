import type { DrugRecord, DrugSearchResult, DrugMappingResult } from './drugMappingService';

const API_BASE_URL = 'http://localhost:3001/api/drug-mapping';

export interface DrugDatabaseStats {
  totalDrugs: number;
  uniqueSubstances: number;
  uniqueAtcCodes: number;
  topAtcClasses: Array<{atcCode: string; count: number}>;
}

class DrugMappingClient {
  /**
   * Mapuje nazwę leku na standardową substancję czynną
   */
  public async mapDrugToStandard(drugName: string): Promise<DrugMappingResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error mapping drug:', error);
      throw error;
    }
  }

  /**
   * Wykonuje szczegółowe wyszukiwanie leków
   */
  public async searchDrugs(searchTerm: string): Promise<DrugSearchResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/detailed-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching drugs:', error);
      throw error;
    }
  }

  /**
   * Pobiera statystyki bazy danych leków
   */
  public async getDatabaseStats(): Promise<DrugDatabaseStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Pobiera listę leków przeciwdepresyjnych
   */
  public async getAntidepressants(): Promise<DrugRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/antidepressants`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting antidepressants:', error);
      throw error;
    }
  }

  /**
   * Pobiera WSZYSTKIE leki z polskiego rejestru (nie tylko przeciwdepresyjne)
   * NOWA METODA: Skalowalne rozwiązanie dla mapowania wszystkich leków
   */
  public async getAllDrugs(): Promise<DrugRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/all`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting all drugs:', error);
      throw error;
    }
  }

  /**
   * Sprawdza czy lek jest przeciwdepresyjny
   */
  public async isAntidepressant(drugName: string): Promise<{drugName: string; isAntidepressant: boolean}> {
    try {
      const response = await fetch(`${API_BASE_URL}/is-antidepressant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking if drug is antidepressant:', error);
      throw error;
    }
  }

  /**
   * Mapuje wiele leków jednocześnie (batch processing)
   */
  public async mapMultipleDrugs(drugNames: string[]): Promise<DrugMappingResult[]> {
    const results: DrugMappingResult[] = [];
    
    // Przetwarzaj po 5 leków jednocześnie, żeby nie przeciążyć serwera
    const batchSize = 5;
    for (let i = 0; i < drugNames.length; i += batchSize) {
      const batch = drugNames.slice(i, i + batchSize);
      const batchPromises = batch.map(drugName => this.mapDrugToStandard(drugName));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        // Dodaj puste wyniki dla nieudanych mapowań
        batch.forEach(drugName => {
          results.push({
            found: false,
            standardName: drugName,
            activeSubstance: '',
            atcCode: '',
            alternatives: [],
            confidence: 0,
            details: []
          });
        });
      }
      
      // Krótka pauza między batches
      if (i + batchSize < drugNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Wyszukuje leki z filtrowaniem po klasie ATC
   */
  public async searchDrugsByAtcClass(atcClass: string): Promise<DrugRecord[]> {
    try {
      // Najpierw pobierz wszystkie leki przeciwdepresyjne
      const antidepressants = await this.getAntidepressants();
      
      // Filtruj po klasie ATC
      return antidepressants.filter(drug => 
        drug.atcCode.startsWith(atcClass.toUpperCase())
      );
    } catch (error) {
      console.error('Error searching drugs by ATC class:', error);
      throw error;
    }
  }

  /**
   * Pobiera sugestie leków na podstawie częściowej nazwy
   */
  public async getDrugSuggestions(partialName: string, limit: number = 10): Promise<string[]> {
    try {
      if (partialName.length < 2) return [];
      
      const searchResult = await this.searchDrugs(partialName);
      
      const suggestions = new Set<string>();
      
      // Dodaj dokładne dopasowania
      searchResult.exactMatches.forEach(drug => {
        suggestions.add(drug.productName);
        if (drug.commonName) suggestions.add(drug.commonName);
      });
      
      // Dodaj częściowe dopasowania
      searchResult.partialMatches.forEach(drug => {
        suggestions.add(drug.productName);
        if (drug.commonName) suggestions.add(drug.commonName);
      });
      
      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Error getting drug suggestions:', error);
      return [];
    }
  }
}

// Singleton instance
export const drugMappingClient = new DrugMappingClient();
export default drugMappingClient; 