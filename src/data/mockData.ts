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
  analyzedAt: "2025-01-15T10:30:00Z",
  isMockData: true
};

// Rozbudowane dane demonstracyjne z bogatą historią farmakoterapii
export const demoPatientData: PatientData = {
  summary: {
    id: "DEMO-001/2025",
    age: 42,
    mainDiagnosis: "F33.2 Zaburzenie depresyjne nawracające, obecnie epizod depresyjny ciężki bez objawów psychotycznych",
    comorbidities: [
      "F41.1 Zaburzenie lękowe uogólnione", 
      "F10.1 Używanie alkoholu z szkodą", 
      "E78.0 Hipercholesterolemia",
      "I10 Nadciśnienie tętnicze pierwotne"
    ],
  },
  episodeEstimation: {
    scenarios: [
      {
        id: 1,
        description: "Obecny epizod rozpoczął się w marcu 2023",
        evidence: "Dokumentacja psychiatryczna wskazuje na znaczące pogorszenie stanu od marca 2023"
      },
      {
        id: 2,
        description: "Możliwy wcześniejszy początek - styczeń 2023",
        evidence: "Pacjent zgłaszał objawy już w styczniu, ale nie szukał pomocy"
      }
    ],
    conclusion: "Obecny epizod depresyjny trwa od marca 2023 roku (22 miesiące)."
  },
  trdAnalysis: {
    episodeStartDate: "2023-03-01",
    pharmacotherapy: [
      // Pierwsza próba - Sertraline
      {
        id: "1",
        drugName: "Sertraline",
        shortName: "SER",
        startDate: "2023-03-15",
        endDate: "2023-05-30",
        dose: "50mg",
        attemptGroup: 1,
        notes: "Rozpoczęcie leczenia, dawka początkowa. Adekwatna wg kryt. MGH-ATRQ badania: Sertraline 50mg przez 10 tygodni"
      },
      {
        id: "2",
        drugName: "Sertraline",
        shortName: "SER",
        startDate: "2023-05-30",
        endDate: "2023-07-15",
        dose: "100mg",
        attemptGroup: 1,
        notes: "Zwiększenie dawki z powodu braku odpowiedzi. Adekwatna wg kryt. MGH-ATRQ badania: kontynuacja próby"
      },
      {
        id: "3",
        drugName: "Sertraline",
        shortName: "SER",
        startDate: "2023-07-15",
        endDate: "2023-08-30",
        dose: "150mg",
        attemptGroup: 1,
        notes: "Maksymalna dawka, nadal brak odpowiedzi. Adekwatna wg kryt. MGH-ATRQ badania: łącznie 20 tygodni"
      },
      
      // Druga próba - Venlafaxine
      {
        id: "4",
        drugName: "Venlafaxine XR",
        shortName: "VEN",
        startDate: "2023-09-01",
        endDate: "2023-10-15",
        dose: "75mg",
        attemptGroup: 2,
        notes: "Zmiana leku, dawka początkowa. Nieadekwatna wg kryt. MGH-ATRQ badania: dawka za niska"
      },
      {
        id: "5",
        drugName: "Venlafaxine XR",
        shortName: "VEN",
        startDate: "2023-10-15",
        endDate: "2023-12-01",
        dose: "150mg",
        attemptGroup: 2,
        notes: "Zwiększenie dawki. Adekwatna wg kryt. MGH-ATRQ badania: Venlafaxine 150mg przez 12 tygodni"
      },
      {
        id: "6",
        drugName: "Venlafaxine XR",
        shortName: "VEN",
        startDate: "2023-12-01",
        endDate: "2024-01-30",
        dose: "225mg",
        attemptGroup: 2,
        notes: "Dalsze zwiększenie dawki, częściowa odpowiedź. Adekwatna wg kryt. MGH-ATRQ badania: kontynuacja"
      },
      
      // Trzecia próba - Mirtazapine (augmentacja)
      {
        id: "7",
        drugName: "Venlafaxine XR",
        shortName: "VEN",
        startDate: "2024-01-30",
        endDate: "2024-04-15",
        dose: "225mg",
        attemptGroup: 3,
        notes: "Kontynuacja w ramach terapii skojarzonej. Adekwatna wg kryt. MGH-ATRQ badania: lek bazowy w augmentacji"
      },
      {
        id: "8",
        drugName: "Mirtazapine",
        shortName: "MIR",
        startDate: "2024-02-01",
        endDate: "2024-04-15",
        dose: "15mg",
        attemptGroup: 3,
        notes: "Augmentacja, poprawa snu ale nadal depresja. Adekwatna wg kryt. MGH-ATRQ badania: Mirtazapine 15mg przez 10 tygodni"
      },
      {
        id: "9",
        drugName: "Mirtazapine",
        shortName: "MIR",
        startDate: "2024-04-15",
        endDate: "2024-06-01",
        dose: "30mg",
        attemptGroup: 3,
        notes: "Zwiększenie dawki mirtazapiny. Adekwatna wg kryt. MGH-ATRQ badania: kontynuacja augmentacji"
      },
      
      // Czwarta próba - Bupropion
      {
        id: "10",
        drugName: "Bupropion XL",
        shortName: "BUP",
        startDate: "2024-06-15",
        endDate: "2024-08-01",
        dose: "150mg",
        attemptGroup: 4,
        notes: "Zmiana na bupropion, dawka początkowa. Nieadekwatna wg kryt. MGH-ATRQ badania: dawka za niska"
      },
      {
        id: "11",
        drugName: "Bupropion XL",
        shortName: "BUP",
        startDate: "2024-08-01",
        endDate: "2024-10-15",
        dose: "300mg",
        attemptGroup: 4,
        notes: "Zwiększenie dawki, minimalna poprawa. Adekwatna wg kryt. MGH-ATRQ badania: Bupropion 300mg przez 10 tygodni"
      },
      
      // Piąta próba - Duloxetine
      {
        id: "12",
        drugName: "Duloxetine",
        shortName: "DUL",
        startDate: "2024-10-30",
        endDate: "2024-12-15",
        dose: "60mg",
        attemptGroup: 5,
        notes: "Zmiana na duloksetynę. Adekwatna wg kryt. MGH-ATRQ badania: Duloxetine 60mg przez 8 tygodni"
      },
      {
        id: "13",
        drugName: "Duloxetine",
        shortName: "DUL",
        startDate: "2024-12-15",
        endDate: "2025-01-25",
        dose: "90mg",
        attemptGroup: 5,
        notes: "Zwiększenie dawki, obecne leczenie. Adekwatna wg kryt. MGH-ATRQ badania: kontynuacja"
      },
      
      // Leki wspomagające (przez cały okres)
      {
        id: "14",
        drugName: "Lorazepam",
        shortName: "LOR",
        startDate: "2023-03-15",
        endDate: "2023-06-01",
        dose: "1mg",
        attemptGroup: 0,
        notes: "Doraźnie na lęk, pierwszych 3 miesiące. Lek wspomagający, nie dotyczy MGH-ATRQ"
      },
      {
        id: "15",
        drugName: "Zolpidem",
        shortName: "ZOL",
        startDate: "2023-04-01",
        endDate: "2024-02-01",
        dose: "10mg",
        attemptGroup: 0,
        notes: "Na bezsenność, długoterminowo. Lek wspomagający, nie dotyczy MGH-ATRQ"
      },
      {
        id: "16",
        drugName: "Quetiapine",
        shortName: "QUE",
        startDate: "2024-06-01",
        endDate: "2025-01-25",
        dose: "25mg",
        attemptGroup: 0,
        notes: "Małe dawki na sen i augmentacja. Nieadekwatna wg kryt. MGH-ATRQ badania: dawka za niska (wymagane 150mg)"
      }
    ],
    conclusion: "Pacjent spełnia kryteria lekooporności - 5 nieudanych prób leczenia w obecnym epizodzie. Wymaga rozważenia terapii III linii (ketamina, ECT, TMS)."
  },
  inclusionCriteria: [
    {
      id: "IC1",
      name: "Wiek 18-65 lat",
      status: "spełnione",
      details: "Pacjent ma 42 lata",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "IC2",
      name: "Diagnoza zaburzenia depresyjnego",
      status: "spełnione",
      details: "F33.2 - potwierdzona diagnoza",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "IC3",
      name: "Lekooporność",
      status: "spełnione",
      details: "5 nieudanych prób leczenia w obecnym epizodzie",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  psychiatricExclusionCriteria: [
    {
      id: "PEC1",
      name: "Zaburzenia psychotyczne",
      status: "spełnione",
      details: "Brak objawów psychotycznych",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "PEC2",
      name: "Zaburzenia lękowe",
      status: "weryfikacja",
      details: "GAD wymaga oceny nasilenia",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "PEC3",
      name: "Uzależnienie od substancji",
      status: "weryfikacja",
      details: "Historia używania alkoholu - wymaga oceny aktualnego stanu",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  medicalExclusionCriteria: [
    {
      id: "MEC1",
      name: "Choroby sercowo-naczyniowe",
      status: "weryfikacja",
      details: "Nadciśnienie tętnicze - wymaga oceny kontroli",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "MEC2",
      name: "Zaburzenia metaboliczne",
      status: "spełnione",
      details: "Hipercholesterolemia kontrolowana dietą",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    },
    {
      id: "MEC3",
      name: "Ciąża/karmienie",
      status: "spełnione",
      details: "Nie dotyczy (mężczyzna)",
      userStatus: null,
      userComment: null,
      userOverrideTimestamp: null
    }
  ],
  reportConclusion: {
    overallQualification: "Prawdopodobnie kwalifikuje się do badania",
    mainIssues: [
      "Wymaga oceny kontroli nadciśnienia",
      "Konieczna weryfikacja aktualnego używania alkoholu",
      "Ocena nasilenia zaburzeń lękowych"
    ],
    criticalInfoNeeded: [
      "Aktualne pomiary ciśnienia tętniczego",
      "Wyniki badań biochemicznych (funkcje wątroby)",
      "Ocena w skali GAD-7 dla zaburzeń lękowych",
      "Wywiad dotyczący używania alkoholu w ostatnich 6 miesiącach"
    ],
    estimatedProbability: 75
  },
  analyzedAt: "2025-01-15T12:45:00Z",
  isMockData: true
};