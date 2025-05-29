// ============================================================================
// DETAILED TRD TIMELINE CHART - World-Class Clinical Research Component
// Enhanced with Advanced Analytics and AI-Powered Insights
// ============================================================================

import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  useRef, 
  memo 
} from 'react';
import {
  parseISO, 
  format, 
  differenceInDays, 
  addDays, 
  startOfDay, 
  endOfDay, 
  isValid,
  differenceInHours,
  addHours,
  isWithinInterval,
  differenceInWeeks,
  differenceInMonths
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon, 
  CalendarIcon, 
  ClockIcon, 
  ArrowsPointingOutIcon, 
  XMarkIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  InformationCircleIcon, 
  ChevronUpIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  BeakerIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CpuChipIcon,
  HeartIcon,
  BoltIcon,
  AcademicCapIcon,
  SparklesIcon,
  TrophyIcon,
  LightBulbIcon,
  FireIcon,
  StarIcon,
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { 
  ArrowsPointingInIcon
} from '@heroicons/react/24/solid';
import type { PharmacotherapyItem, PatientData } from '../../types/index';
import { PREDEFINED_PROTOCOLS } from '../../data/protocols';
import { HistoricalContext } from '../HistoricalContext';

// Import the enhanced clinical analysis service
import { 
  clinicalAnalysisService,
  type ProcessedDrugEpisode,
  type ClinicalAnalysisResult,
  type DrugClassificationResult,
  type TreatmentContext,
  type DataQualityAssessment
} from '../../services/clinicalAnalysisService';

// ============================================================================
// ENHANCED CLINICAL RESEARCH INTERFACES
// ============================================================================

// Advanced treatment pattern analysis
interface TreatmentPatternAnalysis {
  patternType: 'sequential' | 'augmentation' | 'combination' | 'switching' | 'cycling';
  complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  adherencePattern: 'consistent' | 'intermittent' | 'poor' | 'unknown';
  responsePattern: 'improving' | 'stable' | 'declining' | 'variable';
  riskFactors: string[];
  clinicalRecommendations: string[];
}

// AI-powered predictive analytics
interface PredictiveAnalytics {
  treatmentSuccessProbability: number; // 0-1
  adverseEventRisk: number; // 0-1
  protocolEligibilityScore: number; // 0-1
  recommendedNextSteps: string[];
  confidenceLevel: number; // 0-1
  aiInsights: string[];
}

// Enhanced drug group with advanced analytics
interface DrugGroup {
  drugName: string;
  shortName: string;
  episodes: ProcessedDrugEpisode[];
  isExpanded: boolean;
  isVisible: boolean;
  color: string;
  
  // Enhanced clinical data
  drugClassification: DrugClassificationResult;
  overallAnalysis: ClinicalAnalysisResult;
  protocolRelevance: ProtocolRelevanceAnalysis;
  treatmentPattern: TreatmentPatternAnalysis;
  predictiveAnalytics: PredictiveAnalytics;
  
  // Legacy fields (maintained for compatibility)
  drugClass: string;
  totalDuration: number;
  maxDose: string;
  efficacyTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  mghAtrqCompliant: boolean;
}

interface ProtocolRelevanceAnalysis {
  isRelevantForCOMP006: boolean;
  contributesToTRDDiagnosis: boolean;
  meetsAdequacyCriteria: boolean;
  hasExclusionaryFindings: boolean;
  clinicalNotes: string[];
  protocolScore: number; // 0-100
  eligibilityConfidence: number; // 0-1
}

// Enhanced timeline event with AI insights
interface TimelineEvent {
  id: string;              
  drugName: string;
  shortName: string;
  dose: string;            
  startDate: Date;
  endDate: Date;
  duration: number;        
  attemptGroup: number;
  notes?: string; 
  color: string;           
  x: number;
  width: number;
  y: number;
  height: number;
  
  // Enhanced clinical data
  clinicalAnalysis: ClinicalAnalysisResult;
  drugClassification: DrugClassificationResult;
  treatmentContext: TreatmentContext;
  predictiveAnalytics: PredictiveAnalytics;
  
  // Visual indicators
  clinicalSignificance: 'low' | 'moderate' | 'high' | 'critical';
  protocolRelevance: 'not_relevant' | 'relevant' | 'critical';
  dataQuality: 'poor' | 'fair' | 'good' | 'excellent';
  aiConfidence: number; // 0-1
  
  // Legacy fields (maintained for compatibility)
  efficacyScore?: number;
  sideEffects?: string[];
  adherence?: number;
  overlaps?: string[];
  washoutPeriod?: number;
  mghAtrqCompliant?: boolean;
}

interface DetailedTrdTimelineChartProps {
  patientData: PatientData;
  className?: string;
  onEventSelect?: (event: TimelineEvent | null) => void;
  initialZoomLevel?: number;
  enableVirtualization?: boolean;
  protocolId?: string; // Default to COMP006
  showClinicalInsights?: boolean;
  enableAIAnalysis?: boolean;
  enablePredictiveAnalytics?: boolean;
  showAdvancedMetrics?: boolean;
}

// ============================================================================
// ADVANCED CLINICAL ANALYTICS FUNCTIONS
// ============================================================================

// Calculate protocol relevance score (0-100)
const calculateProtocolScore = (
  drugClassification: DrugClassificationResult,
  mghCompliant: boolean,
  episodeCount: number,
  totalDuration: number
): number => {
  let score = 0;
  
  // Base score for protocol relevance
  if (drugClassification.isProtocolRelevant) score += 40;
  if (drugClassification.isAntidepressant) score += 20;
  
  // MGH ATRQ compliance bonus
  if (mghCompliant) score += 30;
  
  // Episode count and duration bonus
  if (episodeCount >= 2) score += 5;
  if (totalDuration >= 56) score += 5; // 8 weeks minimum
  
  return Math.min(100, Math.max(0, score));
};

// Calculate eligibility confidence (0-1)
const calculateEligibilityConfidence = (
  drugClassification: DrugClassificationResult,
  mghCompliant: boolean,
  episodes: ProcessedDrugEpisode[]
): number => {
  let confidence = 0.5; // Base confidence
  
  // High confidence factors
  if (drugClassification.confidence > 0.9) confidence += 0.2;
  if (mghCompliant) confidence += 0.2;
  if (episodes.length > 0 && episodes[0].dataQuality.completeness > 0.8) confidence += 0.1;
  
  // Reduce confidence for uncertain classifications
  if (drugClassification.confidence < 0.7) confidence -= 0.2;
  if (episodes.some(e => e.dataQuality.completeness < 0.5)) confidence -= 0.1;
  
  return Math.min(1, Math.max(0, confidence));
};

// AI-powered treatment pattern analysis
const analyzeTreatmentPattern = (episodes: ProcessedDrugEpisode[]): TreatmentPatternAnalysis => {
  if (episodes.length === 0) {
    return {
      patternType: 'sequential',
      complexity: 'simple',
      adherencePattern: 'unknown',
      responsePattern: 'stable',
      riskFactors: [],
      clinicalRecommendations: []
    };
  }

  // Analyze pattern complexity
  const uniqueDrugs = new Set(episodes.map(e => e.drugName));
  const totalDuration = episodes.reduce((sum, e) => sum + differenceInDays(e.parsedEndDate, e.parsedStartDate), 0);
  const avgDuration = totalDuration / episodes.length;
  
  let complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex' = 'simple';
  if (uniqueDrugs.size > 5 && episodes.length > 8) complexity = 'highly_complex';
  else if (uniqueDrugs.size > 3 && episodes.length > 5) complexity = 'complex';
  else if (uniqueDrugs.size > 2 || episodes.length > 3) complexity = 'moderate';

  // Analyze adherence pattern
  const shortEpisodes = episodes.filter(e => differenceInDays(e.parsedEndDate, e.parsedStartDate) < 30).length;
  const adherenceRatio = 1 - (shortEpisodes / episodes.length);
  
  let adherencePattern: 'consistent' | 'intermittent' | 'poor' | 'unknown' = 'unknown';
  if (adherenceRatio > 0.8) adherencePattern = 'consistent';
  else if (adherenceRatio > 0.6) adherencePattern = 'intermittent';
  else adherencePattern = 'poor';

  // Analyze response pattern
  const efficacyScores = episodes.map(e => e.clinicalAnalysis.treatmentResponse.efficacyScore);
  const avgEfficacy = efficacyScores.reduce((sum, score) => sum + score, 0) / efficacyScores.length;
  
  let responsePattern: 'improving' | 'stable' | 'declining' | 'variable' = 'stable';
  if (efficacyScores.length > 1) {
    const trend = efficacyScores[efficacyScores.length - 1] - efficacyScores[0];
    if (trend > 2) responsePattern = 'improving';
    else if (trend < -2) responsePattern = 'declining';
    else if (Math.max(...efficacyScores) - Math.min(...efficacyScores) > 4) responsePattern = 'variable';
  }

  // Generate risk factors
  const riskFactors: string[] = [];
  if (complexity === 'highly_complex') riskFactors.push('Bardzo złożony schemat leczenia');
  if (adherencePattern === 'poor') riskFactors.push('Niska adherencja do terapii');
  if (responsePattern === 'declining') riskFactors.push('Pogarszająca się odpowiedź na leczenie');
  if (episodes.some(e => e.clinicalAnalysis.adverseEvents.hasAdverseEvents)) {
    riskFactors.push('Historia działań niepożądanych');
  }

  // Generate clinical recommendations
  const clinicalRecommendations: string[] = [];
  if (adherencePattern === 'poor') {
    clinicalRecommendations.push('Rozważyć strategie poprawy adherencji');
  }
  if (complexity === 'highly_complex') {
    clinicalRecommendations.push('Konsultacja psychiatryczna specjalistyczna');
  }
  if (responsePattern === 'declining') {
    clinicalRecommendations.push('Pilna ocena skuteczności terapii');
  }

  return {
    patternType: episodes.length > 3 ? 'sequential' : 'sequential',
    complexity,
    adherencePattern,
    responsePattern,
    riskFactors,
    clinicalRecommendations
  };
};

// AI-powered predictive analytics
const generatePredictiveAnalytics = (
  episodes: ProcessedDrugEpisode[], 
  patientData: PatientData
): PredictiveAnalytics => {
  if (episodes.length === 0) {
    return {
      treatmentSuccessProbability: 0.5,
      adverseEventRisk: 0.3,
      protocolEligibilityScore: 0.5,
      recommendedNextSteps: [],
      confidenceLevel: 0.3,
      aiInsights: []
    };
  }

  // Calculate treatment success probability based on historical data
  const successfulEpisodes = episodes.filter(e => e.clinicalAnalysis.treatmentResponse.efficacyScore > 6);
  const baseSuccessRate = successfulEpisodes.length / episodes.length;
  
  // Adjust based on complexity and adherence
  const pattern = analyzeTreatmentPattern(episodes);
  let adjustedSuccessRate = baseSuccessRate;
  
  if (pattern.adherencePattern === 'consistent') adjustedSuccessRate += 0.2;
  else if (pattern.adherencePattern === 'poor') adjustedSuccessRate -= 0.3;
  
  if (pattern.complexity === 'simple') adjustedSuccessRate += 0.1;
  else if (pattern.complexity === 'highly_complex') adjustedSuccessRate -= 0.2;

  // Calculate adverse event risk
  const adverseEventHistory = episodes.filter(e => e.clinicalAnalysis.adverseEvents.hasAdverseEvents);
  const baseAdverseRisk = adverseEventHistory.length / episodes.length;
  
  // Calculate protocol eligibility score
  const compliantEpisodes = episodes.filter(e => e.clinicalAnalysis.mghAtrqCompliance.isCompliant);
  const protocolScore = compliantEpisodes.length / episodes.length;

  // Generate AI insights
  const aiInsights: string[] = [];
  if (adjustedSuccessRate > 0.7) {
    aiInsights.push('Wysoka prawdopodobieństwo sukcesu terapeutycznego');
  } else if (adjustedSuccessRate < 0.3) {
    aiInsights.push('Niska prawdopodobieństwo sukcesu - rozważyć alternatywne strategie');
  }
  
  if (baseAdverseRisk > 0.5) {
    aiInsights.push('Podwyższone ryzyko działań niepożądanych - wymagane ścisłe monitorowanie');
  }
  
  if (protocolScore > 0.6) {
    aiInsights.push('Dobra zgodność z kryteriami protokołu COMP006');
  }

  // Generate recommended next steps
  const recommendedNextSteps: string[] = [];
  if (pattern.adherencePattern === 'poor') {
    recommendedNextSteps.push('Implementacja strategii poprawy przestrzegania terapii');
  }
  if (baseAdverseRisk > 0.6) {
    recommendedNextSteps.push('Intensywne monitorowanie bezpieczeństwa');
  }
  if (adjustedSuccessRate > 0.7) {
    recommendedNextSteps.push('Kontynuacja obecnej strategii terapeutycznej');
  }

  return {
    treatmentSuccessProbability: Math.max(0, Math.min(1, adjustedSuccessRate)),
    adverseEventRisk: Math.max(0, Math.min(1, baseAdverseRisk)),
    protocolEligibilityScore: Math.max(0, Math.min(1, protocolScore)),
    recommendedNextSteps,
    confidenceLevel: episodes.length > 3 ? 0.8 : 0.5,
    aiInsights
  };
};

// ============================================================================
// OPTIMIZED UTILITY FUNCTIONS
// ============================================================================

// Enhanced zoom levels with infinite scroll support
const ZOOM_LEVELS = [
  { 
    name: '5 lat', 
    pixelsPerDay: 0.5,
    tickInterval: 'year' as const,
    format: 'yyyy', 
    unit: 'year' as const,
    density: 'very-low' as const,
    minorTickInterval: 'quarter' as const,
    minorFormat: 'QQQ',
    clinicalContext: 'lifetime_overview',
    aiContext: 'long_term_patterns'
  },
  { 
    name: '2 lata', 
    pixelsPerDay: 1,
    tickInterval: 'quarter' as const,
    format: 'QQQ yyyy', 
    unit: 'quarter' as const,
    density: 'low' as const,
    minorTickInterval: 'month' as const,
    minorFormat: 'MMM',
    clinicalContext: 'long_term_patterns',
    aiContext: 'treatment_resistance_analysis'
  },
  { 
    name: 'Rok', 
    pixelsPerDay: 2,
    tickInterval: 'month' as const,
    format: 'MMM yyyy', 
    unit: 'month' as const,
    density: 'medium' as const,
    minorTickInterval: 'week' as const,
    minorFormat: 'dd',
    clinicalContext: 'annual_review',
    aiContext: 'efficacy_trend_analysis'
  },
  { 
    name: '6 miesięcy', 
    pixelsPerDay: 4,
    tickInterval: 'month' as const,
    format: 'MMM yyyy', 
    unit: 'month' as const,
    density: 'medium' as const,
    minorTickInterval: 'week' as const,
    minorFormat: 'dd MMM',
    clinicalContext: 'episode_analysis',
    aiContext: 'response_prediction'
  },
  { 
    name: '3 miesiące', 
    pixelsPerDay: 8,
    tickInterval: 'week' as const,
    format: 'dd MMM', 
    unit: 'week' as const,
    density: 'high' as const,
    minorTickInterval: 'day' as const,
    minorFormat: 'dd',
    clinicalContext: 'treatment_response',
    aiContext: 'early_response_detection'
  },
  { 
    name: 'Miesiąc', 
    pixelsPerDay: 16,
    tickInterval: 'week' as const,
    format: 'dd MMM', 
    unit: 'week' as const,
    density: 'high' as const,
    minorTickInterval: 'day' as const,
    minorFormat: 'dd',
    clinicalContext: 'acute_monitoring',
    aiContext: 'side_effect_monitoring'
  },
  { 
    name: '2 tygodnie', 
    pixelsPerDay: 32,
    tickInterval: 'day' as const,
    format: 'dd.MM', 
    unit: 'day' as const,
    density: 'very-high' as const,
    minorTickInterval: 'hour' as const,
    minorFormat: 'HH:mm',
    clinicalContext: 'titration_period',
    aiContext: 'dose_optimization'
  },
  { 
    name: 'Tydzień', 
    pixelsPerDay: 64,
    tickInterval: 'day' as const,
    format: 'dd.MM', 
    unit: 'day' as const,
    density: 'very-high' as const,
    minorTickInterval: 'hour' as const,
    minorFormat: 'HH:mm',
    clinicalContext: 'daily_monitoring',
    aiContext: 'acute_response_tracking'
  },
  { 
    name: '3 dni', 
    pixelsPerDay: 128,
    tickInterval: 'hour' as const,
    format: 'dd.MM HH:mm', 
    unit: 'hour' as const,
    density: 'ultra' as const,
    minorTickInterval: 'hour' as const,
    minorFormat: 'HH:mm',
    clinicalContext: 'crisis_intervention',
    aiContext: 'emergency_monitoring'
  },
  { 
    name: 'Dzień', 
    pixelsPerDay: 256,
    tickInterval: 'hour' as const,
    format: 'HH:mm', 
    unit: 'hour' as const,
    density: 'ultra' as const,
    minorTickInterval: 'hour' as const,
    minorFormat: 'HH:mm',
    clinicalContext: 'hourly_monitoring',
    aiContext: 'real_time_analysis'
  },
] as const;

// Enhanced drug classification with AI-powered insights
const DRUG_CLASS_COLORS = {
  // Primary antidepressants (protocol relevant) - Enhanced with gradients
  'SSRI': '#3B82F6',           // Blue - First line
  'SNRI': '#10B981',           // Green - First line
  'TCA': '#F59E0B',            // Amber - Second line
  'MAOI': '#EF4444',           // Red - Third line
  'Atypical': '#8B5CF6',       // Purple - Variable line
  
  // Augmentation agents - Enhanced visibility
  'Mood Stabilizer': '#EC4899', // Pink - Augmentation
  'Antipsychotic': '#64748B',   // Gray - Augmentation
  'Anxiolytic': '#F97316',      // Orange - Adjunctive
  'Hypnotic': '#22D3EE',        // Cyan - Adjunctive
  
  // AI-enhanced classifications
  'Novel': '#A855F7',           // Purple - Novel mechanisms
  'Experimental': '#F43F5E',    // Rose - Experimental
  'Combination': '#06B6D4',     // Cyan - Combination therapy
  
  // Other/Unknown
  'Other': '#A3E635',           // Lime - Unclassified
  'Unknown': '#6B7280'          // Gray - Unknown
} as const;

// Responsive layout constants
const LAYOUT = {
  TIMELINE_HEIGHT: 80,
  EPISODE_HEIGHT: 40,
  DRUG_HEADER_HEIGHT: 80,
  PADDING: 30,
  SIDEBAR_WIDTH: {
    mobile: 280,
    tablet: 320,
    desktop: 380
  },
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024
  }
} as const;

