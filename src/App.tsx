// src/App.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, HelpCircle, 
  User, CalendarDays, Stethoscope, Pill, ListChecks, Target, BarChart3, 
  Info, Filter, ArrowDownUp, Edit3, Save, RotateCcw 
  // Usunięto nieużywane importy: X, MessageSquare, BrainCircuit
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DetailedTrdTimelineChart } from './components/charts/DetailedTrdTimelineChart';
import { EnteringScreen } from './components/EnteringScreen';
import { initialPatientData } from './data/mockData';
import { analyzePatientData } from './services/ai';
import { saveToHistory } from './services/patientHistory';
// Usunięto nieużywany import typu PharmacotherapyItem z tego pliku,
// ponieważ jest on potrzebny tylko w DetailedTrdTimelineChart.tsx
import type { PatientData, SupportedAIModel, Criterion } from './types'; 
import { getAIConfig } from './config/aiConfig'; 

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
    <div className="border border-slate-200 rounded-lg mb-3 shadow-sm bg-white transition-all duration-300 ease-in-out">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-t-lg focus:outline-none">
        <div className="flex items-center">{icon}<span className="ml-3">{title}</span></div>
        {isOpen ? <ChevronUp size={24} className="text-sky-600" /> : <ChevronDown size={24} className="text-slate-500" />}
      </button>
      {isOpen && <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg animate-fadeIn">{children}</div>}
    </div>
  );
};

