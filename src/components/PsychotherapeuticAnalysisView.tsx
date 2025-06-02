// ============================================================================
// PSYCHOTHERAPEUTIC ANALYSIS VIEW - Professional Supplementary Assessment
// ============================================================================

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PsychotherapeuticAnalysis } from '../types/index';
import { 
  Brain, 
  Heart, 
  Shield, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Target,
  Award,
  X,
  Lightbulb,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

export interface PsychotherapeuticAnalysisViewProps {
  analysisResult: PsychotherapeuticAnalysis;
  onClose?: () => void;
}

export const PsychotherapeuticAnalysisView: React.FC<PsychotherapeuticAnalysisViewProps> = ({
  analysisResult,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'readiness' | 'setting' | 'psychedelic' | 'narrative'>('overview');

  const getReadinessColor = (value: string) => {
    const colorMap = {
      'Bardzo dobra': 'from-green-500 to-emerald-600 text-white',
      'Dobra': 'from-green-400 to-green-500 text-white',
      'Średnia': 'from-yellow-400 to-orange-500 text-white',
      'Słaba': 'from-orange-500 to-red-500 text-white',
      'Przeciwwskazana': 'from-red-600 to-red-700 text-white',
      'Bardzo silne': 'from-green-500 to-emerald-600 text-white',
      'Silne': 'from-green-400 to-green-500 text-white',
      'Bardzo wysoka': 'from-green-500 to-emerald-600 text-white',
      'Wysoka': 'from-green-400 to-green-500 text-white',
      'Bardzo realistyczne': 'from-green-500 to-emerald-600 text-white',
      'Realistyczne': 'from-green-400 to-green-500 text-white',
      'Bardzo stabilne': 'from-green-500 to-emerald-600 text-white',
      'Stabilne': 'from-green-400 to-green-500 text-white',
      'Bardzo komfortowe': 'from-green-500 to-emerald-600 text-white',
      'Komfortowe': 'from-green-400 to-green-500 text-white',
      'Naturalne': 'from-green-500 to-emerald-600 text-white',
      'Zaawansowane': 'from-green-500 to-emerald-600 text-white',
      'Dobre': 'from-green-400 to-green-500 text-white',
      'Bardzo pozytywne': 'from-green-500 to-emerald-600 text-white',
      'Pozytywne': 'from-green-400 to-green-500 text-white',
      'Adaptacyjne': 'from-green-400 to-green-500 text-white',
      'Bardzo elastyczne': 'from-green-500 to-emerald-600 text-white',
      'Elastyczne': 'from-green-400 to-green-500 text-white',
      'Znakomita': 'from-green-500 to-emerald-600 text-white',
      'Dość stabilna z obszarami trudności': 'from-yellow-400 to-orange-500 text-white',
      'Możliwe': 'from-yellow-400 to-orange-500 text-white',
      'Nieco magiczne': 'from-yellow-400 to-orange-500 text-white',
      'Neutralne': 'from-yellow-400 to-orange-500 text-white',
      'Podstawowe': 'from-yellow-400 to-orange-500 text-white',
      'Mieszane': 'from-yellow-400 to-orange-500 text-white',
      'Częściowa': 'from-yellow-400 to-orange-500 text-white',
      'Sztywne': 'from-orange-500 to-red-500 text-white',
      'Trudne': 'from-orange-500 to-red-500 text-white',
      'Bardzo trudne': 'from-red-600 to-red-700 text-white',
      'Niemożliwe': 'from-red-600 to-red-700 text-white',
      'Niska': 'from-orange-500 to-red-500 text-white',
      'Bardzo niska': 'from-red-600 to-red-700 text-white',
      'Regresywne': 'from-orange-500 to-red-500 text-white',
      'Patologiczne': 'from-red-600 to-red-700 text-white',
      'Problematyczna': 'from-orange-500 to-red-500 text-white',
      'Trudna do nawiązania': 'from-red-600 to-red-700 text-white',
      'Magiczne/nierzeczywiste': 'from-red-600 to-red-700 text-white',
      'Chaotyczne': 'from-red-600 to-red-700 text-white',
      'Brak': 'from-gray-400 to-gray-500 text-white',
      'Brak doświadczenia': 'from-gray-400 to-gray-500 text-white',
    };
    return colorMap[value as keyof typeof colorMap] || 'from-gray-400 to-gray-500 text-white';
  };

  const FactorCard: React.FC<{
    title: string;
    factor: any;
    icon: React.ReactNode;
  }> = ({ title, factor, icon }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-remedy-primary to-remedy-accent rounded-lg">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getReadinessColor(factor.value)}`}>
            {factor.value}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Pewność: {factor.confidence}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Uzasadnienie:</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{factor.rationale}</p>
        </div>

        {factor.clinicalEvidence.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Dowody kliniczne:</h4>
            <ul className="space-y-1">
              {factor.clinicalEvidence.map((evidence: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-600 flex items-start">
                  <span className="w-1.5 h-1.5 bg-remedy-accent rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(factor.greenFlags?.length > 0 || factor.redFlags?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factor.greenFlags?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mocne strony:
                </h4>
                <ul className="space-y-1">
                  {factor.greenFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="text-xs text-green-600 flex items-start">
                      <span className="w-1 h-1 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {factor.redFlags?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Obszary ryzyka:
                </h4>
                <ul className="space-y-1">
                  {factor.redFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="text-xs text-red-600 flex items-start">
                      <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const SummaryCard: React.FC<{
    title: string;
    items: string[];
    type: 'strengths' | 'risks' | 'recommendations' | 'needs' | 'support';
  }> = ({ title, items, type }) => {
    const getTypeConfig = () => {
      switch (type) {
        case 'strengths':
          return { icon: <Award className="w-4 h-4" />, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-50', textColor: 'text-green-800' };
        case 'risks':
          return { icon: <AlertTriangle className="w-4 h-4" />, color: 'from-red-500 to-red-600', bgColor: 'bg-red-50', textColor: 'text-red-800' };
        case 'recommendations':
          return { icon: <Lightbulb className="w-4 h-4" />, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-800' };
        case 'needs':
          return { icon: <Target className="w-4 h-4" />, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-800' };
        case 'support':
          return { icon: <Users className="w-4 h-4" />, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-800' };
      }
    };

    const config = getTypeConfig();

    return (
      <div className={`${config.bgColor} rounded-xl p-6 border border-gray-100`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2 bg-gradient-to-r ${config.color} text-white rounded-lg`}>
            {config.icon}
          </div>
          <h3 className={`text-lg font-bold ${config.textColor}`}>{title}</h3>
        </div>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className={`text-sm ${config.textColor} flex items-start`}>
              <span className={`w-1.5 h-1.5 rounded-full mt-2 mr-3 flex-shrink-0 ${config.color.includes('green') ? 'bg-green-500' : 
                config.color.includes('red') ? 'bg-red-500' : 
                config.color.includes('blue') ? 'bg-blue-500' : 
                config.color.includes('purple') ? 'bg-purple-500' : 'bg-indigo-500'}`}></span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Overall Readiness Header */}
      <div className="text-center">
        <div className={`inline-flex items-center px-8 py-4 rounded-2xl text-2xl font-bold bg-gradient-to-r ${getReadinessColor(analysisResult.summary.overallReadiness)} shadow-lg`}>
          <Award className="w-6 h-6 mr-3" />
          Ogólna gotowość: {analysisResult.summary.overallReadiness}
        </div>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
          Kompleksowa ocena psychoterapeutyczna uzupełniająca analizę kliniczną, skupiająca się na gotowości do terapii psychodelicznej
        </p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryCard 
          title="Kluczowe mocne strony" 
          items={analysisResult.summary.keyStrengths} 
          type="strengths" 
        />
        <SummaryCard 
          title="Główne obszary ryzyka" 
          items={analysisResult.summary.keyRisks} 
          type="risks" 
        />
        <SummaryCard 
          title="Zalecenia terapeutyczne" 
          items={analysisResult.summary.therapeuticRecommendations} 
          type="recommendations" 
        />
        <SummaryCard 
          title="Potrzeby przygotowawcze" 
          items={analysisResult.summary.preparationNeeds} 
          type="needs" 
        />
      </div>

      {analysisResult.summary.integrationSupport.length > 0 && (
        <SummaryCard 
          title="Wsparcie w integracji" 
          items={analysisResult.summary.integrationSupport} 
          type="support" 
        />
      )}
    </div>
  );

  const renderReadiness = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FactorCard 
        title="Struktura osobowości"
        factor={analysisResult.psychotherapeuticReadiness.personalityStructure}
        icon={<Brain className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Siła ego"
        factor={analysisResult.psychotherapeuticReadiness.egoStrength}
        icon={<Shield className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Przetwarzanie traumy"
        factor={analysisResult.psychotherapeuticReadiness.traumaProcessingCapacity}
        icon={<Heart className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Wzorce obronne"
        factor={analysisResult.psychotherapeuticReadiness.defensePatterns}
        icon={<Shield className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Zdolność integracji"
        factor={analysisResult.psychotherapeuticReadiness.integrationCapacity}
        icon={<Zap className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Sojusz terapeutyczny"
        factor={analysisResult.psychotherapeuticReadiness.therapeuticAlliance}
        icon={<Users className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Otwartość"
        factor={analysisResult.psychotherapeuticReadiness.openness}
        icon={<Eye className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Elastyczność radzenia sobie"
        factor={analysisResult.psychotherapeuticReadiness.copingFlexibility}
        icon={<TrendingUp className="w-5 h-5 text-white" />}
      />
    </div>
  );

  const renderSetting = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FactorCard 
        title="Gotowość motywacyjna"
        factor={analysisResult.setSettingFactors.motivationalReadiness}
        icon={<Target className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Realizm oczekiwań"
        factor={analysisResult.setSettingFactors.expectationRealism}
        icon={<Eye className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Zdolność do oddania kontroli"
        factor={analysisResult.setSettingFactors.surrenderCapacity}
        icon={<Heart className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Stabilność środowiskowa"
        factor={analysisResult.setSettingFactors.environmentalStability}
        icon={<Shield className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="System wsparcia"
        factor={analysisResult.setSettingFactors.supportSystem}
        icon={<Users className="w-5 h-5 text-white" />}
      />
    </div>
  );

  const renderPsychedelic = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FactorCard 
        title="Radzenie z doświadczeniami dysocjacyjnymi"
        factor={analysisResult.psychedelicFactors.dissociativeExperienceHandling}
        icon={<Brain className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Komfort ze stanami zmienionymi"
        factor={analysisResult.psychedelicFactors.altereredStatesComfort}
        icon={<Eye className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Rezygnacja z kontroli"
        factor={analysisResult.psychedelicFactors.controlRelinquishing}
        icon={<Heart className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Umiejętności mindfulness"
        factor={analysisResult.psychedelicFactors.mindfulnessSkills}
        icon={<Target className="w-5 h-5 text-white" />}
      />
      <FactorCard 
        title="Poprzednie doświadczenia psychodeliczne"
        factor={analysisResult.psychedelicFactors.previousPsychedelicExperience}
        icon={<Zap className="w-5 h-5 text-white" />}
      />
    </div>
  );

  const renderNarrative = () => (
    <div className="space-y-8">
      {Object.entries(analysisResult.narrativeAssessment).map(([key, content]) => {
        const titles = {
          personalityDynamics: 'Dynamika osobowości',
          traumaAndDefenses: 'Trauma i mechanizmy obronne',
          therapeuticRelationship: 'Relacja terapeutyczna',
          readinessAssessment: 'Ocena gotowości',
          riskMitigation: 'Minimalizacja ryzyka',
          preparationPlan: 'Plan przygotowania'
        };

        return (
          <div key={key} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-remedy-accent" />
              {titles[key as keyof typeof titles]}
            </h3>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({children}) => <h1 className="text-lg font-bold text-gray-900 mb-3 mt-6 first:mt-0">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-bold text-gray-800 mb-2 mt-4">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-3">{children}</h3>,
                  p: ({children}) => <p className="text-gray-700 mb-3 leading-relaxed text-sm">{children}</p>,
                  strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700 text-sm">{children}</ul>,
                  li: ({children}) => <li className="ml-2">{children}</li>
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Przegląd', icon: <Award className="w-4 h-4" /> },
    { id: 'readiness', label: 'Gotowość psychoterapeutyczna', icon: <Brain className="w-4 h-4" /> },
    { id: 'setting', label: 'Set & Setting', icon: <Heart className="w-4 h-4" /> },
    { id: 'psychedelic', label: 'Czynniki psychodeliczne', icon: <Zap className="w-4 h-4" /> },
    { id: 'narrative', label: 'Analiza narracyjna', icon: <Lightbulb className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-remedy-primary to-remedy-accent p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center">
                <Brain className="w-6 h-6 mr-3" />
                Analiza psychoterapeutyczna (uzupełniająca)
              </h1>
              <p className="text-remedy-light/90">
                Specjalistyczna ocena gotowości do terapii psychodelicznej na podstawie analizy klinicznej
              </p>
            </div>
            
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Zamknij analizę"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-remedy-accent text-remedy-primary bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'readiness' && renderReadiness()}
          {activeTab === 'setting' && renderSetting()}
          {activeTab === 'psychedelic' && renderPsychedelic()}
          {activeTab === 'narrative' && renderNarrative()}
        </div>
      </div>
    </div>
  );
}; 