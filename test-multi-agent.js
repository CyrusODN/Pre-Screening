// Test skrypt dla wieloagentowego systemu
// Sprawdza czy cały pipeline działa poprawnie z minimalnymi danymi

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';

// Minimalne dane testowe - krótkie ale kompletne
const testMedicalHistory = `
KARTA WIZYTY | Prywatna: dn. 15-01-2024, Warszawa
Pacjent: J.K., 35 lat
Lekarz: Dr Anna Kowalska

Wywiad:
Pacjent zgłasza się z powodu zaburzeń depresyjnych trwających od 3 lat. 
Relacjonuje obniżony nastrój, brak energii, anhedonię. 
Problemy ze snem, koncentracją, poczucie beznadziejności.

Historia farmakoterapii:
1. Sertraline 50mg (6 miesięcy) - bez poprawy
2. Fluoksetyna 20mg (4 miesiące) - minimalna poprawa
3. Welbox 150mg (3 miesiące) - brak efektu
4. Dulsevia 60mg (obecnie, 2 miesiące) - częściowa poprawa

Inne terapie:
- Psychoterapia CBT (6 miesięcy) - częściowa poprawa
- Aktywność fizyczna - nieregularna

Stan psychiczny:
Orientacja wszechstronna, kontakt rzeczowy, nastrój obniżony, 
napęd zmniejszony. Bez objawów psychotycznych, bez myśli samobójczych.

Rozpoznanie: F33.1 - Zaburzenie depresyjne nawracające
`;

const testStudyProtocol = `
PROTOKÓŁ BADANIA KLINICZNEGO - SKRÓCONY TEST

Kryteria włączenia:
- Wiek 18-65 lat
- Depresja lekoopora (niepowodzenie ≥2 leków)
- Stabilny stan somatyczny

Kryteria wykluczenia:
- Zaburzenia psychotyczne
- Uzależnienia
- Ciężkie choroby somatyczne
- Ciąża
`;

