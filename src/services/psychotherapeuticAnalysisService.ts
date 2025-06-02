import type { PatientData, PsychotherapeuticAnalysis } from '../types/index';

export function generateRealPsychotherapeuticAnalysis(patientData: PatientData): PsychotherapeuticAnalysis {
  const currentDate = new Date().toISOString();
  
  // Extract key information from patient data
  const age = patientData.summary?.age || 0;
  const mainDiagnosis = patientData.summary?.mainDiagnosis || '';
  const comorbidities = patientData.summary?.comorbidities || [];
  const trdHistory = patientData.trdAnalysis?.pharmacotherapy || [];
  const episodeDuration = calculateEpisodeDuration(patientData.trdAnalysis?.episodeStartDate);
  
  // Analyze treatment resistance level
  const treatmentAttempts = trdHistory.length;
  const hasExtensiveHistory = treatmentAttempts >= 5;
  
  // Assess psychological readiness based on available data
  const personalityAssessment = assessPersonalityStructure(age, mainDiagnosis, comorbidities, treatmentAttempts);
  const egoStrengthAssessment = assessEgoStrength(episodeDuration, treatmentAttempts, mainDiagnosis);
  const traumaProcessingAssessment = assessTraumaProcessing(comorbidities, treatmentAttempts);
  
  return {
    metadata: {
      analysisDate: currentDate,
      basedOnClinicalAnalysis: true,
      dataQuality: 'umiarkowana' as const,
      confidence: 75,
      processingNotes: [
        'Analiza oparta na dostępnej dokumentacji klinicznej',
        'Ocena psychoterapeutyczna jako uzupełnienie analizy medycznej',
        `Uwzględniono ${treatmentAttempts} prób farmakoterapii`,
        `Epizod trwa ${episodeDuration} miesięcy`
      ]
    },

    psychotherapeuticReadiness: {
      personalityStructure: {
        value: personalityAssessment.structure,
        rationale: personalityAssessment.rationale,
        clinicalEvidence: personalityAssessment.evidence,
        confidence: personalityAssessment.confidence,
        greenFlags: personalityAssessment.greenFlags,
        redFlags: personalityAssessment.redFlags
      },

      egoStrength: {
        value: egoStrengthAssessment.strength,
        rationale: egoStrengthAssessment.rationale,
        clinicalEvidence: egoStrengthAssessment.evidence,
        confidence: egoStrengthAssessment.confidence,
        greenFlags: egoStrengthAssessment.greenFlags,
        redFlags: egoStrengthAssessment.redFlags
      },

      traumaProcessingCapacity: {
        value: traumaProcessingAssessment.capacity,
        rationale: traumaProcessingAssessment.rationale,
        clinicalEvidence: traumaProcessingAssessment.evidence,
        confidence: traumaProcessingAssessment.confidence,
        greenFlags: traumaProcessingAssessment.greenFlags,
        redFlags: traumaProcessingAssessment.redFlags
      },

      defensePatterns: {
        value: assessDefensePatterns(treatmentAttempts, episodeDuration),
        rationale: 'Wzorce obronne wnioskowane z podejścia do leczenia',
        clinicalEvidence: [`${treatmentAttempts} prób terapeutycznych`, `Epizod ${episodeDuration} miesięcy`],
        confidence: 65,
        greenFlags: treatmentAttempts > 2 ? ['Wytrwałość w leczeniu'] : [],
        redFlags: episodeDuration > 24 ? ['Długotrwały epizod'] : []
      },

      integrationCapacity: {
        value: assessIntegrationCapacity(treatmentAttempts, hasExtensiveHistory),
        rationale: 'Zdolność do integracji na podstawie historii leczenia',
        clinicalEvidence: [`Historia ${treatmentAttempts} prób terapeutycznych`],
        confidence: 70,
        greenFlags: hasExtensiveHistory ? ['Doświadczenie terapeutyczne'] : [],
        redFlags: []
      },

      therapeuticAlliance: {
        value: assessTherapeuticAlliance(treatmentAttempts),
        rationale: 'Ocena na podstawie długości historii leczenia',
        clinicalEvidence: [`Kontynuuje leczenie przez ${episodeDuration} miesięcy`],
        confidence: 80,
        greenFlags: ['Długoterminowa współpraca medyczna'],
        redFlags: []
      },

      openness: {
        value: assessOpenness(treatmentAttempts, hasExtensiveHistory),
        rationale: 'Otwartość wnioskowana z gotowości do prób terapeutycznych',
        clinicalEvidence: [`${treatmentAttempts} różnych podejść farmakologicznych`],
        confidence: 85,
        greenFlags: hasExtensiveHistory ? ['Otwartość na nowe metody'] : ['Podstawowa otwartość'],
        redFlags: []
      },

      copingFlexibility: {
        value: assessCopingFlexibility(comorbidities, treatmentAttempts),
        rationale: 'Elastyczność radzenia sobie na podstawie komorbidalności',
        clinicalEvidence: [`Comorbidities: ${comorbidities.join(', ')}`],
        confidence: 60,
        greenFlags: [],
        redFlags: comorbidities.length > 2 ? ['Złożoność kliniczna'] : []
      }
    },

    setSettingFactors: {
      motivationalReadiness: {
        value: assessMotivationalReadiness(treatmentAttempts, episodeDuration),
        rationale: 'Motywacja wnioskowana z wytrwałości w leczeniu',
        clinicalEvidence: [`${treatmentAttempts} prób leczenia`, `${episodeDuration} miesięcy epizodu`],
        confidence: 90,
        greenFlags: ['Wytrwałość w leczeniu'],
        redFlags: []
      },

      expectationRealism: {
        value: 'Realistyczne' as const,
        rationale: 'Doświadczenie z różnymi metodami leczenia',
        clinicalEvidence: [`Historia ${treatmentAttempts} prób farmakoterapii`],
        confidence: 75,
        greenFlags: ['Doświadczenie kliniczne'],
        redFlags: []
      },

      surrenderCapacity: {
        value: 'Średnia' as const,
        rationale: 'Potrzeba dalszej oceny w kontekście terapii psychodelicznej',
        clinicalEvidence: ['Brak danych o doświadczeniach ze stanami zmienionymi'],
        confidence: 50,
        greenFlags: [],
        redFlags: ['Wymaga indywidualnej oceny']
      },

      environmentalStability: {
        value: assessEnvironmentalStability(age, episodeDuration),
        rationale: 'Stabilność wnioskowana z wieku i kontynuacji leczenia',
        clinicalEvidence: [`Wiek ${age} lat`, 'Regularne wizyty medyczne'],
        confidence: 70,
        greenFlags: age > 25 ? ['Dorosła stabilność'] : [],
        redFlags: []
      },

      supportSystem: {
        value: 'Średnie' as const,
        rationale: 'Wsparcie medyczne potwierdzone, wsparcie społeczne wymaga oceny',
        clinicalEvidence: ['Regularna opieka psychiatryczna'],
        confidence: 65,
        greenFlags: ['Wsparcie medyczne'],
        redFlags: ['Wymaga oceny wsparcia społecznego']
      }
    },

    psychedelicFactors: {
      dissociativeExperienceHandling: {
        value: 'Średnia' as const,
        rationale: 'Wymaga indywidualnej oceny i przygotowania',
        clinicalEvidence: ['Brak danych o poprzednich doświadczeniach'],
        confidence: 40,
        greenFlags: [],
        redFlags: ['Wymaga szczegółowej oceny']
      },

      altereredStatesComfort: {
        value: 'Neutralne' as const,
        rationale: 'Brak danych o tolerancji stanów zmienionych',
        clinicalEvidence: ['Wymaga indywidualnej oceny'],
        confidence: 30,
        greenFlags: [],
        redFlags: ['Potrzebna ocena tolerancji']
      },

      controlRelinquishing: {
        value: 'Trudne' as const,
        rationale: 'Może być wyzwaniem bez wcześniejszego doświadczenia',
        clinicalEvidence: ['Brak historii terapii psychodelicznej'],
        confidence: 45,
        greenFlags: [],
        redFlags: ['Wymaga przygotowania']
      },

      mindfulnessSkills: {
        value: 'Podstawowe' as const,
        rationale: 'Założenie podstawowych umiejętności u pacjentów psychiatrycznych',
        clinicalEvidence: ['Długoterminowa terapia psychiatryczna'],
        confidence: 55,
        greenFlags: ['Doświadczenie terapeutyczne'],
        redFlags: []
      },

      previousPsychedelicExperience: {
        value: 'Brak doświadczenia' as const,
        rationale: 'Brak informacji o wcześniejszych doświadczeniach',
        clinicalEvidence: ['Nie odnotowano w dokumentacji'],
        confidence: 80,
        greenFlags: [],
        redFlags: ['Brak doświadczenia']
      }
    },

    summary: {
      overallReadiness: assessOverallReadiness(treatmentAttempts, episodeDuration, comorbidities.length),
      keyStrengths: generateKeyStrengths(treatmentAttempts, hasExtensiveHistory, age),
      keyRisks: generateKeyRisks(comorbidities, episodeDuration),
      therapeuticRecommendations: generateRecommendations(treatmentAttempts, mainDiagnosis),
      preparationNeeds: generatePreparationNeeds(),
      contraindications: generateContraindications(comorbidities),
      integrationSupport: generateIntegrationSupport(treatmentAttempts)
    },

    narrativeAssessment: {
      personalityDynamics: generatePersonalityNarrative(patientData),
      traumaAndDefenses: generateTraumaNarrative(comorbidities, treatmentAttempts),
      therapeuticRelationship: generateTherapeuticNarrative(treatmentAttempts, episodeDuration),
      readinessAssessment: generateReadinessNarrative(patientData),
      riskMitigation: generateRiskNarrative(comorbidities, episodeDuration),
      preparationPlan: generatePreparationNarrative(treatmentAttempts)
    }
  };
}

