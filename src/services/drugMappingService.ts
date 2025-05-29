import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface DrugRecord {
  id: string;
  productName: string;
  commonName: string;
  strength: string;
  atcCode: string;
  activeSubstance: string;
  pharmaceuticalForm: string;
  routeOfAdministration: string;
}

export interface DrugSearchResult {
  exactMatches: DrugRecord[];
  partialMatches: DrugRecord[];
  substanceMatches: DrugRecord[];
  confidence: number;
  searchTerm: string;
}

export interface DrugMappingResult {
  found: boolean;
  standardName: string;
  activeSubstance: string;
  atcCode: string;
  alternatives: string[];
  confidence: number;
  details: DrugRecord[];
}

interface CSVRecord {
  'Identyfikator Produktu Leczniczego': string;
  'Nazwa Produktu Leczniczego': string;
  'Nazwa powszechnie stosowana': string;
  'Rodzaj preparatu': string;
  'Moc': string;
  'Kod ATC': string;
  'Substancja czynna': string;
  'Postać farmaceutyczna': string;
  'Droga podania - Gatunek - Tkanka - Okres karencji': string;
}

class DrugMappingService {
  private drugDatabase: DrugRecord[] = [];
  private isInitialized = false;
  private csvFilePath: string;

  constructor() {
    this.csvFilePath = path.join(process.cwd(), 'Rejestr_Produktow_Leczniczych_calosciowy_stan_na_dzien_20250527.csv');
  }

  /**
   * Inicjalizuje bazę danych leków z pliku CSV
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Inicjalizacja bazy danych leków...');
      
      if (!fs.existsSync(this.csvFilePath)) {
        throw new Error(`Plik CSV nie został znaleziony: ${this.csvFilePath}`);
      }

      const csvContent = fs.readFileSync(this.csvFilePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        delimiter: ';',
        quote: '"',
        skip_empty_lines: true,
        relax_quotes: true
      }) as CSVRecord[];

      this.drugDatabase = records
        .filter((record: CSVRecord) => record['Rodzaj preparatu'] === 'Ludzki') // Tylko leki dla ludzi
        .map((record: CSVRecord) => ({
          id: record['Identyfikator Produktu Leczniczego'] || '',
          productName: record['Nazwa Produktu Leczniczego'] || '',
          commonName: record['Nazwa powszechnie stosowana'] || '',
          strength: record['Moc'] || '',
          atcCode: record['Kod ATC'] || '',
          activeSubstance: record['Substancja czynna'] || '',
          pharmaceuticalForm: record['Postać farmaceutyczna'] || '',
          routeOfAdministration: this.extractRouteOfAdministration(record['Droga podania - Gatunek - Tkanka - Okres karencji'] || '')
        }))
        .filter(drug => drug.productName && drug.activeSubstance); // Filtruj tylko kompletne rekordy

      this.isInitialized = true;
      console.log(`✅ Załadowano ${this.drugDatabase.length} rekordów leków`);
      
    } catch (error) {
      console.error('❌ Błąd podczas inicjalizacji bazy danych leków:', error);
      throw error;
    }
  }

  /**
   * Wyodrębnia drogę podania z pola zawierającego dodatkowe informacje
   */
  private extractRouteOfAdministration(routeField: string): string {
    if (!routeField) return '';
    
    // Wyciągnij pierwszą część przed pierwszym separatorem
    const parts = routeField.split(/[-–—]/);
    return parts[0]?.trim() || '';
  }

