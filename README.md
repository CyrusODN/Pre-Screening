# 🧠 Remedius Pre-Screening System

**Zaawansowany system AI do analizy kwalifikacji pacjentów w badaniach klinicznych z terapią psychodeliczną**

## 📋 Opis Projektu

Remedius Pre-Screening to nowoczesna aplikacja webowa wykorzystująca sztuczną inteligencję do automatycznej analizy dokumentacji medycznej pacjentów pod kątem kwalifikacji do badań klinicznych. System specjalizuje się w ocenie pacjentów z depresją lekooporną (TRD) dla terapii psychodelicznych.

## ✨ Główne Funkcjonalności

### 🔍 **Analiza Pre-Screeningowa**
- **Automatyczna ocena kryteriów włączenia/wyłączenia** zgodnie z protokołem badania
- **Analiza farmakoterapii i TRD** według kryteriów MGH-ATRQ
- **Szacowanie początku epizodu depresyjnego** z wieloma scenariuszami
- **Ocena prawdopodobieństwa kwalifikacji** z szczegółowym uzasadnieniem

### 📊 **Wizualizacje i Raporty**
- **Interaktywna oś czasu farmakoterapii** z analizą TRD
- **Wykresy kołowe statusu kryteriów** z podziałem na kategorie
- **Szczegółowe raporty PDF** gotowe do druku
- **Dashboard z kluczowymi metrykami** pacjenta

### 🤖 **Inteligentny Chatbot Medyczny**
- **Kontekstowe odpowiedzi** na pytania o analizę
- **Wyjaśnienia decyzji AI** w języku medycznym
- **Sugerowane pytania następne** dla głębszej analizy
- **Profesjonalne wsparcie kliniczne** 24/7

### 💾 **Zarządzanie Danymi**
- **Zapisywanie analiz** w lokalnej bazie danych
- **Historia pacjentów** z możliwością porównania
- **Export/Import danych** w formatach JSON/CSV
- **Backup i przywracanie** analiz

## 🚀 Technologie

### Frontend
- **React 18** z TypeScript
- **Tailwind CSS** dla stylizacji
- **Recharts** do wizualizacji danych
- **Lucide React** dla ikon

### Backend & AI
- **Claude 4 Opus** (Anthropic) - główny model AI
- **Gemini 2.5 Pro** (Google) - alternatywny model
- **OpenAI o3** - wsparcie dla modeli OpenAI
- **Node.js** backend dla mapowania leków

### Narzędzia
- **Vite** - bundler i dev server
- **ESLint** - linting kodu
- **TypeScript** - typowanie statyczne

## 📦 Instalacja

### Wymagania
- Node.js 18+
- npm lub yarn
- Klucze API dla modeli AI

### Kroki instalacji

1. **Klonowanie repozytorium**
```bash
git clone [repository-url]
cd Pre-Screening
```

2. **Instalacja zależności**
```bash
npm install
```

3. **Konfiguracja zmiennych środowiskowych**
```bash
cp .env.example .env
```

Wypełnij plik `.env` swoimi kluczami API:
```env
# Claude API (Anthropic)
VITE_CLAUDE_API_KEY=your_claude_api_key

# Gemini API (Google)
VITE_GEMINI_API_KEY=your_gemini_api_key

# OpenAI API
VITE_OPENAI_API_KEY=your_openai_api_key
```

4. **Uruchomienie aplikacji**
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`

## 🎯 Użycie

### 1. **Wprowadzenie Danych**
- Wybierz protokół badania lub wprowadź własny
- Wklej historię choroby pacjenta
- Wybierz model AI (Claude, Gemini, lub o3)
- Włącz analizę specjalistyczną dla bardziej szczegółowych wyników

### 2. **Analiza Automatyczna**
System przeprowadzi kompleksową analizę obejmującą:
- Ocenę wszystkich kryteriów włączenia i wyłączenia
- Analizę farmakoterapii z mapowaniem nazw leków
- Określenie statusu TRD według MGH-ATRQ
- Szacowanie prawdopodobieństwa kwalifikacji

### 3. **Przegląd Wyników**
- Sprawdź wizualizacje na osi czasu
- Przeanalizuj wykresy statusu kryteriów
- Przeczytaj szczegółowe uzasadnienia AI
- Skorzystaj z chatbota do zadawania pytań

### 4. **Edycja i Zapisywanie**
- Edytuj statusy kryteriów jako badacz
- Dodaj komentarze i uzasadnienia
- Zapisz analizę do historii
- Wydrukuj raport PDF

## 🔧 Konfiguracja

### Modele AI
System obsługuje trzy główne modele AI:

1. **Claude 4 Opus** (Rekomendowany)
   - Najwyższa jakość analizy medycznej
   - Doskonałe rozumienie kontekstu klinicznego
   - Precyzyjne mapowanie leków

2. **Gemini 2.5 Pro**
   - Szybka analiza
   - Dobra jakość za rozsądną cenę
   - Stabilne API

3. **OpenAI o3**
   - Kompatybilność z ekosystemem OpenAI
   - Dobra jakość ogólna

### Analiza Specjalistyczna
Włączenie analizy specjalistycznej zapewnia:
- Głębszą analizę farmakoterapii
- Szczegółowe mapowanie nazw leków
- Rozszerzone scenariusze epizodów
- Dodatkowe weryfikacje kliniczne

## 📁 Struktura Projektu

```
src/
├── components/          # Komponenty React
│   ├── charts/         # Komponenty wykresów
│   ├── EnteringScreen.tsx
│   ├── PrintableReport.tsx
│   └── ...
├── services/           # Logika biznesowa
│   ├── ai.ts          # Główny serwis AI
│   ├── chatbotService.ts
│   └── ...
├── types/             # Definicje TypeScript
├── data/              # Dane statyczne i protokoły
├── config/            # Konfiguracja AI i aplikacji
└── styles/            # Style CSS
```

## 🧪 Testowanie

### Uruchomienie testów
```bash
npm test
```

### Testowanie API
```bash
node test-backend-api.js
```

### Demo z przykładowymi danymi
Aplikacja zawiera wbudowane dane demonstracyjne do testowania funkcjonalności.

## 📈 Rozwój

### Planowane funkcjonalności
- [ ] Integracja z systemami szpitalnymi (HL7 FHIR)
- [ ] Zaawansowana analityka i raporty
- [ ] Wsparcie dla większej liczby protokołów badań
- [ ] API dla integracji zewnętrznych
- [ ] Mobilna aplikacja towarzysząca

### Wkład w rozwój
1. Fork repozytorium
2. Stwórz branch dla nowej funkcjonalności
3. Wprowadź zmiany z testami
4. Wyślij Pull Request

## 📄 Licencja

Ten projekt jest własnością Remedius i jest chroniony prawami autorskimi. Wszelkie prawa zastrzeżone.

## 🆘 Wsparcie

W przypadku problemów lub pytań:
- Sprawdź dokumentację w folderze `/docs`
- Przejrzyj istniejące Issues
- Skontaktuj się z zespołem deweloperskim

---

**Remedius Pre-Screening System** - Przyszłość analizy kwalifikacji pacjentów w badaniach klinicznych.