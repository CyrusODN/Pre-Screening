// src/App.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, HelpCircle, 
  User, CalendarDays, Stethoscope, Pill, ListChecks, Target, BarChart3, 
  Info, Filter, ArrowDownUp, Edit3, Save, RotateCcw, Printer, X
  // Usunięto nieużywane importy: MessageSquare, BrainCircuit
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DetailedTrdTimelineChart } from './components/charts/DetailedTrdTimelineChart';
import { EnteringScreen } from './components/EnteringScreen';
import { PrintableReport } from './components/PrintableReport';
import { initialPatientData } from './data/mockData';
import { analyzePatientData } from './services/ai';
import { saveToHistory } from './services/patientHistory';
// Usunięto nieużywany import typu PharmacotherapyItem z tego pliku,
// ponieważ jest on potrzebny tylko w DetailedTrdTimelineChart.tsx
import type { PatientData, SupportedAIModel, Criterion } from './types'; 
import { getAIConfig } from './config/aiConfig'; 
import './styles/print.css';

const USER_STATUS_OPTIONS = [
  { value: 'spełnione_manual', label: 'Spełnione (ocena badacza)' },
  { value: 'niespełnione_manual', label: 'Niespełnione (ocena badacza)' },
  { value: 'weryfikacja_manual', label: 'Wymaga weryfikacji (ocena badacza)' },
];

const getEffectiveStatus = (criterion: Criterion) => criterion.userStatus || criterion.status;

const getStatusColor = (status: string | null | undefined) => {
  if (status?.endsWith('_manual')) return 'text-blue-600';
  switch (status) {
    case 'spełnione': case 'prawdopodobnie OK': return 'text-green-600';
    case 'niespełnione': case 'potencjalne wykluczenie': case 'problem/weryfikacja': return 'text-red-600';
    case 'weryfikacja': case 'prawdopodobnie spełnione': case 'potencjalnie niespełnione/weryfikacja': return 'text-yellow-500';
    default: return 'text-slate-500';
  }
};