  /**
   * Normalizuje nazwę leku do wyszukiwania
   */
  private normalizeDrugName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Usuń znaki specjalne
      .replace(/\s+/g, ' ') // Usuń wielokrotne spacje
      .trim();
  }

  /**
   * Wyszukuje leki w bazie danych
   */
  public async searchDrugs(searchTerm: string): Promise<DrugSearchResult> {
    await this.initialize();

    const normalizedSearch = this.normalizeDrugName(searchTerm);
    const searchWords = normalizedSearch.split(' ').filter(word => word.length > 2);

    const exactMatches: DrugRecord[] = [];
    const partialMatches: DrugRecord[] = [];
    const substanceMatches: DrugRecord[] = [];

    for (const drug of this.drugDatabase) {
      const normalizedProductName = this.normalizeDrugName(drug.productName);
      const normalizedCommonName = this.normalizeDrugName(drug.commonName);
      const normalizedSubstance = this.normalizeDrugName(drug.activeSubstance);

      // Dokładne dopasowanie
      if (normalizedProductName === normalizedSearch || 
          normalizedCommonName === normalizedSearch) {
        exactMatches.push(drug);
        continue;
      }

      // Częściowe dopasowanie nazwy produktu lub nazwy powszechnej
      const productNameMatch = searchWords.some(word => 
        normalizedProductName.includes(word) || normalizedCommonName.includes(word)
      );
      
      if (productNameMatch) {
        partialMatches.push(drug);
        continue;
      }

      // Dopasowanie substancji czynnej
      const substanceMatch = searchWords.some(word => 
        normalizedSubstance.includes(word)
      );
      
      if (substanceMatch) {
        substanceMatches.push(drug);
      }
    }

    // Oblicz pewność
    let confidence = 0;
    if (exactMatches.length > 0) confidence = 0.95;
    else if (partialMatches.length > 0) confidence = 0.8;
    else if (substanceMatches.length > 0) confidence = 0.6;

    return {
      exactMatches: exactMatches.slice(0, 10), // Ogranicz wyniki
      partialMatches: partialMatches.slice(0, 10),
      substanceMatches: substanceMatches.slice(0, 10),
      confidence,
      searchTerm
    };
  }

  /**
   * Mapuje nazwę leku na standardową substancję czynną
   */
  public async mapDrugToStandard(drugName: string): Promise<DrugMappingResult> {
    const searchResult = await this.searchDrugs(drugName);
    
    if (searchResult.exactMatches.length > 0) {
      const primaryMatch = searchResult.exactMatches[0];
      const alternatives = searchResult.exactMatches
        .slice(1, 5)
        .map(drug => drug.productName);

      return {
        found: true,
        standardName: primaryMatch.commonName || primaryMatch.activeSubstance,
        activeSubstance: primaryMatch.activeSubstance,
        atcCode: primaryMatch.atcCode,
        alternatives,
        confidence: searchResult.confidence,
        details: searchResult.exactMatches.slice(0, 3)
      };
    }

    if (searchResult.partialMatches.length > 0) {
      const primaryMatch = searchResult.partialMatches[0];
      const alternatives = searchResult.partialMatches
        .slice(1, 5)
        .map(drug => drug.productName);

      return {
        found: true,
        standardName: primaryMatch.commonName || primaryMatch.activeSubstance,
        activeSubstance: primaryMatch.activeSubstance,
        atcCode: primaryMatch.atcCode,
        alternatives,
        confidence: searchResult.confidence,
        details: searchResult.partialMatches.slice(0, 3)
      };
    }

    if (searchResult.substanceMatches.length > 0) {
      const primaryMatch = searchResult.substanceMatches[0];
      const alternatives = searchResult.substanceMatches
        .slice(1, 5)
        .map(drug => drug.productName);

      return {
        found: true,
        standardName: primaryMatch.commonName || primaryMatch.activeSubstance,
        activeSubstance: primaryMatch.activeSubstance,
        atcCode: primaryMatch.atcCode,
        alternatives,
        confidence: searchResult.confidence,
        details: searchResult.substanceMatches.slice(0, 3)
      };
    }

    return {
      found: false,
      standardName: drugName,
      activeSubstance: '',
      atcCode: '',
      alternatives: [],
      confidence: 0,
      details: []
    };
  }

  /**
   * Pobiera statystyki bazy danych
   */
  public async getDatabaseStats(): Promise<{
    totalDrugs: number;
    uniqueSubstances: number;
    uniqueAtcCodes: number;
    topAtcClasses: Array<{atcCode: string; count: number}>;
  }> {
    await this.initialize();

    const uniqueSubstances = new Set(
      this.drugDatabase.map(drug => drug.activeSubstance).filter(Boolean)
    );

    const uniqueAtcCodes = new Set(
      this.drugDatabase.map(drug => drug.atcCode).filter(Boolean)
    );

    // Zlicz kody ATC
    const atcCounts = new Map<string, number>();
    this.drugDatabase.forEach(drug => {
      if (drug.atcCode) {
        const mainClass = drug.atcCode.substring(0, 3); // Pierwsze 3 znaki to główna klasa
        atcCounts.set(mainClass, (atcCounts.get(mainClass) || 0) + 1);
      }
    });

    const topAtcClasses = Array.from(atcCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([atcCode, count]) => ({ atcCode, count }));

    return {
      totalDrugs: this.drugDatabase.length,
      uniqueSubstances: uniqueSubstances.size,
      uniqueAtcCodes: uniqueAtcCodes.size,
      topAtcClasses
    };
  }

  /**
   * Wyszukuje leki przeciwdepresyjne (kody ATC N06A*)
   */
  public async getAntidepressants(): Promise<DrugRecord[]> {
    await this.initialize();

    return this.drugDatabase.filter(drug => 
      drug.atcCode.startsWith('N06A')
    );
  }

  /**
   * Pobiera WSZYSTKIE leki z bazy danych (nie tylko przeciwdepresyjne)
   * NOWA METODA: Skalowalne rozwiązanie dla mapowania wszystkich leków
   */
  public async getAllDrugs(): Promise<DrugRecord[]> {
    await this.initialize();

    return this.drugDatabase; // Zwróć wszystkie leki z polskiego rejestru
  }

  /**
   * Sprawdza czy lek jest przeciwdepresyjny
   */
  public async isAntidepressant(drugName: string): Promise<boolean> {
    const mapping = await this.mapDrugToStandard(drugName);
    return mapping.found && mapping.atcCode.startsWith('N06A');
  }
}

// Singleton instance
export const drugMappingService = new DrugMappingService();
export default drugMappingService; 