async function testMultiAgentSystem() {
  console.log('🧪 ROZPOCZYNAM TEST WIELOAGENTOWEGO SYSTEMU\n');
  
  try {
    // Sprawdź czy backend działa
    console.log('1️⃣ Sprawdzam czy backend działa...');
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Backend nie działa - uruchom npm run start');
    }
    console.log('✅ Backend działa\n');

    // Test wieloagentowej analizy
    console.log('2️⃣ Testuję wieloagentową analizę...');
    console.log('📋 Dane testowe:');
    console.log(`   - Historia medyczna: ${testMedicalHistory.length} znaków`);
    console.log(`   - Protokół: ${testStudyProtocol.length} znaków`);
    console.log(`   - Model: gemini (szybki i niezawodny)\n`);

    const startTime = Date.now();
    
    const analysisResponse = await fetch(`${BACKEND_URL}/api/analyze/multi-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        medicalHistory: testMedicalHistory,
        studyProtocol: testStudyProtocol,
        model: 'gemini',
        enableSpecialistAnalysis: false // Wyłączamy na test - ma być szybko
      })
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      throw new Error(`Analiza nie powiodła się: ${analysisResponse.status} - ${error}`);
    }

    const result = await analysisResponse.json();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Analiza zakończona w ${Math.round(duration/1000)}s\n`);

    // Sprawdź wyniki każdego agenta
    console.log('3️⃣ Sprawdzam wyniki agentów:');
    
    const expectedAgents = [
      'clinical-synthesis',
      'episode-analysis', 
      'pharmacotherapy-analysis',
      'trd-assessment',
      'criteria-assessment',
      'risk-assessment'
    ];

    let successCount = 0;
    
    for (const agentName of expectedAgents) {
      const agentResult = result.agentResults?.[agentName];
      if (agentResult && agentResult.confidence > 0) {
        console.log(`   ✅ ${agentName} - OK (confidence: ${agentResult.confidence})`);
        successCount++;
      } else {
        console.log(`   ❌ ${agentName} - BŁĄD lub brak wyniku`);
        if (agentResult?.warnings?.length > 0) {
          console.log(`      ⚠️ Ostrzeżenia: ${agentResult.warnings.join('; ')}`);
        }
      }
    }

    console.log(`\n📊 Sukces agentów: ${successCount}/${expectedAgents.length}`);

    // Sprawdź finalny wynik
    console.log('\n4️⃣ Sprawdzam finalny wynik:');
    
    const finalResult = result.finalResult;
    if (finalResult) {
      console.log(`   ✅ ID pacjenta: ${finalResult.summary?.id || 'BRAK'}`);
      console.log(`   ✅ Wiek: ${finalResult.summary?.age || 'BRAK'}`);
      console.log(`   ✅ Główne rozpoznanie: ${finalResult.summary?.mainDiagnosis || 'BRAK'}`);
      console.log(`   ✅ Liczba kryteriów włączenia: ${finalResult.inclusionCriteria?.length || 0}`);
      console.log(`   ✅ Liczba kryteriów wykluczenia psychiatrycznych: ${finalResult.psychiatricExclusionCriteria?.length || 0}`);
      console.log(`   ✅ Liczba kryteriów wykluczenia medycznych: ${finalResult.medicalExclusionCriteria?.length || 0}`);
      console.log(`   ✅ Farmakoterapia - liczba leków: ${finalResult.trdAnalysis?.pharmacotherapy?.length || 0}`);
      console.log(`   ✅ Ogólna kwalifikacja: ${finalResult.reportConclusion?.overallQualification || 'BRAK'}`);
      
      // Sprawdź mapowanie leków
      if (finalResult.drugMappingInfo) {
        console.log(`   ✅ Mapowanie leków: ${finalResult.drugMappingInfo.mappingsApplied} mapowań`);
      }
    } else {
      console.log('   ❌ Brak finalnego wyniku');
    }

    // Sprawdź logi wykonania
    console.log('\n5️⃣ Sprawdzam logi wykonania:');
    const executionLog = result.executionLog || [];
    console.log(`   📝 Liczba wpisów w logu: ${executionLog.length}`);
    
    if (executionLog.length > 0) {
      console.log('   📋 Ostatnie 3 wpisy:');
      executionLog.slice(-3).forEach(log => {
        console.log(`      - ${log}`);
      });
    }

    // Podsumowanie
    console.log('\n🎯 PODSUMOWANIE TESTU:');
    
    const allAgentsOk = successCount === expectedAgents.length;
    const hasFinalResult = !!finalResult;
    const hasBasicData = !!(finalResult?.summary?.id && finalResult?.summary?.age);
    
    if (allAgentsOk && hasFinalResult && hasBasicData) {
      console.log('🎉 ✅ WIELOAGENTOWY SYSTEM DZIAŁA POPRAWNIE!');
      console.log(`   ⏱️ Czas wykonania: ${Math.round(duration/1000)}s`);
      console.log(`   🤖 Wszystkie ${expectedAgents.length} agentów zadziałało`);
      console.log('   📋 Finalny wynik zawiera wszystkie kluczowe dane');
      console.log('\n💡 Możesz teraz bezpiecznie używać pełnych danych Training Data');
    } else {
      console.log('⚠️ ❌ SYSTEM MA PROBLEMY:');
      if (!allAgentsOk) console.log(`   - Tylko ${successCount}/${expectedAgents.length} agentów zadziałało`);
      if (!hasFinalResult) console.log('   - Brak finalnego wyniku');
      if (!hasBasicData) console.log('   - Brak podstawowych danych w wyniku');
      console.log('\n🔧 Sprawdź logi powyżej żeby znaleźć problem');
    }

  } catch (error) {
    console.error('\n💥 BŁĄD TESTU:', error.message);
    console.log('\n🔧 Sprawdź czy:');
    console.log('   1. Backend działa (npm run start)');
    console.log('   2. Porty 3001 i 5173 są wolne');
    console.log('   3. Klucze API są skonfigurowane w .env');
    console.log('   4. Brak błędów w logach backendu');
  }
}

// Uruchom test
console.log('🚀 MULTI-AGENT SYSTEM TEST');
console.log('============================\n');
testMultiAgentSystem(); 