const getStatusIcon = (status: string | null | undefined) => {
  const className = "inline-block mr-2 h-5 w-5";
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

const AccordionItem: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="card-remedy">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center text-2xl font-bold text-gray-900">
          <div className="icon-circle mr-4">
            {icon}
          </div>
          <span>{title}</span>
        </div>
        <ChevronDown size={24} className={`text-remedy-accent transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-6 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

const EditCriterionModal: React.FC<{criterion: Criterion, onClose: () => void, onSave: (id: string, status: string, comment: string) => void}> = ({ criterion, onClose, onSave }) => {
  const [newStatus, setNewStatus] = useState(criterion.userStatus || criterion.status || '');
  const [comment, setComment] = useState(criterion.userComment || '');
  const handleSave = () => { onSave(criterion.id, newStatus, comment); onClose(); };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Edytuj kryterium</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{criterion.id}: {criterion.name}</h4>
              <p className="text-gray-600 text-sm">{criterion.details}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Status:</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all">
                <option value="spełnione">Spełnione</option>
                <option value="niespełnione">Niespełnione</option>
                <option value="weryfikacja">Wymaga weryfikacji</option>
                <option value="spełnione_manual">Spełnione (zmienione przez badacza)</option>
                <option value="niespełnione_manual">Niespełnione (zmienione przez badacza)</option>
                <option value="weryfikacja_manual">Wymaga weryfikacji (zmienione przez badacza)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Komentarz badacza:</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
                        placeholder="Opcjonalny komentarz..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all resize-none">
              </textarea>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={onClose} className="btn-secondary">Anuluj</button>
            <button onClick={handleSave} className="btn-primary">Zapisz</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CriteriaList: React.FC<{criteria: Criterion[], title: string, onUpdateCriterion: (id: string, status: string | null, comment: string | null) => void}> = ({ criteria, title, onUpdateCriterion }) => {
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('id');
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const statusOrder: Record<string, number> = { 'problem/weryfikacja': 1, 'potencjalne wykluczenie': 1, 'niespełnione_manual': 1, 'potencjalnie niespełnione/weryfikacja': 2, 'weryfikacja': 2, 'weryfikacja_manual': 2, 'prawdopodobnie spełnione': 3, 'prawdopodobnie OK': 3, 'spełnione': 4, 'spełnione_manual': 4, };
  const uniqueStatuses = useMemo(() => { const statuses = (criteria || []).map(c => getEffectiveStatus(c)); const userStatuses = USER_STATUS_OPTIONS.map(opt => opt.value); return ['all', ...new Set([...statuses, ...userStatuses])]; }, [criteria]);
  const filteredAndSortedCriteria = useMemo(() => {
    let result = [...(criteria || [])];
    if (filter !== 'all') { result = result.filter(c => getEffectiveStatus(c) === filter); }
    if (sortOrder === 'status') { result.sort((a, b) => (statusOrder[getEffectiveStatus(a)] || 99) - (statusOrder[getEffectiveStatus(b)] || 99) || a.id.localeCompare(b.id)); }
    else { result.sort((a, b) => a.id.localeCompare(b.id)); }
    return result;
  }, [criteria, filter, sortOrder]);
  const handleResetOverride = (criterionId: string) => { onUpdateCriterion(criterionId, null, null); };

  if (!criteria || criteria.length === 0) { 
    return <p className="text-slate-500 text-center py-4">Brak danych kryteriów do wyświetlenia dla {title}.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 items-center p-3 bg-slate-100 rounded-md">
        <Filter size={20} className="text-slate-600" /><label htmlFor={`${title}-filter`} className="mr-2 text-sm font-medium text-slate-700">Filtr statusu:</label>
        <select id={`${title}-filter`} value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500">{uniqueStatuses.map(s => <option key={s} value={s}>{s === 'all' ? 'Wszystkie' : USER_STATUS_OPTIONS.find(opt => opt.value === s)?.label || s}</option>)}</select>
        <ArrowDownUp size={20} className="text-slate-600 ml-4" /><label htmlFor={`${title}-sort`} className="mr-2 text-sm font-medium text-slate-700">Sortuj wg:</label>
        <select id={`${title}-sort`} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"><option value="id">ID Kryterium</option><option value="status">Status</option></select>
      </div>
      {filteredAndSortedCriteria.length === 0 && <p className="text-slate-500 text-center py-4">Brak kryteriów pasujących do wybranego filtra.</p>}
      <ul className="space-y-2">
        {filteredAndSortedCriteria.map((criterion: Criterion) => {
          const effectiveStatus = getEffectiveStatus(criterion);
          return (
            <li key={criterion.id} className={`p-3 rounded-md border ${getStatusColor(effectiveStatus).replace('text-', 'border-').replace('-600', '-300').replace('-500', '-300')} bg-white shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex justify-between items-start">
                <div>
                  <strong className={`${getStatusColor(effectiveStatus)} flex items-center`}>{getStatusIcon(effectiveStatus)}<span>{criterion.id}: {criterion.name}</span>{criterion.userStatus && <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">Zmienione</span>}</strong>
                  <p className="text-sm text-slate-600 ml-8 mt-1">{criterion.details}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {criterion.userStatus && (<button onClick={() => handleResetOverride(criterion.id)} title="Resetuj zmianę badacza" className="p-1 text-slate-500 hover:text-slate-700"><RotateCcw size={16} /></button>)}
                  <button onClick={() => setEditingCriterion(criterion)} title="Edytuj status i komentarz" className="p-1 text-sky-600 hover:text-sky-800"><Edit3 size={18} /></button>
                </div>
              </div>
              {criterion.userComment && (<div className="mt-2 ml-8 p-2 border-l-4 border-blue-300 bg-blue-50 rounded-r-md"><p className="text-xs font-semibold text-blue-700 mb-0.5">Komentarz Badacza ({criterion.userOverrideTimestamp ? new Date(criterion.userOverrideTimestamp).toLocaleDateString('pl-PL') : 'Brak daty'}):</p><p className="text-sm text-blue-800 whitespace-pre-wrap">{criterion.userComment}</p></div>)}
            </li>);
        })}
      </ul>
      {editingCriterion && <EditCriterionModal criterion={editingCriterion} onClose={() => setEditingCriterion(null)} onSave={(id, status, comment) => onUpdateCriterion(id, status, comment)} />}
    </div>);
};