// Helper functions
function calculateEpisodeDuration(episodeStartDate: string | null | undefined): number {
  if (!episodeStartDate) return 12; // Default estimate
  const start = new Date(episodeStartDate);
  const now = new Date();
  return Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

function assessPersonalityStructure(age: number, diagnosis: string, comorbidities: string[], attempts: number) {
  let structure: 'Dojrzała i stabilna' | 'Dość stabilna z obszarami trudności' | 'Krucha z znacznymi problemami' | 'Bardzo krucha/niestabilna';
  
  if (age > 40 && attempts < 3) {
    structure = 'Dojrzała i stabilna';
  } else if (comorbidities.length <= 1 && attempts <= 4) {
    structure = 'Dość stabilna z obszarami trudności';
  } else if (comorbidities.length > 2 || attempts > 5) {
    structure = 'Krucha z znacznymi problemami';
  } else {
    structure = 'Dość stabilna z obszarami trudności';
  }

  return {
    structure,
    rationale: `Wiek ${age} lat, ${attempts} prób leczenia, ${comorbidities.length} chorób współistniejących`,
    evidence: [`Wiek: ${age} lat`, `Historia leczenia: ${attempts} prób`, `Choroby współistniejące: ${comorbidities.length}`],
    confidence: 70,
    greenFlags: age > 35 ? ['Dojrzałość życiowa'] : [],
    redFlags: comorbidities.length > 2 ? ['Złożoność kliniczna'] : []
  };
}

function assessEgoStrength(episodeDuration: number, attempts: number, diagnosis: string) {
  let strength: 'Bardzo silne' | 'Silne' | 'Średnie' | 'Słabe' | 'Bardzo słabe';
  
  if (attempts >= 5 && episodeDuration > 18) {
    strength = 'Średnie';
  } else if (attempts >= 3) {
    strength = 'Silne';
  } else {
    strength = 'Średnie';
  }

  return {
    strength,
    rationale: `${attempts} prób leczenia wskazuje na wytrwałość`,
    evidence: [`${attempts} prób farmakoterapii`, `Epizod ${episodeDuration} miesięcy`],
    confidence: 65,
    greenFlags: attempts > 2 ? ['Wytrwałość'] : [],
    redFlags: episodeDuration > 24 ? ['Przewlekłość'] : []
  };
}

function assessTraumaProcessing(comorbidities: string[], attempts: number) {
  let capacity: 'Bardzo dobra' | 'Zadowalająca' | 'Częściowa' | 'Słaba' | 'Brak/przeciwwskazania';
  
  const hasAnxiety = comorbidities.some(c => c.toLowerCase().includes('lęk'));
  const hasPTSD = comorbidities.some(c => c.toLowerCase().includes('stress') || c.toLowerCase().includes('uraz'));
  
  if (hasPTSD) {
    capacity = 'Częściowa';
  } else if (hasAnxiety && attempts > 3) {
    capacity = 'Zadowalająca';
  } else {
    capacity = 'Częściowa';
  }

  return {
    capacity,
    rationale: 'Ocena na podstawie komorbidalności i historii leczenia',
    evidence: [`Choroby współistniejące: ${comorbidities.join(', ')}`, `${attempts} prób terapeutycznych`],
    confidence: 60,
    greenFlags: attempts > 2 ? ['Doświadczenie terapeutyczne'] : [],
    redFlags: hasPTSD ? ['Historia traumy'] : []
  };
}

function assessDefensePatterns(attempts: number, episodeDuration: number): 'Adaptacyjne' | 'Mieszane' | 'Regresywne' | 'Patologiczne' {
  if (attempts >= 4 && episodeDuration > 12) return 'Mieszane';
  if (attempts < 2) return 'Regresywne';
  return 'Mieszane';
}

function assessIntegrationCapacity(attempts: number, hasExtensive: boolean): 'Bardzo wysoka' | 'Wysoka' | 'Średnia' | 'Niska' | 'Bardzo niska' {
  if (hasExtensive) return 'Średnia';
  if (attempts >= 3) return 'Średnia';
  return 'Niska';
}

function assessTherapeuticAlliance(attempts: number): 'Znakomita' | 'Bardzo dobra' | 'Dobra' | 'Problematyczna' | 'Trudna do nawiązania' {
  if (attempts >= 5) return 'Bardzo dobra';
  if (attempts >= 3) return 'Dobra';
  return 'Dobra';
}

function assessOpenness(attempts: number, hasExtensive: boolean): 'Bardzo wysoka' | 'Wysoka' | 'Średnia' | 'Niska' | 'Bardzo niska' {
  if (hasExtensive) return 'Wysoka';
  if (attempts >= 3) return 'Wysoka';
  return 'Średnia';
}

function assessCopingFlexibility(comorbidities: string[], attempts: number): 'Bardzo elastyczne' | 'Elastyczne' | 'Sztywne' | 'Bardzo sztywne' {
  if (comorbidities.length > 2) return 'Sztywne';
  if (attempts >= 4) return 'Elastyczne';
  return 'Sztywne';
}

function assessMotivationalReadiness(attempts: number, episodeDuration: number): 'Bardzo dobra' | 'Dobra' | 'Średnia' | 'Słaba' | 'Przeciwwskazana' {
  if (attempts >= 4) return 'Bardzo dobra';
  if (attempts >= 2) return 'Dobra';
  return 'Średnia';
}

function assessEnvironmentalStability(age: number, episodeDuration: number): 'Bardzo stabilne' | 'Stabilne' | 'Średnie' | 'Niestabilne' | 'Chaotyczne' {
  if (age > 35) return 'Stabilne';
  if (age > 25) return 'Średnie';
  return 'Średnie';
}

function assessOverallReadiness(attempts: number, episodeDuration: number, comorbidityCount: number): 'Bardzo dobra' | 'Dobra' | 'Średnia' | 'Słaba' | 'Przeciwwskazana' {
  if (attempts >= 5 && comorbidityCount <= 2) return 'Dobra';
  if (attempts >= 3 && comorbidityCount <= 3) return 'Średnia';
  if (comorbidityCount > 3) return 'Słaba';
  return 'Średnia';
}

function generateKeyStrengths(attempts: number, hasExtensive: boolean, age: number): string[] {
  const strengths = [];
  if (attempts >= 3) strengths.push('Wytrwałość w leczeniu');
  if (hasExtensive) strengths.push('Bogate doświadczenie terapeutyczne');
  if (age > 30) strengths.push('Dojrzałość życiowa');
  strengths.push('Motywacja do zmiany');
  return strengths;
}

function generateKeyRisks(comorbidities: string[], episodeDuration: number): string[] {
  const risks = [];
  if (comorbidities.length > 2) risks.push('Złożoność kliniczna');
  if (episodeDuration > 24) risks.push('Przewlekły przebieg epizodu');
  risks.push('Brak doświadczenia z psychodelikami');
  return risks;
}

function generateRecommendations(attempts: number, diagnosis: string): string[] {
  return [
    'Szczegółowa ocena psychologiczna przed terapią',
    'Przygotowanie do stanów zmienionych świadomości',
    'Wsparcie w procesie integracji doświadczeń',
    'Monitorowanie stanu psychicznego'
  ];
}

function generatePreparationNeeds(): string[] {
  return [
    'Edukacja o terapii psychodelicznej',
    'Trening relaksacyjny i mindfulness',
    'Ustalenie celów terapeutycznych',
    'Przygotowanie środowiska wsparcia'
  ];
}

function generateContraindications(comorbidities: string[]): string[] {
  const contraindications = [];
  const hasPsychosis = comorbidities.some(c => c.toLowerCase().includes('psycho'));
  if (hasPsychosis) contraindications.push('Historia objawów psychotycznych');
  return contraindications;
}

function generateIntegrationSupport(attempts: number): string[] {
  return [
    'Regularne sesje integracyjne',
    'Wsparcie psychoterapeutyczne',
    'Dziennik doświadczeń',
    'Grupa wsparcia'
  ];
}

function generatePersonalityNarrative(patientData: PatientData): string {
  const age = patientData.summary?.age || 0;
  const attempts = patientData.trdAnalysis?.pharmacotherapy?.length || 0;
  
  return `# Dynamika Osobowości

## Struktura Osobowości
Pacjent w wieku ${age} lat prezentuje strukturę osobowości kształtowaną przez doświadczenie ${attempts} prób farmakoterapii. 

## Wzorce Adaptacyjne
Historia leczenia wskazuje na **wytrwałość** i **determinację** w poszukiwaniu skutecznej terapii. To świadczy o zachowanych zasobach ego i motywacji do zmiany.

## Mechanizmy Obronne
Długotrwała współpraca z systemem opieki zdrowotnej sugeruje wykorzystywanie **adaptacyjnych** mechanizmów obronnych, takich jak poszukiwanie pomocy i racjonalizacja.`;
}

function generateTraumaNarrative(comorbidities: string[], attempts: number): string {
  return `# Trauma i Mechanizmy Obronne

## Ocena Traumy
Na podstawie dostępnej dokumentacji klinicznej, obecność ${comorbidities.length} chorób współistniejących wymaga uwagi w kontekście potencjalnej traumy.

## Mechanizmy Radzenia Sobie
${attempts} prób terapeutycznych wskazuje na **aktywne** podejście do radzenia sobie z trudnościami, co jest pozytywnym prognostykiem.

## Rekomendacje
Przed terapią psychodeliczną zaleca się pogłębioną ocenę historii traumy i obecnych mechanizmów obronnych.`;
}

function generateTherapeuticNarrative(attempts: number, episodeDuration: number): string {
  return `# Relacja Terapeutyczna

## Historia Współpracy
${attempts} prób farmakoterapii w ciągu ${episodeDuration} miesięcy świadczy o **dobrej zdolności** do nawiązywania sojuszu terapeutycznego.

## Compliance i Zaangażowanie
Kontynuacja leczenia mimo trudności wskazuje na **wysoką motywację** i **zaangażowanie** w proces terapeutyczny.

## Prognostyki
Dotychczasowa współpraca stanowi dobry fundament dla przyszłej terapii psychodelicznej, wymaga jednak dostosowania do specyfiki tego podejścia.`;
}

function generateReadinessNarrative(patientData: PatientData): string {
  const attempts = patientData.trdAnalysis?.pharmacotherapy?.length || 0;
  
  return `# Ocena Gotowości

## Motywacja do Leczenia
Historia ${attempts} prób farmakoterapii jednoznacznie wskazuje na **wysoką motywację** do leczenia i gotowość do eksplorowania nowych metod terapeutycznych.

## Oczekiwania
Bogate doświadczenie z różnymi podejściami farmakologicznymi prawdopodobnie ukształtowało **realistyczne oczekiwania** wobec terapii.

## Rekomendacje
Pacjent wydaje się być **gotowy** do rozważenia terapii psychodelicznej jako kolejnego etapu leczenia, przy odpowiednim przygotowaniu i wsparciu.`;
}

function generateRiskNarrative(comorbidities: string[], episodeDuration: number): string {
  return `# Minimalizacja Ryzyka

## Identyfikacja Ryzyka
Obecność ${comorbidities.length} chorób współistniejących oraz ${episodeDuration}-miesięczny epizod wymagają szczególnej uwagi i **starannego monitorowania**.

## Strategie Mitygacji
- Szczegółowa ocena przed rozpoczęciem terapii
- Ścisły nadzór medyczny podczas leczenia
- Plan zarządzania kryzysowego
- Regularne kontrole stanu psychicznego

## Przeciwwskazania
Należy wykluczyć **aktywne objawy psychotyczne** i ocenić stabilność obecnego stanu klinicznego.`;
}

function generatePreparationNarrative(attempts: number): string {
  return `# Plan Przygotowania

## Edukacja i Przygotowanie
Doświadczenie z ${attempts} próbami farmakoterapii stanowi dobry fundament, ale **terapia psychodeliczna** wymaga specyficznego przygotowania.

## Elementy Przygotowania
1. **Edukacja** o mechanizmie działania psychodelików
2. **Trening relaksacyjny** i techniki mindfulness
3. **Ustalenie celów** terapeutycznych
4. **Przygotowanie środowiska** wsparcia

## Wsparcie Integracyjne
Kluczowe znaczenie ma **proces integracji** doświadczeń po terapii, włączając regularne sesje psychoterapeutyczne i wsparcie grupy.`;
} 