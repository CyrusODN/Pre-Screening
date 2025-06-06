// src/components/EnteringScreen.tsx
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, History, BrainCircuit, PlayCircle, Zap, FolderOpen, XCircle } from 'lucide-react';
import { ProtocolSelector } from './ProtocolSelector';
import { Logo } from './Logo';
import { SavedAnalysesManager } from './SavedAnalysesManager';
import type { Protocol, SupportedAIModel } from '../types';
import type { StoredAnalysis } from '../types/storage';

interface EnteringScreenProps {
  onDataSubmit: (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => void;
  onSelectHistoricalPatient: (patientId: string) => void;
  onLoadDemo?: () => void;
  selectedAIModel: SupportedAIModel;
  onAIModelChange: (model: SupportedAIModel) => void;
  enableSpecialistAnalysis: boolean;
  onSpecialistAnalysisChange: (enabled: boolean) => void;
  onLoadSavedAnalysis?: (analysis: StoredAnalysis) => void;
  onPdfUpload?: () => void;
  anonymizedPdfData?: {
    texts: string[];
    sessionIds: string[];
    combinedText: string;
    fileCount: number;
  } | null;
  onClearAnonymizedData?: () => void;
}

export const EnteringScreen: React.FC<EnteringScreenProps> = ({ 
    onDataSubmit, 
    onSelectHistoricalPatient,
    onLoadDemo,
    selectedAIModel,
    onAIModelChange,
    enableSpecialistAnalysis,
    onSpecialistAnalysisChange,
    onLoadSavedAnalysis,
    onPdfUpload,
    anonymizedPdfData,
    onClearAnonymizedData
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
      
    // Użyj zanonimizowanych danych jeśli są dostępne, inaczej sprawdź formularz
    const historyToUse = anonymizedPdfData ? anonymizedPdfData.combinedText : medicalHistory;
      
    if (!protocolText || !historyToUse) {
      setError('Proszę wprowadzić zarówno protokół (lub wybrać predefiniowany) jak i historię choroby (lub załadować PDF).');
      return;
    }
    
    onDataSubmit({ protocol: protocolText, medicalHistory: historyToUse, selectedAIModel });
  };

  const handleProtocolSelect = (protocolObj: Protocol) => {
    setSelectedProtocol(protocolObj);
    setProtocol(''); 
    setProtocolFile(null); 
  };
  
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

            {/* Specialist Analysis Toggle */}
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
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className={`text-sm ${enableSpecialistAnalysis ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                  {enableSpecialistAnalysis ? 'Włączona' : 'Wyłączona'}
                </span>
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

            {/* Informacja o załadowanych zanonimizowanych danych */}
            {anonymizedPdfData && (
              <div className="card-remedy">
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-green-900">
                          ✅ Zanonimizowane dane PDF gotowe do analizy
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>
                            📄 <strong>{anonymizedPdfData.fileCount} plików PDF</strong> zostało pomyślnie zanonimizowanych
                          </p>
                          <p>
                            📊 <strong>{Math.round(anonymizedPdfData.combinedText.length / 1000)}k znaków</strong> tekstu przygotowanych do analizy
                          </p>
                          <p className="mt-1 font-medium">
                            💡 Wszystkie dane osobowe zostały zastąpione pseudonimami
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onClearAnonymizedData}
                      className="ml-4 text-green-600 hover:text-green-800"
                      title="Usuń załadowane dane i wróć do wprowadzania ręcznego"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card-remedy space-y-3">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  Historia Choroby
                </label>
                <div className="space-y-3">
                  <textarea
                    value={anonymizedPdfData ? '' : medicalHistory}
                    onChange={(e) => {
                      if (!anonymizedPdfData) {
                        setMedicalHistory(e.target.value);
                      }
                    }}
                    disabled={!!anonymizedPdfData}
                    className={`w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none text-sm ${
                      anonymizedPdfData ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                    placeholder={
                      anonymizedPdfData 
                        ? `✅ Załadowane ${anonymizedPdfData.fileCount} plików PDF (${Math.round(anonymizedPdfData.combinedText.length / 1000)}k znaków zanonimizowanych)` 
                        : "Wprowadź lub wklej historię choroby..."
                    }
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText size={16} />
                      <span className="font-medium text-sm">
                        {anonymizedPdfData 
                          ? `📄 ${anonymizedPdfData.fileCount} plików PDF załadowanych` 
                          : (medicalHistoryFile ? medicalHistoryFile.name : 'Dane wprowadzane ręcznie lub z PDF')
                        }
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onPdfUpload) {
                            onPdfUpload();
                          }
                        }}
                        disabled={!!anonymizedPdfData}
                        className={`btn-primary flex items-center gap-2 text-sm ${
                          anonymizedPdfData ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={anonymizedPdfData ? 'Najpierw usuń załadowane dane żeby wgrać nowe' : 'Upload PDF'}
                      >
                        <FileText size={16} />
                        <span>Upload PDF</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* PDF Upload Info */}
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="text-sm text-blue-800">
                        <strong>Upload PDF:</strong> Automatycznie wykrywamy i anonimizujemy dane osobowe (imiona, PESEL, telefony, dokumenty tożsamości) przed analizą AI. 
                        Otrzymasz podgląd do weryfikacji.
                      </div>
                    </div>
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
      </div>
    </div>
  );
};