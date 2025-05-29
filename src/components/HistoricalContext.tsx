import React from 'react';
import { 
  DocumentTextIcon, 
  BeakerIcon, 
  HeartIcon, 
  AcademicCapIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

interface HistoricalContextData {
  previousMedications?: string;
  familyHistory?: string;
  otherTreatments?: string;
  patientBackground?: string;
}

interface HistoricalContextProps {
  data: HistoricalContextData;
  variant?: 'default' | 'print';
  className?: string;
}

export const HistoricalContext: React.FC<HistoricalContextProps> = ({ 
  data, 
  variant = 'default',
  className = '' 
}) => {
  // Sprawdź czy są jakiekolwiek dane do wyświetlenia
  const hasData = data.previousMedications || 
                  data.familyHistory || 
                  data.otherTreatments || 
                  data.patientBackground;

  if (!hasData) {
    return null;
  }

  // Style dla wersji print
  if (variant === 'print') {
    return (
      <section className={`mb-4 ${className}`}>
        <h2 className="text-xl font-bold mb-3 text-blue-700">Kontekst Historyczny</h2>
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <p className="text-sm text-gray-600 mb-3 italic">
            Informacje uzupełniające bez konkretnych dat, które dopełniają szczegółową oś czasu farmakoterapii.
          </p>
          
          <div className="space-y-3">
            {data.previousMedications && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">📋 Historia Leków</h3>
                <p className="text-sm text-gray-700 leading-relaxed pl-4">
                  {data.previousMedications}
                </p>
              </div>
            )}
            
            {data.familyHistory && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">👨‍👩‍👧‍👦 Wywiad Rodzinny</h3>
                <p className="text-sm text-gray-700 leading-relaxed pl-4">
                  {data.familyHistory}
                </p>
              </div>
            )}
            
            {data.otherTreatments && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">🎓 Inne Terapie</h3>
                <p className="text-sm text-gray-700 leading-relaxed pl-4">
                  {data.otherTreatments}
                </p>
              </div>
            )}
            
            {data.patientBackground && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">ℹ️ Tło Pacjenta</h3>
                <p className="text-sm text-gray-700 leading-relaxed pl-4">
                  {data.patientBackground}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Style dla wersji default (interaktywna)
  return (
    <div className={`border-t border-remedy-border bg-gradient-to-r from-remedy-light via-white to-remedy-secondary/5 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-remedy-primary to-remedy-accent rounded-lg flex items-center justify-center shadow-md">
          <DocumentTextIcon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold bg-gradient-to-r from-remedy-primary to-remedy-accent bg-clip-text text-transparent">
            Kontekst Historyczny
          </h3>
          <p className="text-sm text-slate-600 font-medium">
            Informacje uzupełniające do analizy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-remedy-accent rounded-full animate-pulse"></div>
          <span className="text-xs bg-gradient-to-r from-remedy-light to-remedy-secondary/20 text-remedy-primary px-3 py-1 rounded-full font-medium border border-remedy-border/30">
            Dane kontekstowe
          </span>
        </div>
      </div>
      
      {/* Grid kontekstowy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {data.previousMedications && (
          <div className="card-remedy hover:shadow-xl transition-all duration-300 border border-remedy-border/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-remedy-accent to-remedy-primary rounded-md flex items-center justify-center">
                <BeakerIcon className="w-3 h-3 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800">Historia Leków</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.previousMedications}
            </p>
          </div>
        )}
        
        {data.familyHistory && (
          <div className="card-remedy hover:shadow-xl transition-all duration-300 border border-remedy-border/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-remedy-secondary to-remedy-accent rounded-md flex items-center justify-center">
                <HeartIcon className="w-3 h-3 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800">Wywiad Rodzinny</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.familyHistory}
            </p>
          </div>
        )}
        
        {data.otherTreatments && (
          <div className="card-remedy hover:shadow-xl transition-all duration-300 border border-remedy-border/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-remedy-primary to-remedy-secondary rounded-md flex items-center justify-center">
                <AcademicCapIcon className="w-3 h-3 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800">Inne Terapie</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.otherTreatments}
            </p>
          </div>
        )}
        
        {data.patientBackground && (
          <div className="card-remedy hover:shadow-xl transition-all duration-300 border border-remedy-border/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-remedy-accent to-remedy-secondary rounded-md flex items-center justify-center">
                <InformationCircleIcon className="w-3 h-3 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800">Tło Pacjenta</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.patientBackground}
            </p>
          </div>
        )}
      </div>
      
      {/* Panel informacyjny */}
      <div className="bg-gradient-to-r from-remedy-light/50 to-remedy-secondary/10 rounded-lg p-4 border border-remedy-border/30">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-gradient-to-br from-remedy-primary to-remedy-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <InformationCircleIcon className="w-3 h-3 text-white" />
          </div>
          <div>
            <h5 className="font-semibold text-remedy-primary mb-1">Informacja Metodologiczna</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ten kontekst historyczny zawiera ogólne wzmianki bez konkretnych dat, 
              które uzupełniają szczegółową oś czasu farmakoterapii przedstawioną powyżej. 
              Służy do lepszego zrozumienia tła klinicznego pacjenta przez badacza i 
              może zawierać istotne informacje dla interpretacji wyników leczenia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 