// src/components/EnteringScreen.tsx
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, History, BrainCircuit, PlayCircle, Network, Zap, FolderOpen } from 'lucide-react'; // Added FolderOpen
import { ProtocolSelector } from './ProtocolSelector';
import { Logo } from './Logo';
import { SavedAnalysesManager } from './SavedAnalysesManager'; // Nowy import
// import { StorageTestButton } from './StorageTestButton';
// Usunięto import starego systemu historii
import { isMultiAgentAvailable } from '../services/multiAgentService';
import type { Protocol, SupportedAIModel } from '../types';
import type { StoredAnalysis } from '../types/storage'; // Poprawny import

interface EnteringScreenProps {
  onDataSubmit: (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => void;
  onSelectHistoricalPatient: (patientId: string) => void;
  onLoadDemo?: () => void; // Nowa prop dla trybu demo
  selectedAIModel: SupportedAIModel;
  onAIModelChange: (model: SupportedAIModel) => void;
  isMultiAgentMode: boolean;
  onMultiAgentModeChange: (enabled: boolean) => void;
  // NEW: Specialist analysis props
  enableSpecialistAnalysis: boolean;
  onSpecialistAnalysisChange: (enabled: boolean) => void;
  onLoadSavedAnalysis?: (analysis: StoredAnalysis) => void; // Nowa prop dla ładowania zapisanych analiz
}

export const EnteringScreen: React.FC<EnteringScreenProps> = ({ 
    onDataSubmit, 
    onSelectHistoricalPatient,
    onLoadDemo,
    selectedAIModel,
    onAIModelChange,
    isMultiAgentMode,
    onMultiAgentModeChange,
    enableSpecialistAnalysis,
    onSpecialistAnalysisChange,
    onLoadSavedAnalysis
}) => {
  const [protocol, setProtocol] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<string>('');
  const [protocolFile, setProtocolFile] = useState<File | null>(null);
  const [medicalHistoryFile, setMedicalHistoryFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [showSavedAnalyses, setShowSavedAnalyses] = useState<boolean>(false);

  const handleFileUpload = async (file: File, type: 'protocol' | 'medicalHistory') => {
    try {
      const text = await file.text();
      if (type === 'protocol') {
        setProtocol(text);
        setProtocolFile(file);
        setSelectedProtocol(null); 
      } else {
        setMedicalHistory(text);
        setMedicalHistoryFile(file);
      }
      setError('');
    } catch (err) {
      setError('Błąd podczas wczytywania pliku. Upewnij się, że plik jest w formacie tekstowym.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const protocolText = selectedProtocol 
      ? JSON.stringify(selectedProtocol.criteria, null, 2) 
      : protocol;
      
    if (!protocolText || !medicalHistory) {
      setError('Proszę wprowadzić zarówno protokół (lub wybrać predefiniowany) jak i historię choroby.');
      return;
    }
    onDataSubmit({ protocol: protocolText, medicalHistory, selectedAIModel });
  };

  const handleProtocolSelect = (protocolObj: Protocol) => {
    setSelectedProtocol(protocolObj);
    setProtocol(''); 
    setProtocolFile(null); 
  };
  
  // Nowa funkcja do obsługi ładowania zapisanej analizy
  const handleLoadSavedAnalysis = (analysis: StoredAnalysis) => {
    if (onLoadSavedAnalysis) {
      onLoadSavedAnalysis(analysis);
      setShowSavedAnalyses(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-theme-light py-4 px-3 sm:px-4 lg:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          {/* Logo Header */}
          <div className="flex justify-center mb-4">
            <Logo 
              size="lg" 
              showText={false}
              className="hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Title Section */}
          <div className="text-center mb-4">
            <div className="bg-gradient-to-r from-remedy-light via-white to-remedy-secondary/10 rounded-xl p-4 shadow-lg border border-remedy-border/30">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-remedy-primary via-remedy-accent to-remedy-secondary bg-clip-text text-transparent mb-2">
                Remedius Pre-Screening system
              </h1>
              <p className="text-lg text-slate-700 font-medium">
                Wprowadź dane do analizy kwalifikacji pacjenta
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* AI Model Selector */}
            <div className="flex items-center gap-2 card-remedy py-2 px-3">
              <div className="icon-circle">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <label htmlFor="ai-model-select" className="text-sm font-medium text-gray-900">
              Model AI:
            </label>
            <select
              id="ai-model-select"
              value={selectedAIModel}
              onChange={(e) => onAIModelChange(e.target.value as SupportedAIModel)}
                className="p-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all"
            >
              <option value="o3">o3 (OpenAI-like)</option>
              <option value="gemini">Gemini 2.5 Pro Preview 05-06</option>
                <option value="claude-opus">Claude 4 Opus</option>
            </select>
            </div>

            {/* Multi-Agent Mode Toggle */}
            <div className="flex items-center gap-2 card-remedy py-2 px-3">
              <div className="icon-circle">
                <Network className="w-4 h-4" />
              </div>
              <label htmlFor="multi-agent-toggle" className="text-sm font-medium text-gray-900">
                Tryb wieloagentowy:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="multi-agent-toggle"
                  type="checkbox"
                  checked={isMultiAgentMode}
                  onChange={(e) => onMultiAgentModeChange(e.target.checked)}
                  disabled={!isMultiAgentAvailable()}
                  className="w-4 h-4 text-remedy-accent bg-gray-100 border-gray-300 rounded focus:ring-remedy-accent focus:ring-2 disabled:opacity-50"
                />
                <span className={`text-sm ${isMultiAgentMode ? 'text-remedy-accent font-medium' : 'text-gray-500'}`}>
                  {isMultiAgentMode ? 'Włączony' : 'Wyłączony'}
                </span>
                {!isMultiAgentAvailable() && (
                  <span className="text-xs text-red-500 ml-2">(Niedostępny)</span>
                )}
              </div>
            </div>

            {/* NEW: Specialist Analysis Toggle */}
            <div className="flex items-center gap-2 card-remedy py-2 px-3">
              <div className="icon-circle">
                <Zap className="w-4 h-4" />
              </div>
              <label htmlFor="specialist-analysis-toggle" className="text-sm font-medium text-gray-900">
                Analiza specjalistyczna:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="specialist-analysis-toggle"
                  type="checkbox"
                  checked={enableSpecialistAnalysis}
                  onChange={(e) => onSpecialistAnalysisChange(e.target.checked)}
                  disabled={isMultiAgentMode} // Disabled in multi-agent mode as it might have its own analysis
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
                />
                <span className={`text-sm ${enableSpecialistAnalysis ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                  {enableSpecialistAnalysis ? 'Włączona' : 'Wyłączona'}
                </span>
                {isMultiAgentMode && (
                  <span className="text-xs text-amber-600 ml-2">(Automatyczna w trybie wieloagentowym)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSavedAnalyses(!showSavedAnalyses)}
              className="btn-secondary flex items-center gap-2 text-sm px-3 py-1.5"
            >
              <FolderOpen className="w-4 h-4" />
              {showSavedAnalyses ? 'Ukryj zapisane analizy' : 'Pokaż zapisane analizy'}
            </button>
            {onLoadDemo && (
              <button
                onClick={onLoadDemo}
                className="btn-primary flex items-center gap-2 bg-gradient-to-r from-remedy-primary to-remedy-accent hover:from-remedy-accent hover:to-remedy-secondary shadow-lg hover:shadow-xl transition-all duration-300 text-sm px-3 py-1.5"
                title="Załaduj przykładowe dane z bogatą historią farmakoterapii"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Tryb Demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* NEW: Info about specialist analysis */}
        {enableSpecialistAnalysis && !isMultiAgentMode && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg mb-4">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-purple-900 mb-1">Analiza Specjalistyczna Włączona</h3>
                <p className="text-xs text-purple-700 leading-relaxed">
                  System przeprowadzi wieloetapową analizę obejmującą: detekcję wszystkich form leczenia (w tym ketaminy), 
                  profil gotowości psychodelicznej, połączenia kontekstowe oraz szczegółowy raport narracyjny. 
                  Analiza może potrwać dłużej, ale zapewni bardziej kompletne wyniki.
                </p>
              </div>
            </div>
          </div>
        )}

        {showSavedAnalyses ? (
          <div className="card-remedy mb-6">
            <SavedAnalysesManager
              onAnalysisSelect={handleLoadSavedAnalysis}
              onClose={() => setShowSavedAnalyses(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 mb-3 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 mr-2" size={16} />
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              </div>
            )}

            <ProtocolSelector
              selectedProtocol={selectedProtocol}
              onProtocolSelect={handleProtocolSelect}
            />

            <div className="card-remedy space-y-3">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  Historia Choroby
                </label>
                <div className="space-y-3">
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none text-sm"
                    placeholder="Wprowadź lub wklej historię choroby..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText size={16} />
                      <span className="font-medium text-sm">{medicalHistoryFile ? medicalHistoryFile.name : 'Nie wybrano pliku'}</span>
                    </div>
                    <label className="btn-primary cursor-pointer flex items-center gap-2">
                      <Upload size={16} />
                      <span>Wczytaj z pliku</span>
                      <input
                        type="file"
                        accept=".txt,.doc,.docx,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'medicalHistory');
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button type="submit" className="btn-primary text-base px-6 py-2">
                Rozpocznij Analizę
              </button>
            </div>
          </form>
        )}
        
        {/* Storage Test Button - tylko w trybie deweloperskim */}
        {/* {import.meta.env.DEV && (
          <div className="mt-6">
            <StorageTestButton />
          </div>
        )} */}
      </div>
    </div>
  );
};