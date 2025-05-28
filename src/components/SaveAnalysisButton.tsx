// ============================================================================
// SAVE ANALYSIS BUTTON - Przycisk do zapisywania analizy
// ============================================================================

import React, { useState } from 'react';
import { Save, Check, AlertCircle, X } from 'lucide-react';
import { analysisHistoryService } from '../services/AnalysisHistoryService';
import type { PatientData } from '../types';

interface SaveAnalysisButtonProps {
  patientData: PatientData;
  medicalHistory?: string;
  studyProtocol?: string;
  isMultiAgentMode?: boolean;
  agentResults?: Record<string, any>;
  className?: string;
}

export const SaveAnalysisButton: React.FC<SaveAnalysisButtonProps> = ({
  patientData,
  medicalHistory = '',
  studyProtocol = '',
  isMultiAgentMode = false,
  agentResults = {},
  className = ''
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const generateDefaultName = () => {
    const patientId = patientData.summary?.id || 'BrakID';
    const date = new Date().toLocaleDateString('pl-PL');
    const time = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const mode = isMultiAgentMode ? 'Wieloagentowa' : 'Klasyczna';
    return `${patientId} - ${mode} - ${date} ${time}`;
  };

  const handleSaveClick = () => {
    setAnalysisName(generateDefaultName());
    setShowNameDialog(true);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (!analysisName.trim()) {
      setErrorMessage('Nazwa analizy nie może być pusta');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      let analysisId: string;

      if (isMultiAgentMode) {
        analysisId = await analysisHistoryService.saveMultiAgentAnalysis(
          patientData,
          agentResults,
          medicalHistory,
          studyProtocol
        );
      } else {
        analysisId = await analysisHistoryService.saveSingleAgentAnalysis(
          patientData,
          medicalHistory,
          studyProtocol
        );
      }

      // Aktualizuj metadane z niestandardową nazwą
      await analysisHistoryService.updateAnalysisMetadata(analysisId, {
        notes: analysisName,
        tags: [...(patientData.summary?.comorbidities || []), isMultiAgentMode ? 'multi-agent' : 'single-agent']
      });

      setSaveStatus('success');
      setShowNameDialog(false);
      
      // Pokaż sukces przez 3 sekundy
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

      console.log(`✅ Analiza zapisana pomyślnie: ${analysisId} jako "${analysisName}"`);

    } catch (error) {
      console.error('❌ Błąd podczas zapisywania analizy:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Nieznany błąd podczas zapisywania');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowNameDialog(false);
    setAnalysisName('');
    setErrorMessage('');
    setSaveStatus('idle');
  };

  if (saveStatus === 'success') {
    return (
      <button
        className={`btn-primary flex items-center gap-2 ${className}`}
        disabled
      >
        <Check size={16} className="text-green-500" />
        <span>Zapisano!</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleSaveClick}
        className={`btn-primary flex items-center gap-2 ${className}`}
        disabled={isSaving}
        title="Zapisz analizę do folderu History"
      >
        <Save size={16} />
        <span>Zapisz Analizę</span>
      </button>

      {/* Dialog do wprowadzenia nazwy */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Zapisz Analizę</h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nazwa analizy:
                  </label>
                  <input
                    type="text"
                    value={analysisName}
                    onChange={(e) => setAnalysisName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all"
                    placeholder="Wprowadź nazwę analizy..."
                    autoFocus
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p><strong>Pacjent:</strong> {patientData.summary?.id || 'Brak ID'}</p>
                  <p><strong>Tryb:</strong> {isMultiAgentMode ? 'Wieloagentowy' : 'Klasyczny'}</p>
                  <p><strong>Model:</strong> {patientData.modelUsed || 'Nieznany'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                  disabled={isSaving || !analysisName.trim()}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Zapisywanie...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Zapisz</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 