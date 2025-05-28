import React, { useState, useEffect } from 'react';
import { Search, Database, Pill, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import drugMappingClient, { type DrugDatabaseStats } from '../services/drugMappingClient';
import { classifyDrugForClinicalResearchEnhanced } from '../services/clinicalAnalysisService';
import type { DrugSearchResult, DrugMappingResult, DrugRecord } from '../services/drugMappingService';

export const DrugMappingDemo: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<DrugSearchResult | null>(null);
  const [mappingResult, setMappingResult] = useState<DrugMappingResult | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DrugDatabaseStats | null>(null);
  const [antidepressants, setAntidepressants] = useState<DrugRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'stats' | 'antidepressants'>('search');

  // Załaduj statystyki przy inicjalizacji
  useEffect(() => {
    loadStats();
    loadAntidepressants();
  }, []);

  const loadStats = async () => {
    try {
      const dbStats = await drugMappingClient.getDatabaseStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAntidepressants = async () => {
    try {
      const drugs = await drugMappingClient.getAntidepressants();
      setAntidepressants(drugs.slice(0, 50)); // Pokaż tylko pierwsze 50
    } catch (error) {
      console.error('Error loading antidepressants:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      // Wykonaj wszystkie trzy typy wyszukiwania
      const [searchRes, mappingRes, enhancedRes] = await Promise.all([
        drugMappingClient.searchDrugs(searchTerm),
        drugMappingClient.mapDrugToStandard(searchTerm),
        classifyDrugForClinicalResearchEnhanced(searchTerm)
      ]);

      setSearchResult(searchRes);
      setMappingResult(mappingRes);
      setEnhancedResult(enhancedRes);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle size={16} />;
    if (confidence >= 0.6) return <AlertCircle size={16} />;
    return <XCircle size={16} />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="card-remedy">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database size={24} className="text-remedy-primary" />
          System Mapowania Leków - Demo
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'search', label: 'Wyszukiwanie', icon: Search },
            { id: 'stats', label: 'Statystyki', icon: BarChart3 },
            { id: 'antidepressants', label: 'Leki Przeciwdepresyjne', icon: Pill }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === id
                  ? 'bg-remedy-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Wpisz nazwę leku (np. Duloxetine, Sertralina, Prozac...)"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchTerm.trim()}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                <Search size={16} />
                {isLoading ? 'Szukam...' : 'Szukaj'}
              </button>
            </div>

            {/* Results */}
            {mappingResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mapping Result */}
                <div className="card-remedy">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Pill size={18} className="text-remedy-accent" />
                    Wynik Mapowania
                  </h3>
                  
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 ${getConfidenceColor(mappingResult.confidence)}`}>
                      {getConfidenceIcon(mappingResult.confidence)}
                      <span className="font-medium">
                        {mappingResult.found ? 'Znaleziono' : 'Nie znaleziono'}
                      </span>
                      <span className="text-sm">({Math.round(mappingResult.confidence * 100)}%)</span>
                    </div>

                    {mappingResult.found && (
                      <>
                        <div>
                          <strong>Nazwa standardowa:</strong> {mappingResult.standardName}
                        </div>
                        <div>
                          <strong>Substancja czynna:</strong> {mappingResult.activeSubstance}
                        </div>
                        <div>
                          <strong>Kod ATC:</strong> {mappingResult.atcCode}
                        </div>
                        
                        {mappingResult.alternatives.length > 0 && (
                          <div>
                            <strong>Alternatywne nazwy:</strong>
                            <ul className="list-disc list-inside ml-4 text-sm text-gray-600">
                              {mappingResult.alternatives.map((alt, idx) => (
                                <li key={idx}>{alt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Enhanced Classification */}
                {enhancedResult && (
                  <div className="card-remedy">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle size={18} className="text-remedy-success" />
                      Klasyfikacja Kliniczna
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <strong>Klasa farmakologiczna:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-sm ${
                          enhancedResult.isAntidepressant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {enhancedResult.primaryClass}
                        </span>
                      </div>
                      
                      <div>
                        <strong>Lek przeciwdepresyjny:</strong> 
                        <span className={`ml-2 ${enhancedResult.isAntidepressant ? 'text-green-600' : 'text-red-600'}`}>
                          {enhancedResult.isAntidepressant ? 'Tak' : 'Nie'}
                        </span>
                      </div>

                      <div>
                        <strong>Mechanizm działania:</strong>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-600">
                          {enhancedResult.mechanism.map((mech: string, idx: number) => (
                            <li key={idx}>{mech}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={`flex items-center gap-2 ${getConfidenceColor(enhancedResult.confidence)}`}>
                        {getConfidenceIcon(enhancedResult.confidence)}
                        <span className="text-sm">
                          Pewność: {Math.round(enhancedResult.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Search Results */}
            {searchResult && (
              <div className="card-remedy">
                <h3 className="text-lg font-semibold mb-3">Szczegółowe Wyniki Wyszukiwania</h3>
                
                {['exactMatches', 'partialMatches', 'substanceMatches'].map((matchType) => {
                  const matches = searchResult[matchType as keyof DrugSearchResult] as DrugRecord[];
                  const titles = {
                    exactMatches: 'Dokładne dopasowania',
                    partialMatches: 'Częściowe dopasowania',
                    substanceMatches: 'Dopasowania substancji'
                  };
                  
                  if (matches.length === 0) return null;
                  
                  return (
                    <div key={matchType} className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {titles[matchType as keyof typeof titles]} ({matches.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {matches.slice(0, 6).map((drug, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border text-sm">
                            <div className="font-medium">{drug.productName}</div>
                            <div className="text-gray-600">{drug.activeSubstance}</div>
                            <div className="text-xs text-gray-500">
                              {drug.atcCode} • {drug.strength}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-remedy text-center">
                <div className="text-3xl font-bold text-remedy-primary">{stats.totalDrugs.toLocaleString()}</div>
                <div className="text-gray-600">Łączna liczba leków</div>
              </div>
              <div className="card-remedy text-center">
                <div className="text-3xl font-bold text-remedy-accent">{stats.uniqueSubstances.toLocaleString()}</div>
                <div className="text-gray-600">Unikalne substancje</div>
              </div>
              <div className="card-remedy text-center">
                <div className="text-3xl font-bold text-remedy-secondary">{stats.uniqueAtcCodes.toLocaleString()}</div>
                <div className="text-gray-600">Kody ATC</div>
              </div>
            </div>

            <div className="card-remedy">
              <h3 className="text-lg font-semibold mb-3">Top 10 Klas ATC</h3>
              <div className="space-y-2">
                {stats.topAtcClasses.map((atcClass, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{atcClass.atcCode}</span>
                    <span className="text-gray-600">{atcClass.count} leków</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Antidepressants Tab */}
        {activeTab === 'antidepressants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Leki Przeciwdepresyjne (pierwsze 50 z {antidepressants.length})
              </h3>
              <button
                onClick={loadAntidepressants}
                className="btn-secondary text-sm"
              >
                Odśwież
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {antidepressants.map((drug, idx) => (
                <div key={idx} className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="font-medium text-sm">{drug.productName}</div>
                  <div className="text-xs text-gray-600 mt-1">{drug.activeSubstance}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="bg-blue-100 text-blue-800 px-1 rounded">{drug.atcCode}</span>
                    {drug.strength && <span className="ml-2">{drug.strength}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 