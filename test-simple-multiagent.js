// UPROSZCZONY TEST WIELOAGENTOWEJ ANALIZY
// Symuluje działanie agentów przez osobne wywołania AI API

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';

// Krótkie dane testowe - ale kompletne
const testMedicalHistory = `
KARTA WIZYTY | Test: dn. 15-01-2024, Warszawa
Pacjent: J.K., 35 lat

Wywiad:
Pacjent zgłasza się z powodu zaburzeń depresyjnych trwających od 3 lat. 
Obniżony nastrój, brak energii, anhedonia.

Historia farmakoterapii:
1. Sertraline 50mg (6 miesięcy) - bez poprawy
2. Fluoksetyna 20mg (4 miesiące) - minimalna poprawa  
3. Dulsevia 60mg (obecnie, 2 miesiące) - częściowa poprawa

Stan psychiczny:
Orientacja wszechstronna, kontakt rzeczowy, nastrój obniżony.
Bez objawów psychotycznych, bez myśli samobójczych.

Rozpoznanie: F33.1 - Zaburzenie depresyjne nawracające
`;

const testStudyProtocol = `
PROTOKÓŁ BADANIA - KRYTERIA KWALIFIKACJI

Kryteria włączenia:
- Wiek 18-65 lat
- Depresja lekoopora (niepowodzenie ≥2 leków)
- Stabilny stan somatyczny

Kryteria wykluczenia:
- Zaburzenia psychotyczne
- Uzależnienia aktywne
- Ciężkie choroby somatyczne
`;

// Definicje agentów do testowania
const agents = [
  {
    name: 'Clinical Synthesis Agent',
    systemPrompt: 'Jesteś ekspertem klinicznym specjalizującym się w syntezie danych medycznych. Analizujesz dokumentację medyczną i tworzysz strukturalne podsumowania.',
    userPrompt: `Przeanalizuj dokumentację medyczną i stwórz strukturalne podsumowanie zawierające:
- ID pacjenta i podstawowe dane demograficzne
- Główne rozpoznanie
- Kluczowe objawy i ich historię

DOKUMENTACJA:
${testMedicalHistory}

Odpowiedz w formacie JSON z polami: id, age, mainDiagnosis, keySymptoms.`,
    expectation: 'id, age, mainDiagnosis'
  },
  {
    name: 'Episode Analysis Agent',
    systemPrompt: 'Jesteś specjalistą w analizie epizodów depresyjnych. Analizujesz przebieg choroby i charakterystykę epizodów.',
    userPrompt: `Przeanalizuj historię epizodów depresyjnych pacjenta:

${testMedicalHistory}

Określ:
- Liczba epizodów
- Czas trwania obecnego epizodu
- Nasilenie objawów
- Odpowiedź na leczenie

Odpowiedz strukturalnie.`,
    expectation: 'analiza epizodów'
  },
  {
    name: 'Pharmacotherapy Analysis Agent',
    systemPrompt: 'Jesteś farmakologiem klinicznym specjalizującym się w leczeniu depresji. Analizujesz historię farmakoterapii.',
    userPrompt: `Przeanalizuj historię farmakoterapii pacjenta:

${testMedicalHistory}

Określ:
- Lista wszystkich stosowanych leków przeciwdepresyjnych
- Dawki i czas stosowania
- Odpowiedź na leczenie (efficacy)
- Czy pacjent spełnia kryteria depresji lekoopornej

Odpowiedz strukturalnie.`,
    expectation: 'lista leków, efficacy'
  },
  {
    name: 'TRD Assessment Agent',
    systemPrompt: 'Jesteś ekspertem w ocenie depresji lekoopornej (TRD). Oceniasz czy pacjent kwalifikuje się jako TRD.',
    userPrompt: `Oceń czy pacjent spełnia kryteria depresji lekoopornej (TRD):

${testMedicalHistory}

Kryteria TRD:
- Niepowodzenie ≥2 adekwatnych prób leczenia
- Adekwatna dawka przez adekwatny czas
- Brak remisji

Czy pacjent spełnia kryteria TRD? Uzasadnij.`,
    expectation: 'ocena TRD'
  },
  {
    name: 'Criteria Assessment Agent',
    systemPrompt: 'Jesteś ekspertem w kwalifikacji pacjentów do badań klinicznych. Oceniasz zgodność z kryteriami włączenia/wykluczenia.',
    userPrompt: `Oceń czy pacjent spełnia kryteria badania:

PACJENT:
${testMedicalHistory}

PROTOKÓŁ:
${testStudyProtocol}

Oceń każde kryterium włączenia i wykluczenia osobno.`,
    expectation: 'kryteria włączenia/wykluczenia'
  },
  {
    name: 'Risk Assessment Agent',
    systemPrompt: 'Jesteś ekspertem w ocenie ryzyka klinicznego. Oceniasz bezpieczeństwo włączenia pacjenta do badania.',
    userPrompt: `Oceń ryzyko kliniczne pacjenta:

${testMedicalHistory}

Oceń:
- Ryzyko samobójcze
- Stabilność kliniczną
- Bezpieczeństwo uczestnictwa w badaniu
- Poziom ryzyka (niskie/średnie/wysokie)`,
    expectation: 'ocena ryzyka'
  }
];

