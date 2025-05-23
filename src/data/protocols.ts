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
        {
          id: 'IC6',
          name: 'Lekooporność (TRD)',
          details: 'Niepowodzenie 2-4 różnych terapii farmakologicznych w obecnym epizodzie, potwierdzone przez MGH-ATRQ.'
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