// src/components/EnteringScreen.tsx
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, History, BrainCircuit, PlayCircle, Network, Zap } from 'lucide-react'; // Added Network, Zap
import { PatientHistory } from './PatientHistory';
import { ProtocolSelector } from './ProtocolSelector';
import { getHistory, clearHistory } from '../services/patientHistory';
import { isMultiAgentAvailable } from '../services/multiAgentService';
import type { Protocol, SupportedAIModel } from '../types';

interface EnteringScreenProps {
  onDataSubmit: (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => void;
  onSelectHistoricalPatient: (patientId: string) => void;
  onLoadDemo?: () => void; // Nowa prop dla trybu demo
  selectedAIModel: SupportedAIModel;
  onAIModelChange: (model: SupportedAIModel) => void;
  isMultiAgentMode: boolean;
  onMultiAgentModeChange: (enabled: boolean) => void;
}

export const EnteringScreen: React.FC<EnteringScreenProps> = ({ 
    onDataSubmit, 
    onSelectHistoricalPatient,
    onLoadDemo,
    selectedAIModel,
    onAIModelChange,
    isMultiAgentMode,
    onMultiAgentModeChange
}) => {
  const [protocol, setProtocol] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [protocolFile, setProtocolFile] = useState<File | null>(null);
  const [medicalHistoryFile, setMedicalHistoryFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showCustomProtocol, setShowCustomProtocol] = useState(false);

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
    setShowCustomProtocol(false); 
  };
  
  const handleClearHistory = () => {
    clearHistory();
    setShowHistory(false); 
  };


  return (
    <div className="min-h-screen bg-gradient-theme-light py-8 px-3 sm:px-4 lg:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Interaktywny Raport Pre-screeningowy
          </h1>
          <p className="text-lg text-gray-600">
            Wprowadź dane do analizy kwalifikacji pacjenta
          </p>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* AI Model Selector */}
            <div className="flex items-center gap-2 card-remedy">
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
                className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all"
            >
              <option value="o3">o3 (OpenAI-like)</option>
              <option value="gemini">Gemini 2.5 Pro Preview 05-06</option>
                <option value="claude-opus">Claude 4 Opus</option>
            </select>
            </div>

            {/* Multi-Agent Mode Toggle */}
            <div className="flex items-center gap-2 card-remedy">
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
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCustomProtocol(!showCustomProtocol)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {showCustomProtocol ? 'Wybierz predefiniowany' : 'Własny protokół'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Ukryj historię' : 'Pokaż historię'}
            </button>
            {onLoadDemo && (
              <button
                onClick={onLoadDemo}
                className="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                title="Załaduj przykładowe dane z bogatą historią farmakoterapii"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Tryb Demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
            )}
          </div>
        </div>


        {showHistory ? (
          <div className="card-remedy mb-8">
             <PatientHistory
              history={getHistory()}
              onClearHistory={handleClearHistory}
              onSelectPatient={onSelectHistoricalPatient}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 mb-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 mr-2" size={16} />
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              </div>
            )}

            {showCustomProtocol ? (
              <div className="card-remedy space-y-4">
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Własny Protokół Badania
                  </label>
                  <div className="space-y-4">
                    <textarea
                      value={protocol}
                      onChange={(e) => {
                        setProtocol(e.target.value);
                        if (selectedProtocol) setSelectedProtocol(null); 
                      }}
                      className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none text-sm"
                      placeholder="Wprowadź lub wklej protokół badania (w formacie JSON lub tekstowym)..."
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <FileText size={16} />
                        <span className="font-medium text-sm">{protocolFile ? protocolFile.name : 'Nie wybrano pliku'}</span>
                      </div>
                      <label className="btn-primary cursor-pointer flex items-center gap-2">
                        <Upload size={16} />
                        <span>Wczytaj z pliku</span>
                        <input
                          type="file"
                          accept=".txt,.json,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'protocol');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ProtocolSelector
                selectedProtocol={selectedProtocol}
                onProtocolSelect={handleProtocolSelect}
              />
            )}

            <div className="card-remedy space-y-4">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-3">
                  Historia Choroby
                </label>
                <div className="space-y-4">
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none text-sm"
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
              <button type="submit" className="btn-primary text-lg px-8 py-3">
                Rozpocznij Analizę
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};