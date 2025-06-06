// src/App.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ListChecks, 
  Stethoscope, 
  Target, 
  BarChart3, 
  FileText, 
  TrendingUp,
  CalendarDays,
  Clock,
  Brain,
  FolderOpen,
  Pill,
  TestTube,
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  HelpCircle, 
  User, 
  Info, 
  Filter, 
  ArrowDownUp, 
  Edit3, 
  Save, 
  RotateCcw, 
  Printer, 
  X, 
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DetailedTrdTimelineChart } from './components/charts/DetailedTrdTimelineChart';
import { EnteringScreen } from './components/EnteringScreen';
import { PrintableReport } from './components/PrintableReport';
import { Logo } from './components/Logo';
import { ChatButton } from './components/ChatButton';
import { ChatWindow } from './components/ChatWindow';
import { StorageTestButton } from './components/StorageTestButton';
import { SaveAnalysisButton } from './components/SaveAnalysisButton';
import { SavedAnalysesManager } from './components/SavedAnalysesManager';
import { PsychotherapeuticAnalysisView } from './components/PsychotherapeuticAnalysisView';
import { PdfAnonymizer } from './components/PdfAnonymizer';
import { initialPatientData, demoPatientData } from './data/mockData';
import { analyzePatientData } from './services/ai';
import { DrugMappingDemo } from './components/DrugMappingDemo';
import { chatbotService } from './services/chatbotService';
import { saveToHistory } from './services/patientHistory';
import { AnalysisHistoryService } from './services/AnalysisHistoryService';
import { generateRealPsychotherapeuticAnalysis } from './services/psychotherapeuticAnalysisService';
import type { PatientData, SupportedAIModel, Criterion } from './types'; 
import { getAIConfig } from './config/aiConfig'; 
import './styles/print.css';

const getEffectiveStatus = (criterion: Criterion) => criterion.userStatus || criterion.status;

