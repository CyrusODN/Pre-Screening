// ============================================================================
// SAVED ANALYSES MANAGER - Zarządzanie zapisanymi analizami
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Search, Edit3, Trash2, Download, Eye, 
  Calendar, User, Brain, Tag, X, Check, AlertCircle,
  Filter, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { analysisHistoryService } from '../services/AnalysisHistoryService';
import type { AnalysisList, AnalysisMetadata, StoredAnalysis } from '../types/storage';

interface SavedAnalysesManagerProps {
  onAnalysisSelect?: (analysis: StoredAnalysis) => void;
  onClose?: () => void;
}

export const SavedAnalysesManager: React.FC<SavedAnalysesManagerProps> = ({
  onAnalysisSelect,
  onClose
}) => {
  const [analyses, setAnalyses] = useState<AnalysisMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Ładowanie analiz
  const loadAnalyses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options = {
        pageSize: 100,
        sortBy: sortBy === 'date' ? 'createdAt' as const : 
                sortBy === 'name' ? 'patientId' as const : 
                'createdAt' as const,
        sortOrder,
        ...(filterType !== 'all' && { analysisType: filterType as 'single-agent' | 'multi-agent' })
      };

      let result: AnalysisList;
      
      if (searchQuery.trim()) {
        result = await analysisHistoryService.searchAnalyses(searchQuery, options);
      } else {
        result = await analysisHistoryService.getAnalysesList(options);
      }

      setAnalyses(result.analyses);

      // Ładuj statystyki
      const stats = await analysisHistoryService.getStatistics();
      setStatistics(stats);

    } catch (err) {
      console.error('❌ Błąd podczas ładowania analiz:', err);
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania analiz');
    } finally {
      setLoading(false);
    }
  };

  // Efekt do ładowania danych
  useEffect(() => {
    loadAnalyses();
  }, [searchQuery, filterType, sortBy, sortOrder]);

  // Obsługa edycji nazwy
  const handleStartEdit = (analysis: AnalysisMetadata) => {
    setEditingId(analysis.id);
    setEditingName(analysis.notes || `Analiza ${analysis.id}`);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await analysisHistoryService.updateAnalysisMetadata(editingId, {
        notes: editingName.trim(),
        updatedAt: new Date().toISOString()
      });

      // Odśwież listę
      await loadAnalyses();
      
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error('❌ Błąd podczas zapisywania nazwy:', err);
      setError('Błąd podczas zapisywania nazwy');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Obsługa usuwania
  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę analizę?')) return;

    try {
      await analysisHistoryService.deleteAnalysis(id);
      await loadAnalyses();
    } catch (err) {
      console.error('❌ Błąd podczas usuwania analizy:', err);
      setError('Błąd podczas usuwania analizy');
    }
  };

  // Obsługa otwierania analizy
  const handleOpenAnalysis = async (metadata: AnalysisMetadata) => {
    try {
      const fullAnalysis = await analysisHistoryService.loadAnalysis(metadata.id);
      if (fullAnalysis && onAnalysisSelect) {
        onAnalysisSelect(fullAnalysis);
      }
    } catch (err) {
      console.error('❌ Błąd podczas ładowania analizy:', err);
      setError('Błąd podczas ładowania analizy');
    }
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatowanie rozmiaru pliku
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Unikalne typy analiz do filtrowania
  const analysisTypes = ['all', ...new Set(analyses.map(a => a.analysisType))];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-remedy-primary to-remedy-accent rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Zapisane Analizy</h2>
              {statistics && (
                <p className="text-sm text-gray-600">
                  Łącznie: {statistics.total} analiz • 
                  Rozmiar: {formatFileSize(statistics.storageSize)} • 
                  Ostatnie 7 dni: {statistics.recentCount}
                </p>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Filtry i wyszukiwanie */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Wyszukiwanie */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Szukaj analiz..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent"
                />
              </div>
            </div>

            {/* Filtr typu */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent"
              >
                {analysisTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'Wszystkie' : 
                     type === 'single-agent' ? 'Klasyczne' :
                     type === 'multi-agent' ? 'Wieloagentowe' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Sortowanie */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy as 'date' | 'name' | 'type');
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent"
              >
                <option value="date-desc">Najnowsze</option>
                <option value="date-asc">Najstarsze</option>
                <option value="name-asc">Nazwa A-Z</option>
                <option value="name-desc">Nazwa Z-A</option>
                <option value="type-asc">Typ A-Z</option>
              </select>
            </div>

            {/* Odśwież */}
            <button
              onClick={loadAnalyses}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Odśwież listę"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista analiz */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-remedy-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">Ładowanie analiz...</span>
              </div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zapisanych analiz</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Nie znaleziono analiz pasujących do wyszukiwania' : 'Zapisz pierwszą analizę, aby zobaczyć ją tutaj'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Nazwa analizy */}
                      <div className="flex items-center gap-2 mb-2">
                        {editingId === analysis.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Zapisz"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Anuluj"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-gray-900 flex-1">
                              {analysis.notes || `Analiza ${analysis.id}`}
                            </h3>
                            <button
                              onClick={() => handleStartEdit(analysis)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edytuj nazwę"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Metadane */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{analysis.patientId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          <span>{analysis.modelUsed}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(analysis.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            analysis.analysisType === 'multi-agent' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {analysis.analysisType === 'multi-agent' ? 'Wieloagentowa' : 'Klasyczna'}
                          </span>
                        </div>
                      </div>

                      {/* Tagi */}
                      {analysis.tags && analysis.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {analysis.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {analysis.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{analysis.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Akcje */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleOpenAnalysis(analysis)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Otwórz analizę"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(analysis.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Usuń analizę"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Wyświetlono {analyses.length} {searchQuery ? 'z wyników wyszukiwania' : 'analiz'}
            </span>
            {statistics && (
              <span>
                Typy: {Object.entries(statistics.byType).map(([type, count]) => 
                  `${type === 'single-agent' ? 'Klasyczne' : 'Wieloagentowe'}: ${count}`
                ).join(' • ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 