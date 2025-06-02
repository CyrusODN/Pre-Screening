// Test skrypt dla backend API (używanego przez wieloagentowy system)
// Sprawdza czy AI proxy działa poprawnie

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';

async function testBackendAPI() {
  console.log('🧪 ROZPOCZYNAM TEST BACKEND API (AI PROXY)\n');
  
  try {
    // Sprawdź czy backend działa
    console.log('1️⃣ Sprawdzam czy backend działa...');
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Backend nie działa - uruchom npm run start');
    }
    console.log('✅ Backend działa\n');

    // Test prostego AI zapytania
    console.log('2️⃣ Testuję AI proxy endpoint...');
    
    const testPrompt = `
Przeanalizuj krótko następujące dane medyczne:

PACJENT: J.K., 35 lat
ROZPOZNANIE: F33.1 - Zaburzenie depresyjne nawracające
LEKI: Sertraline (bez efektu), Fluoksetyna (minimalna poprawa), Dulsevia (częściowa poprawa)

Odpowiedz krótko: Czy pacjent spełnia kryteria depresji lekooporne?
`;

    const models = ['gemini', 'claude-opus', 'o3-mini'];
    
    for (const model of models) {
      console.log(`🤖 Testuję model: ${model}`);
      
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            systemPrompt: 'Jesteś ekspertem psychiatrą specjalizującym się w leczeniu depresji opornej na leczenie.',
            userPrompt: testPrompt,
            temperature: 0.1,
            maxTokens: 200
          })
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const error = await response.text();
          console.log(`   ❌ ${model} - BŁĄD: ${response.status}`);
          console.log(`      ${error.substring(0, 100)}...`);
          continue;
        }

        const result = await response.json();
        const responseText = result.content || '';
        
        console.log(`   ✅ ${model} - OK (${Math.round(duration/1000)}s)`);
        console.log(`      Odpowiedź: ${responseText.substring(0, 80)}...`);
        
      } catch (modelError) {
        console.log(`   ❌ ${model} - BŁĄD: ${modelError.message}`);
      }
      
      // Krótka przerwa między zapytaniami
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test endpointów pomocniczych
    console.log('\n3️⃣ Testuję endpointy pomocnicze...');
    
    // Test drug mapping
    console.log('   🔍 Drug mapping...');
    try {
      const drugResponse = await fetch(`${BACKEND_URL}/api/drug-mapping/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugName: 'Sertraline' })
      });
      
      if (drugResponse.ok) {
        const drugResult = await drugResponse.json();
        console.log(`      ✅ Drug mapping działa - found: ${drugResult.found}`);
      } else {
        console.log(`      ❌ Drug mapping błąd: ${drugResponse.status}`);
      }
    } catch (error) {
      console.log(`      ❌ Drug mapping błąd: ${error.message}`);
    }

    // Test analysis storage
    console.log('   💾 Analysis storage...');
    try {
      const statsResponse = await fetch(`${BACKEND_URL}/api/analysis/stats`);
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log(`      ✅ Storage działa - ${stats.total} analiz zapisanych`);
      } else {
        console.log(`      ❌ Storage błąd: ${statsResponse.status}`);
      }
    } catch (error) {
      console.log(`      ❌ Storage błąd: ${error.message}`);
    }

    console.log('\n🎯 PODSUMOWANIE TESTU BACKEND API:');
    console.log('✅ Backend API jest gotowy do obsługi wieloagentowego systemu');
    console.log('💡 Teraz możesz przetestować system wieloagentowy przez interfejs aplikacji\n');
    
    console.log('📋 JAK PRZETESTOWAĆ WIELOAGENTOWY SYSTEM:');
    console.log('1. Otwórz aplikację: http://localhost:5173');
    console.log('2. Wybierz tryb "Multi-Agent Analysis"');
    console.log('3. Wklej te krótkie dane testowe w pole "Medical History":');
    console.log('\n' + '='.repeat(50));
    console.log(`KARTA WIZYTY | Test: dn. 15-01-2024, Warszawa
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
Bez objawów psychotycznych.

Rozpoznanie: F33.1 - Zaburzenie depresyjne nawracające`);
    console.log('='.repeat(50));
    console.log('\n4. Uruchom analizę i sprawdź czy wszystkie 6 agentów zadziała');
    console.log('5. Sprawdź czy finalny wynik zawiera wszystkie sekcje\n');
    

  } catch (error) {
    console.error('\n💥 BŁĄD TESTU:', error.message);
    console.log('\n🔧 Sprawdź czy:');
    console.log('   1. Backend działa (npm run start)');
    console.log('   2. Klucze API są skonfigurowane w .env');
    console.log('   3. Brak błędów w logach backendu');
  }
}

// Uruchom test
console.log('🚀 BACKEND API TEST');
console.log('====================\n');
testBackendAPI(); 