import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, History } from 'lucide-react';
import { PatientHistory } from './PatientHistory';
import { ProtocolSelector } from './ProtocolSelector';
import { getHistory, clearHistory } from '../services/patientHistory';
import { Protocol } from '../types';
import { PREDEFINED_PROTOCOLS } from '../data/protocols';

interface EnteringScreenProps {
  onDataSubmit: (data: { protocol: string; medicalHistory: string }) => void;
  onSelectHistoricalPatient: (patientId: string) => void;
}

export const EnteringScreen: React.FC<EnteringScreenProps> = ({ onDataSubmit, onSelectHistoricalPatient }) => {
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
      setError('Proszę wprowadzić zarówno protokół jak i historię choroby.');
      return;
    }
    onDataSubmit({ protocol: protocolText, medicalHistory });
  };

  const handleProtocolSelect = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setProtocol('');
    setProtocolFile(null);
    setShowCustomProtocol(false);
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-sky-700 mb-4">
            Interaktywny Raport Pre-screeningowy
          </h1>
          <p className="text-lg text-slate-600">
            Wprowadź dane do analizy kwalifikacji pacjenta
          </p>
        </header>

        <div className="flex justify-end mb-6 gap-4">
          <button
            onClick={() => setShowCustomProtocol(!showCustomProtocol)}
            className="flex items-center gap-2 px-4 py-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
          >
            <FileText className="w-5 h-5" />
            {showCustomProtocol ? 'Wybierz predefiniowany' : 'Własny protokół'}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
          >
            <History className="w-5 h-5" />
            {showHistory ? 'Ukryj historię' : 'Pokaż historię'}
          </button>
        </div>

        {showHistory ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <PatientHistory
              history={getHistory()}
              onClearHistory={handleClearHistory}
              onSelectPatient={onSelectHistoricalPatient}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {showCustomProtocol ? (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-slate-700 mb-2">
                    Własny Protokół Badania
                  </label>
                  <div className="space-y-4">
                    <textarea
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="w-full h-48 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Wprowadź lub wklej protokół badania..."
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <FileText size={18} />
                        <span>{protocolFile ? protocolFile.name : 'Nie wybrano pliku'}</span>
                      </div>
                      <label className="btn-primary cursor-pointer flex items-center">
                        <Upload size={18} className="mr-2" />
                        <span>Wczytaj z pliku</span>
                        <input
                          type="file"
                          accept=".txt,.doc,.docx"
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

            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div>
                <label className="block text-lg font-semibold text-slate-700 mb-2">
                  Historia Choroby
                </label>
                <div className="space-y-4">
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full h-48 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Wprowadź lub wklej historię choroby..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <FileText size={18} />
                      <span>
                        {medicalHistoryFile ? medicalHistoryFile.name : 'Nie wybrano pliku'}
                      </span>
                    </div>
                    <label className="btn-primary cursor-pointer flex items-center">
                      <Upload size={18} className="mr-2" />
                      <span>Wczytaj z pliku</span>
                      <input
                        type="file"
                        accept=".txt,.doc,.docx"
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

            <div className="flex justify-center">
              <button
                type="submit"
                className="btn-primary px-8 py-3 text-lg flex items-center"
              >
                Rozpocznij Analizę
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};