import { PatientData } from '../types';

export const initialPatientData: PatientData = {
  summary: {
    id: "Pacjent XYZ/05/2025",
    age: 33,
    mainDiagnosis: "F33.1 Zaburzenie depresyjne nawracające, obecnie epizod depresyjny umiarkowany",
    comorbidities: ["F42 Zaburzenia obsesyjno-kompulsyjne (OCD) - przewlekłe, objawowe", "Astma oskrzelowa"],
  },
  // ... rest of the mock data structure from the original App.tsx
};