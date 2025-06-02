// RZECZYWISTY TEST WIELOAGENTOWEGO SYSTEMU
// Bezpośrednio importuje i testuje MultiAgentCoordinator

import { MultiAgentCoordinatorImpl } from './src/agents/coordination/MultiAgentCoordinator.ts';
import fetch from 'node-fetch';

// Make fetch globally available for the agents
global.fetch = fetch;

// Krótkie dane testowe
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
Bez objawów psychotycznych.

Rozpoznanie: F33.1 - Zaburzenie depresyjne nawracające
`;

const testStudyProtocol = `
PROTOKÓŁ BADANIA KLINICZNEGO - TEST

Kryteria włączenia:
- Wiek 18-65 lat
- Depresja lekoopora (niepowodzenie ≥2 leków)
- Stabilny stan somatyczny

Kryteria wykluczenia:
- Zaburzenia psychotyczne
- Uzależnienia
- Ciężkie choroby somatyczne
`;

async function testRealMultiAgent() {
  console.log('🧪 RZECZYWISTY TEST WIELOAGENTOWEGO SYSTEMU');
  console.log('=' .repeat(50));
  console.log();

  try {
    // Stwórz coordinator
    console.log('1️⃣ Tworzę MultiAgentCoordinator...');
    const coordinator = new MultiAgentCoordinatorImpl();
    console.log('✅ Coordinator utworzony\n');

    // Sprawdź czy backend działa
    console.log('2️⃣ Sprawdzam dostępność backend API...');
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        console.log('✅ Backend API dostępny');
      } else {
        console.log('⚠️ Backend API niedostępny - niektóre agenty mogą nie działać');
      }
    } catch (error) {
      console.log('⚠️ Backend API niedostępny - uruchom npm run start');
    }
    console.log();

    // Uruchom pełny pipeline
    console.log('3️⃣ Uruchamiam pełny pipeline wieloagentowy...');
    console.log(`📋 Historia medyczna: ${testMedicalHistory.length} znaków`);
    console.log(`📋 Protokół badania: ${testStudyProtocol.length} znaków`);
    console.log('🤖 Model: gemini (najszybszy i niezawodny)');
    console.log();

    const startTime = Date.now();
    
    console.log('🚀 Rozpoczynam analizę...\n');
    
    const result = await coordinator.executeAgentPipeline(
      testMedicalHistory,
      testStudyProtocol,
      'gemini',
      false // Bez specialist analysis - test bazowy
    );

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Pipeline zakończony w ${Math.round(totalTime/1000)}s\n`);

    // Sprawdź każdego agenta
    console.log('4️⃣ Sprawdzam wyniki każdego agenta:');
    console.log('-'.repeat(40));
    
    const expectedAgents = [
      { key: 'clinical-synthesis', name: 'Clinical Synthesis Agent' },
      { key: 'episode-analysis', name: 'Episode Analysis Agent' },
      { key: 'pharmacotherapy-analysis', name: 'Pharmacotherapy Agent' },
      { key: 'trd-assessment', name: 'TRD Assessment Agent' },
      { key: 'criteria-assessment', name: 'Criteria Assessment Agent' },
      { key: 'risk-assessment', name: 'Risk Assessment Agent' }
    ];

    let successCount = 0;
    let totalConfidence = 0;

    for (const agent of expectedAgents) {
      const agentResult = result.agentResults[agent.key];
      
      if (agentResult) {
        const confidence = agentResult.confidence || 0;
        const status = confidence > 0 ? '✅' : '⚠️';
        const warnings = agentResult.warnings?.length || 0;
        
        console.log(`${status} ${agent.name}`);
        console.log(`   Confidence: ${confidence}%`);
        if (warnings > 0) {
          console.log(`   Ostrzeżenia: ${warnings}`);
        }
        if (agentResult.summary) {
          console.log(`   Wynik: ${agentResult.summary.substring(0, 60)}...`);
        }
        
        if (confidence > 0) {
          successCount++;
          totalConfidence += confidence;
        }
        console.log();
      } else {
        console.log(`❌ ${agent.name} - BRAK WYNIKU\n`);
      }
    }

    // Sprawdź finalny wynik
    console.log('5️⃣ Sprawdzam finalny wynik syntezy:');
    console.log('-'.repeat(40));
    
    const finalResult = result.finalResult;
    if (finalResult) {
      console.log(`✅ ID pacjenta: ${finalResult.summary?.id || 'BRAK'}`);
      console.log(`✅ Wiek: ${finalResult.summary?.age || 'BRAK'}`);
      console.log(`✅ Rozpoznanie: ${finalResult.summary?.mainDiagnosis || 'BRAK'}`);
      console.log(`✅ Kryteria włączenia: ${finalResult.inclusionCriteria?.length || 0}`);
      console.log(`✅ Kryteria wykluczenia (psych): ${finalResult.psychiatricExclusionCriteria?.length || 0}`);
      console.log(`✅ Kryteria wykluczenia (med): ${finalResult.medicalExclusionCriteria?.length || 0}`);
      console.log(`✅ Farmakoterapia: ${finalResult.trdAnalysis?.pharmacotherapy?.length || 0} leków`);
      console.log(`✅ Kwalifikacja: ${finalResult.reportConclusion?.overallQualification || 'BRAK'}`);
      
      if (finalResult.drugMappingInfo?.mappingsApplied) {
        console.log(`✅ Mapowanie leków: ${finalResult.drugMappingInfo.mappingsApplied} mapowań`);
      }
    } else {
      console.log('❌ Brak finalnego wyniku!');
    }
    console.log();

    // Sprawdź logi wykonania
    console.log('6️⃣ Logi wykonania:');
    console.log('-'.repeat(40));
    const executionLog = result.executionLog || [];
    console.log(`📝 Liczba wpisów: ${executionLog.length}`);
    
    if (executionLog.length > 0) {
      console.log('📋 Kluczowe etapy:');
      executionLog.slice(0, 8).forEach((log, index) => {
        console.log(`   ${index + 1}. ${log}`);
      });
      
      if (executionLog.length > 8) {
        console.log(`   ... i ${executionLog.length - 8} więcej`);
      }
    }
    console.log();

    // PODSUMOWANIE
    console.log('🎯 PODSUMOWANIE TESTU:');
    console.log('='.repeat(50));
    
    const avgConfidence = successCount > 0 ? Math.round(totalConfidence / successCount) : 0;
    const allAgentsWorking = successCount === expectedAgents.length;
    const hasGoodResult = !!(finalResult?.summary?.id && finalResult?.summary?.age);
    
    if (allAgentsWorking && hasGoodResult && avgConfidence >= 70) {
      console.log('🎉 ✅ WSZYSTKIE AGENTY DZIAŁAJĄ POPRAWNIE!');
      console.log(`   🤖 Sukces: ${successCount}/${expectedAgents.length} agentów`);
      console.log(`   📊 Średnia pewność: ${avgConfidence}%`);
      console.log(`   ⏱️ Czas wykonania: ${Math.round(totalTime/1000)}s`);
      console.log(`   📋 Finalny wynik: kompletny`);
      console.log();
      console.log('💡 System wieloagentowy jest gotowy do użycia z pełnymi danymi!');
      console.log('   Możesz teraz bezpiecznie korzystać z dużego pliku "Training Data"');
      
    } else {
      console.log('⚠️ ❌ SYSTEM MA PROBLEMY:');
      
      if (!allAgentsWorking) {
        console.log(`   - Tylko ${successCount}/${expectedAgents.length} agentów działa`);
      }
      if (!hasGoodResult) {
        console.log('   - Finalny wynik jest niepełny');
      }
      if (avgConfidence < 70) {
        console.log(`   - Niska średnia pewność: ${avgConfidence}%`);
      }
      
      console.log();
      console.log('🔧 Sugerowane działania:');
      console.log('   1. Sprawdź klucze API w .env (zwłaszcza GOOGLE_API_KEY)');
      console.log('   2. Upewnij się że backend działa (npm run start)');
      console.log('   3. Sprawdź logi błędów powyżej');
      console.log('   4. Spróbuj ponownie za chwilę (może być rate limiting)');
    }

  } catch (error) {
    console.error('\n💥 KRYTYCZNY BŁĄD TESTU:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\n🔧 Sprawdź:');
    console.log('   1. Czy backend działa (npm run start)');
    console.log('   2. Czy klucze API są poprawne w .env');
    console.log('   3. Czy nie ma konfliktów portów');
    console.log('   4. Czy wszystkie dependencies są zainstalowane');
  }
}

// Uruchom test
console.log();
testRealMultiAgent(); 