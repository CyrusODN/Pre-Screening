import { PatientData } from '../types';

export const initialPatientData: PatientData = {
  summary: {
    id: "Pacjent XYZ/05/2025",
    age: 33,
    mainDiagnosis: "F33.1 Zaburzenie depresyjne nawracające, obecnie epizod depresyjny umiarkowany",
    comorbidities: ["F42 Zaburzenia obsesyjno-kompulsyjne (OCD) - przewlekłe, objawowe", "Astma oskrzelowa"],
  },
  episodeEstimation: {
    scenarios: [
      {
        id: 1,
        description: "Początek obecnego epizodu szacowany na styczeń 2024",
        evidence: "Znaczące pogorszenie stanu psychicznego, zwiększenie dawki leków przeciwdepresyjnych"
      }
    ],
    conclusion: "Na podstawie dostępnej dokumentacji, obecny epizod rozpoczął się w styczniu 2024."
  },
  trdAnalysis: {
    episodeStartDate: "2024-01-15",
    pharmacotherapy: [
      {
        id: "1",
        drugName: "Escitalopram",
        shortName: "ESC",
        startDate: "2024-01-15",
        endDate: "2024-03-15",
        dose: "20mg",
        attemptGroup: 1,
        notes: "Brak odpowiedzi po 8 tygodniach"
      }
    ],
    conclusion: "Pacjent spełnia kryteria lekooporności wg MGH-ATRQ"
  },
  inclusionCriteria: [
    {
      id: "IC1",
      name: "Wiek 18-65 lat",
      status: "spełnione",
      details: "Pacjent ma 33 lata",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  psychiatricExclusionCriteria: [
    {
      id: "EC1",
      name: "Współistniejące zaburzenia psychiczne",
      status: "weryfikacja",
      details: "OCD wymaga dokładnej oceny nasilenia",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  medicalExclusionCriteria: [
    {
      id: "GMEC1",
      name: "Istotne schorzenia somatyczne",
      status: "weryfikacja",
      details: "Astma oskrzelowa - wymagana ocena ciężkości",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  reportConclusion: {
    overallQualification: "Potencjalnie kwalifikuje się do badania",
    mainIssues: [
      "Konieczna ocena nasilenia OCD",
      "Wymagana weryfikacja ciężkości astmy"
    ],
    criticalInfoNeeded: [
      "Aktualne wyniki spirometrii",
      "Ocena nasilenia objawów OCD w skali Y-BOCS"
    ],
    estimatedProbability: 70
  },
  isMockData: true
};