const CriteriaStatusPieChart: React.FC<{criteriaData: Array<Criterion & {type: string}>, title: string}> = ({ criteriaData, title }) => {
  if (!criteriaData || criteriaData.length === 0) {
    return <p className="text-slate-500 text-center py-4">Brak danych do wyświetlenia wykresu dla: {title}</p>;
  }

  const statusCounts = criteriaData.reduce((acc, criterion) => {
    const effectiveStatus = getEffectiveStatus(criterion);
    const statusLabel = effectiveStatus.includes('spełnione') || effectiveStatus.includes('OK') ? 'Pozytywne / OK' :
      effectiveStatus.includes('niespełnione') || effectiveStatus.includes('wykluczenie') || effectiveStatus.includes('problem') ? 'Negatywne / Problem' :
        'Do Weryfikacji';
    acc[statusLabel] = (acc[statusLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const COLORS: Record<string, string> = { 'Pozytywne / OK': '#22c55e', 'Negatywne / Problem': '#ef4444', 'Do Weryfikacji': '#f59e0b' };
  const RADIAN = Math.PI / 180;
  
  interface CustomizedLabelProps {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string; value: number;
  }
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: CustomizedLabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent * 100 < 5) return null;
    return <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">{`${name} (${value})`}</text>;
  };

  if (data.length === 0) return <p className="text-slate-500 text-center py-4">Brak danych do wyświetlenia wykresu dla: {title}</p>;

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-white shadow">
      <h4 className="text-md font-semibold text-slate-700 mb-4 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />)}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [value, name]} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasSubmittedData, setHasSubmittedData] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientData | null>(null);
  const [selectedAIModel, setSelectedAIModel] = useState<SupportedAIModel>('o3'); 
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [dynamicConclusion, setDynamicConclusion] = useState({
    overallQualification: '',
    mainIssues: [] as string[],
    criticalInfoNeeded: [] as string[],
    estimatedProbability: 0
  });

  const handleDataSubmit = async (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => {
    setHasSubmittedData(true); 
    setIsAnalyzing(true);
    setAnalysisError(null); 
    try {
      const analysisResult = await analyzePatientData(data.medicalHistory, data.protocol, data.selectedAIModel);
      setPatientProfile(analysisResult);
      saveToHistory(analysisResult);

      if (analysisResult.reportConclusion) {
        setDynamicConclusion({
          overallQualification: analysisResult.reportConclusion.overallQualification || '',
          mainIssues: analysisResult.reportConclusion.mainIssues || [],
          criticalInfoNeeded: analysisResult.reportConclusion.criticalInfoNeeded || [],
          estimatedProbability: analysisResult.reportConclusion.estimatedProbability || 0
        });
      }
    } catch (error) {
      console.error('Error analyzing data in App.tsx:', error);
      const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd.';
      setAnalysisError(`Błąd podczas analizy danych (${data.selectedAIModel}): ${errorMessage}. Używam danych testowych.`);
      
      const mockDataWithModel: PatientData = {
        ...initialPatientData, 
        analyzedAt: new Date().toISOString(),
        isMockData: true,
        modelUsed: data.selectedAIModel
      };
      setPatientProfile(mockDataWithModel);
      saveToHistory(mockDataWithModel);

      if (mockDataWithModel.reportConclusion) {
        setDynamicConclusion({
          overallQualification: mockDataWithModel.reportConclusion.overallQualification || '',
          mainIssues: mockDataWithModel.reportConclusion.mainIssues || [],
          criticalInfoNeeded: mockDataWithModel.reportConclusion.criticalInfoNeeded || [],
          estimatedProbability: mockDataWithModel.reportConclusion.estimatedProbability || 0
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistoricalPatient = (patientId: string) => {
    alert(`Funkcja przeglądania historycznych analiz dla pacjenta ${patientId} będzie dostępna wkrótce.`);
  };

  const handleUpdateCriterion = (criterionType: keyof Pick<PatientData, 'inclusionCriteria' | 'psychiatricExclusionCriteria' | 'medicalExclusionCriteria'>, criterionId: string, newUserStatus: string | null, newUserComment: string | null) => {
    setPatientProfile(prevProfile => {
      if (!prevProfile || !prevProfile[criterionType]) {
        console.error(`Cannot update criterion: ${criterionType} is undefined in patientProfile.`);
        return prevProfile;
      }
      const updatedCriteria = prevProfile[criterionType].map((c: Criterion) =>
        c.id === criterionId
          ? {
              ...c,
              userStatus: newUserStatus || null,
              userComment: newUserComment || null,
              userOverrideTimestamp: newUserStatus ? new Date().toISOString() : null
            }
          : c
      );
      const updatedProfile = { ...prevProfile, [criterionType]: updatedCriteria as Criterion[] };
      saveToHistory(updatedProfile); 
      return updatedProfile;
    });
  };

  useEffect(() => {
    if (!patientProfile) return;

    const pInclusionCriteria = patientProfile.inclusionCriteria || [];
    const pPsychiatricExclusionCriteria = patientProfile.psychiatricExclusionCriteria || [];
    const pMedicalExclusionCriteria = patientProfile.medicalExclusionCriteria || [];

    const hasOverrides = [
      ...pInclusionCriteria,
      ...pPsychiatricExclusionCriteria,
      ...pMedicalExclusionCriteria
    ].some(c => c.userStatus);

    let newOverallQualification = patientProfile.reportConclusion?.overallQualification || '';
    if (hasOverrides) {
      newOverallQualification = `${newOverallQualification} (z modyfikacjami badacza)`;
    }

    let baseProbability = patientProfile.reportConclusion?.estimatedProbability || 0;
    const allCriteria = [
      ...pInclusionCriteria,
      ...pPsychiatricExclusionCriteria,
      ...pMedicalExclusionCriteria,
    ];

    allCriteria.forEach(criterion => {
      if (criterion && criterion.status) {
        const initialStatus = criterion.status;
        const effectiveStatus = getEffectiveStatus(criterion);
        if (criterion.userStatus) { 
          if ((initialStatus.includes('problem') || initialStatus.includes('wykluczenie') || initialStatus.includes('niespełnione')) &&
            (effectiveStatus.includes('spełnione_manual'))) {
            baseProbability = Math.min(100, baseProbability + 5); 
          }
          else if ((initialStatus.includes('spełnione') || initialStatus.includes('OK')) &&
            (effectiveStatus.includes('niespełnione_manual'))) {
            baseProbability = Math.max(0, baseProbability - 10);
          }
        }
      }
    });
    
    setDynamicConclusion(prev => ({
      ...prev,
      overallQualification: newOverallQualification,
      estimatedProbability: Math.round(Math.max(0, Math.min(100, baseProbability))), 
    }));

  }, [patientProfile]);


  const allCriteriaForChart = useMemo((): Array<Criterion & {type: string}> => {
    if (!patientProfile) return [];
    return [
      ...(patientProfile.inclusionCriteria || []).map(c => ({ ...c, type: 'Włączenia' })),
      ...(patientProfile.psychiatricExclusionCriteria || []).map(c => ({ ...c, type: 'Psychiatryczne Wyłączenia' })),
      ...(patientProfile.medicalExclusionCriteria || []).map(c => ({ ...c, type: 'Medyczne Wyłączenia' })),
    ];
  }, [patientProfile]);

  const currentSelectedAIConfig = getAIConfig(selectedAIModel);
  const isCurrentModelConfigured = !!(currentSelectedAIConfig.apiKey && currentSelectedAIConfig.model);

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  if (!hasSubmittedData) {
    return <EnteringScreen 
      onDataSubmit={handleDataSubmit}
      onSelectHistoricalPatient={handleSelectHistoricalPatient}
      selectedAIModel={selectedAIModel}
      onAIModelChange={setSelectedAIModel}
    />;
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-theme-light p-4 sm:p-6 md:p-8 font-sans flex items-center justify-center">
        <div className="text-center card-remedy max-w-md">
          <div className="icon-circle mx-auto mb-6">
            <div role="status" className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" aria-label="Ładowanie">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Ładowanie...
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analizowanie danych pacjenta</h2>
          <p className="text-gray-600 mb-2">Model: {
            selectedAIModel === 'gemini' ? 'Gemini 2.5 Pro Preview 05-06' : 
            selectedAIModel === 'claude-opus' ? 'Claude 4 Opus' :
            selectedAIModel.toUpperCase()
          }</p>
          <p className="text-sm text-gray-500">To może potrwać chwilę...</p>
        </div>
      </div>
    );
  }

  if (!patientProfile || Object.keys(patientProfile).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-theme-light p-4 sm:p-6 md:p-8 font-sans flex flex-col items-center justify-center">
        <div className="card-remedy max-w-md text-center">
          <div className="icon-circle mx-auto mb-6">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wystąpił błąd</h2>
          <p className="text-gray-600 mb-4">Nie udało się załadować profilu pacjenta. Spróbuj ponownie.</p>
          {analysisError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm text-left">
                  <p className="font-semibold mb-2">Szczegóły błędu:</p>
                  <p>{analysisError}</p>
              </div>
          )}
          <button 
            onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
            className="btn-primary mt-6"
          >
            Powrót do wprowadzania danych
          </button>
        </div>
      </div>
    );
  }
  
  const modelDisplayName = patientProfile.modelUsed === 'gemini' ? 'Gemini 2.5 Pro Preview 05-06' : 
                        patientProfile.modelUsed === 'claude-opus' ? 'Claude 4 Opus' :
                        patientProfile.modelUsed?.toUpperCase() || 'Nieznany';

  // If in print mode, render the printable report
  if (isPrintMode) {
    return (
      <PrintableReport 
        patientProfile={patientProfile}
        dynamicConclusion={dynamicConclusion}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-theme-light py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
      
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Interaktywny Raport Pre-screeningowy</h1>
              <p className="text-xl text-gray-600 mt-2">Analiza Kwalifikacji Pacjenta</p>
              <p className="text-base text-gray-500 mt-1">Model: <span className="font-medium">{modelDisplayName}</span></p>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handlePrint}
                className="no-print btn-primary flex items-center gap-2"
                title="Drukuj raport"
              >
                <Printer size={20} />
                <span className="hidden sm:inline">Drukuj Raport</span>
              </button>
            </div>
          </div>
          
          {analysisError && !patientProfile.isMockData && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl inline-block text-sm">
                  <AlertTriangle size={16} className="inline-block mr-2" />
                  {analysisError}
              </div>
          )}
          {patientProfile.isMockData && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl inline-block">
              <AlertTriangle size={16} className="inline-block mr-2" />
              Używane są dane testowe - połączenie z AI ({modelDisplayName}) jest niedostępne lub wystąpił błąd.
              {!isCurrentModelConfigured && ` Sprawdź konfigurację (klucz API, model) dla ${modelDisplayName} w pliku .env.`}
            </div>
          )}
        </header>

        <main className="space-y-8">
          <section className="card-remedy">
            <div className="flex items-center text-3xl font-bold text-gray-900 mb-6">
              <div className="icon-circle mr-4">
                <User size={24} />
              </div>
              <span>Dane Pacjenta: {patientProfile.summary?.id || 'Brak ID'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
              <p><strong className="font-medium text-gray-900">Wiek:</strong> {patientProfile.summary?.age || 'N/A'} lat</p>
              <p><strong className="font-medium text-gray-900">Główna diagnoza:</strong> {patientProfile.summary?.mainDiagnosis || 'N/A'}</p>
              <div className="md:col-span-2">
                <strong className="font-medium text-gray-900">Choroby współistniejące:</strong>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  {(patientProfile.summary?.comorbidities || []).map((com, idx) => <li key={idx}>{com}</li>)}
                  {(patientProfile.summary?.comorbidities || []).length === 0 && <li>Brak</li>}
                </ul>
              </div>
            </div>
          </section>

          <AccordionItem title="Wizualizacje Danych" icon={<BarChart3 size={24} />} defaultOpen={true}>
            <div className="grid grid-cols-1 gap-6">
              <DetailedTrdTimelineChart
                pharmacotherapy={patientProfile.trdAnalysis?.pharmacotherapy || []}
              />
              <div className="lg:col-span-1 mt-6">
                <CriteriaStatusPieChart criteriaData={allCriteriaForChart} title="Ogólny Status Kryteriów (po zmianach)" />
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title="Szacowanie Początku Obecnego Epizodu Depresyjnego" icon={<CalendarDays size={24} />}>
            <div className="space-y-4 text-gray-600">
              {(patientProfile.episodeEstimation?.scenarios || []).map(sc => (
                <div key={sc.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p><strong className="font-medium text-gray-900">Scenariusz {sc.id}:</strong> {sc.description}</p>
                  <p className="text-sm text-gray-500 mt-2"><em>Przesłanki:</em> {sc.evidence}</p>
                </div>
              ))}
              {(patientProfile.episodeEstimation?.scenarios || []).length === 0 && <p>Brak scenariuszy.</p>}
              <div className="mt-4 p-4 border-t-2 border-gray-300 bg-blue-50 rounded-lg">
                <p><strong className="font-medium text-gray-900">Wnioski dotyczące początku epizodu dla celów badania:</strong></p>
                <p className="mt-2">{patientProfile.episodeEstimation?.conclusion || 'Brak wniosków.'}</p>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title="Analiza TRD (Kryterium IC6) - Podsumowanie" icon={<Pill size={24} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Poniżej znajduje się podsumowanie wniosków z analizy farmakoterapii. Szczegółowa oś czasu leczenia dostępna jest w sekcji "Wizualizacje Danych".</p>
              <p className="font-semibold text-gray-900">{patientProfile.trdAnalysis?.conclusion || 'Brak podsumowania analizy TRD.'}</p>
            </div>
          </AccordionItem>

          <AccordionItem title="Kryteria Włączenia (IC)" icon={<ListChecks size={24} />}>
            <CriteriaList criteria={patientProfile.inclusionCriteria || []} title="Inclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('inclusionCriteria', id, status, comment)} />
          </AccordionItem>

          <AccordionItem title="Psychiatryczne Kryteria Wyłączenia (EC)" icon={<AlertTriangle size={24} />}>
            <CriteriaList criteria={patientProfile.psychiatricExclusionCriteria || []} title="PsychiatricExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('psychiatricExclusionCriteria', id, status, comment)} />
          </AccordionItem>

          <AccordionItem title="Ogólne Medyczne Kryteria Wyłączenia (GMEC)" icon={<Stethoscope size={24} />}>
            <CriteriaList criteria={patientProfile.medicalExclusionCriteria || []} title="MedicalExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('medicalExclusionCriteria', id, status, comment)} />
          </AccordionItem>

          <section className="card-remedy">
            <div className="flex items-center text-3xl font-bold text-gray-900 mb-6">
              <div className="icon-circle mr-4">
                <Target size={24} />
              </div>
              <span>Wniosek Dotyczący Kwalifikacji i Prawdopodobieństwo</span>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ogólna Kwalifikacja:</h3>
                <p className={`text-xl font-bold ${dynamicConclusion.overallQualification.toLowerCase().includes("nie kwalifikuje") ? "text-red-600" : dynamicConclusion.overallQualification.toLowerCase().includes("kwalifikuje") ? "text-green-600" : "text-yellow-500"}`}>
                  {dynamicConclusion.overallQualification || 'Brak oceny kwalifikacji.'}
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Główne Problemy / Potencjalne Przeszkody (wg AI):</h3>
                {dynamicConclusion.mainIssues && dynamicConclusion.mainIssues.length > 0 ? (
                  <ul className="list-disc list-inside ml-4 space-y-2 text-gray-600">
                    {dynamicConclusion.mainIssues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                  </ul>
                ) : (
                  <p className="text-gray-500">Brak zidentyfikowanych problemów</p>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Krytyczne Informacje do Uzyskania/Weryfikacji (wg AI):</h3>
                {dynamicConclusion.criticalInfoNeeded && dynamicConclusion.criticalInfoNeeded.length > 0 ? (
                  <ul className="list-disc list-inside ml-4 space-y-2 text-gray-600">
                    {dynamicConclusion.criticalInfoNeeded.map((info, idx) => <li key={idx}>{info}</li>)}
                  </ul>
                ) : (
                  <p className="text-gray-500">Brak krytycznych informacji do weryfikacji</p>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Szacowane Prawdopodobieństwo Kwalifikacji:</h3>
                <div className="flex items-center gap-4">
                  <div className="icon-circle flex-shrink-0">
                    <BarChart3 size={24} />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                    <div className={`h-12 rounded-full flex items-center justify-center text-white font-bold transition-all duration-500 ease-out ${dynamicConclusion.estimatedProbability >= 70 ? 'bg-green-500' : dynamicConclusion.estimatedProbability >=40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${dynamicConclusion.estimatedProbability}%` }}>
                      {dynamicConclusion.estimatedProbability > 10 ? `${dynamicConclusion.estimatedProbability}%` : ''}
                    </div>
                  </div>
                  {dynamicConclusion.estimatedProbability <= 10 && <span className="text-gray-900 font-bold text-xl ml-2">{dynamicConclusion.estimatedProbability}%</span>}
                </div>
                <p className="text-sm text-gray-500 mt-3">Prawdopodobieństwo uwzględnia modyfikacje badacza. Ocena początkowa AI ({modelDisplayName}): {patientProfile.reportConclusion?.estimatedProbability || 0}%.</p>
              </div>
            </div>
          </section>
        </main>
        
        <footer className="mt-20 text-center text-sm text-gray-500 py-6 border-t border-gray-200">
          <p>&copy; {new Date().getFullYear()} Aplikacja Raportów Pre-screeningowych. Wszelkie prawa zastrzeżone.</p>
          <p>Wygenerowano: {new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}</p>
          <button 
            onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
            className="no-print btn-secondary mt-4"
          >
            Analizuj nowego pacjenta
          </button>
        </footer>
      </div>
    </div>
  );
};

export default App;
