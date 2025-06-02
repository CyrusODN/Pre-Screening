import React, { useState } from 'react';
import { Brain, Quote, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Eye, Shield, Heart, Users, Lightbulb, Target, X } from 'lucide-react';
import type { AnalizaGotowosciPsychodelicznej, AnalizaObszaru, Wskaznik, CytatZEHR } from '../types';

interface Props {
  analiza: AnalizaGotowosciPsychodelicznej;
  onClose: () => void;
}

export const NarrativePsychedelicAnalysisView: React.FC<Props> = ({ analiza, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getGotowoscColor = (gotowosc: string) => {
    switch (gotowosc) {
      case 'doskonala': return 'text-green-700 bg-green-50 border-green-200';
      case 'dobra': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'umiarkowana': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'slaba': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'przeciwwskazana': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getDuchBadaniaColor = (duch: string) => {
    switch (duch) {
      case 'bardzo_zgodny': return 'text-green-700 bg-green-50 border-green-200';
      case 'zgodny': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'czescciowo_zgodny': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'niezgodny': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getRyzykoColor = (ryzyko: string) => {
    switch (ryzyko) {
      case 'niskie': return 'text-green-700 bg-green-50';
      case 'umiarkowane': return 'text-yellow-700 bg-yellow-50';
      case 'wysokie': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getObszarIcon = (obszarName: string) => {
    switch (obszarName) {
      case 'motywacjaIOczekiwania': return <Target size={20} className="text-remedy-primary" />;
      case 'introspekacjaIUpsychologicznienie': return <Eye size={20} className="text-remedy-primary" />;
      case 'elastycznoscPoznawcza': return <Lightbulb size={20} className="text-remedy-primary" />;
      case 'silaEgo': return <Shield size={20} className="text-remedy-primary" />;
      case 'przymierzeTerapeutyczne': return <Heart size={20} className="text-remedy-primary" />;
      case 'wsparcieSpoleczne': return <Users size={20} className="text-remedy-primary" />;
      default: return <Brain size={20} className="text-remedy-primary" />;
    }
  };

  const getObszarTitle = (obszarKey: string): string => {
    const titles = {
      motywacjaIOczekiwania: 'Motywacja i Oczekiwania',
      introspekacjaIUpsychologicznienie: 'Zdolność do Introspekcji',
      elastycznoscPoznawcza: 'Elastyczność Poznawcza',
      silaEgo: 'Siła Ego i Zasoby',
      przymierzeTerapeutyczne: 'Przymierze Terapeutyczne',
      wsparcieSpoleczne: 'Wsparcie Społeczne'
    };
    return titles[obszarKey as keyof typeof titles] || obszarKey;
  };

  const formatGotowoscText = (gotowosc: string): string => {
    const texts = {
      doskonala: 'Doskonała',
      dobra: 'Dobra', 
      umiarkowana: 'Umiarkowana',
      slaba: 'Słaba',
      przeciwwskazana: 'Przeciwwskazana'
    };
    return texts[gotowosc as keyof typeof texts] || gotowosc;
  };

  const formatDuchBadaniaText = (duch: string): string => {
    const texts = {
      bardzo_zgodny: 'Bardzo zgodny',
      zgodny: 'Zgodny',
      czescciowo_zgodny: 'Częściowo zgodny',
      niezgodny: 'Niezgodny'
    };
    return texts[duch as keyof typeof texts] || duch;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-remedy-primary to-remedy-accent text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center pr-12">
              <Brain size={28} className="mr-3 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Analiza Gotowości Psychodelicznej</h2>
                <p className="text-white/80 mt-1">Narracyjna ocena kliniczna na podstawie dokumentacji EHR</p>
              </div>
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 transition-all duration-200 rounded-lg p-2 text-white hover:text-white"
              title="Zamknij analizę"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Readiness */}
              <div className={`p-4 rounded-lg border-2 ${getGotowoscColor(analiza.ogolnaGotowosc)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Ogólna Gotowość</h3>
                    <p className="text-xl font-bold">{formatGotowoscText(analiza.ogolnaGotowosc)}</p>
                  </div>
                  <Shield size={24} />
                </div>
              </div>

              {/* Study Spirit */}
              <div className={`p-4 rounded-lg border-2 ${getDuchBadaniaColor(analiza.duchBadania)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Duch Badania</h3>
                    <p className="text-xl font-bold">{formatDuchBadaniaText(analiza.duchBadania)}</p>
                  </div>
                  <Heart size={24} />
                </div>
              </div>

              {/* Confidence Level */}
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-700">Poziom Pewności</h3>
                    <p className="text-xl font-bold text-gray-800">{analiza.poziomPewnosci}%</p>
                  </div>
                  <Target size={24} className="text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Overall Assessment */}
          <SectionCard
            title="Ogólna Ocena Kliniczna"
            isExpanded={expandedSections.has('summary')}
            onToggle={() => toggleSection('summary')}
            icon={<Brain size={20} />}
          >
            <div className="space-y-4">
              <div className="bg-remedy-light p-4 rounded-lg border border-gray-200">
                <p className="text-gray-800 leading-relaxed">{analiza.ogolnaOcena}</p>
              </div>
              
              {analiza.klucoweZalecenia.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Kluczowe Zalecenia:</h4>
                  <ul className="space-y-2">
                    {analiza.klucoweZalecenia.map((zalecenie, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle size={16} className="text-remedy-600 mt-1 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{zalecenie}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Clinical Areas Analysis */}
          {Object.entries(analiza.obszary).map(([key, obszar]) => (
            <SectionCard
              key={key}
              title={getObszarTitle(key)}
              isExpanded={expandedSections.has(key)}
              onToggle={() => toggleSection(key)}
              icon={getObszarIcon(key)}
            >
              <ObszarAnalysisView obszar={obszar} />
            </SectionCard>
          ))}

          {/* Metadata */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Data analizy:</span><br />
                {new Date(analiza.dataAnalzy).toLocaleString('pl-PL')}
              </div>
              <div>
                <span className="font-medium">Jakość danych:</span><br />
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  analiza.jakoscDanych === 'wysoka' ? 'bg-green-100 text-green-800' :
                  analiza.jakoscDanych === 'umiarkowana' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {analiza.jakoscDanych}
                </span>
              </div>
              <div>
                <span className="font-medium">Analiza narracyjna:</span><br />
                Zaawansowana ocena kontekstualna
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children, isExpanded, onToggle, icon }) => (
  <div className="border-b border-gray-200">
    <button
      onClick={onToggle}
      className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        {icon}
        <h3 className="text-lg font-semibold text-gray-800 ml-3">{title}</h3>
      </div>
      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {isExpanded && (
      <div className="px-6 pb-6">
        {children}
      </div>
    )}
  </div>
);

interface ObszarAnalysisViewProps {
  obszar: AnalizaObszaru;
}

const ObszarAnalysisView: React.FC<ObszarAnalysisViewProps> = ({ obszar }) => {
  const getRyzykoColor = (ryzyko: string) => {
    switch (ryzyko) {
      case 'niskie': return 'text-green-700 bg-green-50 border-green-200';
      case 'umiarkowane': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'wysokie': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Level */}
      <div className={`p-3 rounded-lg border ${getRyzykoColor(obszar.poziomRyzyka)}`}>
        <div className="flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          <span className="font-medium text-sm">
            Poziom ryzyka: <span className="font-bold">{obszar.poziomRyzyka}</span>
          </span>
        </div>
      </div>

      {/* Main Analysis */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Analiza Narracyjna:</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-800 leading-relaxed">{obszar.analiza}</p>
        </div>
      </div>

      {/* Supporting Citations */}
      {obszar.wspierajaceCytaty.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Wspierające Cytaty z EHR:</h4>
          <div className="space-y-3">
            {obszar.wspierajaceCytaty.map((cytat, index) => (
              <CitationCard key={index} cytat={cytat} />
            ))}
          </div>
        </div>
      )}

      {/* Indicators */}
      {obszar.wskazniki.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Wskaźniki Kliniczne:</h4>
          <div className="space-y-2">
            {obszar.wskazniki.map((wskaznik, index) => (
              <IndicatorCard key={index} wskaznik={wskaznik} />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-remedy-light p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-remedy-primary mb-2">Podsumowanie:</h4>
        <p className="text-gray-700">{obszar.podsumowanie}</p>
      </div>
    </div>
  );
};

interface CitationCardProps {
  cytat: CytatZEHR;
}

const CitationCard: React.FC<CitationCardProps> = ({ cytat }) => (
  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
    <div className="flex items-start">
      <Quote size={16} className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
      <div className="flex-grow">
        <p className="text-gray-800 italic mb-2">"{cytat.tekst}"</p>
        <div className="text-sm text-gray-600">
          <p><strong>Źródło:</strong> {cytat.zrodlo}</p>
          <p><strong>Znaczenie:</strong> {cytat.znaczenie}</p>
        </div>
      </div>
    </div>
  </div>
);

interface IndicatorCardProps {
  wskaznik: Wskaznik;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ wskaznik }) => {
  const getIndicatorStyle = (typ: string) => {
    switch (typ) {
      case 'pozytywny': return 'bg-green-50 border-green-200 text-green-800';
      case 'negatywny': return 'bg-red-50 border-red-200 text-red-800';
      case 'mieszany': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIndicatorIcon = (typ: string) => {
    switch (typ) {
      case 'pozytywny': return <CheckCircle size={16} className="text-green-600" />;
      case 'negatywny': return <XCircle size={16} className="text-red-600" />;
      case 'mieszany': return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <AlertTriangle size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getIndicatorStyle(wskaznik.typ)}`}>
      <div className="flex items-start">
        {getIndicatorIcon(wskaznik.typ)}
        <div className="ml-3">
          <span className="font-medium capitalize">{wskaznik.typ}:</span>
          <span className="ml-2">{wskaznik.opis}</span>
        </div>
      </div>
    </div>
  );
}; 