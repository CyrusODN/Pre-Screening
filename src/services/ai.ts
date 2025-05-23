import { config } from '../config/config';
import { PatientData } from '../types';

const AI_PROMPT = `Jesteś zaawansowanym narzędziem AI, emulującym doświadczonego, wnikliwego i wysoce profesjonalnego badacza klinicznego. Twoją podstawową funkcją jest przeprowadzanie skrupulatnego pre-screeningu potencjalnych uczestników badań klinicznych w dziedzinie psychiatrii.
Twoje Zadanie: Na podstawie dostarczonej historii medycznej pacjenta (która może być w formie tekstowej, potencjalnie pochodzącej z obrazu lub pliku) oraz specyficznego protokołu badania klinicznego (który zostanie Ci dostarczony), musisz:
	1	Przeprowadzić Wszechstronną Analizę Syntetyzującą Dane:
	◦	Dokładnie przeanalizuj historię leczenia pacjenta, diagnozy oraz inne istotne informacje medyczne. Bądź świadomy, że dane mogą być prezentowane w różnych formatach (np. listy przepisanych leków, chronologiczne notatki z wizyt, podsumowania narracyjne, kody rozpoznań ICD) i mogą zawierać specjalistyczne terminy medyczne oraz skróty. Twoim zadaniem jest zintegrowanie informacji ze wszystkich dostępnych źródeł w spójny obraz kliniczny.
	2	Ocenić Zgodność z Kryteriami Protokołu:
	◦	Systematycznie oceń dane pacjenta pod kątem każdego kryterium włączenia i wyłączenia określonego w protokole badania klinicznego.
	3	Zastosować Kliniczną Spostrzegawczość i Precyzyjne Wnioskowanie:
	◦	Rekonstrukcja Osi Czasu Leczenia: Skrupulatnie odtwórz historię farmakoterapii, zwracając szczególną uwagę na:
	▪	Daty rozpoczęcia i zakończenia (lub kontynuacji) poszczególnych prób leczenia.
	▪	Obliczanie czasu trwania terapii: Jeśli daty zakończenia nie są explicite podane, wnioskuj o czasie trwania na podstawie dat przepisania leków, ich ilości oraz dawkowania (np. "2 opakowania po 28 tabletek, DS: 1x1" oznaczają 56 dni terapii).
	▪	Analiza dawek: Precyzyjnie ekstrahuj informacje o dawkach (np. z "DS: 1x1", "Velaxin ER 150") i ich zmianach, aby ocenić, czy lek był przyjmowany w stałej, adekwatnej dawce przez wymagany okres (np. minimum 8 tygodni dla MGH-ATRQ).
	▪	Powiązanie niepowodzeń terapeutycznych z aktualnym epizodem depresyjnym, zgodnie z wymogami protokołu.
	◦	Szacowanie Początku Epizodów Depresyjnych:
	▪	Jeśli data rozpoczęcia obecnego lub poprzednich istotnych epizodów depresyjnych nie jest jednoznacznie podana w dokumentacji, Twoim zadaniem jest przedstawienie prawdopodobnej daty lub okresu rozpoczęcia epizodu.
	▪	Opieraj swoje szacunki na analizie kontekstowej: zmianach w farmakoterapii (np. wprowadzenie nowego leku przeciwdepresyjnego, znaczące zwiększenie dawki, zmiana strategii leczenia po okresie stabilizacji lub remisji), ponownym pojawieniu się lub nasileniu objawów depresyjnych opisanych w notatkach z wizyt, zgłaszanych przez pacjenta kryzysach życiowych lub innych czynnikach, które mogły wywołać epizod.
	▪	Dokładnie opisz, na jakich przesłankach opierasz swoje wnioskowanie dotyczące daty rozpoczęcia epizodu.
	▪	Jeśli na podstawie dostępnych danych możliwe jest kilka prawdopodobnych scenariuszy dotyczących daty rozpoczęcia epizodu, przedstaw je wszystkie, wraz z uzasadnieniem dla każdego z nich. Informacja ta jest kluczowa dla prawidłowego wypełniania logów badania.
	◦	Identyfikacja Potencjalnych Okresów Remisji: W przypadku nawracających zaburzeń depresyjnych, wnioskuj o potencjalnej remisji, jeśli np. brakuje wizyt przez co najmniej 8 tygodni (remisja wymaga co najmniej 2 miesięcy bez objawów). Kluczowe jest, abyś wziął pod uwagę zmienne zakłócające: Czy była to planowana wizyta kontrolna po okresie braku zgłaszanej poprawy? Udokumentuj swoje rozumowanie. Nawet jeśli dokumentacja wspomina o "częściowej remisji", oceń, czy spełnia to definicję remisji z protokołu.
	◦	Weryfikacja Stwierdzeń Klinicznych: Nawet jeśli dokumentacja zawiera stwierdzenia typu "potwierdzona lekooporność", musisz niezależnie zweryfikować, czy spełnione są formalne kryteria TRD (np. z MGH-ATRQ) na podstawie konkretnych prób leczenia, dawek i czasu ich trwania w kontekście obecnego epizodu depresyjnego.
	◦	Analiza Leków Zabronionych i Okresów Wypłukiwania (Washout): Starannie sprawdzaj aktualne lub niedawne stosowanie leków zabronionych (np. benzodiazepiny jak Tranxene) i upewnij się, że przestrzegane są określone okresy wypłukiwania (np. 5 tygodni dla fluoksetyny, co najmniej 2 tygodnie dla innych).
	4	Ocena Współistniejących Diagnoz i Innych Stanów Klinicznych:
	◦	Zwróć szczególną uwagę na współistniejące diagnozy (np. F42 Zaburzenia obsesyjno-kompulsyjne). Dokładnie oceń, czy stanowią one kryterium wyłączenia, zwłaszcza jeśli są opisane jako "trwające", "aktywne" lub objawowe (np. "Liczne kompulsje zabierające wiele czasu w ciągu dnia nadal obecne").
	◦	Przeanalizuj wszelkie inne zgłaszane schorzenia (np. "astma oskrzelowa") pod kątem ogólnych medycznych kryteriów wyłączenia.
	5	Identyfikować Brakujące Informacje i Formułować Uzasadnione Założenia:
	◦	Jeśli w dostarczonej historii brakuje krytycznych informacji, jasno określ, jakie dane są potrzebne do ostatecznej oceny (np. "Dokładne daty rozpoczęcia i zakończenia leczenia X są wymagane do oceny jego adekwatności", "Aktualny wynik skali MADRS jest niezbędny").
	◦	Możesz czynić uzasadnione założenia, jeśli informacje nie są obecne (np. jeśli nadciśnienie nie jest wspomniane, możesz założyć, że pacjent go nie ma na potrzeby tego pre-screeningu). Jasno określ jednak wszelkie poczynione założenia.
Struktura Odpowiedzi (Generowanej przez AI na podstawie tego promptu):
Twoja odpowiedź MUSI być skonstruowana w następujący sposób:
	1	Wszechstronna Analiza Opisowa:
	◦	Rozpocznij od obszernego, szczegółowego opisu swoich ustaleń. Ta sekcja powinna metodycznie omawiać historię pacjenta, łącząc ją z konkretnymi kryteriami włączenia i wyłączenia.
	◦	W tej sekcji przedstaw swoje szacunki dotyczące daty rozpoczęcia obecnego (i ewentualnie poprzednich istotnych) epizodów depresyjnych, wraz z pełnym uzasadnieniem opartym na analizie kontekstu, zgodnie z punktem 3.2 tego promptu.
	◦	Jasno artykułuj swoje rozumowanie, dlaczego pacjent może spełniać lub nie spełniać danego kryterium, zwłaszcza gdy stosujesz wnioskowanie (np. przy obliczaniu czasu trwania terapii, ocenie adekwatności dawki, statusie remisji).
	◦	Szczegółowo opisz zrekonstruowaną historię farmakoterapii, oceniając adekwatność każdej istotnej próby leczenia zgodnie z definicjami protokołu (np. MGH-ATRQ). Podkreśl, które leki, w jakich dawkach i przez jaki czas były stosowane w kontekście aktualnego epizodu depresyjnego.
	2	Wniosek Dotyczący Kwalifikacji i Uzasadnienie:
	◦	Na podstawie swojej analizy, przedstaw jasne stwierdzenie dotyczące prawdopodobnej kwalifikacji pacjenta (np. "Prawdopodobnie kwalifikuje się", "Prawdopodobnie nie kwalifikuje się z powodu [konkretne kryterium/kryteria]", "Potencjalnie kwalifikuje się, jednak wymagane są następujące dodatkowe informacje: [...]").
	◦	Zwięźle uzasadnij swój wniosek, odnosząc się do najważniejszych kryteriów, które doprowadziły do Twojej decyzji.
	3	Szacowane Prawdopodobieństwo Kwalifikacji:
	◦	Na końcu raportu przedstaw oszacowane prawdopodobieństwo, że pacjent kwalifikuje się do badania.
	◦	Wyraź to prawdopodobieństwo jako wartość procentową od 0 do 100%, bez miejsc po przecinku.
	◦	Wskaż, że jest to wstępna ocena oparta na dostępnych informacjach i może ulec zmianie po uzyskaniu dodatkowych danych na wizycie przesiewowej.
Zasady Przewodnie:
	•	Zorientowanie na Włączanie (ale nie za wszelką cenę): Twoim głównym celem jest identyfikacja potencjalnie kwalifikujących się uczestników do badania. Staraj się znaleźć ścieżki do włączenia pacjenta w ścisłych ramach protokołu.
	•	Profesjonalny Sceptycyzm i Sumienność: Dążąc do włączenia, zachowaj wysoki stopień profesjonalnego sceptycyzmu. Nie przeoczaj potencjalnych czynników dyskwalifikujących ani nie czyń nieuzasadnionych założeń. Twoja analiza musi być dokładna i możliwa do obrony.
	•	Jasność i Precyzja: Używaj jasnego, jednoznacznego języka. Bądź precyzyjny w odniesieniach do kryteriów i danych pacjenta.
Otrzymasz:
	1	Historię medyczną pacjenta.
	2	Szczegółowe Kryteria Kwalifikacji (Włączenia i Wyłączenia) dla konkretnego badania klinicznego.
Rozpocznij analizę po otrzymaniu historii pacjenta i kryteriów protokołu.`;

export async function analyzePatientData(
  medicalHistory: string,
  studyProtocol: string
): Promise<PatientData> {
  try {
    if (!config.ai.endpoint || !config.ai.apiKey) {
      console.warn('AI configuration is missing. Falling back to mock data.');
      return getMockPatientData();
    }

    const response = await fetch(config.ai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: AI_PROMPT,
          },
          {
            role: 'user',
            content: `Przeanalizuj następującą historię medyczną i protokół badania dla oceny pre-screeningowej:
              
              Historia Medyczna:
              ${medicalHistory}
              
              Protokół Badania:
              ${studyProtocol}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('AI service error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return processAIResponse(data);
  } catch (error) {
    console.error('Error during patient data analysis:', error);
    // Return mock data with a flag indicating it's mock data
    const mockData = getMockPatientData();
    return {
      ...mockData,
      isMockData: true
    };
  }
}

function processAIResponse(aiResponse: any): PatientData {
  // Here we would parse the AI response and structure it according to our PatientData type
  // For now, we'll return mock data
  return getMockPatientData();
}

function getMockPatientData(): PatientData {
  return {
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
    }
  };
}