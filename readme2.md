# Instrukcja konfiguracji lokalnej

## 1. Wymagania systemowe

- Node.js w wersji 18 lub nowszej
- npm (dołączony do Node.js)
- Edytor kodu (np. Visual Studio Code)
- Przeglądarka internetowa (Chrome, Firefox, Safari)
- Git

## 2. Konfiguracja środowiska

1. Zainstaluj Node.js:
   - Pobierz instalator ze strony [nodejs.org](https://nodejs.org)
   - Wybierz wersję LTS (Long Term Support)
   - Uruchom instalator i postępuj zgodnie z instrukcjami
   - Sprawdź instalację w terminalu:
     ```bash
     node --version
     npm --version
     ```

2. Zainstaluj Git:
   - Pobierz ze strony [git-scm.com](https://git-scm.com)
   - Podczas instalacji wybierz domyślne opcje
   - Sprawdź instalację:
     ```bash
     git --version
     ```

## 3. Pobranie i instalacja projektu

1. Sklonuj repozytorium:
   ```bash
   git clone [url-repozytorium]
   cd [nazwa-katalogu]
   ```

2. Zainstaluj zależności:
   ```bash
   npm install
   ```

## 4. Konfiguracja zmiennych środowiskowych

1. Skopiuj plik `.env.example` do `.env`:
   ```bash
   cp .env.example .env
   ```

2. Otwórz plik `.env` i uzupełnij zmienne:
   ```
   VITE_AI_API_KEY=twój-klucz-api
   VITE_AI_ENDPOINT=https://api.openai.com/v1/chat/completions
   VITE_AI_MODEL=gpt-4
   ```

## 5. Uruchomienie aplikacji

1. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```

2. Otwórz aplikację w przeglądarce:
   - Domyślny adres: http://localhost:5173

## 6. Weryfikacja działania

1. Sprawdź czy:
   - Strona główna się ładuje
   - Można wprowadzać dane pacjenta
   - Wykresy się wyświetlają
   - Historia analiz działa
   - Edycja kryteriów jest możliwa

2. Przetestuj tryb testowy:
   - Usuń zmienne z pliku `.env`
   - Zrestartuj serwer
   - Sprawdź czy pojawia się informacja o trybie testowym

## 7. Rozwiązywanie problemów

1. Problem z instalacją zależności:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```

2. Błędy kompilacji:
   - Sprawdź logi w konsoli
   - Upewnij się, że wszystkie pliki są na miejscu
   - Zweryfikuj składnię TypeScript

3. Problemy z AI:
   - Sprawdź poprawność klucza API
   - Zweryfikuj dostępność endpointu
   - Sprawdź limity API

## 8. Przygotowanie do produkcji

1. Zbuduj aplikację:
   ```bash
   npm run build
   ```

2. Przetestuj build lokalnie:
   ```bash
   npm run preview
   ```

3. Sprawdź czy:
   - Wszystkie funkcje działają
   - Nie ma błędów w konsoli
   - Wydajność jest zadowalająca

## 9. Dobre praktyki

1. Regularne commity:
   ```bash
   git add .
   git commit -m "opis zmian"
   ```

2. Aktualizacja zależności:
   ```bash
   npm update
   ```

3. Testowanie:
   - Sprawdzaj różne scenariusze użycia
   - Testuj na różnych przeglądarkach
   - Weryfikuj obsługę błędów

## 10. Wsparcie

W razie problemów:
1. Sprawdź dokumentację w README.md
2. Przejrzyj logi aplikacji
3. Skontaktuj się z zespołem wsparcia