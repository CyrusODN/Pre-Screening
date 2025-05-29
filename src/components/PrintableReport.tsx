import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Info } from 'lucide-react';
import type { PatientData, Criterion } from '../types';
import { HistoricalContext } from './HistoricalContext';

interface PrintableReportProps {
  patientProfile: PatientData;
  dynamicConclusion: {
    overallQualification: string;
    estimatedProbability: number;
    mainIssues: string[];
    criticalInfoNeeded: string[];
    riskFactors?: string[];
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
        {/* Logo SVG - bez napisu */}
        <div className="flex justify-center mb-3">
          <svg 
            width="160" 
            height="40" 
            viewBox="0 0 5563 1373" 
            className="print:block"
            style={{ 
              printColorAdjust: 'exact',
              width: '160px',
              height: '40px',
              display: 'block'
            }}
          >
            <g transform="matrix(1,0,0,1,-5776,-4887)">
              <g transform="matrix(0.667511,0,0,0.164628,5776.11,4887.65)">
                <g transform="matrix(5.37388,0,0,21.7893,-1090.81,-17616.5)">
                  <g transform="matrix(0.24,0,0,0.24,201.685,799.993)">
                    <path d="M1176.72,647.641C1176.72,520.486 1071.36,433.997 962.572,433.997L508.093,433.997L508.093,501.548L962.572,501.548C1052.44,501.548 1108,568.887 1108,647.641C1108,726.396 1052.44,793.031 962.572,793.031L739.176,793.031L739.176,860.518L776.001,860.518L1049.64,1232.67L1128.38,1232.67L858.779,860.518L962.572,860.518C1071.36,860.518 1176.72,774.796 1176.72,647.641ZM2008.04,860.216L1940.37,860.216L1940.37,1232.67L2008.04,1232.67L2008.04,860.216ZM2680.33,434.531L2680.33,1232.67L2747.29,1232.67L2747.29,434.531L2680.33,434.531ZM1290.37,1165.14L1795.27,1165.14L1795.27,1232.67L1290.37,1232.67L1290.37,1165.14ZM2896.35,1165.14L3401.24,1165.14L3401.24,1232.67L2896.35,1232.67L2896.35,1165.14ZM4376.53,434.216L4294.35,434.216L4616.69,953.293L4618,1232.57L4690.89,1232.57L4689.89,952.251L4376.53,434.216ZM3863.28,434.531L3562.67,434.531L3562.67,501.428L3858.77,501.428C4082.51,501.428 4218.45,639.906 4218.45,833.951C4218.45,1028 4082.51,1165.05 3858.77,1165.05L3629.81,1165.05L3628.53,793.12L3562.67,793.12L3562.67,1232.57L3863.28,1232.57C4102.99,1232.57 4286.65,1073.66 4286.65,833.951C4286.65,594.239 4102.99,434.531 3863.28,434.531ZM4936.71,434.216L4688.72,837.117L4726.23,895.347L5013.63,434.216L4936.71,434.216ZM1940.37,793.12L2008.04,793.12L2008.04,541.222L2335.89,860.312L2355.88,860.312L2613.16,609.034L2613.16,513.295L2346.37,777.72L2008.04,434.531L1940.37,434.531L1940.37,793.12ZM1290.37,793.12L1763,793.12L1763,860.312L1290.37,860.312L1290.37,793.12ZM2896.35,793.12L3368.97,793.12L3368.97,860.312L2896.35,860.312L2896.35,793.12ZM1290.37,433.997L1795.27,433.997L1795.27,501.524L1290.37,501.524L1290.37,433.997ZM2896.35,433.997L3401.24,433.997L3401.24,501.524L2896.35,501.524L2896.35,433.997Z" style={{ fill: '#0d0d0d', fillRule: 'nonzero' }} />
                  </g>
                  <g transform="matrix(0.24,0,0,0.24,-147.422,-2001.1)">
                    <path d="M2028.91,12464.3L2028.91,12360.6L1961.38,12360.6L1961.38,12464.3L1857.65,12464.3L1857.65,12531.9L1961.38,12531.9L1961.38,12635.6L2028.91,12635.6L2028.91,12531.9L2132.65,12531.9L2132.65,12464.3L2028.91,12464.3Z" style={{ fill: '#3d97c5', fillRule: 'nonzero' }} />
                  </g>
                  <g transform="matrix(0.278775,0,0,0.278775,218.948,767.68)">
                    <path d="M4667.74,489.542L4627.92,489.542L4311.62,1177.11L4377.26,1177.11L4651.92,573.995L4888.16,1119.76L4647.83,1119.76L4631.24,1177.12L4979.54,1177.12L4979.53,1177.11L4984.04,1177.11L4667.74,489.542ZM5133.98,1177.11L5076.22,1177.11L5076.22,489.542L5133.98,489.542L5133.98,1177.11Z" style={{ fill: '#3d97c5', fillRule: 'nonzero' }} />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
        
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          Remedius Pre-Screening System
        </h1>
        <p className="text-base text-gray-600">
          Analiza Kwalifikacji do Badania Klinicznego
        </p>
        <p className="text-xs text-gray-500 mt-1">
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
      <section className="mb-2">
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
          {(dynamicConclusion.riskFactors && dynamicConclusion.riskFactors.length > 0) && (
            <div className="md:col-span-2">
              <p><strong>Czynniki ryzyka/społeczne:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1">
                {dynamicConclusion.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-orange-700">{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Conclusion - Moved here for faster analysis by researchers */}
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

      {/* Historical Context - Added for comprehensive analysis */}
      {patientProfile.historicalContext && (
        <HistoricalContext 
          data={patientProfile.historicalContext}
          variant="print"
        />
      )}

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

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 border-t-2 border-gray-200 pt-2">
        <p>&copy; {new Date().getFullYear()} Aplikacja Raportów Pre-screeningowych</p>
        <p>Ten raport został wygenerowany automatycznie na podstawie danych medycznych pacjenta</p>
      </footer>
    </div>
  );
}; 