const getStatusColor = (status: string | null | undefined) => {
  switch (status) {
    case 'spełnia':
    case 'spełnione': 
    case 'prawdopodobnie spełnione':
    case 'prawdopodobnie OK':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'nie spełnia':
    case 'niespełnione':
    case 'potencjalne wykluczenie':
    case 'problem/weryfikacja':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'częściowo spełnia':
    case 'weryfikacja':
    case 'potencjalnie niespełnione/weryfikacja':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'nie dotyczy': 
      return 'text-gray-500 bg-gray-50 border-gray-200';
    default: 
      return 'text-gray-400 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string | null | undefined) => {
  switch (status) {
    case 'spełnia':
    case 'spełnione':
    case 'prawdopodobnie spełnione':
    case 'prawdopodobnie OK':
      return <CheckCircle2 size={14} />;
    case 'nie spełnia':
    case 'niespełnione':
    case 'potencjalne wykluczenie':
    case 'problem/weryfikacja':
      return <XCircle size={14} />;
    case 'częściowo spełnia':
    case 'weryfikacja':
    case 'potencjalnie niespełnione/weryfikacja':
      return <AlertTriangle size={14} />;
    case 'nie dotyczy': 
      return <HelpCircle size={14} />;
    default: 
      return <HelpCircle size={14} />;
  }
};

const USER_STATUS_OPTIONS = [
  { value: 'spełnione_manual', label: 'Spełnione (ocena badacza)' },
  { value: 'niespełnione_manual', label: 'Niespełnione (ocena badacza)' },
  { value: 'weryfikacja_manual', label: 'Wymaga weryfikacji (ocena badacza)' },
];

const AccordionItem: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="card-remedy">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center text-lg font-bold text-gray-900">
          <div className="icon-circle mr-3">
            {icon}
          </div>
          <span>{title}</span>
        </div>
        <ChevronDown size={20} className={`text-remedy-accent transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-4 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

const EditCriterionModal: React.FC<{criterion: Criterion, onClose: () => void, onSave: (id: string, status: string, comment: string) => void}> = ({ criterion, onClose, onSave }) => {
  const [newStatus, setNewStatus] = useState<string>(criterion.userStatus || criterion.status || '');
  const [comment, setComment] = useState<string>(criterion.userComment || '');
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
                <option value="spełnia">Spełnia</option>
                <option value="nie spełnia">Nie spełnia</option>
                <option value="częściowo spełnia">Częściowo spełnia</option>
                <option value="nie dotyczy">Nie dotyczy</option>
                <option value="spełnia_manual">Spełnia (zmienione przez badacza)</option>
                <option value="niespełnia_manual">Niespełnia (zmienione przez badacza)</option>
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
  const [filter, setFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('id');
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const statusOrder: Record<string, number> = { 
    'problem/weryfikacja': 1, 
    'potencjalne wykluczenie': 1, 
    'niespełnione_manual': 1,
    'niespełnione': 1,
    'nie spełnia': 1,
    'potencjalnie niespełnione/weryfikacja': 2, 
    'weryfikacja': 2, 
    'weryfikacja_manual': 2,
    'częściowo spełnia': 2,
    'prawdopodobnie spełnione': 3, 
    'prawdopodobnie OK': 3, 
    'spełnione': 4, 
    'spełnione_manual': 4,
    'spełnia': 4,
    'nie dotyczy': 5
  };
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
    return (
      <div className="p-6 bg-gradient-to-br from-remedy-light to-white rounded-xl shadow-lg border border-remedy-border">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-remedy-primary/20 to-remedy-accent/20 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-remedy-primary" />
          </div>
          <p className="text-slate-500 font-medium">Brak danych do wyświetlenia wykresu</p>
          <p className="text-slate-400 text-sm mt-1">{title}</p>
        </div>
      </div>
    );
  }

  const statusCounts = criteriaData.reduce((acc, criterion) => {
    const effectiveStatus = getEffectiveStatus(criterion);
    let statusLabel: string;
    
    // POPRAWKA: Najpierw sprawdź statusy negatywne/problematyczne (żeby "niespełnione" nie było mylone z "spełnione")
    if (effectiveStatus?.includes('nie spełnia') || 
        effectiveStatus?.includes('niespełnione') || 
        effectiveStatus?.includes('wykluczenie') || 
        effectiveStatus?.includes('problem') ||
        effectiveStatus === 'potencjalne wykluczenie' || 
        effectiveStatus === 'problem/weryfikacja' ||
        effectiveStatus === 'niespełnione_manual' ||
        effectiveStatus === 'nie spełnia') {
      statusLabel = 'Negatywne / Problem';
    } 
    // Pozytywne statusy - sprawdź po negatywnych
    else if (effectiveStatus?.includes('spełnia') || effectiveStatus?.includes('spełnione') || effectiveStatus?.includes('OK')) {
      statusLabel = 'Pozytywne / OK';
    } 
    // Wszystko inne do weryfikacji
    else {
      statusLabel = 'Do Weryfikacji';
    }
    
    acc[statusLabel] = (acc[statusLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  
  // Nowoczesne kolory gradientowe zgodne z motywem aplikacji
  const COLORS: Record<string, string> = { 
    'Pozytywne / OK': '#10b981', // emerald-500
    'Negatywne / Problem': '#ef4444', // red-500
    'Do Weryfikacji': '#f59e0b' // amber-500
  };
  
  // Kolory gradientowe dla lepszego efektu wizualnego
  const GRADIENT_COLORS: Record<string, string> = {
    'Pozytywne / OK': 'url(#greenGradient)',
    'Negatywne / Problem': 'url(#redGradient)', 
    'Do Weryfikacji': 'url(#amberGradient)'
  };
  
  const RADIAN = Math.PI / 180;
  
  interface CustomizedLabelProps {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string; value: number;
  }
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: CustomizedLabelProps) => {
    if (percent * 100 < 8) return null; // Ukryj etykiety dla małych segmentów
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        fontSize="11px" 
        fontWeight="600"
        className="drop-shadow-sm"
      >
        {`${value}`}
      </text>
    );
  };

  // Niestandardowy tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = criteriaData.length;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-remedy-border backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[data.name] }}
            />
            <span className="font-semibold text-slate-800 text-sm">{data.name}</span>
          </div>
          <div className="text-xs text-slate-600">
            <div>Liczba: <span className="font-medium text-slate-800">{data.value}</span></div>
            <div>Procent: <span className="font-medium text-slate-800">{percentage}%</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Niestandardowa legenda
  const CustomLegend = ({ payload }: any) => {
    const total = criteriaData.length;
    
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.payload.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center gap-2 bg-gradient-to-r from-remedy-light/50 to-white px-3 py-2 rounded-lg border border-remedy-border/30">
              <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <div className="text-xs">
                <div className="font-medium text-slate-800">{entry.value}</div>
                <div className="text-slate-500">{percentage}%</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (data.length === 0) return (
    <div className="p-6 bg-gradient-to-br from-remedy-light to-white rounded-xl shadow-lg border border-remedy-border">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-remedy-primary/20 to-remedy-accent/20 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-remedy-primary" />
        </div>
        <p className="text-slate-500 font-medium">Brak danych do wyświetlenia wykresu</p>
        <p className="text-slate-400 text-sm mt-1">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-remedy-light via-white to-remedy-secondary/5 rounded-xl shadow-lg border border-remedy-border hover:shadow-xl transition-all duration-300">
      {/* Header z ikoną */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-remedy-primary to-remedy-accent rounded-lg flex items-center justify-center shadow-md">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 bg-gradient-to-r from-remedy-primary to-remedy-accent bg-clip-text text-transparent">
            {title}
          </h4>
        </div>
      </div>

      {/* Statystyki podsumowujące */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-white/60 rounded-lg border border-remedy-border/30">
          <div className="text-lg font-bold text-slate-800">{criteriaData.length}</div>
          <div className="text-xs text-slate-600 font-medium">Łącznie</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg border border-remedy-border/30">
          <div className="text-lg font-bold text-emerald-600">
            {statusCounts['Pozytywne / OK'] || 0}
          </div>
          <div className="text-xs text-slate-600 font-medium">Pozytywne</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg border border-remedy-border/30">
          <div className="text-lg font-bold text-red-500">
            {statusCounts['Negatywne / Problem'] || 0}
          </div>
          <div className="text-xs text-slate-600 font-medium">Problemy</div>
        </div>
      </div>

      {/* Wykres kołowy */}
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          {/* Definicje gradientów */}
          <defs>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#059669" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
            </linearGradient>
          </defs>
          
          <Pie 
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={120}
            innerRadius={40} // Dodanie wewnętrznego promienia dla efektu donut
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            stroke="white"
            strokeWidth={3}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={GRADIENT_COLORS[entry.name] || COLORS[entry.name] || '#8884d8'}
                className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Dodatkowe informacje */}
      <div className="mt-4 p-3 bg-gradient-to-r from-remedy-light/30 to-remedy-secondary/10 rounded-lg border border-remedy-border/30">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
          <Info className="w-3 h-3" />
          <span className="font-medium">
            Analiza {criteriaData.length} kryteriów • 
            Sukces: {(((statusCounts['Pozytywne / OK'] || 0) / criteriaData.length) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPsychotherapeuticAnalysis, setShowPsychotherapeuticAnalysis] = useState(false);

  const [hasSubmittedData, setHasSubmittedData] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientData | null>(null);
  const [selectedAIModel, setSelectedAIModel] = useState<SupportedAIModel>('gemini');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [enableSpecialistAnalysis, setEnableSpecialistAnalysis] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasChatSession, setHasChatSession] = useState(false);
  const [showDrugDemo, setShowDrugDemo] = useState(false);
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
  const [showPdfAnonymizer, setShowPdfAnonymizer] = useState(false);
  const [originalAnalysisData, setOriginalAnalysisData] = useState<{medicalHistory: string, studyProtocol: string} | null>(null);

  const [dynamicConclusion, setDynamicConclusion] = useState({
    overallQualification: '',
    mainIssues: [] as string[],
    criticalInfoNeeded: [] as string[],
    estimatedProbability: 0,
    riskFactors: [] as string[]
  });

  // Stan dla zanonimizowanych danych z PDF
  const [anonymizedPdfData, setAnonymizedPdfData] = useState<{
    texts: string[];
    sessionIds: string[];
    combinedText: string;
    fileCount: number;
  } | null>(null);

  const handleDataSubmit = async (data: { protocol: string; medicalHistory: string; selectedAIModel: SupportedAIModel }) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setPatientProfile(null);

    console.log('🚀 Rozpoczynam analizę...');
    console.log('📊 Model AI:', data.selectedAIModel);
    console.log('🏥 Analiza specjalistyczna:', enableSpecialistAnalysis ? 'włączona' : 'wyłączona');

    // Użyj zanonimizowanych danych PDF jeśli są dostępne, inaczej dane z formularza
    const medicalHistoryToUse = anonymizedPdfData ? anonymizedPdfData.combinedText : data.medicalHistory;
    
    if (anonymizedPdfData) {
      console.log(`📄 Używam zanonimizowanych danych PDF (${anonymizedPdfData.fileCount} plików, ${medicalHistoryToUse.length} znaków)`);
    }

    try {
      const result = await analyzePatientData(
        data.protocol,
        medicalHistoryToUse,
        data.selectedAIModel,
        enableSpecialistAnalysis
      );

      setPatientProfile(result);
      setHasSubmittedData(true);
      setOriginalAnalysisData({
        medicalHistory: medicalHistoryToUse,
        studyProtocol: data.protocol,
      });

      // Cleanup zanonimizowanych danych po użyciu
      if (anonymizedPdfData) {
        setTimeout(async () => {
          try {
            await Promise.all(
              anonymizedPdfData.sessionIds.map(sessionId =>
                fetch(`http://localhost:3001/api/pdf-session/${sessionId}`, {
                  method: 'DELETE'
                })
              )
            );
            console.log(`🧹 ${anonymizedPdfData.sessionIds.length} sesji PDF zostało wyczyszczonych`);
          } catch (error) {
            console.warn('⚠️ Nie udało się wyczyścić niektórych sesji PDF:', error);
          }
        }, 1000);
        
        setAnonymizedPdfData(null); // Wyczyść z pamięci
      }

      // Initialize chatbot session
      try {
        if (enableSpecialistAnalysis) {
          chatbotService.initializeSessionFromMultiAgent(
            result,
            medicalHistoryToUse,
            data.protocol
          );
        } else {
          chatbotService.initializeSessionFromSingleAgent(
            result,
            medicalHistoryToUse,
            data.protocol
          );
        }
        setHasChatSession(true);
        console.log(`✅ Sesja chatbota została zainicjalizowana (${enableSpecialistAnalysis ? 'multi-agent' : 'single-agent'})`);
      } catch (error) {
        console.error('❌ Błąd podczas inicjalizacji chatbota:', error);
        setHasChatSession(false);
      }

      console.log('✅ Analiza zakończona pomyślnie');
    } catch (error) {
      console.error('❌ Błąd podczas analizy:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Nieznany błąd podczas analizy');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistoricalPatient = (patientId: string) => {
    alert(`Funkcja przeglądania historycznych analiz dla pacjenta ${patientId} będzie dostępna wkrótce.`);
  };

  // Funkcja do ładowania danych demonstracyjnych
  const loadDemoData = () => {
    console.log('🎯 Ładowanie danych demonstracyjnych...');
    setHasSubmittedData(true);
    
    // Załaduj dane demo ale bez automatycznego uruchamiania analizy psychodelicznej
    const demoDataWithoutSpecialistAnalysis = {
      ...demoPatientData,
      specialistAnalysis: undefined  // Wyczyść analizę specjalistyczną
    };
    
    setPatientProfile(demoDataWithoutSpecialistAnalysis);
    setAnalysisError(null);
    
    // Inicjalizuj sesję chatbota dla danych demo
    try {
      chatbotService.initializeSessionFromSingleAgent(
        demoDataWithoutSpecialistAnalysis,
        'Demo: Historia choroby pacjenta z danymi demonstracyjnymi',
        'Demo: Protokół badania klinicznego'
      );
      setHasChatSession(true);
      console.log('✅ Sesja chatbota została zainicjalizowana dla danych demo');
    } catch (error) {
      console.error('❌ Błąd podczas inicjalizacji chatbota dla demo:', error);
      setHasChatSession(false);
    }
    
    if (demoPatientData.reportConclusion) {
      setDynamicConclusion({
        overallQualification: demoPatientData.reportConclusion.overallQualification || '',
        mainIssues: demoPatientData.reportConclusion.mainIssues || [],
        criticalInfoNeeded: demoPatientData.reportConclusion.criticalInfoNeeded || [],
        estimatedProbability: demoPatientData.reportConclusion.estimatedProbability || 0,
        riskFactors: demoPatientData.reportConclusion.riskFactors || []
      });
    }
    
    console.log('✅ Dane demonstracyjne załadowane pomyślnie');
  };

  // Funkcja do obsługi PDF upload
  const handlePdfUpload = () => {
    console.log('📄 Inicjowanie PDF upload workflow...');
    setShowPdfAnonymizer(true);
  };

  // Funkcja wywoływana po zakończeniu anonimizacji PDF
  const handleAnonymizedTextReady = (anonymizedTexts: string[], sessionIds: string[]) => {
    console.log(`✅ Otrzymano ${anonymizedTexts.length} zanonimizowanych tekstów z sesji:`, sessionIds);
    
    // Połącz wszystkie zanonimizowane teksty w jeden
    const combinedText = anonymizedTexts.map((text, index) => {
      return `=== DOKUMENT ${index + 1} ===\n\n${text}\n\n`;
    }).join('');
    
    console.log(`📄 Połączono ${anonymizedTexts.length} dokumentów (${combinedText.length} znaków)`);
    
    // Użyj połączonego zanonimizowanego tekstu jako historii choroby
    const defaultProtocol = 'Protokół badania klinicznego'; // Można rozszerzyć
    
    setShowPdfAnonymizer(false);
    
    // Rozpocznij analizę z zanonimizowanym tekstem
    handleDataSubmit({
      protocol: defaultProtocol,
      medicalHistory: combinedText,
      selectedAIModel: selectedAIModel
    });
    
    // Cleanup wszystkich sesji po analizie
    setTimeout(async () => {
      try {
        await Promise.all(
          sessionIds.map(sessionId =>
            fetch(`http://localhost:3001/api/pdf-session/${sessionId}`, {
              method: 'DELETE'
            })
          )
        );
        console.log(`🧹 ${sessionIds.length} sesji PDF zostało wyczyszczonych`);
      } catch (error) {
        console.warn('⚠️ Nie udało się wyczyścić niektórych sesji PDF:', error);
      }
    }, 1000);
  };

  // Funkcja do przechowywania zanonimizowanych danych bez analizy
  const handleAnonymizedDataReady = (anonymizedTexts: string[], sessionIds: string[]) => {
    console.log(`📦 Przygotowano ${anonymizedTexts.length} zanonimizowanych tekstów do analizy`);
    
    // Połącz wszystkie zanonimizowane teksty w jeden
    const combinedText = anonymizedTexts.map((text, index) => {
      return `=== DOKUMENT ${index + 1} ===\n\n${text}\n\n`;
    }).join('');
    
    // Zapisz dane w stanie
    setAnonymizedPdfData({
      texts: anonymizedTexts,
      sessionIds: sessionIds,
      combinedText: combinedText,
      fileCount: anonymizedTexts.length
    });
    
    setShowPdfAnonymizer(false);
    
    console.log(`💾 Zanonimizowane dane zapisane w pamięci (${combinedText.length} znaków, ${anonymizedTexts.length} plików)`);
  };

  // Funkcja do anulowania PDF upload
  const handlePdfUploadCancel = () => {
    console.log('❌ Anulowano PDF upload workflow');
    setShowPdfAnonymizer(false);
  };

  // Funkcja do ładowania zapisanej analizy
  const handleLoadSavedAnalysis = (savedAnalysis: any) => {
    console.log('📖 Ładowanie zapisanej analizy...');
    setHasSubmittedData(true);
    setPatientProfile(savedAnalysis.patientData);
    setAnalysisError(null);
    setShowSavedAnalyses(false);
    
    // Store original data for potential re-saving
    setOriginalAnalysisData({
      medicalHistory: savedAnalysis.medicalHistory || '',
      studyProtocol: savedAnalysis.studyProtocol || '',
    });
    
    // Inicjalizuj sesję chatbota dla zapisanej analizy
    try {
      const analysisType = savedAnalysis.analysisType || 'single-agent';
      if (analysisType === 'multi-agent') {
        chatbotService.initializeSessionFromMultiAgent(
          savedAnalysis.patientData,
          savedAnalysis.medicalHistory || 'Brak danych historii choroby',
          savedAnalysis.studyProtocol || 'Brak danych protokołu'
        );
      } else {
        chatbotService.initializeSessionFromSingleAgent(
          savedAnalysis.patientData,
          savedAnalysis.medicalHistory || 'Brak danych historii choroby',
          savedAnalysis.studyProtocol || 'Brak danych protokołu'
        );
      }
      setHasChatSession(true);
      console.log(`✅ Sesja chatbota została zainicjalizowana dla zapisanej analizy (${analysisType})`);
    } catch (error) {
      console.error('❌ Błąd podczas inicjalizacji chatbota dla zapisanej analizy:', error);
      setHasChatSession(false);
    }
    
    if (savedAnalysis.patientData.reportConclusion) {
      setDynamicConclusion({
        overallQualification: savedAnalysis.patientData.reportConclusion.overallQualification || '',
        mainIssues: savedAnalysis.patientData.reportConclusion.mainIssues || [],
        criticalInfoNeeded: savedAnalysis.patientData.reportConclusion.criticalInfoNeeded || [],
        estimatedProbability: savedAnalysis.patientData.reportConclusion.estimatedProbability || 0,
        riskFactors: savedAnalysis.patientData.reportConclusion.riskFactors || []
      });
    }
    
    console.log('✅ Zapisana analiza załadowana pomyślnie');
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
            (effectiveStatus.includes('spełnia'))) {
            baseProbability = Math.min(100, baseProbability + 5); 
          }
          else if ((initialStatus.includes('spełnia') || initialStatus.includes('OK')) &&
            (effectiveStatus.includes('nie spełnia'))) {
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

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-theme-light p-3 sm:p-4 md:p-6 font-sans flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Logo 
              size="lg" 
              showText={true}
              className="justify-center"
            />
          </div>

          {/* Loading Card */}
          <div className="card-remedy">
            <div className="icon-circle mx-auto mb-4">
              <div role="status" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" aria-label="Ładowanie">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Ładowanie...
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analizowanie danych pacjenta</h2>
            
            {/* Analysis Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="w-2 h-2 bg-remedy-primary rounded-full"></div>
                <span className="text-gray-600">Model: <span className="font-medium text-gray-800">{
                  selectedAIModel === 'gemini' ? 'Gemini 2.5 Pro Preview 05-06' : 
                  selectedAIModel === 'claude-opus' ? 'Claude 4 Opus' :
                  selectedAIModel.toUpperCase()
                }</span></span>
              </div>
              {anonymizedPdfData && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Źródło: <span className="font-medium text-gray-800">{anonymizedPdfData.fileCount} zanonimizowanych PDF-ów</span></span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-500">Przeprowadzam analizę...</p>
            
            {/* Progress Animation */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-remedy-primary to-remedy-accent h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSubmittedData) {
    // If PDF anonymizer is shown, render it
    if (showPdfAnonymizer) {
      return (
        <PdfAnonymizer
          onAnonymizedTextReady={handleAnonymizedTextReady}
          onCancel={handlePdfUploadCancel}
          onAnonymizedDataReady={handleAnonymizedDataReady}
        />
      );
    }

    return <EnteringScreen 
      onDataSubmit={handleDataSubmit}
      onSelectHistoricalPatient={handleSelectHistoricalPatient}
      onLoadDemo={loadDemoData}
      selectedAIModel={selectedAIModel}
      onAIModelChange={setSelectedAIModel}
      enableSpecialistAnalysis={enableSpecialistAnalysis}
      onSpecialistAnalysisChange={setEnableSpecialistAnalysis}
      onLoadSavedAnalysis={handleLoadSavedAnalysis}
      onPdfUpload={handlePdfUpload}
      anonymizedPdfData={anonymizedPdfData}
      onClearAnonymizedData={() => setAnonymizedPdfData(null)}
    />;
  }

  if (!patientProfile || Object.keys(patientProfile).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-theme-light p-3 sm:p-4 md:p-6 font-sans flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo 
            size="lg" 
            showText={true}
            className="justify-center"
          />
        </div>

        {/* Error Card */}
        <div className="card-remedy max-w-lg text-center">
          <div className="icon-circle mx-auto mb-4">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Wystąpił błąd</h2>
          <p className="text-gray-600 mb-3 text-sm">Nie udało się załadować profilu pacjenta. Spróbuj ponownie.</p>
          
          {analysisError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm text-left">
              <p className="font-semibold mb-1">Szczegóły błędu:</p>
              <p>{analysisError}</p>
            </div>
          )}
          
          <button 
            onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
            className="btn-primary mt-4"
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

  // Jeśli pokazujemy demo mapowania leków
  if (showDrugDemo) {
    return (
      <div className="min-h-screen bg-gradient-theme-light py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => setShowDrugDemo(false)}
              className="btn-secondary"
            >
              ← Powrót do aplikacji
            </button>
          </div>
          <DrugMappingDemo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-theme-light py-8 px-3 sm:px-4 lg:px-6 font-sans">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
      
      <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        {/* Logo Header */}
        <div className="flex justify-between items-center mb-8">
          <Logo 
            size="lg" 
            showText={true}
            onClick={() => window.location.reload()}
            className="hover:scale-105 transition-transform duration-300"
          />
          <div className="flex items-center gap-3">
            {/* Save Analysis Button */}
            {patientProfile && originalAnalysisData && (
              <SaveAnalysisButton
                patientData={patientProfile}
                medicalHistory={originalAnalysisData.medicalHistory}
                studyProtocol={originalAnalysisData.studyProtocol}
                className="text-sm"
              />
            )}
            
            {/* Saved Analyses Button */}
            <button
              onClick={() => setShowSavedAnalyses(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="Przeglądaj zapisane analizy"
            >
              <FolderOpen size={16} />
              <span className="hidden sm:inline">Zapisane Analizy</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="no-print btn-primary flex items-center gap-2"
              title="Drukuj raport"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Drukuj Raport</span>
            </button>
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-remedy-light via-white to-remedy-secondary/10 rounded-xl p-6 shadow-lg border border-remedy-border/30">
            <p className="text-xl text-slate-700 font-medium mb-2">Analiza Kwalifikacji Pacjenta</p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-remedy-primary rounded-full"></div>
                <span>Model: <span className="font-medium text-slate-800">{modelDisplayName}</span></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6">
        <section className="card-remedy">
          <div className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <div className="icon-circle mr-3">
              <User size={16} />
            </div>
          <span>Dane Pacjenta: {patientProfile.summary?.id || 'Brak ID'}</span>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600 text-sm">
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

        <AccordionItem title="Wizualizacje Danych" icon={<BarChart3 size={16} />} defaultOpen={true}>
          <div className="grid grid-cols-1 gap-4">
          <DetailedTrdTimelineChart
              patientData={patientProfile}
              enableAIAnalysis={true}
              enablePredictiveAnalytics={true}
              showAdvancedMetrics={true}
              showClinicalInsights={true}
          />
            <div className="lg:col-span-1 mt-4">
            <CriteriaStatusPieChart criteriaData={allCriteriaForChart} title="Ogólny Status Kryteriów (po zmianach)" />
          </div>
        </div>
      </AccordionItem>

        <AccordionItem title="Szacowanie Początku Obecnego Epizodu Depresyjnego" icon={<CalendarDays size={16} />}>
          <div className="space-y-3 text-gray-600 text-sm">
            {(patientProfile.episodeEstimation?.scenarios || []).map(sc => (
              <div key={sc.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p><strong className="font-medium text-gray-900">Scenariusz {sc.id}:</strong> {sc.description}</p>
                <p className="text-sm text-gray-500 mt-1"><em>Przesłanki:</em> {sc.evidence}</p>
              </div>
            ))}
          {(patientProfile.episodeEstimation?.scenarios || []).length === 0 && <p>Brak scenariuszy.</p>}
            <div className="mt-3 p-3 border-t-2 border-gray-300 bg-blue-50 rounded-lg">
              <p><strong className="font-medium text-gray-900">Wnioski dotyczące początku epizodu dla celów badania:</strong></p>
              <p className="mt-2">{patientProfile.episodeEstimation?.conclusion || 'Brak wniosków.'}</p>
            </div>
        </div>
      </AccordionItem>

        <AccordionItem title="Analiza TRD (Kryterium IC6) - Podsumowanie" icon={<Pill size={16} />}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Poniżej znajduje się podsumowanie wniosków z analizy farmakoterapii. Szczegółowa oś czasu leczenia dostępna jest w sekcji "Wizualizacje Danych".</p>
            <p className="font-semibold text-gray-900 text-sm">{patientProfile.trdAnalysis?.conclusion || 'Brak podsumowania analizy TRD.'}</p>
          </div>
      </AccordionItem>

        <AccordionItem title="Kryteria Włączenia (IC)" icon={<ListChecks size={16} />}>
        <CriteriaList criteria={patientProfile.inclusionCriteria || []} title="Inclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('inclusionCriteria', id, status, comment)} />
      </AccordionItem>

        <AccordionItem title="Psychiatryczne Kryteria Wyłączenia (EC)" icon={<AlertTriangle size={16} />}>
        <CriteriaList criteria={patientProfile.psychiatricExclusionCriteria || []} title="PsychiatricExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('psychiatricExclusionCriteria', id, status, comment)} />
      </AccordionItem>

        <AccordionItem title="Ogólne Medyczne Kryteria Wyłączenia (GMEC)" icon={<Stethoscope size={16} />}>
        <CriteriaList criteria={patientProfile.medicalExclusionCriteria || []} title="MedicalExclusion" onUpdateCriterion={(id, status, comment) => handleUpdateCriterion('medicalExclusionCriteria', id, status, comment)} />
      </AccordionItem>

        <section className="card-remedy">
          <div className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <div className="icon-circle mr-3">
              <Target size={16} />
            </div>
          <span>Wniosek Dotyczący Kwalifikacji i Prawdopodobieństwo</span>
        </div>
        <div className="space-y-6">
          <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ogólna Kwalifikacja:</h3>
            <p className={`text-lg font-bold ${dynamicConclusion.overallQualification.toLowerCase().includes("nie kwalifikuje") ? "text-red-600" : dynamicConclusion.overallQualification.toLowerCase().includes("kwalifikuje") ? "text-green-600" : "text-yellow-500"}`}>
              {dynamicConclusion.overallQualification || 'Brak oceny kwalifikacji.'}
            </p>
          </div>
            
          <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Główne Problemy / Potencjalne Przeszkody (wg AI):</h3>
            {dynamicConclusion.mainIssues && dynamicConclusion.mainIssues.length > 0 ? (
                <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600 text-sm">
                {dynamicConclusion.mainIssues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            ) : (
                <p className="text-gray-500 text-sm">Brak zidentyfikowanych problemów</p>
            )}
          </div>
            
          <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Krytyczne Informacje do Uzyskania/Weryfikacji (wg AI):</h3>
            {dynamicConclusion.criticalInfoNeeded && dynamicConclusion.criticalInfoNeeded.length > 0 ? (
                <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600 text-sm">
                {dynamicConclusion.criticalInfoNeeded.map((info, idx) => <li key={idx}>{info}</li>)}
              </ul>
            ) : (
                <p className="text-gray-500 text-sm">Brak krytycznych informacji do weryfikacji</p>
            )}
          </div>
            
          <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Szacowane Prawdopodobieństwo Kwalifikacji:</h3>
            <div className="flex items-center gap-3">
                <div className="icon-circle flex-shrink-0">
                  <BarChart3 size={16} />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div className={`h-8 rounded-full flex items-center justify-center text-white font-bold transition-all duration-500 ease-out text-sm ${dynamicConclusion.estimatedProbability >= 70 ? 'bg-green-500' : dynamicConclusion.estimatedProbability >=40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${dynamicConclusion.estimatedProbability}%` }}>
                    {dynamicConclusion.estimatedProbability > 10 ? `${dynamicConclusion.estimatedProbability}%` : ''}
                  </div>
                </div>
                {dynamicConclusion.estimatedProbability <= 10 && <span className="text-gray-900 font-bold text-sm ml-2">{dynamicConclusion.estimatedProbability}%</span>}
              </div>
          </div>
        </div>
      </section>

      {/* NEW: Psychotherapeutic Analysis Button */}
      <section className="card-remedy bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="icon-circle mr-3 bg-gradient-to-r from-purple-600 to-indigo-600">
              <Brain size={16} />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Pre-Screeningowa Analiza Psychoterapeutyczna</span>
              <p className="text-sm text-gray-600 mt-1">Szczegółowa ocena gotowości do terapii psychodelicznej z perspektywy psychoterapeutycznej</p>
            </div>
          </div>
          <button
            onClick={() => setShowPsychotherapeuticAnalysis(true)}
            className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            🧠 Przeprowadź Analizę
          </button>
        </div>
      </section>

      {/* Psychotherapeutic Analysis Modal */}
      {showPsychotherapeuticAnalysis && (
        <PsychotherapeuticAnalysisView 
          analysisResult={generateRealPsychotherapeuticAnalysis(patientProfile)}
          onClose={() => setShowPsychotherapeuticAnalysis(false)}
        />
      )}
    </main>
      
      <footer className="mt-12 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
      <p>&copy; {new Date().getFullYear()} Aplikacja Raportów Pre-screeningowych. Wszelkie prawa zastrzeżone.</p>
      <p>Wygenerowano: {new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}</p>
      <div className="flex justify-center gap-4 mt-3">
        <button 
          onClick={() => { setHasSubmittedData(false); setAnalysisError(null);}} 
          className="no-print btn-secondary"
        >
          Analizuj nowego pacjenta
        </button>
        <button
          onClick={() => setShowSavedAnalyses(true)}
          className="no-print btn-secondary flex items-center gap-2"
        >
          <FolderOpen size={16} />
          Zapisane Analizy
        </button>
        <button
          onClick={() => setShowDrugDemo(true)}
          className="no-print btn-primary"
        >
          🧪 Demo Mapowania Leków
        </button>
      </div>
      
      {/* Storage Test Button - tylko w trybie deweloperskim */}
      {/* {import.meta.env.DEV && (
        <div className="mt-4 flex justify-center">
          <StorageTestButton />
        </div>
      )} */}
    </footer>
    </div>
    
    {/* Chat Components - tylko w trybie wieloagentowym i po udanej analizie */}
    {hasChatSession && (
      <>
        <ChatButton 
          isOpen={isChatOpen}
          onClick={() => setIsChatOpen(!isChatOpen)}
          hasNewMessages={false}
        />
        <ChatWindow
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </>
    )}
    
    {/* Saved Analyses Manager */}
    {showSavedAnalyses && (
      <SavedAnalysesManager
        onAnalysisSelect={handleLoadSavedAnalysis}
        onClose={() => setShowSavedAnalyses(false)}
      />
    )}
  </div>
);
};

export default App;
