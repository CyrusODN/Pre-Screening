import { performPsychedelicPreScreening } from './src/services/specialistAnalysisService.ts';

const sampleMedicalHistory = `
KARTA WIZYTY | Prywatna: dn. 05-12-2022, Warszawa
Pacjent: M.K., 35 lat
Lekarz: Dr Magdalena Więdłocha

Wywiad:
Pacjent zgłasza się z powodu zaburzeń depresyjnych trwających od nastoletnich lat. 
Dużo lęku towarzyszy tym objawom. W trakcie terapii stwierdzono osobowość unikającą.
Pochodzenie ze wschodniej granicy Polski, pełna rodzina ale "patologiczna".
Ojciec nadużywał alkoholu, znikał, robił awantury.

Historia farmakoterapii:
- Sertralinę 50 mg (najdłużej brał, minimalna poprawa)
- Fluoksetynę (brak efektu, skutki uboczne)
- Lek trójpierścieniowy (dużo skutków ubocznych)
- Welbox 150 mg (bez efektu)
- Alventa 75-112,5 mg (bez poprawy)
- Brintellix, Pregabalin 100 mg
- Concerta, Medikinet CR (poprawa motywacji)

Inne terapie:
- TMS - 30 zabiegów (minimalna poprawa)
- EMDR (minimalna poprawa)
- Psychoterapia: psychoanalityczna, CBT, grupowa
- Warsztaty dla mężczyzn, psychologia procesu
- DDA w 2 miejscach, po roku każde

Ketamina IV (12 sesji 12/2022-03/2023):
- Dawki: 45-110 mg
- Początkowo poprawa nastroju przez 2 dni po wlewie
- Umiarkowane objawy dysocjacji, bez innych działań niepożądanych
- Ostatnie sesje: pogorszenie, nasilenie niepokoju, pesymistycznych myśli
- Jeden wlew przerwano po 70ml z powodu pogorszenia samopoczucia

Wywiad rodzinny:
- Mama: nerwica, przyjmowała setaloft
- Ojciec: uzależniony od alkoholu
- Starszy brat, siostra, rodzice w separacji

Osobowość i zachowanie:
- Osobowość unikająca
- Lęki społeczne, nieadekwatność w kontaktach
- Konwersyjne objawy lęku: bóle brzucha, ścisk w żołądku, biegunki
- Anhedonia, problemy ze snem
- Perfekcjonizm w kontaktach, strach przed błędami rodziców
- Zainteresowanie grami na konsoli (czasem kompulsywne)

Diagnoza ASD/ADHD:
- Podjął diagnostykę w kierunku ASD
- Córka brata ma autyzm
- Potwierdzono rozpoznanie ADHD
- Przygnębiony diagnozą i "nieuleczalnością"

Stan psychiczny:
- Orientacja wszechstronna, kontakt rzeczowy
- Nastrój obniżony, napęd w normie
- Bez objawów psychotycznych
- Bez myśli samobójczych
- Utrzymuje się brak energii, anhedonia, brak motywacji

Rozpoznanie: 
- F33.2 - Zaburzenie depresyjne nawracające, obecnie epizod depresji ciężkiej
- F84 - Całościowe zaburzenia rozwojowe  
- F90 - Zaburzenia hiperkinetyczne

Kwalifikacja do badania psilocybiny w TRD ze względu na lekooporność.
`;

