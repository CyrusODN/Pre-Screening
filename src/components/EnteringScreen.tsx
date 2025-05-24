// src/components/EnteringScreen.tsx
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, History, BrainCircuit, PlayCircle } from 'lucide-react'; // Added PlayCircle
import { PatientHistory } from './PatientHistory';
import { ProtocolSelector } from './ProtocolSelector';
import { getHistory, clearHistory } from '../services/patientHistory';
import type { Protocol, SupportedAIModel } from '../types';

interface EnteringScreenProps {
  onDataSubmit: (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => void;
  onSelectHistoricalPatient: (patientId: string) => void;
  selectedAIModel: SupportedAIModel;
  onAIModelChange: (model: SupportedAIModel) => void;
}

export const EnteringScreen: React.FC<EnteringScreenProps> = ({ 
    onDataSubmit, 
    onSelectHistoricalPatient,
    selectedAIModel,
    onAIModelChange
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
    <div className="min-h-screen bg-gradient-theme-light py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-20">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Interaktywny Raport Pre-screeningowy
          </h1>
          <p className="text-xl text-gray-600">
            Wprowadź dane do analizy kwalifikacji pacjenta
          </p>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3 card-remedy">
            <div className="icon-circle">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <label htmlFor="ai-model-select" className="text-base font-medium text-gray-900">
              Model AI:
            </label>
            <select
              id="ai-model-select"
              value={selectedAIModel}
              onChange={(e) => onAIModelChange(e.target.value as SupportedAIModel)}
              className="p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all"
            >
              <option value="o3">o3 (OpenAI-like)</option>
              <option value="gemini">Gemini 2.5 Pro Preview 05-06</option>
              <option value="claude-opus">Claude 4 Opus</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCustomProtocol(!showCustomProtocol)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {showCustomProtocol ? 'Wybierz predefiniowany' : 'Własny protokół'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary flex items-center gap-2"
            >
              <History className="w-5 h-5" />
              {showHistory ? 'Ukryj historię' : 'Pokaż historię'}
            </button>
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
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 p-6 mb-6 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 mr-3" size={20} />
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            {showCustomProtocol ? (
              <div className="card-remedy space-y-6">
                <div>
                  <label className="block text-2xl font-bold text-gray-900 mb-4">
                    Własny Protokół Badania
                  </label>
                  <div className="space-y-6">
                    <textarea
                      value={protocol}
                      onChange={(e) => {
                        setProtocol(e.target.value);
                        if (selectedProtocol) setSelectedProtocol(null); 
                      }}
                      className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none"
                      placeholder="Wprowadź lub wklej protokół badania (w formacie JSON lub tekstowym)..."
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-gray-600">
                        <FileText size={20} />
                        <span className="font-medium">{protocolFile ? protocolFile.name : 'Nie wybrano pliku'}</span>
                      </div>
                      <label className="btn-primary cursor-pointer flex items-center gap-2">
                        <Upload size={18} />
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

            <div className="card-remedy space-y-6">
              <div>
                <label className="block text-2xl font-bold text-gray-900 mb-4">
                  Historia Choroby
                </label>
                <div className="space-y-6">
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none"
                    placeholder="Wprowadź lub wklej historię choroby..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <FileText size={20} />
                      <span className="font-medium">{medicalHistoryFile ? medicalHistoryFile.name : 'Nie wybrano pliku'}</span>
                    </div>
                    <label className="btn-primary cursor-pointer flex items-center gap-2">
                      <Upload size={18} />
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

            <div className="flex justify-center pt-8">
              <button
                type="submit"
                className="btn-primary px-12 py-4 text-xl font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-shadow duration-200"
              >
                <PlayCircle size={24} />
                Rozpocznij Analizę
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};