async function testSimpleMultiAgent() {
  console.log('🧪 UPROSZCZONY TEST WIELOAGENTOWEJ ANALIZY');
  console.log('=' .repeat(50));
  console.log();

  try {
    // Sprawdź backend
    console.log('1️⃣ Sprawdzam backend...');
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Backend nie działa - uruchom npm run start');
    }
    console.log('✅ Backend dostępny\n');

    // Test każdego agenta
    console.log('2️⃣ Testuję każdego agenta osobno...');
    console.log(`📋 Historia: ${testMedicalHistory.length} znaków`);
    console.log(`📋 Protokół: ${testStudyProtocol.length} znaków`);
    console.log('🤖 Model: gemini\n');

    let successCount = 0;
    const results = {};
    const totalStartTime = Date.now();

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      console.log(`🤖 [${i+1}/${agents.length}] Testuję: ${agent.name}`);
      
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini',
            systemPrompt: agent.systemPrompt,
            userPrompt: agent.userPrompt,
            temperature: 0.1,
            maxTokens: 1000
          })
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const error = await response.text();
          console.log(`   ❌ BŁĄD: ${response.status} - ${error.substring(0, 100)}...`);
          continue;
        }

        const result = await response.json();
        const content = result.content || '';
        
        // Sprawdź czy zawiera oczekiwane elementy
        const hasExpected = agent.expectation.split(',').some(keyword => 
          content.toLowerCase().includes(keyword.trim().toLowerCase())
        );
        
        if (content.length > 50 && hasExpected) {
          console.log(`   ✅ Sukces (${Math.round(duration/1000)}s)`);
          console.log(`   📝 Wynik: ${content.substring(0, 80)}...`);
          successCount++;
          results[agent.name] = { success: true, content, duration };
        } else {
          console.log(`   ⚠️ Słaba odpowiedź (${Math.round(duration/1000)}s)`);
          console.log(`   📝 Otrzymano: ${content.substring(0, 60)}...`);
          results[agent.name] = { success: false, content, duration };
        }
        
      } catch (error) {
        console.log(`   ❌ Błąd: ${error.message}`);
        results[agent.name] = { success: false, error: error.message };
      }
      
      console.log();
      
      // Krótka przerwa między zapytaniami
      if (i < agents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const totalTime = Date.now() - totalStartTime;

    // Podsumowanie
    console.log('🎯 PODSUMOWANIE TESTÓW:');
    console.log('='.repeat(50));
    
    const successRate = Math.round((successCount / agents.length) * 100);
    
    console.log(`📊 Sukces agentów: ${successCount}/${agents.length} (${successRate}%)`);
    console.log(`⏱️ Całkowity czas: ${Math.round(totalTime/1000)}s`);
    console.log(`📈 Średni czas na agenta: ${Math.round(totalTime/(agents.length*1000))}s`);
    console.log();

    // Szczegółowe wyniki
    console.log('📋 Szczegółowe wyniki:');
    for (const [agentName, result] of Object.entries(results)) {
      const status = result.success ? '✅' : '❌';
      const time = result.duration ? `${Math.round(result.duration/1000)}s` : 'N/A';
      console.log(`   ${status} ${agentName} (${time})`);
    }
    console.log();

    // Ocena ogólna
    if (successRate >= 80) {
      console.log('🎉 ✅ WIELOAGENTOWY SYSTEM DZIAŁA BARDZO DOBRZE!');
      console.log('   💡 Wszystkie kluczowe agenty odpowiadają poprawnie');
      console.log('   🚀 System jest gotowy do pracy z pełnymi danymi "Training Data"');
      
    } else if (successRate >= 60) {
      console.log('⚠️ ✅ SYSTEM DZIAŁA, ALE MA PEWNE PROBLEMY');
      console.log(`   📊 ${successRate}% agentów działa poprawnie`);
      console.log('   🔧 Warto sprawdzić agentów które nie działają');
      
    } else {
      console.log('❌ ⚠️ SYSTEM MA POWAŻNE PROBLEMY');
      console.log(`   📊 Tylko ${successRate}% agentów działa`);
      console.log('   🚨 Sprawdź konfigurację API i połączenie z AI');
    }

    console.log();
    console.log('📍 NASTĘPNE KROKI:');
    if (successRate >= 80) {
      console.log('1. Otwórz aplikację: http://localhost:5173');
      console.log('2. Wybierz "Multi-Agent Analysis"');
      console.log('3. Wklej pełne dane z pliku "Training Data"');
      console.log('4. Uruchom analizę i zweryfikuj wyniki');
    } else {
      console.log('1. Sprawdź konfigurację API keys w .env');
      console.log('2. Zrestartuj backend (npm run start)');
      console.log('3. Uruchom ten test ponownie');
      console.log('4. Jeśli problem się powtarza, sprawdź logi backendu');
    }

  } catch (error) {
    console.error('\n💥 KRYTYCZNY BŁĄD TESTU:');
    console.error('Error:', error.message);
    
    console.log('\n🔧 Sprawdź:');
    console.log('   1. Czy backend działa (npm run start)');
    console.log('   2. Czy klucze API są poprawne w .env');
    console.log('   3. Czy porty 3001 i 5173 nie są zajęte');
  }
}

// Uruchom test
console.log();
testSimpleMultiAgent(); 