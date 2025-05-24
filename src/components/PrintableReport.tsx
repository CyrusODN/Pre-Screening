import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Info } from 'lucide-react';
import type { PatientData, Criterion } from '../types';

interface PrintableReportProps {
  patientProfile: PatientData;
  dynamicConclusion: {
    overallQualification: string;
    estimatedProbability: number;
    mainIssues: string[];
    criticalInfoNeeded: string[];
  };
}

const getEffectiveStatus = (criterion: Criterion) => criterion.userStatus || criterion.status;

const getStatusIcon = (status: string | null | undefined) => {
  const className = "inline-block mr-2 h-4 w-4";
  if (status?.endsWith('_manual')) {
    if (status.startsWith('spełnione')) return <CheckCircle2 className={className} />;
    if (status.startsWith('niespełnione')) return <XCircle className={className} />;
    return <HelpCircle className={className} />;
  }
  switch (status) {
    case 'spełnione': case 'prawdopodobnie OK': return <CheckCircle2 className={className} />;
    case 'niespełnione': case 'potencjalne wykluczenie': case 'problem/weryfikacja': return <XCircle className={className} />;
    case 'weryfikacja': case 'prawdopodobnie spełnione': case 'potencjalnie niespełnione/weryfikacja': return <HelpCircle className={className} />;
    default: return <Info className={className} />;
  }
};

