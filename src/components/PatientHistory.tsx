import React from 'react';
import { History, Trash2, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { PatientHistoryEntry } from '../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PatientHistoryProps {
  history: PatientHistoryEntry[];
  onClearHistory: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  history,
  onClearHistory,
  onSelectPatient,
}) => {
  const getStatusIcon = (conclusion: string) => {
    if (conclusion.includes('nie kwalifikuje')) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    } else if (conclusion.includes('kwalifikuje')) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    return <HelpCircle className="w-5 h-5 text-yellow-500" />;
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Brak przeanalizowanych pacjentów w historii</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <History className="w-6 h-6 text-sky-600" />
          Historia Analiz
        </h2>
        <button
          onClick={onClearHistory}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Wyczyść historię
        </button>
      </div>
      <div className="grid gap-4">
        {history.map((entry) => (
          <button
            key={`${entry.id}-${entry.analyzedAt}`}
            onClick={() => onSelectPatient(entry.id)}
            className="w-full text-left bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(entry.reportConclusion.overallQualification)}
                  <h3 className="font-semibold text-slate-800">{entry.summary.id}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {entry.summary.mainDiagnosis}
                </p>
                <p className="text-xs text-slate-500">
                  Przeanalizowano: {format(new Date(entry.analyzedAt), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">
                  Wiek: {entry.summary.age} lat
                </div>
                <div className="text-sm mt-1">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    entry.reportConclusion.estimatedProbability >= 70
                      ? 'bg-green-100 text-green-800'
                      : entry.reportConclusion.estimatedProbability >= 40
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.reportConclusion.estimatedProbability}% szans
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};