const EditCriterionModal: React.FC<{criterion: Criterion, onClose: () => void, onSave: (id: string, status: string, comment: string) => void}> = ({ criterion, onClose, onSave }) => {
  const [newStatus, setNewStatus] = useState(criterion.userStatus || '');
  const [comment, setComment] = useState(criterion.userComment || '');
  const handleSave = () => { onSave(criterion.id, newStatus, comment); onClose(); };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Edytuj Kryterium: {criterion.id} - {criterion.name}</h3>
        <div className="mb-4">
          <label htmlFor="status-select" className="block text-sm font-medium text-slate-700 mb-1">Nowy Status:</label>
          <select id="status-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500">
            <option value="">Wybierz status (lub usuń nadpisanie)</option>
            {USER_STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
        <div className="mb-6">
          <label htmlFor="comment-input" className="block text-sm font-medium text-slate-700 mb-1">Komentarz Badacza:</label>
          {/* Poprawka: rows oczekuje liczby, nie stringa. Ustawiono na 3. */}
          <textarea id="comment-input" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" placeholder="Dodaj uzasadnienie zmiany statusu..." />
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300">Anuluj</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md flex items-center"><Save size={16} className="mr-2" /> Zapisz Zmiany</button>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div role="status" className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" aria-label="Ładowanie">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Ładowanie...
            </span>
          </div>
          <p className="text-xl text-slate-700 mt-4">Analizowanie danych pacjenta (model: {selectedAIModel === 'gemini' ? 'Gemini 2.5 Pro Preview 05-06' : selectedAIModel.toUpperCase()})...</p>
          <p className="text-sm text-slate-500 mt-2">To może potrwać chwilę...</p>
        </div>
      </div>
    );
  }

  if (!patientProfile || Object.keys(patientProfile).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8 font-sans flex flex-col items-center justify-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <p className="text-xl text-slate-700 mb-2">Wystąpił błąd podczas ładowania danych pacjenta.</p>
        <p className="text-slate-600 text-center mb-4">Nie udało się załadować profilu pacjenta. Spróbuj ponownie.</p>
        {analysisError && (
            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md text-sm max-w-md text-left">
                <p><strong>Szczegóły błędu:</strong></p>
                <p>{analysisError}</p>
            </div>
        )}
        <button 
          onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
          className="mt-6 px-6 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
        >
          Powrót do wprowadzania danych
        </button>
      </div>
    );
  }
  
  const modelDisplayName = patientProfile.modelUsed === 'gemini' ? 'Gemini 2.5 Pro Preview 05-06' : patientProfile.modelUsed?.toUpperCase() || 'Nieznany';


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8 font-sans">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-700">Interaktywny Raport Pre-screeningowy</h1>
        <p className="text-lg text-slate-600 mt-1">Analiza Kwalifikacji Pacjenta (model: <span className="font-semibold">{modelDisplayName}</span>)</p>
        
        {analysisError && !patientProfile.isMockData && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md inline-block text-sm">
                <AlertTriangle size={16} className="inline-block mr-1" />
                {analysisError}
            </div>
        )}
        {patientProfile.isMockData && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-md inline-block">
            <AlertTriangle size={16} className="inline-block mr-1" />
            Używane są dane testowe - połączenie z AI ({modelDisplayName}) jest niedostępne lub wystąpił błąd.
            {!isCurrentModelConfigured && ` Sprawdź konfigurację (klucz API, model) dla ${modelDisplayName} w pliku .env.`}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        <section className="bg-white p-6 rounded-xl shadow-lg border border-sky-200">
          <div className="flex items-center text-2xl font-semibold text-sky-700 mb-4">
            <User size={30} className="mr-3 text-sky-600" />
            <span>Dane Pacjenta: {patientProfile.summary?.id || 'Brak ID'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
            <p><strong className="font-medium">Wiek:</strong> {patientProfile.summary?.age || 'N/A'} lat</p>
            <p><strong className="font-medium">Główna diagnoza:</strong> {patientProfile.summary?.mainDiagnosis || 'N/A'}</p>
            <div><strong className="font-medium">Choroby współistniejące:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                {(patientProfile.summary?.comorbidities || []).map((com, idx) => <li key={idx}>{com}</li>)}
                {(patientProfile.summary?.comorbidities || []).length === 0 && <li>Brak</li>}
              </ul>
            </div>
          </div>
        </section>

        <AccordionItem title="Wizualizacje Danych" icon={<BarChart3 size={22} className="text-sky-600" />} defaultOpen={true}>
          <div className="grid grid-cols-1 gap-6">
            <DetailedTrdTimelineChart
              pharmacotherapy={patientProfile.trdAnalysis?.pharmacotherapy || []}
            />
            <div className="lg:col-span-1 mt-6">
              <CriteriaStatusPieChart criteriaData={allCriteriaForChart} title="Ogólny Status Kryteriów (po zmianach)" />
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="Szacowanie Początku Obecnego Epizodu Depresyjnego" icon={<CalendarDays size={22} className="text-sky-600" />}>
          <div className="space-y-3 text-slate-700">
            {(patientProfile.episodeEstimation?.scenarios || []).map(sc => (<div key={sc.id} className="p-3 border border-slate-200 rounded-md bg-slate-50"><p><strong className="font-medium">Scenariusz {sc.id}:</strong> {sc.description}</p><p className="text-sm text-slate-600 mt-1"><em>Przesłanki:</em> {sc.evidence}</p></div>))}
            {(patientProfile.episodeEstimation?.scenarios || []).length === 0 && <p>Brak scenariuszy.</p>}
            <div className="mt-3 p-3 border-t border-slate-300"><p><strong className="font-medium">Wnioski dotyczące początku epizodu dla celów badania:</strong> {patientProfile.episodeEstimation?.conclusion || 'Brak wniosków.'}</p></div>
          </div>
        </AccordionItem>

        <AccordionItem title="Analiza TRD (Kryterium IC6) - Podsumowanie" icon={<Pill size={22} className="text-sky-600" />}>
          <p className="mb-3 text-sm text-slate-600">Poniżej znajduje się podsumowanie wniosków z analizy farmakoterapii. Szczegółowa oś czasu leczenia dostępna jest w sekcji "Wizualizacje Danych".</p>
          <p className="mt-4 font-semibold text-slate-800">{patientProfile.trdAnalysis?.conclusion || 'Brak podsumowania analizy TRD.'}</p>
        </AccordionItem>

        <AccordionItem title="Kryteria Włączenia (IC)" icon={<ListChecks size={22} className="text-green-600" />}>
          <CriteriaList criteria={patientProfile.inclusionCriteria || []} title="Inclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('inclusionCriteria', id, status, comment)} />
        </AccordionItem>

        <AccordionItem title="Psychiatryczne Kryteria Wyłączenia (EC)" icon={<AlertTriangle size={22} className="text-red-600" />}>
          <CriteriaList criteria={patientProfile.psychiatricExclusionCriteria || []} title="PsychiatricExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('psychiatricExclusionCriteria', id, status, comment)} />
        </AccordionItem>

        <AccordionItem title="Ogólne Medyczne Kryteria Wyłączenia (GMEC)" icon={<Stethoscope size={22} className="text-red-600" />}>
          <CriteriaList criteria={patientProfile.medicalExclusionCriteria || []} title="MedicalExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('medicalExclusionCriteria', id, status, comment)} />
        </AccordionItem>

        <section className="bg-white p-6 rounded-xl shadow-lg border border-sky-200">
          <div className="flex items-center text-2xl font-semibold text-sky-700 mb-6">
            <Target size={30} className="mr-3 text-sky-600" />
            <span>Wniosek Dotyczący Kwalifikacji i Prawdopodobieństwo</span>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Ogólna Kwalifikacja:</h3>
              <p className={`text-lg font-bold ${dynamicConclusion.overallQualification.toLowerCase().includes("nie kwalifikuje") ? "text-red-600" : dynamicConclusion.overallQualification.toLowerCase().includes("kwalifikuje") ? "text-green-600" : "text-yellow-500"}`}>
                {dynamicConclusion.overallQualification || 'Brak oceny kwalifikacji.'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Główne Problemy / Potencjalne Przeszkody (wg AI):</h3>
              {dynamicConclusion.mainIssues && dynamicConclusion.mainIssues.length > 0 ? (
                <ul className="list-disc list-inside ml-4 space-y-1 text-slate-700">
                  {dynamicConclusion.mainIssues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                </ul>
              ) : (
                <p className="text-slate-600">Brak zidentyfikowanych problemów</p>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Krytyczne Informacje do Uzyskania/Weryfikacji (wg AI):</h3>
              {dynamicConclusion.criticalInfoNeeded && dynamicConclusion.criticalInfoNeeded.length > 0 ? (
                <ul className="list-disc list-inside ml-4 space-y-1 text-slate-700">
                  {dynamicConclusion.criticalInfoNeeded.map((info, idx) => <li key={idx}>{info}</li>)}
                </ul>
              ) : (
                <p className="text-slate-600">Brak krytycznych informacji do weryfikacji</p>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Szacowane Prawdopodobieństwo Kwalifikacji:</h3>
              <div className="flex items-center gap-3">
                <BarChart3 size={28} className="text-sky-600 flex-shrink-0" />
                <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                  <div className={`h-8 rounded-full flex items-center justify-center text-white font-bold transition-all duration-500 ease-out ${dynamicConclusion.estimatedProbability >= 70 ? 'bg-green-500' : dynamicConclusion.estimatedProbability >=40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${dynamicConclusion.estimatedProbability}%` }}>
                    {dynamicConclusion.estimatedProbability > 5 ? `${dynamicConclusion.estimatedProbability}%` : ''}
                  </div>
                </div>
                {dynamicConclusion.estimatedProbability <= 5 && <span className="text-sky-700 font-bold ml-2">{dynamicConclusion.estimatedProbability}%</span>}
              </div>
              <p className="text-sm text-slate-600 mt-2">Prawdopodobieństwo uwzględnia modyfikacje badacza. Ocena początkowa AI ({modelDisplayName}): {patientProfile.reportConclusion?.estimatedProbability || 0}%.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="mt-12 text-center text-sm text-slate-500 py-6 border-t border-slate-200">
        <p>&copy; {new Date().getFullYear()} Aplikacja Raportów Pre-screeningowych. Wszelkie prawa zastrzeżone.</p>
        <p>Wygenerowano: {new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}</p>
         <button 
          onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
          className="mt-4 px-4 py-2 text-sm bg-sky-100 text-sky-700 rounded-md hover:bg-sky-200 transition-colors"
        >
          Analizuj nowego pacjenta
        </button>
      </footer>
    </div>
  );
};

export default App;
