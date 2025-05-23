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

4. Uruchom aplikację w trybie deweloperskim:
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

## Zmienne środowiskowe

Aby połączyć się z API, utwórz plik `.env` w głównym katalogu projektu i dodaj następujące zmienne:

```env
VITE_AI_API_KEY=twój-klucz-api
VITE_AI_ENDPOINT=url-endpointu
VITE_AI_MODEL=nazwa-modelu
```

## Funkcje

- Analiza historii medycznej pacjenta
- Ocena kryteriów włączenia i wyłączenia
- Interaktywna edycja statusów kryteriów
- Wizualizacja danych na wykresach
- Historia poprzednich analiz