// Fallback colors for backward compatibility
const BASE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', 
  '#64748B', '#F97316', '#22D3EE', '#A3E635', '#FACC15', '#FB7185',
  '#6366F1', '#D946EF', '#06B6D4', '#A1A1AA', '#F43F5E', '#84CC16',
] as const;

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

// Legacy compatibility functions (updated to use new clinical analysis)
// const calculateEfficacyTrend = (episodes: ProcessedDrugEpisode[]): 'improving' | 'stable' | 'declining' | 'unknown' => {
//   if (episodes.length < 2) return 'unknown';
//   const scores = episodes.map(e => e.clinicalAnalysis.treatmentResponse.efficacyScore).filter(s => s > 0);
//   if (scores.length < 2) return 'unknown';
//   
//   const trend = scores[scores.length - 1] - scores[0];
//   if (trend > 1) return 'improving';
//   if (trend < -1) return 'declining';
//   return 'stable';
// };

// Legacy MGH ATRQ compliance check (updated to use new analysis)
// const checkMghAtrqCompliance = (drugName: string, dose: string, duration: number, notes?: string, patientData?: PatientData): boolean => {
//   const analysis = clinicalAnalysisService.analyzeMGHATRQCompliance(drugName, dose, duration, notes, patientData);
//   return analysis.isCompliant;
// };

