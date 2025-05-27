# Pre-Screening

Aplikacja do analizy pre-screeningowej pacjentów w badaniach klinicznych.

## Wymagania

- Node.js (wersja 18 lub nowsza)
- npm (dołączony do Node.js)

## Instalacja i uruchomienie

1. Sklonuj repozytorium:
```bash
git clone [url-repozytorium]
```

2. Przejdź do katalogu projektu:
```bash
cd [nazwa-katalogu]
```

3. Zainstaluj zależności:
```bash
npm install
```

4. Skonfiguruj zmienne środowiskowe:
   - Skopiuj plik `.env.example` do `.env`
   - Uzupełnij wartości w pliku `.env`:
     - `VITE_AI_API_KEY`: Twój klucz API
     - `VITE_AI_ENDPOINT`: URL endpointu API (domyślnie dla OpenAI)
     - `VITE_AI_MODEL`: Nazwa modelu (np. gpt-4)

5. Uruchom aplikację w trybie deweloperskim:
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

## Tryb testowy

Jeśli zmienne środowiskowe nie są skonfigurowane, aplikacja automatycznie przełączy się w tryb testowy, używając przykładowych danych. Zobaczysz wtedy odpowiedni komunikat w interfejsie.

## Funkcje

- Analiza historii medycznej pacjenta
- Ocena kryteriów włączenia i wyłączenia
- Interaktywna edycja statusów kryteriów
- Wizualizacja danych na wykresach
- Historia poprzednich analiz

## Dostosowanie promptu AI

Prompt AI znajduje się w pliku `src/services/ai.ts`. Możesz go dostosować do swoich potrzeb, modyfikując zmienną `AI_PROMPT`.

## Rozwiązywanie problemów

1. Jeśli widzisz komunikat o danych testowych:
   - Sprawdź, czy plik `.env` istnieje
   - Upewnij się, że wszystkie zmienne środowiskowe są poprawnie ustawione
   - Sprawdź, czy masz aktywny klucz API

2. Jeśli analiza nie działa:
   - Sprawdź konsolę przeglądarki pod kątem błędów
   - Upewnij się, że endpoint API jest dostępny
   - Sprawdź, czy model AI jest poprawnie skonfigurowany

## Uruchomienie Systemu

### Wymagane Klucze API
Upewnij się, że masz skonfigurowane klucze API w pliku `.env`:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key  
GOOGLE_API_KEY=your_google_api_key
```

### Uruchomienie Pełnego Systemu
```bash
# Instalacja zależności
npm install

# Uruchomienie backend + frontend (zalecane)
npm start

# Alternatywnie - używając skryptu startowego
./start.sh

# Alternatywnie - uruchomienie osobno:
# Backend (port 3001)
npm run server

# Frontend (port 5178)
npm run dev
```

### Szybki Start
```bash
# Najprostszy sposób - uruchom wszystko naraz
./start.sh
```

Skrypt automatycznie:
- Sprawdzi czy masz klucze API w `.env`
- Zainstaluje zależności jeśli potrzeba
- Uruchomi backend i frontend
- Pokaże status i adresy URL

### Architektura

System składa się z:
1. **Backend Proxy Server** (port 3001) - obsługuje wywołania API AI
2. **Frontend React App** (port 5178) - interfejs użytkownika
3. **Multi-Agent System** - 6 wyspecjalizowanych agentów AI

### Rozwiązanie Problemów CORS

System używa backend proxy server'a do obsługi wywołań API AI, co rozwiązuje problemy CORS występujące przy bezpośrednich wywołaniach z przeglądarki.