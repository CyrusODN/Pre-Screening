// ============================================================================
// ANALYSIS HISTORY COMPONENT - Komponent do przeglądania historii analiz
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  AnalysisList, 
  AnalysisMetadata, 
  StoredAnalysis, 
  SearchOptions 
} from '../types/storage';
import { analysisHistoryService } from '../services/AnalysisHistoryService';

interface AnalysisHistoryProps {
  onAnalysisSelect?: (analysis: StoredAnalysis) => void;
  onClose?: () => void;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  onAnalysisSelect,
  onClose
}) => {
  const [analyses, setAnalyses] = useState<AnalysisMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'single-agent' | 'multi-agent'>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState<any>(null);

  const pageSize = 10;

  // Wczytaj analizy
  const loadAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const options: SearchOptions = {
        page: currentPage,
        pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (filterType !== 'all') {
        options.analysisType = filterType;
      }

      if (filterModel !== 'all') {
        options.modelUsed = filterModel;
      }

      let result: AnalysisList;
      
      if (searchQuery.trim()) {
        result = await analysisHistoryService.searchAnalyses(searchQuery, options);
      } else {
        result = await analysisHistoryService.getAnalysesList(options);
      }

      setAnalyses(result.analyses);
      setTotalPages(Math.ceil(result.total / pageSize));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas wczytywania analiz');
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Wczytaj statystyki
  const loadStatistics = async () => {
    try {
      const stats = await analysisHistoryService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  // Wczytaj dane przy pierwszym renderze i zmianie filtrów
  useEffect(() => {
    loadAnalyses();
  }, [currentPage, filterType, filterModel, searchQuery]);

  useEffect(() => {
    loadStatistics();
  }, []);

  // Obsługa wyszukiwania
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Obsługa wyboru analizy
  const handleAnalysisClick = async (metadata: AnalysisMetadata) => {
    if (!onAnalysisSelect) return;

    try {
      const fullAnalysis = await analysisHistoryService.loadAnalysis(metadata.id);
      if (fullAnalysis) {
        onAnalysisSelect(fullAnalysis);
      }
    } catch (err) {
      setError(`Błąd podczas wczytywania analizy: ${err}`);
    }
  };

  // Obsługa usuwania analizy
  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę analizę?')) return;

    try {
      await analysisHistoryService.deleteAnalysis(id);
      loadAnalyses(); // Odśwież listę
      loadStatistics(); // Odśwież statystyki
    } catch (err) {
      setError(`Błąd podczas usuwania analizy: ${err}`);
    }
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pl-PL');
  };

  // Formatowanie rozmiaru pliku
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Historia Analiz</h2>
            {statistics && (
              <p className="text-sm text-gray-600 mt-1">
                Łącznie: {statistics.total} analiz | 
                Rozmiar: {formatFileSize(statistics.storageSize)} | 
                Ostatnie 7 dni: {statistics.recentCount}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          )}
        </div>

        {/* Filtry i wyszukiwanie */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Wyszukiwanie */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Szukaj po ID pacjenta, typie analizy, modelu..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtr typu */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Wszystkie typy</option>
              <option value="single-agent">Klasyczne</option>
              <option value="multi-agent">Wieloagentowe</option>
            </select>

            {/* Filtr modelu */}
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Wszystkie modele</option>
              <option value="o3">O3</option>
              <option value="gemini">Gemini</option>
              <option value="claude-opus">Claude Opus</option>
            </select>

            {/* Przycisk odświeżania */}
            <button
              onClick={loadAnalyses}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ładowanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Lista analiz */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Ładowanie analiz...</div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">
                {searchQuery ? 'Nie znaleziono analiz spełniających kryteria' : 'Brak zapisanych analiz'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAnalysisClick(analysis)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {analysis.patientId}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          analysis.analysisType === 'multi-agent' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.analysisType === 'multi-agent' ? 'Wieloagentowa' : 'Klasyczna'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          analysis.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : analysis.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {analysis.status === 'completed' ? 'Ukończona' : 
                           analysis.status === 'failed' ? 'Nieudana' : 'W trakcie'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {analysis.modelUsed}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {analysis.notes || 'Brak notatek'}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Utworzona: {formatDate(analysis.createdAt)}</span>
                        {analysis.updatedAt !== analysis.createdAt && (
                          <span>Zaktualizowana: {formatDate(analysis.updatedAt)}</span>
                        )}
                        <span>Wersja: {analysis.version}</span>
                      </div>
                      
                      {analysis.tags && analysis.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {analysis.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnalysis(analysis.id);
                        }}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginacja */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              Strona {currentPage} z {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Poprzednia
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Następna
              </button>
            </div>
          </div>
        )}

        {/* Statystyki w stopce */}
        {statistics && (
          <div className="p-4 border-t bg-gray-50 text-xs text-gray-600">
            <div className="flex flex-wrap gap-4">
              <span>Typy: {Object.entries(statistics.byType).map(([type, count]) => `${type}: ${count}`).join(', ')}</span>
              <span>Modele: {Object.entries(statistics.byModel).map(([model, count]) => `${model}: ${count}`).join(', ')}</span>
              <span>Status: {Object.entries(statistics.byStatus).map(([status, count]) => `${status}: ${count}`).join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 