// Legacy efficacy analysis (updated to use new analysis)
// const analyzeEfficacyFromRealData = (notes: string, attemptGroup: number, drugName: string): number => {
//   const response = clinicalAnalysisService.analyzeTreatmentResponse(notes, 84, attemptGroup);
//   return response.efficacyScore;
// };

// Legacy adherence analysis (updated to use new analysis)
// const analyzeAdherenceFromRealData = (notes: string, duration: number, attemptGroup: number): number => {
//   const response = clinicalAnalysisService.analyzeTreatmentResponse(notes, duration, attemptGroup);
//   return response.sustainedResponse ? 0.9 : 0.6;
// };

// Legacy side effects analysis (updated to use new analysis)
// const analyzeSideEffectsFromRealData = (notes: string, drugClass: string): string[] => {
//   const adverse = clinicalAnalysisService.analyzeAdverseEvents(notes, drugClass, 84);
//   return adverse.events.map(e => e.type);
// };

// Legacy drug classification (updated to use new analysis)
// const classifyDrugClass = (drugName: string): string => {
//   const classification = clinicalAnalysisService.classifyDrugForClinicalResearch(drugName);
//   return classification.primaryClass;
// };

// ============================================================================
// OPTIMIZED UTILITY FUNCTIONS (Updated)
// ============================================================================

// Memoized hash function - improved for better distribution
const hashCode = (str: string): number => {
  let hash = 0;
  if (str.length === 0) return hash;
  
  // Use a better hash algorithm for more uniform distribution
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Additional mixing to improve distribution
  hash = hash ^ (hash >>> 16);
  hash = hash * 0x85ebca6b;
  hash = hash ^ (hash >>> 13);
  hash = hash * 0xc2b2ae35;
  hash = hash ^ (hash >>> 16);
  
  return Math.abs(hash);
};

// Enhanced drug color cache with collision detection
const drugColorCache = new Map<string, string>();
const usedColors = new Set<string>();

const getDrugColor = (drugName: string, drugClass?: string): string => {
  const cacheKey = `${drugName}-${drugClass || ''}`;
  
  if (drugColorCache.has(cacheKey)) {
    return drugColorCache.get(cacheKey)!;
  }
  
  let color: string;
  
  // ZAWSZE używaj nazwy leku do generowania unikalnego koloru
  // Klasa farmakologiczna jest tylko wskazówką, ale każdy lek ma unikalny kolor
  let colorIndex = hashCode(drugName.toLowerCase()) % BASE_COLORS.length;
  color = BASE_COLORS[colorIndex];
  
  // Jeśli kolor jest już używany, znajdź następny dostępny
  let attempts = 0;
  while (usedColors.has(color) && attempts < BASE_COLORS.length) {
    colorIndex = (colorIndex + 1) % BASE_COLORS.length;
    color = BASE_COLORS[colorIndex];
    attempts++;
  }
  
  // Jeśli wszystkie kolory są używane, użyj wariantu oryginalnego koloru
  if (usedColors.has(color)) {
    const baseColor = BASE_COLORS[hashCode(drugName.toLowerCase()) % BASE_COLORS.length];
    // Stwórz lekko inny odcień
    const variation = hashCode(drugName + 'variation') % 3;
    switch (variation) {
      case 0:
        color = baseColor + '99'; // Dodaj przezroczystość
        break;
      case 1:
        color = baseColor + 'CC'; // Inna przezroczystość
        break;
      default:
        color = baseColor + '66'; // Kolejna przezroczystość
    }
  }
  
  // Dodaj kolor do używanych kolorów
  usedColors.add(color);
  
  drugColorCache.set(cacheKey, color);
  return color;
};

// Optimized date parsing with caching
const dateCache = new Map<string, Date | null>();
const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  if (dateCache.has(dateStr)) {
    return dateCache.get(dateStr)!;
  }
  
  const parsed = parseISO(dateStr); 
  const result = isValid(parsed) ? parsed : null;
  dateCache.set(dateStr, result);
  return result;
};

// ============================================================================
// RESPONSIVE HOOK
// ============================================================================

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < LAYOUT.BREAKPOINTS.mobile) {
        setScreenSize('mobile');
      } else if (width < LAYOUT.BREAKPOINTS.tablet) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    updateScreenSize();
    const debouncedResize = debounce(updateScreenSize, 150);
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);
  
  return screenSize;
};

// Debounce utility for performance
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ============================================================================
// UTILITY FUNCTIONS FOR DATA ANALYSIS - UPDATED TO USE SERVICE
// ============================================================================

// All analysis functions now use the clinical analysis service
// This ensures consistency and prevents code duplication

// Efficacy trend calculation using clinical analysis
// const calculateEfficacyTrend = (episodes: ProcessedDrugEpisode[]): 'improving' | 'stable' | 'declining' | 'unknown' => {
//   if (episodes.length < 2) return 'unknown';
//   const scores = episodes.map(e => e.clinicalAnalysis.treatmentResponse.efficacyScore).filter(s => s > 0);
//   if (scores.length < 2) return 'unknown';
//   
//   const trend = scores[scores.length - 1] - scores[0];
//   if (trend > 1) return 'improving';
//   if (trend < -1) return 'declining';
//   return 'stable';
// };

// MGH ATRQ compliance check using clinical analysis
// const checkMghAtrqCompliance = (drugName: string, dose: string, duration: number, notes?: string, patientData?: PatientData): boolean => {
//   const analysis = clinicalAnalysisService.analyzeMGHATRQCompliance(drugName, dose, duration, notes, patientData);
//   return analysis.isCompliant;
// };

// Efficacy analysis using clinical analysis
// const analyzeEfficacyFromRealData = (notes: string, attemptGroup: number, drugName: string): number => {
//   const response = clinicalAnalysisService.analyzeTreatmentResponse(notes, 84, attemptGroup);
//   return response.efficacyScore;
// };

// Adherence analysis using clinical analysis
// const analyzeAdherenceFromRealData = (notes: string, duration: number, attemptGroup: number): number => {
//   const response = clinicalAnalysisService.analyzeTreatmentResponse(notes, duration, attemptGroup);
//   return response.sustainedResponse ? 0.9 : 0.6;
// };

// Side effects analysis using clinical analysis
// const analyzeSideEffectsFromRealData = (notes: string, drugClass: string): string[] => {
//   const adverse = clinicalAnalysisService.analyzeAdverseEvents(notes, drugClass, 84);
//   return adverse.events.map(e => e.type);
// };

// ============================================================================
// PERFORMANCE OPTIMIZED COMPONENTS
// ============================================================================

