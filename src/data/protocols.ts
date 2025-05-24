import { Protocol } from '../types';

export const PREDEFINED_PROTOCOLS: Record<string, Protocol> = {
  'COMP006': {
    id: 'COMP006',
    name: 'COMP006 - Badanie Kliniczne w Depresji Lekoopornej',
    description: 'Badanie kliniczne oceniające skuteczność i bezpieczeństwo nowej terapii w leczeniu depresji lekoopornej (TRD)',
    criteria: {
      inclusion: [
        {
          id: 'IC1',
          name: 'Zgoda na udział w badaniu (ICF)',
          details: 'Pacjent musi podpisać świadomą zgodę na udział w badaniu.'
        },
        {
          id: 'IC2',
          name: 'Wiek ≥18 lat',
          details: 'Pacjent musi mieć ukończone 18 lat w momencie screeningu.'
        },
        {
          id: 'IC3',
          name: 'Diagnoza dużej depresji',
          details: 'Duża depresja bez objawów psychotycznych (pojedynczy lub nawracający epizod wg DSM-5) potwierdzona przez MINI 7.0.2.'
        },
        {
          id: 'IC4',
          name: 'Czas trwania pierwszego epizodu',
          details: 'Jeśli obecny epizod jest pierwszym w życiu, musi trwać ≥6 miesięcy i ≤2 lata w momencie screeningu.'
        },
        {
          id: 'IC5',
          name: 'Wynik MADRS ≥20',
          details: 'Całkowity wynik w skali MADRS ≥20 podczas screeningu i wizyty początkowej.'
        },
        // ZASTĄPIONY IC6
        {
          id: 'IC6',
          name: 'Lekooporność (TRD) wg MGH-ATRQ (specyficzne dla badania)',
          details: 'Niepowodzenie co najmniej dwóch (2) do czterech (4) różnych, adekwatnych prób leczenia przeciwdepresyjnego (monoterapia lub leczenie adjuwantowe) w obecnym epizodzie depresyjnym. Adekwatność próby leczenia oceniana jest wyłącznie na podstawie specyficznego dla tego badania formularza MGH-ATRQ (minimalna dawka i czas trwania). Dodatkowo, dla Polski, uwzględnia się Kwetiapinę 150mg jako leczenie adjuwantowe. Szczegóły poniżej.',
          mghAtrqPoland: { // Nazwa pola pozostaje dla spójności, ale odnosi się teraz do specyficznego ATRQ badania
            minTrialDurationWeeks: "co najmniej 8 lub 10 tygodni", // Zgodnie z instrukcją na formularzu MGH-ATRQ
            medications: [
              // Leki i minimalne adekwatne dawki wyłącznie z dostarczonego formularza MGH-ATRQ (lewa kolumna "Minimum** Dose")
              // Tricyclic Antidepressants
              { drugName: "Doxepin", brandName: "Adapin", minDose: "150mg/d" },
              { drugName: "Clomipramine", brandName: "Anafranil", minDose: "150mg/d" },
              { drugName: "Amoxapine", brandName: "Asendin", minDose: "150mg/d" },
              { drugName: "Amitriptyline", brandName: "Endep/Elavil", minDose: "150mg/d" },
              { drugName: "Maprotiline", brandName: "Ludiomil", minDose: "150mg/d" },
              { drugName: "Desipramine", brandName: "Norpramin", minDose: "150mg/d" },
              { drugName: "Nortriptyline", brandName: "Pamelor", minDose: "75mg/d" },
              { drugName: "Doxepin ", brandName: "Sinequan", minDose: "150mg/d" }, // Powtórzenie Doxepin, ale inna nazwa handlowa
              { drugName: "Trimipramine", brandName: "Surmontil", minDose: "150mg/d" },
              { drugName: "Imipramine", brandName: "Tofranil", minDose: "150mg/d" },
              { drugName: "Protriptyline", brandName: "Vivactil", minDose: "30mg/d" },
              { drugName: "Pipofezine", brandName: "Azafen", minDose: "150mg/d" },
              { drugName: "Noxiptiline", brandName: "Agedal/Elronon", minDose: "100mg/d" },
              // Monoamine Oxidase Inhibitors (MAOIs)
              { drugName: "Isocarboxazid", brandName: "Marplan", minDose: "30mg/d", notes: "MAOI" },
              { drugName: "Phenelzine", brandName: "Nardil", minDose: "45mg/d", notes: "MAOI" },
              { drugName: "Tranylcypromine", brandName: "Parnate", minDose: "30mg/d", notes: "MAOI" },
              { drugName: "Selegiline patch", brandName: "Emsam", minDose: "6 mg/24 hrs", notes: "MAOI" },
              { drugName: "Moclobemide", brandName: "Aurorix", minDose: "300 mg/d", notes: "MAOI (RIMA)" },
              { drugName: "Pirlindole", brandName: "Pirazidol", minDose: "200 mg/d", notes: "MAOI (RIMA)" },
              // Selective Serotonin Reuptake Inhibitors (SSRIs)
              { drugName: "Escitalopram", brandName: "Lexapro", minDose: "10mg/d", notes: "SSRI" },
              { drugName: "Fluvoxamine", brandName: "Luvox", minDose: "50mg/d", notes: "SSRI" },
              { drugName: "Paroxetine", brandName: "Paxil", minDose: "20/25mg/d", notes: "SSRI - dawka 20 LUB 25 mg/d" },
              { drugName: "Fluoxetine", brandName: "Prozac", minDose: "20mg/d", notes: "SSRI" },
              { drugName: "Sertraline", brandName: "Zoloft", minDose: "50mg/d", notes: "SSRI" },
              { drugName: "Citalopram", brandName: "Celexa", minDose: "20mg/d", notes: "SSRI" },
              // Inne (wg formularza, kontynuacja z drugiego zdjęcia)
              { drugName: "Vilazodone", brandName: "Viibryd", minDose: "40mg/d" },
              { drugName: "Vortioxetine", brandName: "Brintellix", minDose: "10mg/d" },
              // Serotonin-Norepinephrine Reuptake Inhibitors (SNRIs)
              { drugName: "Venlafaxine", brandName: "Effexor", minDose: "150mg/d", notes: "SNRI" },
              { drugName: "Duloxetine", brandName: "Cymbalta", minDose: "60mg/d", notes: "SNRI" },
              { drugName: "Desvenlafaxine", brandName: "Pristiq", minDose: "50mg/d", notes: "SNRI" },
              { drugName: "Milnacipran", brandName: "Savella", minDose: "100mg/d", notes: "SNRI" },
              { drugName: "Levomilnacipran", brandName: "Fetzima", minDose: "40mg/d", notes: "SNRI" },
              // Other Antidepressants (wg formularza)
              { drugName: "Trazodone", brandName: "Desyrel", minDose: "300mg/d" },
              { drugName: "Nefazodone", brandName: "Serzone", minDose: "300mg/d" },
              { drugName: "Bupropion", brandName: "Wellbutrin", minDose: "300mg/d" },
              { drugName: "Mirtazapine", brandName: "Remeron", minDose: "15mg/d" },
              { drugName: "Agomelatine", brandName: "Valdoxan", minDose: "25mg/d" },
              { drugName: "Tianeptine", brandName: "Stablon", minDose: "37.5mg/d" },
              { drugName: "Reboxetine", brandName: "Edronax", minDose: "4 mg/d" },
              { drugName: "Mianserin", brandName: "Bolvidon/Depnon, Norval/Tolvon", minDose: "30 mg/d" },
              { drugName: "Opipramol", brandName: "Insidon", minDose: "150 mg/d" },

              // Dodatek specyficzny dla Polski (spoza głównego formularza MGH-ATRQ, ale istotny dla badania)
              { drugName: "Kwetiapina (jako leczenie adjuwantowe)", minDose: "150 mg/dzień", notes: "Specyficzne dla Polski, leczenie adjuwantowe przez co najmniej 8 lub 10 tygodni." }
            ],
            generalNotes: [
              "Powyższa lista leków i dawek opiera się wyłącznie na specyficznym formularzu MGH-ATRQ dostarczonym dla tego badania.",
              "Za adekwatną próbę leczenia uznaje się stosowanie leku w określonej minimalnej dawce (lub wyższej) przez co najmniej 8 lub 10 tygodni.",
              "Kwetiapina 150mg/dzień jest uznawana w Polsce jako adekwatne leczenie adjuwantowe trwające co najmniej 8 lub 10 tygodni.",
              "Ocena powinna ściśle bazować na powyższych kryteriach. Należy zwrócić uwagę na instrukcję na formularzu MGH-ATRQ dotyczącą sprawdzania, czy lek był dodany w celu augmentacji/wzmocnienia efektu antydepresyjnego."
            ]
          }
        },
        {
          id: 'IC7',
          name: 'Odstawienie leków',
          details: 'Zgoda na odstawienie wszystkich zabronionych leków i potwierdzenie ich odstawienia przed wizytą początkową.'
        },
        {
          id: 'IC8',
          name: 'Zdolność do udziału',
          details: 'Możliwość wykonania wszystkich procedur bez pomocy i zgoda na przestrzeganie harmonogramu wizyt.'
        }
      ],
      psychiatricExclusion: [
        {
          id: 'EC1',
          name: 'Historia zaburzeń afektywnych dwubiegunowych',
          details: 'Obecność lub historia zaburzeń afektywnych dwubiegunowych.'
        },
        {
          id: 'EC2',
          name: 'Zaburzenia psychotyczne',
          details: 'Obecność lub historia schizofrenii, zaburzenia schizofreniformnego, schizoafektywnego lub innych zaburzeń psychotycznych.'
        },
        {
          id: 'EC3',
          name: 'Zaburzenia osobowości',
          details: 'Zaburzenia osobowości: paranoiczne, schizoidalne, schizotypowe, histrioniczne, narcystyczne lub inne poważne współistniejące zaburzenia psychiatryczne.'
        },
        {
          id: 'EC4',
          name: 'Zaburzenie osobowości typu borderline',
          details: 'Zaburzenie osobowości z pogranicza potwierdzone wywiadem lub modułem MINI plus.'
        },
        {
          id: 'EC5',
          name: 'Aktywne zaburzenia współistniejące',
          details: 'Aktywne PTSD, OCD lub anoreksja potwierdzone wywiadem i MINI 7.0.2.'
        },
        {
          id: 'EC6',
          name: 'Hospitalizacja psychiatryczna',
          details: 'Hospitalizacja psychiatryczna w ciągu 6 miesięcy przed screeningiem.'
        },
        {
          id: 'EC7',
          name: 'Historia leczenia inwazyjnego',
          details: 'Stosowanie inwazyjnych metod leczenia (ECT, DBS, VNS) w obecnym epizodzie.'
        },
        {
          id: 'EC8',
          name: 'Historia leczenia nieinwazyjnego',
          details: 'Stosowanie nieinwazyjnych metod leczenia (TMS) w ciągu 6 miesięcy przed screeningiem.'
        },
        {
          id: 'EC9',
          name: 'Aktywna psychoterapia',
          details: 'Udział w programie psychoterapii, który nie pozostanie stabilny przez 9 tygodni.'
        },
        {
          id: 'EC10',
          name: 'Uzależnienia',
          details: 'Uzależnienie od alkoholu lub substancji psychoaktywnych w ciągu 12 miesięcy przed screeningiem.'
        },
        {
          id: 'EC11',
          name: 'Ryzyko samobójcze',
          details: 'Znaczące ryzyko samobójcze według określonych kryteriów.'
        },
        {
          id: 'EC12',
          name: 'Depresja wtórna',
          details: 'Depresja wtórna do przyczyn medycznych lub polekowych.'
        },
        {
          id: 'EC13',
          name: 'Przeciwwskazania osobiste',
          details: 'Okoliczności osobiste lub zachowanie uniemożliwiające bezpieczny udział.'
        },
        {
          id: 'EC14',
          name: 'Historia rodzinna',
          details: 'Występowanie schizofrenii, zaburzenia schizoafektywnego lub ChAD I w rodzinie.'
        },
        {
          id: 'EC15',
          name: 'Ekspozycja na psychodeliki',
          details: 'Stosowanie klasycznych psychodelików w ciągu ostatniego roku lub obecnego epizodu.'
        }
      ],
      medicalExclusion: [
        {
          id: 'GMEC1',
          name: 'Ciąża lub karmienie',
          details: 'Pacjentki w ciąży, karmiące lub planujące ciążę.'
        },
        {
          id: 'GMEC2',
          name: 'Antykoncepcja',
          details: 'Brak zgody na stosowanie skutecznej antykoncepcji podczas badania.'
        },
        {
          id: 'GMEC3',
          name: 'Testy ciążowe',
          details: 'Brak negatywnego wyniku testu ciążowego przed rozpoczęciem badania.'
        },
        {
          id: 'GMEC4',
          name: 'Dawstwo nasienia',
          details: 'Planowane oddawanie nasienia w ciągu 3 miesięcy po zakończeniu badania.'
        },
        {
          id: 'GMEC5',
          name: 'Choroby układu krążenia',
          details: 'Historia udaru, zawału, niekontrolowane nadciśnienie, tachykardia, wydłużony QT lub arytmia.'
        },
        {
          id: 'GMEC6',
          name: 'Cukrzyca',
          details: 'Cukrzyca typu 1 lub niekontrolowana typu 2 (HbA1c >8%).'
        },
        {
          id: 'GMEC7',
          name: 'Choroby tarczycy',
          details: 'Niestabilna choroba tarczycy lub nieprawidłowe wyniki badań.'
        },
        {
          id: 'GMEC8',
          name: 'Padaczka',
          details: 'Występowanie zaburzeń drgawkowych.'
        },
        {
          id: 'GMEC9',
          name: 'Wyniki badań',
          details: 'Istotne klinicznie nieprawidłowości w badaniach laboratoryjnych.'
        },
        {
          id: 'GMEC10',
          name: 'Inne choroby',
          details: 'Inne istotne schorzenia mogące wpływać na interpretację wyników.'
        },
        {
          id: 'GMEC11',
          name: 'Udział w innych badaniach',
          details: 'Aktualny udział w innym badaniu interwencyjnym.'
        },
        {
          id: 'GMEC12',
          name: 'Nadwrażliwość',
          details: 'Nadwrażliwość na badany lek lub substancje pomocnicze.'
        }
      ]
    }
  }
};