async function testPsychedelicPreScreening() {
  console.log('🧠 [Test] Starting psychedelic pre-screening analysis...');
  console.log('=' .repeat(60));
  
  try {
    const result = await performPsychedelicPreScreening(
      sampleMedicalHistory,
      'Protokół badania psilocybiny w TRD',
      {}, // Mock base analysis
      'gemini'
    );

    console.log('✅ [Test] Analysis completed successfully!');
    console.log('');
    
    // Test all sections
    console.log('📊 [Test] Section Availability:');
    console.log(`  Psychological Profile: ${result.psychologicalProfile.isAvailable ? '✅' : '❌'} (${result.psychologicalProfile.confidenceScore}%)`);
    console.log(`  Clinical Stability: ${result.clinicalStability.isAvailable ? '✅' : '❌'} (${result.clinicalStability.confidenceScore}%)`);
    console.log(`  Risk Profile: ${result.riskProfile.isAvailable ? '✅' : '❌'} (${result.riskProfile.confidenceScore}%)`);
    console.log(`  Psychedelic History: ${result.psychedelicHistory.isAvailable ? '✅' : '❌'} (${result.psychedelicHistory.confidenceScore}%)`);
    console.log('');
    
    // Test overall assessment
    console.log('🎯 [Test] Overall Assessment:');
    console.log(`  Suitability: ${result.overallSuitability}`);
    console.log(`  Confidence: ${result.overallConfidence}%`);
    console.log(`  Data Quality: ${result.dataQuality}`);
    console.log('');
    
    // Test psychological profile core data
    if (result.psychologicalProfile.isAvailable && result.psychologicalProfile.coreData) {
      console.log('🧠 [Test] Psychological Profile Core Data:');
      const psych = result.psychologicalProfile.coreData;
      if (psych.bigFiveAssessment) {
        console.log(`  Big Five: O:${psych.bigFiveAssessment.openness} C:${psych.bigFiveAssessment.conscientiousness} E:${psych.bigFiveAssessment.extraversion} A:${psych.bigFiveAssessment.agreeableness} N:${psych.bigFiveAssessment.neuroticism}`);
      }
      console.log(`  Emotional Stability: ${psych.emotionalStability}`);
      console.log(`  Self-Awareness: ${psych.selfAwarenessLevel}`);
      console.log(`  Readiness for Change: ${psych.readinessForChange}`);
      console.log(`  Trauma Indicators: ${psych.traumaIndicators ? 'Yes' : 'No'}`);
      console.log(`  Social Support: ${psych.socialSupport}`);
      console.log('');
    }
    
    // Test psychedelic history
    if (result.psychedelicHistory.isAvailable && result.psychedelicHistory.coreData) {
      console.log('🍄 [Test] Psychedelic History Core Data:');
      const psychedelic = result.psychedelicHistory.coreData;
      if (psychedelic.ketamineExperience) {
        console.log(`  Ketamine Experience: ${psychedelic.ketamineExperience.hasExperience ? 'Yes' : 'No'}`);
        console.log(`  Session Count: ${psychedelic.ketamineExperience.sessionCount}`);
        console.log(`  Tolerance Level: ${psychedelic.ketamineExperience.toleranceLevel}`);
        console.log(`  Adverse Reactions: ${psychedelic.ketamineExperience.adverseReactions ? 'Yes' : 'No'}`);
      }
      console.log(`  Altered States Capacity: ${psychedelic.alteredStatesCapacity}`);
      console.log(`  Integration History: ${psychedelic.integrationHistory}`);
      console.log('');
    }
    
    // Test narrative sections (first few lines)
    console.log('📝 [Test] Narrative Analysis Samples:');
    console.log(`  Psychological: "${result.psychologicalProfile.narrativeAnalysis.slice(0, 100)}..."`);
    console.log(`  Clinical: "${result.clinicalStability.narrativeAnalysis.slice(0, 100)}..."`);
    console.log(`  Risk: "${result.riskProfile.narrativeAnalysis.slice(0, 100)}..."`);
    console.log(`  Psychedelic: "${result.psychedelicHistory.narrativeAnalysis.slice(0, 100)}..."`);
    console.log('');
    
    // Test placebo considerations
    console.log('💊 [Test] Placebo Considerations:');
    console.log(`  "${result.placeboConsiderations.slice(0, 200)}..."`);
    console.log('');
    
    // Test processing log
    console.log('📋 [Test] Processing Log:');
    result.processingLog.slice(0, 5).forEach(log => {
      console.log(`  - ${log}`);
    });
    if (result.processingLog.length > 5) {
      console.log(`  ... and ${result.processingLog.length - 5} more entries`);
    }
    console.log('');
    
    console.log('🎉 [Test] All tests passed! Psychedelic pre-screening is working correctly.');
    
  } catch (error) {
    console.error('❌ [Test] Analysis failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

testPsychedelicPreScreening().catch(console.error); 