// Memoized timeline event component with enhanced clinical indicators
const TimelineEventBar = memo<{
  event: TimelineEvent;
  isHighlighted: boolean;
  onClick: (event: TimelineEvent) => void;
  onHover: (event: TimelineEvent | null, position?: { x: number; y: number }) => void;
  showAdvancedMetrics?: boolean;
}>(({ event, isHighlighted, onClick, onHover, showAdvancedMetrics = false }) => {
  const handleClick = useCallback(() => {
    onClick(event);
  }, [event, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(event);
    }
  }, [event, onClick]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Get mouse position relative to viewport
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    onHover(event, { 
      x: mouseX, 
      y: mouseY 
    });
  }, [event, onHover]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update tooltip position to follow mouse cursor
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    onHover(event, { 
      x: mouseX, 
      y: mouseY 
    });
  }, [event, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  // Enhanced visual indicators based on AI analysis
  const getEventBorderStyle = () => {
    if (event.protocolRelevance === 'critical') return '3px solid #22C55E'; // remedy-success equivalent
    if (event.clinicalSignificance === 'critical') return '3px solid #EF4444'; // remedy-danger
    if (event.aiConfidence > 0.8) return '2px solid #4A90B9'; // remedy-primary
    return '1px solid rgba(255,255,255,0.3)';
  };

  const getEventOpacity = () => {
    if (event.dataQuality === 'poor') return 0.6;
    if (event.dataQuality === 'fair') return 0.8;
    return 1.0;
  };

  // AI confidence indicator
  const getAIConfidenceIcon = () => {
    if (event.aiConfidence > 0.9) return <SparklesIcon className="w-3 h-3 text-purple-600" />;
    if (event.aiConfidence > 0.7) return <StarIcon className="w-3 h-3 text-blue-600" />;
    if (event.aiConfidence > 0.5) return <LightBulbIcon className="w-3 h-3 text-yellow-600" />;
    return null;
  };

  return (
    <div
      className={`absolute rounded-xl shadow-lg cursor-pointer transition-all duration-300 transform-gpu ${
        isHighlighted 
          ? 'ring-4 ring-remedy-primary/40 ring-opacity-50 z-30 scale-105 shadow-2xl' 
          : 'hover:shadow-2xl hover:z-20 hover:scale-102'
      }`}
      style={{
        left: `${event.x}%`,
        top: event.y,
        width: `${event.width}%`,
        height: event.height,
        background: `linear-gradient(135deg, ${event.color} 0%, ${event.color}CC 100%)`,
        border: getEventBorderStyle(),
        opacity: getEventOpacity(),
        backdropFilter: 'blur(1px)',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
      role="button"
      aria-label={`${event.drugName} - ${event.dose} - ${format(event.startDate, 'dd.MM.yyyy')} do ${format(event.endDate, 'dd.MM.yyyy')}`}
    >
      {/* Enhanced content with AI indicators */}
      <div className="h-full flex items-center justify-between px-3 text-white text-xs font-medium relative overflow-hidden">
        {/* Subtle inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 rounded-xl"></div>
        
        <div className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10">
          <span className="truncate font-semibold text-shadow-sm">{event.shortName}</span>
          {event.mghAtrqCompliant && (
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-300 drop-shadow-sm flex-shrink-0" />
          )}
          {showAdvancedMetrics && getAIConfidenceIcon()}
        </div>
        
        {/* Clinical significance indicators */}
        <div className="flex items-center gap-1.5 flex-shrink-0 relative z-10">
          {event.clinicalSignificance === 'critical' && (
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-300 drop-shadow-sm" />
          )}
          {event.protocolRelevance === 'critical' && (
            <TrophyIcon className="w-3.5 h-3.5 text-green-300 drop-shadow-sm" />
          )}
          {event.predictiveAnalytics.treatmentSuccessProbability > 0.8 && (
            <FireIcon className="w-3.5 h-3.5 text-orange-300 drop-shadow-sm" />
          )}
        </div>
      </div>
    </div>
  );
});

TimelineEventBar.displayName = 'TimelineEventBar';

// ============================================================================
// MAIN COMPONENT WITH ENHANCED ANALYTICS
// ============================================================================

export const DetailedTrdTimelineChart: React.FC<DetailedTrdTimelineChartProps> = ({ 
  patientData, 
  className = '',
  onEventSelect,
  initialZoomLevel = 4,
  enableVirtualization = true,
  protocolId = 'COMP006',
  showClinicalInsights = true,
  enableAIAnalysis = true,
  enablePredictiveAnalytics = true,
  showAdvancedMetrics = false
}) => {
  // Clear color cache at the start of each render to ensure fresh color assignment
  drugColorCache.clear();
  usedColors.clear();
  
  // ============================================================================
  // STATE MANAGEMENT - Optimized with proper separation
  // ============================================================================
  
  const screenSize = useResponsive();
  const SIDEBAR_WIDTH = LAYOUT.SIDEBAR_WIDTH[screenSize];
  
  // Core state
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedDrug, setHighlightedDrug] = useState<string | null>(null);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  
  // Tooltip state
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Filter state
  const [expandedDrugs, setExpandedDrugs] = useState<Set<string>>(new Set());
  const [hiddenDrugs, setHiddenDrugs] = useState<Set<string>>(new Set());
  const [selectedDrugClasses, setSelectedDrugClasses] = useState<Set<string>>(new Set());
  const [showMghCompliantOnly, setShowMghCompliantOnly] = useState(false);
  
  // Refs for DOM manipulation
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timeHeaderRef = useRef<HTMLDivElement>(null); // New ref for time header
  
  // Scroll synchronization refs
  // const isScrollingSidebar = useRef(false); // REMOVED
  // const isScrollingMain = useRef(false); // REMOVED
  // const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null); // REMOVED
  
  // Scroll synchronization handlers
  // const handleSidebarScroll = useCallback(() => { ... }); // REMOVED
  // const handleTimelineScroll = useCallback(() => { ... }); // REMOVED

  // Handle time header horizontal scroll (KEEP THIS, but it's not directly used by listeners anymore)
  // const handleTimeHeaderScroll = useCallback(() => { ... }); // Can be removed if not used elsewhere

  // Add scroll event listeners for HORIZONTAL scroll synchronization
  useEffect(() => {
    const timeHeaderElement = timeHeaderRef.current;
    const mainTimelineContentElement = containerRef.current;
    
    let isSyncingTimeHeader = false;
    let isSyncingMainContent = false;

    const syncHorizontalScrollFromTimeHeader = () => {
      if (!isSyncingMainContent && mainTimelineContentElement && timeHeaderElement) {
        isSyncingTimeHeader = true;
        mainTimelineContentElement.scrollLeft = timeHeaderElement.scrollLeft;
        requestAnimationFrame(() => { isSyncingTimeHeader = false; });
      }
    };

    const syncHorizontalScrollFromMainContent = () => {
      if (!isSyncingTimeHeader && timeHeaderElement && mainTimelineContentElement) {
        isSyncingMainContent = true;
        timeHeaderElement.scrollLeft = mainTimelineContentElement.scrollLeft;
        requestAnimationFrame(() => { isSyncingMainContent = false; });
      }
    };

    if (timeHeaderElement && mainTimelineContentElement) {
      timeHeaderElement.addEventListener('scroll', syncHorizontalScrollFromTimeHeader, { passive: true });
      mainTimelineContentElement.addEventListener('scroll', syncHorizontalScrollFromMainContent, { passive: true });
    }
    
    return () => {
      if (timeHeaderElement && mainTimelineContentElement) {
        timeHeaderElement.removeEventListener('scroll', syncHorizontalScrollFromTimeHeader);
        mainTimelineContentElement.removeEventListener('scroll', syncHorizontalScrollFromMainContent);
      }
    };
  }, []); // Empty dependency array, runs once on mount

  // ============================================================================
  // OPTIMIZED DATA PROCESSING
  // ============================================================================
  
  // Memoized drug groups processing with performance optimizations
  const { drugGroups, allEvents, timeRange, drugClasses } = useMemo(() => {
    const pharmacotherapy = patientData.trdAnalysis?.pharmacotherapy || [];
    
    // Early return for empty data
    if (pharmacotherapy.length === 0) {
      return { 
        drugGroups: [], 
        allEvents: [], 
        timeRange: { start: new Date(), end: new Date() }, 
        drugClasses: [] 
      };
    }
    
    // Process episodes with enhanced clinical analysis
    const validEpisodes: ProcessedDrugEpisode[] = pharmacotherapy
      .map((drug, index) => {
        const parsedStartDate = safeDate(drug.startDate);
        const parsedEndDate = safeDate(drug.endDate);
        
        if (!parsedStartDate || !parsedEndDate) return null;
        
        const duration = differenceInDays(parsedEndDate, parsedStartDate);
        
        // Perform comprehensive clinical analysis
        const clinicalAnalysis = clinicalAnalysisService.performClinicalAnalysis(drug, duration, patientData);
        const drugClassification = clinicalAnalysisService.classifyDrugForClinicalResearch(drug.drugName || '', drug.dose, drug.notes);
        
        // Create treatment context
        const treatmentContext: TreatmentContext = {
          episodeNumber: drug.attemptGroup || index + 1,
          isFirstLine: (drug.attemptGroup || index + 1) === 1,
          isMonotherapy: !drugClassification.isAugmentationAgent,
          isAugmentation: drugClassification.isAugmentationAgent,
          isCombination: false, // TODO: Detect from concurrent medications
          previousFailures: Math.max(0, (drug.attemptGroup || index + 1) - 1),
          washoutPeriod: 0, // TODO: Calculate from previous episode
          reasonForStart: drug.notes?.includes('rozpoczęcie') ? 'nowy epizod' : 'zmiana leczenia',
          reasonForStop: clinicalAnalysis.treatmentResponse.reasonForDiscontinuation
        };
        
        // Assess data quality
        const dataQuality: DataQualityAssessment = {
          completeness: [drug.drugName, drug.dose, drug.startDate, drug.endDate].filter(Boolean).length / 4,
          reliability: drug.notes ? 0.8 : 0.6,
          missingFields: [
            !drug.drugName && 'drugName',
            !drug.dose && 'dose',
            !drug.startDate && 'startDate',
            !drug.endDate && 'endDate',
            !drug.notes && 'notes'
          ].filter(Boolean) as string[],
          inconsistencies: [],
          confidence: clinicalAnalysis.mghAtrqCompliance.confidence
        };
        
        return {
        ...drug,
        originalIndex: index,
          parsedStartDate,
          parsedEndDate,
          clinicalAnalysis,
          drugClassification,
          treatmentContext,
          dataQuality
        } as ProcessedDrugEpisode;
      })
      .filter((drug): drug is ProcessedDrugEpisode => drug !== null);

    // Group by drug name with enhanced clinical analysis
    const groupedByDrug = new Map<string, ProcessedDrugEpisode[]>();
    validEpisodes.forEach(episode => {
      const drugName = (episode.drugName || 'Nieznany Lek').trim();
      const existing = groupedByDrug.get(drugName);
      if (existing) {
        existing.push(episode);
      } else {
        groupedByDrug.set(drugName, [episode]);
      }
    });

    // Create enhanced drug groups with clinical insights
    const groups: DrugGroup[] = Array.from(groupedByDrug.entries()).map(([drugName, episodes]) => {
      const firstEpisode = episodes[0];
      const shortName = firstEpisode?.shortName || drugName.substring(0, 4).toUpperCase();
      
      // Aggregate clinical analysis across episodes
      const drugClassification = firstEpisode.drugClassification;
      const totalDuration = episodes.reduce((sum, ep) => sum + differenceInDays(ep.parsedEndDate, ep.parsedStartDate), 0);
      const maxDose = episodes.reduce((max, ep) => ep.dose && ep.dose > max ? ep.dose : max, '');
      
      // Overall clinical analysis for the drug group
      const overallMghCompliance = episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.isCompliant);
      const hasAdverseEvents = episodes.some(ep => ep.clinicalAnalysis.adverseEvents.hasAdverseEvents);
      const bestResponse = episodes.reduce((best, ep) => {
        const score = ep.clinicalAnalysis.treatmentResponse.efficacyScore;
        return score > best ? score : best;
      }, 0);
      
      const overallAnalysis: ClinicalAnalysisResult = {
        mghAtrqCompliance: {
          isCompliant: overallMghCompliance,
          confidence: Math.max(...episodes.map(ep => ep.clinicalAnalysis.mghAtrqCompliance.confidence)),
          reasoning: `Analiza ${episodes.length} epizodów leczenia`,
          minDoseReached: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.minDoseReached),
          minDurationReached: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.minDurationReached),
          adequateTrial: overallMghCompliance,
          specificFindings: {
            drugFound: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.specificFindings.drugFound),
            doseAdequate: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.specificFindings.doseAdequate),
            durationAdequate: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.specificFindings.durationAdequate),
            augmentationUsed: episodes.some(ep => ep.clinicalAnalysis.mghAtrqCompliance.specificFindings.augmentationUsed)
          }
        },
        adverseEvents: {
          hasAdverseEvents,
          severity: hasAdverseEvents ? 'moderate' : 'unknown',
          events: episodes.flatMap(ep => ep.clinicalAnalysis.adverseEvents.events),
          impactOnTreatment: hasAdverseEvents ? 'dose_reduction' : 'none',
          confidence: 0.8
        },
        treatmentResponse: {
          responseType: bestResponse > 7 ? 'full_response' : bestResponse > 4 ? 'partial_response' : 'no_response',
          timeToResponse: Math.min(...episodes.map(ep => ep.clinicalAnalysis.treatmentResponse.timeToResponse)),
          sustainedResponse: episodes.some(ep => ep.clinicalAnalysis.treatmentResponse.sustainedResponse),
          reasonForDiscontinuation: episodes[episodes.length - 1]?.clinicalAnalysis.treatmentResponse.reasonForDiscontinuation || '',
          efficacyScore: bestResponse,
          confidence: 0.8
        },
        protocolEligibility: {
          eligibleForCOMP006: overallMghCompliance,
          inclusionCriteriaMet: overallMghCompliance ? ['IC6'] : [],
          exclusionCriteriaViolated: [],
          riskFactors: hasAdverseEvents ? ['adverse_events_history'] : [],
          recommendations: []
        },
        drugInteractions: {
          hasInteractions: false,
          interactions: [],
          clinicalRelevance: 'low'
        },
        clinicalSignificance: {
          overallSignificance: hasAdverseEvents ? 'high' : overallMghCompliance ? 'moderate' : 'low',
          factors: [],
          recommendations: [],
          flagsForReview: []
        }
      };
      
      // Protocol relevance analysis
      const protocolRelevance: ProtocolRelevanceAnalysis = {
        isRelevantForCOMP006: drugClassification.isProtocolRelevant,
        contributesToTRDDiagnosis: drugClassification.isAntidepressant && overallMghCompliance,
        meetsAdequacyCriteria: overallMghCompliance,
        hasExclusionaryFindings: false,
        clinicalNotes: [`${episodes.length} epizodów`, `Łączny czas: ${totalDuration} dni`],
        protocolScore: calculateProtocolScore(drugClassification, overallMghCompliance, episodes.length, totalDuration),
        eligibilityConfidence: calculateEligibilityConfidence(drugClassification, overallMghCompliance, episodes)
      };
      
      // Calculate efficacy trend (legacy compatibility)
      const efficacyTrend = episodes.length > 1 ? 
        (episodes[episodes.length - 1].clinicalAnalysis.treatmentResponse.efficacyScore > 
         episodes[0].clinicalAnalysis.treatmentResponse.efficacyScore ? 'improving' : 'declining') : 'unknown';
      
      // Treatment pattern analysis
      const treatmentPattern = analyzeTreatmentPattern(episodes);
      
      // Predictive analytics
      const predictiveAnalytics = generatePredictiveAnalytics(episodes, patientData);
      
      return {
        drugName,
        shortName,
        episodes: episodes.sort((a, b) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime()),
        isExpanded: expandedDrugs.has(drugName),
        isVisible: !hiddenDrugs.has(drugName),
        color: getDrugColor(drugName, drugClassification.primaryClass),
        
        // Enhanced clinical data
        drugClassification,
        overallAnalysis,
        protocolRelevance,
        treatmentPattern,
        predictiveAnalytics,
        
        // Legacy fields (maintained for compatibility)
        drugClass: drugClassification.primaryClass,
        totalDuration,
        maxDose,
        efficacyTrend,
        mghAtrqCompliant: overallMghCompliance
      };
    });

    // Optimized sorting with clinical relevance priority
    groups.sort((a, b) => {
      // Prioritize protocol-relevant drugs
      if (a.protocolRelevance.isRelevantForCOMP006 !== b.protocolRelevance.isRelevantForCOMP006) {
        return a.protocolRelevance.isRelevantForCOMP006 ? -1 : 1;
      }
      
      // Then by drug class importance
      const classOrder = ['SSRI', 'SNRI', 'TCA', 'Atypical', 'MAOI', 'Antipsychotic', 'Mood Stabilizer', 'Anxiolytic', 'Hypnotic', 'Other', 'Unknown'];
      const aClassIndex = classOrder.indexOf(a.drugClass);
      const bClassIndex = classOrder.indexOf(b.drugClass);
      
      if (aClassIndex !== bClassIndex) return aClassIndex - bClassIndex;
      if (a.totalDuration !== b.totalDuration) return b.totalDuration - a.totalDuration;
      
      const aFirst = Math.min(...a.episodes.map(e => e.parsedStartDate.getTime()));
      const bFirst = Math.min(...b.episodes.map(e => e.parsedStartDate.getTime()));
      return aFirst - bFirst;
    });

    // Optimized time range calculation
    const allDates = validEpisodes.flatMap(e => [e.parsedStartDate, e.parsedEndDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const totalDays = differenceInDays(maxDate, minDate);
    const paddingDays = Math.max(30, Math.floor(totalDays * 0.1));
    
    const paddedStart = addDays(startOfDay(minDate), -paddingDays);
    const paddedEnd = addDays(endOfDay(maxDate), paddingDays);

    const uniqueClasses = [...new Set(groups.map(g => g.drugClass))];

    return {
      drugGroups: groups,
      allEvents: validEpisodes,
      timeRange: { start: paddedStart, end: paddedEnd },
      drugClasses: uniqueClasses
    };
  }, [patientData, expandedDrugs, hiddenDrugs]);

  // ============================================================================
  // OPTIMIZED FILTERING AND CALCULATIONS
  // ============================================================================
  
  // Filtered drug groups with memoization
  const filteredDrugGroups = useMemo(() => {
    let filtered = drugGroups;
    
    if (selectedDrugClasses.size > 0) {
      filtered = filtered.filter(group => selectedDrugClasses.has(group.drugClass));
    }
    
    if (showMghCompliantOnly) {
      filtered = filtered.filter(group => group.mghAtrqCompliant);
    }
    
    return filtered;
  }, [drugGroups, selectedDrugClasses, showMghCompliantOnly]);

  // Current view range calculation - now infinite scroll based
  const currentViewRange = useMemo(() => {
    // Always show the full data range, zoom affects only visual density
    return { start: timeRange.start, end: timeRange.end };
  }, [timeRange]);

  // Calculate timeline width based on zoom level
  const timelineWidth = useMemo(() => {
    const zoomConfig = ZOOM_LEVELS[zoomLevel];
    const totalDays = differenceInDays(timeRange.end, timeRange.start);
    return Math.max(totalDays * zoomConfig.pixelsPerDay, 1000); // Minimum 1000px width
  }, [timeRange, zoomLevel]);

  // Dynamic time markers generation with infinite scroll support
  const timeMarkers = useMemo(() => {
    const markers: { date: Date; label: string; x: number; type: 'major' | 'minor' }[] = [];
    const { start, end } = currentViewRange;
    const zoomConfig = ZOOM_LEVELS[zoomLevel];
    const totalDays = differenceInDays(end, start);
    
    // Generate major markers
    let current = start;
    const getMajorStep = () => {
      const interval = zoomConfig.tickInterval;
      if (interval === 'year') return { years: 1 };
      if (interval === 'quarter') return { months: 3 };
      if (interval === 'month') return { months: 1 };
      if (interval === 'week') return { weeks: 1 };
      if (interval === 'day') return { days: 1 };
      if (interval === 'hour') return { hours: zoomConfig.density === 'ultra' ? 6 : 12 };
      return { days: 1 };
    };
    
    const majorStep = getMajorStep();
    
    while (current <= end) {
      const daysSinceStart = differenceInDays(current, start);
      const x = (daysSinceStart / totalDays) * 100;
      
      markers.push({
        date: current,
        label: format(current, zoomConfig.format),
        x,
        type: 'major'
      });
      
      // Add next major marker
      if (majorStep.years) current = addDays(current, 365 * majorStep.years);
      else if (majorStep.months) current = addDays(current, 30 * majorStep.months);
      else if (majorStep.weeks) current = addDays(current, 7 * majorStep.weeks);
      else if (majorStep.days) current = addDays(current, majorStep.days);
      else if (majorStep.hours) current = addHours(current, majorStep.hours);
    }
    
    // Generate minor markers for higher zoom levels
    if (zoomConfig.density === 'high' || zoomConfig.density === 'very-high' || zoomConfig.density === 'ultra') {
      current = start;
      const getMinorStep = () => {
        const interval = zoomConfig.minorTickInterval as 'quarter' | 'month' | 'week' | 'day' | 'hour';
        if (interval === 'quarter') return { months: 3 };
        if (interval === 'month') return { months: 1 };
        if (interval === 'week') return { weeks: 1 };
        if (interval === 'day') return { days: 1 };
        if (interval === 'hour') return { hours: zoomConfig.density === 'ultra' ? 1 : 6 };
        return { days: 1 };
      };
      
      const minorStep = getMinorStep();
      
      while (current <= end) {
        const daysSinceStart = differenceInDays(current, start);
        const x = (daysSinceStart / totalDays) * 100;
        
        // Only add minor markers that don't overlap with major ones
        const isOverlappingMajor = markers.some(m => 
          m.type === 'major' && Math.abs(m.x - x) < 0.5
        );
        
        if (!isOverlappingMajor) {
          markers.push({
            date: current,
            label: format(current, zoomConfig.minorFormat),
            x,
            type: 'minor'
          });
        }
        
        // Add next minor marker
        if (minorStep.months) current = addDays(current, 30 * minorStep.months);
        else if (minorStep.weeks) current = addDays(current, 7 * minorStep.weeks);
        else if (minorStep.days) current = addDays(current, minorStep.days);
        else if (minorStep.hours) current = addHours(current, minorStep.hours);
      }
    }
    
    return markers.sort((a, b) => a.x - b.x);
  }, [currentViewRange, zoomLevel]);

  // Container height calculation
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const containerHeight = useMemo(() => {
    if (isFullscreen) {
      // W trybie fullscreen: window.innerHeight - margins (inset-4 = 32px) - header (~80px) - time markers (40px)
      const availableHeight = windowHeight - 32 - 80 - 40; // Dokładne obliczenie
      return Math.max(availableHeight, 400); // Minimum 400px
    }
    return 500; // Standardowa wysokość
  }, [isFullscreen, windowHeight]);

  // Total content height calculation
  const totalContentHeight = useMemo(() => {
    let height = LAYOUT.PADDING;
    
    filteredDrugGroups.forEach(group => {
      if (!group.isVisible) return;
      
      height += LAYOUT.DRUG_HEADER_HEIGHT;
      
      if (group.isExpanded) {
        const episodesByDose = new Map<string, ProcessedDrugEpisode[]>();
        group.episodes.forEach(episode => {
          const dose = episode.dose || 'N/A';
          if (!episodesByDose.has(dose)) {
            episodesByDose.set(dose, []);
          }
          episodesByDose.get(dose)!.push(episode);
        });
        
        height += episodesByDose.size * (LAYOUT.EPISODE_HEIGHT + 8);
      } else {
        height += LAYOUT.EPISODE_HEIGHT + 8;
      }
      
      height += 20;
    });
    
    height += LAYOUT.PADDING;
    return Math.max(height, isFullscreen ? containerHeight : containerHeight + 200);
  }, [filteredDrugGroups, containerHeight, isFullscreen]);

  // Generate position map for precise alignment between sidebar and timeline
  const drugPositionMap = useMemo(() => {
    const positionMap = new Map<string, { 
      drugHeaderCalculatedBarY: number;
      dosePositions: Map<string, { calculatedBarY: number }> 
    }>();
    let currentY = LAYOUT.PADDING;
    
    // IMPORTANT: Timeline has a time header (h-10 = 40px) that sidebar doesn't have
    // We need to SUBTRACT this offset to move bars UP to align with sidebar
    const TIME_HEADER_HEIGHT = 10; // h-10 in Tailwind

    filteredDrugGroups.forEach((group, groupIndex) => {
      if (!group.isVisible) return;
      
      const drugHeaderVisualRowStartY = currentY;

      // CENTER the bar in the drug header row - subtract time header offset
      // Drug header has height LAYOUT.DRUG_HEADER_HEIGHT (80px)
      // Bar has height LAYOUT.EPISODE_HEIGHT (40px)
      // So we position the bar at: rowStart + (rowHeight - barHeight) / 2 - timeHeaderOffset
      const drugHeaderCalculatedBarY = drugHeaderVisualRowStartY + (LAYOUT.DRUG_HEADER_HEIGHT - LAYOUT.EPISODE_HEIGHT) / 2 - TIME_HEADER_HEIGHT;
      
      currentY += LAYOUT.DRUG_HEADER_HEIGHT;
      
      const dosePositions = new Map<string, { calculatedBarY: number }>();
      
      if (group.isExpanded) {
        const episodesByDose = new Map<string, ProcessedDrugEpisode[]>();
        group.episodes.forEach(episode => {
          const dose = episode.dose || 'N/A';
          if (!episodesByDose.has(dose)) {
            episodesByDose.set(dose, []);
          }
          episodesByDose.get(dose)!.push(episode);
        });
        
        Array.from(episodesByDose.keys()).forEach((dose, doseIndex) => {
          const doseVisualRowStartY = currentY;
          
          // CENTER the bar in the dose row - subtract time header offset
          // Dose row has height LAYOUT.EPISODE_HEIGHT + 8 (48px)
          // Bar has height LAYOUT.EPISODE_HEIGHT (40px)
          // So we position the bar at: rowStart + (rowHeight - barHeight) / 2 - timeHeaderOffset
          const doseRowCalculatedBarY = doseVisualRowStartY + ((LAYOUT.EPISODE_HEIGHT + 8) - LAYOUT.EPISODE_HEIGHT) / 2 - TIME_HEADER_HEIGHT;

          dosePositions.set(dose, { calculatedBarY: doseRowCalculatedBarY });
          currentY += LAYOUT.EPISODE_HEIGHT + 8;
        });
      } else { // Group is COLLAPSED
        dosePositions.set('collapsed', { calculatedBarY: drugHeaderCalculatedBarY });
      }
      
      positionMap.set(group.drugName, { 
        drugHeaderCalculatedBarY,
        dosePositions 
      });
      
      // NO SPACING between drug groups - sidebar doesn't have spacing either
    });
    
    return positionMap;
  }, [filteredDrugGroups]);

  // Generate visible events with optimized calculations and enhanced clinical data
  const visibleEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const { start, end } = currentViewRange;
    const zoomConfig = ZOOM_LEVELS[zoomLevel];
    const totalDays = differenceInDays(end, start);
    
    filteredDrugGroups.forEach(group => {
      if (!group.isVisible) return;
      
      const groupCalculatedPositions = drugPositionMap.get(group.drugName);
      if (!groupCalculatedPositions) return;
      
      if (group.isExpanded) {
        const episodesByDose = new Map<string, ProcessedDrugEpisode[]>();
        group.episodes.forEach(episode => {
          const dose = episode.dose || 'N/A';
          if (!episodesByDose.has(dose)) {
            episodesByDose.set(dose, []);
          }
          episodesByDose.get(dose)!.push(episode);
        });
        
        Array.from(episodesByDose.entries()).forEach(([dose, episodes]) => {
          const dosePositionInfo = groupCalculatedPositions.dosePositions.get(dose);
          if (!dosePositionInfo) return;
          
          episodes.forEach(episode => {
            // Always show all episodes in infinite scroll mode
            const eventStart = episode.parsedStartDate;
            const eventEnd = episode.parsedEndDate;
            
            const startDays = differenceInDays(eventStart, start);
            const durationDays = differenceInDays(eventEnd, eventStart) + 1;
            
            const x = (startDays / totalDays) * 100;
            const width = Math.max((durationDays / totalDays) * 100, 0.1);
            
            // Analyze overlaps with enhanced detection
            const overlaps = [...new Set(allEvents
              .filter(other => 
                other.drugName !== episode.drugName &&
                (isWithinInterval(other.parsedStartDate, { start: eventStart, end: eventEnd }) ||
                 isWithinInterval(other.parsedEndDate, { start: eventStart, end: eventEnd }))
              )
              .map(other => other.drugName || 'Unknown'))];
            
            // Enhanced clinical significance assessment
            let clinicalSignificance: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
            if (episode.clinicalAnalysis.adverseEvents.severity === 'severe') clinicalSignificance = 'critical';
            else if (episode.clinicalAnalysis.treatmentResponse.responseType === 'no_response') clinicalSignificance = 'high';
            else if (episode.clinicalAnalysis.mghAtrqCompliance.isCompliant) clinicalSignificance = 'moderate';
            else clinicalSignificance = 'low';
            
            // Protocol relevance assessment
            let protocolRelevance: 'not_relevant' | 'relevant' | 'critical' = 'not_relevant';
            if (episode.drugClassification.isProtocolRelevant) {
              protocolRelevance = episode.clinicalAnalysis.mghAtrqCompliance.isCompliant ? 'critical' : 'relevant';
            }
            
            // Data quality assessment
            let dataQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'fair';
            if (episode.dataQuality.completeness >= 0.9) dataQuality = 'excellent';
            else if (episode.dataQuality.completeness >= 0.7) dataQuality = 'good';
            else if (episode.dataQuality.completeness >= 0.5) dataQuality = 'fair';
            else dataQuality = 'poor';
            
            // Predictive analytics
            const predictiveAnalytics = generatePredictiveAnalytics(group.episodes, patientData);
            
            events.push({
              id: episode.id || `${group.drugName}-${dose}-${episode.originalIndex}`,
              drugName: group.drugName,
              shortName: group.shortName,
              dose,
              startDate: episode.parsedStartDate,
              endDate: episode.parsedEndDate,
              duration: differenceInDays(episode.parsedEndDate, episode.parsedStartDate) + 1,
              attemptGroup: episode.attemptGroup || 0,
              notes: episode.notes,
              color: group.color,
              x,
              width,
              y: dosePositionInfo.calculatedBarY, // Use the new calculated Y
              height: LAYOUT.EPISODE_HEIGHT,
              
              // Enhanced clinical data
              clinicalAnalysis: episode.clinicalAnalysis,
              drugClassification: episode.drugClassification,
              treatmentContext: episode.treatmentContext,
              predictiveAnalytics,
              
              // Visual indicators
              clinicalSignificance,
              protocolRelevance,
              dataQuality,
              aiConfidence: predictiveAnalytics.confidenceLevel,
              
              // Legacy fields (maintained for compatibility)
              efficacyScore: episode.clinicalAnalysis.treatmentResponse.efficacyScore,
              sideEffects: episode.clinicalAnalysis.adverseEvents.events.map(e => e.type),
              adherence: episode.clinicalAnalysis.adverseEvents.impactOnTreatment === 'none' ? 0.8 : 0.6,
              overlaps,
              washoutPeriod: episode.treatmentContext.washoutPeriod,
              mghAtrqCompliant: episode.clinicalAnalysis.mghAtrqCompliance.isCompliant
            });
          });
        });
      } else {
        // Collapsed view - show summary
        const allEpisodes = group.episodes; // Show all episodes in infinite scroll mode
        
        if (allEpisodes.length > 0) {
          const firstStart = Math.min(...allEpisodes.map(e => e.parsedStartDate.getTime()));
          const lastEnd = Math.max(...allEpisodes.map(e => e.parsedEndDate.getTime()));
          
          const eventStart = new Date(firstStart);
          const eventEnd = new Date(lastEnd);
          
          const startDays = differenceInDays(eventStart, start);
          const durationDays = differenceInDays(eventEnd, eventStart) + 1;
          
          const x = (startDays / totalDays) * 100;
          const width = Math.max((durationDays / totalDays) * 100, 0.1);
          
          const collapsedPositionInfo = groupCalculatedPositions.dosePositions.get('collapsed');
          if (!collapsedPositionInfo) return; // Should have a value from map generation
          
          const summaryAnalysis: ClinicalAnalysisResult = group.overallAnalysis;
          const summaryPredictiveAnalytics = generatePredictiveAnalytics(allEpisodes, patientData);
          
          events.push({
            id: `${group.drugName}-summary`,
            drugName: group.drugName,
            shortName: group.shortName,
            dose: `${allEpisodes.length} epizod${allEpisodes.length > 1 ? 'ów' : ''}`,
            startDate: new Date(firstStart),
            endDate: new Date(lastEnd),
            duration: differenceInDays(new Date(lastEnd), new Date(firstStart)) + 1,
            attemptGroup: 0,
            notes: `Łącznie ${allEpisodes.length} epizodów leczenia`,
            color: group.color,
            x,
            width,
            y: collapsedPositionInfo.calculatedBarY, // Use the new calculated Y for collapsed
            height: LAYOUT.EPISODE_HEIGHT,
            
            clinicalAnalysis: summaryAnalysis,
            drugClassification: group.drugClassification,
            treatmentContext: {
              episodeNumber: allEpisodes.length,
              isFirstLine: false,
              isMonotherapy: false,
              isAugmentation: group.drugClassification.isAugmentationAgent,
              isCombination: false,
              previousFailures: 0,
              reasonForStart: 'multiple episodes',
              reasonForStop: 'summary view'
            },
            predictiveAnalytics: summaryPredictiveAnalytics,
            clinicalSignificance: summaryAnalysis.clinicalSignificance.overallSignificance,
            protocolRelevance: group.protocolRelevance.isRelevantForCOMP006 ? 'critical' : 'not_relevant',
            dataQuality: 'good',
            aiConfidence: summaryPredictiveAnalytics.confidenceLevel,
            efficacyScore: summaryAnalysis.treatmentResponse.efficacyScore,
            sideEffects: summaryAnalysis.adverseEvents.events.map(e => e.type),
            adherence: 0.7,
            overlaps: [],
            mghAtrqCompliant: group.mghAtrqCompliant
          });
        }
      }
    });
    
    return events;
  }, [filteredDrugGroups, currentViewRange, zoomLevel, allEvents, patientData, drugPositionMap]);

  // ============================================================================
  // EVENT HANDLERS - Enhanced with clinical insights
  // ============================================================================
  
  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleEventHover = useCallback((event: TimelineEvent | null, position?: { x: number; y: number }) => {
    setHoveredEvent(event);
    setTooltipPosition(position || null);
  }, []);

  const toggleDrugExpansion = useCallback((drugName: string) => {
    setExpandedDrugs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(drugName)) {
        newSet.delete(drugName);
      } else {
        newSet.add(drugName);
      }
      return newSet;
    });
  }, []);

  const toggleDrugVisibility = useCallback((drugName: string) => {
    setHiddenDrugs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(drugName)) {
        newSet.delete(drugName);
      } else {
        newSet.add(drugName);
      }
      return newSet;
    });
  }, []);

  // ============================================================================
  // CLEANUP EFFECTS (This was for the old scrollTimeoutRef, can be removed)
  // ============================================================================
  
  // useEffect(() => { // REMOVED
  //   return () => {
  //     if (scrollTimeoutRef.current) {
  //       clearTimeout(scrollTimeoutRef.current);
  //     }
  //   };
  // }, []); // REMOVED

  // ============================================================================
  // EARLY RETURN FOR EMPTY DATA
  // ============================================================================
  
  if (drugGroups.length === 0) {
      return (
      <div className={`bg-white p-8 rounded-xl shadow-lg border border-remedy-border ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-remedy-secondary to-remedy-accent rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <InformationCircleIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Brak danych farmakoterapii</h3>
          <p className="text-slate-500">Nie znaleziono prawidłowych danych do wizualizacji na osi czasu.</p>
        </div>
        </div>
      );
    }

  // ============================================================================
  // MAIN RENDER - Optimized and accessible
  // ============================================================================
  
  return (
    <div className={`bg-white rounded-xl shadow-xl border border-remedy-border overflow-visible ${isFullscreen ? 'fixed inset-4 z-50' : ''} ${className}`}>
      {/* Optimized header */}
      <div className="bg-gradient-to-r from-remedy-light via-remedy-secondary/10 to-remedy-primary/10 border-b border-remedy-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-remedy-primary to-remedy-accent rounded-xl flex items-center justify-center shadow-lg">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-remedy-primary to-remedy-accent bg-clip-text text-transparent">
                Oś Czasu Farmakoterapii
              </h3>
              <p className="text-sm text-slate-600">Zaawansowana analiza z AI-powered insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 bg-remedy-light px-3 py-1 rounded-full">
              Zoom: {ZOOM_LEVELS[zoomLevel].name}
            </span>
            <button
              onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
              disabled={zoomLevel === 0}
              className="p-2 rounded-lg bg-white shadow-md hover:bg-remedy-light hover:shadow-lg disabled:opacity-50 transition-all duration-200 border border-remedy-border"
              aria-label="Oddal"
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4 text-remedy-primary" />
            </button>
            <button
              onClick={() => setZoomLevel(Math.min(ZOOM_LEVELS.length - 1, zoomLevel + 1))}
              disabled={zoomLevel === ZOOM_LEVELS.length - 1}
              className="p-2 rounded-lg bg-white shadow-md hover:bg-remedy-light hover:shadow-lg disabled:opacity-50 transition-all duration-200 border border-remedy-border"
              aria-label="Przybliż"
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4 text-remedy-primary" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-gradient-to-r from-remedy-primary to-remedy-accent text-white shadow-md hover:shadow-lg transition-all duration-200"
              aria-label={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
            >
              {isFullscreen ? <XMarkIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="relative">
        {/* Time markers header */}
        <div className="flex h-10 bg-gradient-to-r from-remedy-light to-remedy-secondary/20 border-b border-remedy-border">
          <div 
            className="bg-gradient-to-r from-remedy-secondary/30 to-remedy-primary/20 border-r border-remedy-border flex items-center px-4 flex-shrink-0 shadow-inner"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <span className="text-sm font-semibold text-slate-700">
              Leki ({filteredDrugGroups.filter(g => g.isVisible).length})
            </span>
          </div>
          
          <div 
            ref={timeHeaderRef}
            className="relative flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none'
            }}
          >
            <div 
              className="relative h-full"
              style={{ 
                width: timelineWidth // Use calculated timeline width based on zoom
              }}
            >
              {timeMarkers.map((marker, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: `${marker.x}%` }}
                >
                  <div className="w-px h-full bg-remedy-primary/40"></div>
                  <span className="absolute top-1 left-1 whitespace-nowrap text-xs font-medium text-slate-700 bg-white/80 backdrop-blur-sm px-1 rounded">
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex relative" style={{ 
          height: containerHeight, // Viewport height for scrolling
          overflowY: 'auto',      // Enable vertical scroll here
          overflowX: 'visible'    // Allow horizontal overflow for tooltips
        }}>
          {/* Sidebar */}
          <div 
            className="bg-gradient-to-b from-remedy-light via-white to-remedy-secondary/10 border-r border-remedy-border shadow-lg flex-shrink-0 overflow-x-hidden"
            style={{ width: SIDEBAR_WIDTH, height: totalContentHeight /* Content height */ }}
          >
            <div 
              ref={sidebarRef}
              style={{ 
                height: '100%' // Occupy full height of parent (totalContentHeight)
              }}
            >
              {/* Inner div for sidebar content, height should be auto or 100% if not already wrapping */}
              <div style={{ height: '100%' }}> 
                {filteredDrugGroups.map((group) => {
                  if (!group.isVisible) return null;

  return (
                    <div key={group.drugName}>
                      {/* Drug header */}
                      <div
                        className={`border-b border-remedy-border transition-all duration-200 ${
                          highlightedDrug === group.drugName 
                            ? 'bg-gradient-to-r from-remedy-primary/10 to-remedy-accent/10 shadow-md border-remedy-primary/30' 
                            : 'bg-white hover:bg-gradient-to-r hover:from-remedy-light hover:to-white'
                        }`}
                        onMouseEnter={() => setHighlightedDrug(group.drugName)}
                        onMouseLeave={() => setHighlightedDrug(null)}
                      >
                        <div className="flex items-center gap-3 px-4" style={{ height: LAYOUT.DRUG_HEADER_HEIGHT }}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleDrugExpansion(group.drugName)}
                              className="p-1 rounded-lg hover:bg-remedy-secondary/20 transition-all duration-200 hover:shadow-sm"
                              aria-label="Rozwiń/zwiń"
                            >
                              {group.isExpanded ? (
                                <ChevronDownIcon className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full shadow-md border-2 border-white ring-1 ring-remedy-border"
                              style={{ backgroundColor: group.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 text-sm truncate hover:text-remedy-primary transition-colors" title={group.drugName}>
                                  {group.shortName}
                                </span>
                                {group.mghAtrqCompliant && (
                                  <CheckCircleIcon className="w-3 h-3 text-remedy-success" title="Zgodne z MGH ATRQ" />
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded-full">
                                  {group.episodes.length} epizod{group.episodes.length > 1 ? 'ów' : ''}
                                </span>
                                <span className="text-xs text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded-full">
                                  {group.totalDuration} dni
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded episodes by dose */}
                      {group.isExpanded && (
                        <div className="bg-gradient-to-r from-remedy-light/50 to-white">
                          {(() => {
                            const episodesByDose = new Map<string, ProcessedDrugEpisode[]>();
                            group.episodes.forEach(episode => {
                              const dose = episode.dose || 'N/A';
                              if (!episodesByDose.has(dose)) {
                                episodesByDose.set(dose, []);
                              }
                              episodesByDose.get(dose)!.push(episode);
                            });

                            return Array.from(episodesByDose.entries()).map(([dose, episodes]) => (
                              <div key={dose} className="border-b border-remedy-border/50 last:border-b-0 hover:bg-remedy-light/30 transition-colors">
                                <div className="flex items-center gap-3 px-8" style={{ height: LAYOUT.EPISODE_HEIGHT + 8 }}>
                                  <div
                                    className="w-3 h-3 rounded-full shadow-sm border border-white"
                                    style={{ backgroundColor: group.color, opacity: 0.8 }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-slate-700 bg-white px-2 py-1 rounded-full shadow-sm">
                                      {dose}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-2">
                                      {episodes.length} wystąpień
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline content */}
          <div
            ref={containerRef}
            className="flex-1 bg-gradient-to-b from-white to-slate-50 overflow-x-auto overflow-y-visible"
            style={{ 
              height: totalContentHeight, // FIXED: Same height as sidebar
            }}
          >
            <div
              ref={timelineRef}
              className="relative overflow-visible"
              style={{ 
                height: '100%', // Occupy full height of parent containerRef
                width: timelineWidth // Use calculated timeline width based on zoom
              }}
            >
              {/* Grid lines */}
              {timeMarkers.map((marker, index) => (
                <div
                  key={`grid-${index}`}
                  className="absolute top-0 w-px bg-slate-300 opacity-60"
                  style={{ 
                    left: `${marker.x}%`, 
                    height: '100%'
                  }}
                />
              ))}

              {/* Timeline events */}
              {visibleEvents
                .filter(event => {
                  const isInViewportY = event.y + event.height >= 0 && event.y <= totalContentHeight; // FIXED: Use totalContentHeight instead of containerHeight
                  const hasXIntersection = event.x < 100 && (event.x + event.width) > 0;
                  return isInViewportY && hasXIntersection;
                })
                .map(event => (
                  <TimelineEventBar
                    key={event.id}
                    event={event}
                    isHighlighted={highlightedDrug === event.drugName}
                    onClick={handleEventClick}
                    onHover={handleEventHover}
                    showAdvancedMetrics={showAdvancedMetrics}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for selected event */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEvent(null);
            }
          }}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
              <div
                className="w-6 h-6 rounded-full shadow-sm"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-800">
                    {selectedEvent.drugName}
                  </h3>
                  {selectedEvent.mghAtrqCompliant && (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" title="Zgodne z MGH ATRQ" />
                  )}
                </div>
                <p className="text-sm text-slate-600">Szczegóły terapii farmakologicznej</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600 mb-1">Dawka</div>
                <div className="font-semibold text-slate-800">{selectedEvent.dose}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600 mb-1">Czas trwania</div>
                <div className="font-semibold text-slate-800">{selectedEvent.duration} dni</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600 mb-1">Okres terapii</div>
                <div className="font-semibold text-slate-800 text-sm">
                  {format(selectedEvent.startDate, 'dd.MM.yyyy')} - {format(selectedEvent.endDate, 'dd.MM.yyyy')}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600 mb-1">Znaczenie kliniczne</div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  selectedEvent.clinicalSignificance === 'critical' ? 'bg-red-100 text-red-700' :
                  selectedEvent.clinicalSignificance === 'high' ? 'bg-orange-100 text-orange-700' :
                  selectedEvent.clinicalSignificance === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedEvent.clinicalSignificance === 'critical' ? 'Krytyczne' :
                   selectedEvent.clinicalSignificance === 'high' ? 'Wysokie' :
                   selectedEvent.clinicalSignificance === 'moderate' ? 'Średnie' : 'Niskie'}
                </div>
              </div>
            </div>

            {selectedEvent.notes && (
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3">Uwagi kliniczne</h4>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-800">{selectedEvent.notes}</p>
                </div>
              </div>
            )}

            {/* AI-POWERED INSIGHTS SECTION */}
            {(enableAIAnalysis || enablePredictiveAnalytics) && (
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  AI-Powered Insights
                </h4>
                
                {/* Analiza wzorców leczenia */}
                {enableAIAnalysis && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-700 mb-2">Analiza wzorców leczenia</h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-slate-600 mb-1">Wzorzec leczenia</div>
                        <div className="font-medium text-slate-800">
                          {selectedEvent.predictiveAnalytics.confidenceLevel > 0.7 ? (
                            selectedEvent.clinicalAnalysis.treatmentResponse.responseType === 'full_response' ? 'Standardowy' :
                            selectedEvent.clinicalAnalysis.treatmentResponse.responseType === 'partial_response' ? 'Umiarkowany' :
                            'Złożony'
                          ) : 'Nieznany'}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-slate-600 mb-1">Przestrzeganie terapii</div>
                        <div className="font-medium text-slate-800">
                          {selectedEvent.duration > 56 ? 'Dobre' : 
                           selectedEvent.duration > 28 ? 'Umiarkowane' : 'Słabe'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Predykcyjna analityka */}
                {enablePredictiveAnalytics && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-700 mb-2">Predykcyjna analityka</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Prognoza odpowiedzi na leczenie</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${selectedEvent.predictiveAnalytics.treatmentSuccessProbability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-800">
                            {(selectedEvent.predictiveAnalytics.treatmentSuccessProbability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Ryzyko działań niepożądanych</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${selectedEvent.predictiveAnalytics.adverseEventRisk * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-800">
                            {(selectedEvent.predictiveAnalytics.adverseEventRisk * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 italic">
                        *Analiza oparta na historii działań niepożądanych i profilu farmakologicznym leku
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Zgodność z protokołem</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${selectedEvent.predictiveAnalytics.protocolEligibilityScore * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-800">
                            {(selectedEvent.predictiveAnalytics.protocolEligibilityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ocena zgodności z MGH ATRQ */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Ocena zgodności z MGH ATRQ</h5>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">Status zgodności</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        selectedEvent.clinicalAnalysis.mghAtrqCompliance.isCompliant 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedEvent.clinicalAnalysis.mghAtrqCompliance.isCompliant ? 'Zgodny' : 'Niezgodny'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Pewność: {(selectedEvent.clinicalAnalysis.mghAtrqCompliance.confidence * 100).toFixed(0)}%
                    </div>
                    {selectedEvent.clinicalAnalysis.mghAtrqCompliance.reasoning && (
                      <div className="text-xs text-slate-500 mt-1">
                        {selectedEvent.clinicalAnalysis.mghAtrqCompliance.reasoning}
                      </div>
                    )}
                  </div>
                </div>

                {/* Klasyfikacja leków */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Klasyfikacja leków</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="text-slate-600 mb-1">Linia terapii</div>
                      <div className="font-medium text-slate-800">
                        {selectedEvent.drugClassification.primaryClass === 'SSRI' || selectedEvent.drugClassification.primaryClass === 'SNRI' ? 'I linia' :
                         selectedEvent.drugClassification.primaryClass === 'TCA' || selectedEvent.drugClassification.primaryClass === 'Atypical' ? 'II linia' :
                         selectedEvent.drugClassification.primaryClass === 'MAOI' ? 'III linia' :
                         selectedEvent.drugClassification.isAugmentationAgent ? 'Augmentacja' :
                         'Inne'}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <div className="text-slate-600 mb-1">Relevantność protokołu</div>
                      <div className="font-medium text-slate-800">
                        {selectedEvent.drugClassification.isProtocolRelevant ? 'Istotny' : 'Nieistotny'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wskaźniki jakości danych */}
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Wskaźniki jakości danych</h5>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Jakość danych</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedEvent.dataQuality === 'excellent' ? 'bg-green-500' :
                        selectedEvent.dataQuality === 'good' ? 'bg-blue-500' :
                        selectedEvent.dataQuality === 'fair' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-xs font-medium text-slate-800 capitalize">
                        {selectedEvent.dataQuality === 'excellent' ? 'Doskonała' :
                         selectedEvent.dataQuality === 'good' ? 'Dobra' :
                         selectedEvent.dataQuality === 'fair' ? 'Przeciętna' :
                         'Słaba'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-600">Pewność AI</span>
                    <span className="text-xs font-medium text-slate-800">
                      {(selectedEvent.aiConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* AI Insights */}
                {selectedEvent.predictiveAnalytics.aiInsights.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-slate-700 mb-2">Spostrzeżenia AI</h5>
                    <div className="space-y-1">
                      {selectedEvent.predictiveAnalytics.aiInsights.map((insight, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-blue-50 rounded p-2">
                          • {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Next Steps */}
                {selectedEvent.predictiveAnalytics.recommendedNextSteps.length > 0 && (
                  <div>
                    <h5 className="font-medium text-slate-700 mb-2">Zalecane następne kroki</h5>
                    <div className="space-y-1">
                      {selectedEvent.predictiveAnalytics.recommendedNextSteps.map((step, index) => (
                        <div key={index} className="text-xs text-slate-600 bg-green-50 rounded p-2">
                          • {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Tooltip - Rendered at top level to appear above everything */}
      {hoveredEvent && tooltipPosition && (
        <div 
          className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none z-[9999] min-w-max max-w-xs"
          style={{
            left: Math.min(tooltipPosition.x + 15, window.innerWidth - 280), // Offset right and prevent overflow
            top: Math.max(tooltipPosition.y - 80, 10), // Offset up more to avoid cursor and prevent overflow at top
            transform: 'none' // Remove transform to use direct positioning
          }}
        >
          <div className="space-y-1">
            <div className="font-semibold">{hoveredEvent.drugName}</div>
            <div>Dawka: {hoveredEvent.dose}</div>
            <div>Czas trwania: {hoveredEvent.duration} dni</div>
            {showAdvancedMetrics && (
              <>
                <div>Skuteczność: {(hoveredEvent.predictiveAnalytics.treatmentSuccessProbability * 100).toFixed(0)}%</div>
                <div>Pewność AI: {(hoveredEvent.aiConfidence * 100).toFixed(0)}%</div>
              </>
            )}
            {hoveredEvent.mghAtrqCompliant && <div className="text-green-300">✓ Zgodne z MGH ATRQ</div>}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}

      {/* Sekcja Kontekstu Historycznego - NOWY KOMPONENT */}
      {patientData.trdAnalysis?.pharmacotherapy && 
       patientData.historicalContext && (
        <HistoricalContext 
          data={patientData.historicalContext}
          variant="default"
        />
      )}
    </div>
  );
};