const getStatusColor = (status: string | null | undefined) => {
  if (status?.endsWith('_manual')) return 'text-blue-600';
  switch (status) {
    case 'spełnione': case 'prawdopodobnie OK': return 'text-green-600';
    case 'niespełnione': case 'potencjalne wykluczenie': case 'problem/weryfikacja': return 'text-red-600';
    case 'weryfikacja': case 'prawdopodobnie spełnione': case 'potencjalnie niespełnione/weryfikacja': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
};

const CriteriaSection: React.FC<{
  criteria: Criterion[];
  title: string;
  color: string;
}> = ({ criteria, title, color }) => {
  if (!criteria || criteria.length === 0) {
    return (
      <section className="mb-4">
        <h2 className={`text-xl font-bold mb-2 ${color}`}>{title}</h2>
        <p className="text-gray-600">Brak danych kryteriów.</p>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <h2 className={`text-xl font-bold mb-2 ${color}`}>{title}</h2>
      <div className="space-y-2">
        {criteria.map((criterion) => {
          const effectiveStatus = getEffectiveStatus(criterion);
          return (
            <div key={criterion.id} className="border-l-4 border-gray-200 pl-3 py-1">
              <div className={`font-semibold ${getStatusColor(effectiveStatus)} flex items-center`}>
                {getStatusIcon(effectiveStatus)}
                <span>{criterion.id}: {criterion.name}</span>
                {criterion.userStatus && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                    Zmienione przez badacza
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 ml-6 mt-1">{criterion.details}</p>
              {criterion.userComment && (
                <div className="mt-1 ml-6 p-2 border-l-4 border-blue-300 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    Komentarz Badacza ({criterion.userOverrideTimestamp ? 
                      new Date(criterion.userOverrideTimestamp).toLocaleDateString('pl-PL') : 
                      'Brak daty'}):
                  </p>
                  <p className="text-sm text-blue-800">{criterion.userComment}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const PrintableReport: React.FC<PrintableReportProps> = ({ 
  patientProfile, 
  dynamicConclusion 
}) => {
  const modelDisplayName = patientProfile.modelUsed === 'gemini' ?
    'Gemini 2.5 Pro Preview 05-06' : 
    patientProfile.modelUsed === 'claude-opus' ? 'Claude 4 Opus' :
    patientProfile.modelUsed?.toUpperCase() || 'Nieznany';

  return (
    <div className="print-report bg-white text-black p-4 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-4 text-center border-b-2 border-gray-200 pb-3">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          Raport Pre-screeningowy Pacjenta
        </h1>
        <p className="text-lg text-gray-600">
          Analiza Kwalifikacji do Badania Klinicznego
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Model AI: {modelDisplayName} | 
          Wygenerowano: {new Date().toLocaleString('pl-PL', { 
            dateStyle: 'long', 
            timeStyle: 'short' 
          })}
        </p>
        {patientProfile.isMockData && (
          <div className="mt-1 p-2 bg-yellow-100 text-yellow-800 rounded inline-block">
            <AlertTriangle size={16} className="inline-block mr-1" />
            Używane są dane testowe
          </div>
        )}
      </header>

      {/* Patient Information */}
      <section className="mb-4">
        <h2 className="text-2xl font-bold mb-2 text-blue-700">Dane Pacjenta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
          <div>
            <p><strong>ID Pacjenta:</strong> {patientProfile.summary?.id || 'Brak ID'}</p>
            <p><strong>Wiek:</strong> {patientProfile.summary?.age || 'N/A'} lat</p>
          </div>
          <div>
            <p><strong>Główna diagnoza:</strong> {patientProfile.summary?.mainDiagnosis || 'N/A'}</p>
          </div>
          <div className="md:col-span-2">
            <p><strong>Choroby współistniejące:</strong></p>
            <ul className="list-disc list-inside ml-4 mt-1">
              {(patientProfile.summary?.comorbidities || []).map((com, idx) => (
                <li key={idx}>{com}</li>
              ))}
              {(patientProfile.summary?.comorbidities || []).length === 0 && (
                <li>Brak</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Episode Estimation */}
      {patientProfile.episodeEstimation && (
        <section className="mb-4">
          <h2 className="text-2xl font-bold mb-2 text-blue-700">
            Szacowanie Początku Obecnego Epizodu Depresyjnego
          </h2>
          <div className="space-y-2">
            {(patientProfile.episodeEstimation.scenarios || []).map(sc => (
              <div key={sc.id} className="p-2 border border-gray-200 rounded bg-gray-50">
                <p><strong>Scenariusz {sc.id}:</strong> {sc.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  <em>Przesłanki:</em> {sc.evidence}
                </p>
              </div>
            ))}
            <div className="mt-2 p-2 border-t-2 border-gray-300 bg-blue-50">
              <p><strong>Wnioski dotyczące początku epizodu dla celów badania:</strong></p>
              <p className="mt-1">{patientProfile.episodeEstimation.conclusion || 'Brak wniosków.'}</p>
            </div>
          </div>
        </section>
      )}

      {/* TRD Analysis */}
      {patientProfile.trdAnalysis && (
        <section className="mb-4">
          <h2 className="text-2xl font-bold mb-2 text-blue-700">
            Analiza TRD (Kryterium IC6) - Podsumowanie
          </h2>
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-semibold">
              {patientProfile.trdAnalysis.conclusion || 'Brak podsumowania analizy TRD.'}
            </p>
          </div>
          
          {/* Pharmacotherapy Timeline */}
          {patientProfile.trdAnalysis.pharmacotherapy && 
           patientProfile.trdAnalysis.pharmacotherapy.length > 0 && (
            <div className="mt-2">
              <h3 className="text-lg font-semibold mb-2">Oś czasu farmakoterapii:</h3>
              <div className="space-y-1">
                {patientProfile.trdAnalysis.pharmacotherapy.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-200 pl-3 py-1">
                    <p className="font-medium">{item.drugName} ({item.dose})</p>
                    <p className="text-sm text-gray-600">
                      {item.startDate} - {item.endDate || 'trwa'} | 
                      Grupa próby: {item.attemptGroup}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-500 italic">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Criteria Sections */}
      <CriteriaSection
        criteria={patientProfile.inclusionCriteria || []}
        title="Kryteria Włączenia (IC)"
        color="text-green-700"
      />

      <CriteriaSection
        criteria={patientProfile.psychiatricExclusionCriteria || []}
        title="Psychiatryczne Kryteria Wyłączenia (EC)"
        color="text-red-700"
      />

      <CriteriaSection
        criteria={patientProfile.medicalExclusionCriteria || []}
        title="Ogólne Medyczne Kryteria Wyłączenia (GMEC)"
        color="text-red-700"
      />

      {/* Conclusion */}
      <section className="mb-4 border-2 border-blue-200 rounded p-4 bg-blue-50">
        <h2 className="text-2xl font-bold mb-2 text-blue-700">
          Wniosek Dotyczący Kwalifikacji
        </h2>
        
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold mb-1">Ogólna Kwalifikacja:</h3>
            <p className={`text-lg font-bold ${
              dynamicConclusion.overallQualification.toLowerCase().includes("nie kwalifikuje") ? 
                "text-red-600" : 
                dynamicConclusion.overallQualification.toLowerCase().includes("kwalifikuje") ? 
                  "text-green-600" : 
                  "text-yellow-600"
            }`}>
              {dynamicConclusion.overallQualification || 'Brak oceny kwalifikacji.'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-1">
              Szacowane Prawdopodobieństwo Kwalifikacji:
            </h3>
            <p className="text-2xl font-bold text-blue-700">
              {dynamicConclusion.estimatedProbability}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Prawdopodobieństwo uwzględnia modyfikacje badacza. 
              Ocena początkowa AI: {patientProfile.reportConclusion?.estimatedProbability || 0}%.
            </p>
          </div>

          {dynamicConclusion.mainIssues && dynamicConclusion.mainIssues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-1">Główne Problemy / Potencjalne Przeszkody:</h3>
              <ul className="list-disc list-inside space-y-1">
                {dynamicConclusion.mainIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {dynamicConclusion.criticalInfoNeeded && dynamicConclusion.criticalInfoNeeded.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Krytyczne Informacje do Uzyskania/Weryfikacji:
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {dynamicConclusion.criticalInfoNeeded.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 border-t-2 border-gray-200 pt-2">
        <p>&copy; {new Date().getFullYear()} Aplikacja Raportów Pre-screeningowych</p>
        <p>Ten raport został wygenerowany automatycznie na podstawie danych medycznych pacjenta</p>
      </footer>
    </div>
  );
}; 