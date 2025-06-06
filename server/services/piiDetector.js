import fs from 'fs';
import path from 'path';

class PIIDetector {
  constructor() {
    this.polishNames = null;
    this.medicalTerms = null;
    this.loadDictionaries();
  }

  loadDictionaries() {
    try {
      this.polishNames = JSON.parse(fs.readFileSync('./data/polishNames.json', 'utf8'));
      this.medicalTerms = JSON.parse(fs.readFileSync('./data/medicalTerms.json', 'utf8'));
      console.log('✅ [PIIDetector] Dictionaries loaded successfully');
    } catch (error) {
      console.error('❌ [PIIDetector] Error loading dictionaries:', error);
    }
  }

  detectPII(text) {
    console.log('🔍 [PIIDetector] Starting PII detection...');
    
    const detections = [];
    
    // UWAGA: NIE wykrywamy dat - zgodnie z wymaganiem użytkownika!
    detections.push(...this.detectPESEL(text));
    detections.push(...this.detectPhoneNumbers(text));
    detections.push(...this.detectNames(text));
    detections.push(...this.detectEmails(text));
    detections.push(...this.detectAddresses(text));
    detections.push(...this.detectFieldValues(text)); // Nowa metoda!
    detections.push(...this.detectPostalCodes(text)); // Nowa metoda!
    detections.push(...this.detectIdentityDocuments(text)); // Nowa metoda!
    
    // Sort by position in text
    detections.sort((a, b) => a.startIndex - b.startIndex);
    
    // Remove overlapping detections (keep highest confidence)
    const cleanedDetections = this.removeOverlaps(detections);
    
    console.log(`✅ [PIIDetector] Found ${cleanedDetections.length} PII entities`);
    
    return {
      detections: cleanedDetections,
      overallConfidence: this.calculateOverallConfidence(cleanedDetections),
      summary: {
        totalDetections: cleanedDetections.length,
        byType: this.generateSummary(cleanedDetections)
      }
    };
  }

  detectPESEL(text) {
    const detections = [];
    const peselPattern = /\b\d{11}\b/g;
    let match;

    while ((match = peselPattern.exec(text)) !== null) {
      // Validate PESEL checksum
      const pesel = match[0];
      if (this.validatePESEL(pesel)) {
        detections.push({
          type: 'PESEL',
          text: pesel,
          startIndex: match.index,
          endIndex: match.index + pesel.length,
          confidence: 0.98,
          replacement: '[PESEL]'
        });
      }
    }

    return detections;
  }

  validatePESEL(pesel) {
    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(pesel[i]) * weights[i];
    }
    
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(pesel[10]);
  }

  detectPhoneNumbers(text) {
    const detections = [];
    const phonePatterns = [
      /(?:\+48\s?)?\d{3}[-\s]?\d{3}[-\s]?\d{3}/g,
      /(?:\+48\s?)?\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g,
      /\b\d{9}\b/g
    ];

    phonePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phone = match[0];
        // Sprawdzamy czy to nie jest przypadkiem PESEL, kod pocztowy, etc.
        if (!this.isLikelyPESEL(phone) && !this.isLikelyPostalCode(phone)) {
          detections.push({
            type: 'PHONE',
            text: phone,
            startIndex: match.index,
            endIndex: match.index + phone.length,
            confidence: 0.85,
            replacement: '[TELEFON]'
          });
        }
      }
    });

    return detections;
  }

  detectNames(text) {
    const detections = [];
    
    // 1. Wykrywanie imion i nazwisk w kontekście formularza medycznego
    const contextualPatterns = [
      // "Imię [spacje] [Imię]"
      /(?:Imię\s*(?:i\s*nazwisko)?[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+))/gi,
      // "Nazwisko [spacje] [Nazwisko]"  
      /(?:Nazwisko[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+))/gi,
      // "Drugie imię [spacje] [Imię]"
      /(?:Drugie\s+imię[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+))/gi,
      // "Karta pacjenta: [Imię] [Nazwisko]"
      /(?:Karta\s+pacjenta[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+))/gi,
      // "Pan/Pani [Imię]"
      /(?:Pan|Pani)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/gi
    ];

    contextualPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const capturedName = match[1];
        
        // Sprawdzamy czy to nie jest miasto ani termin medyczny
        if (!this.isCityName(capturedName) && !this.isMedicalTerm(capturedName)) {
          detections.push({
            type: 'NAME',
            text: capturedName,
            startIndex: match.index + match[0].indexOf(capturedName),
            endIndex: match.index + match[0].indexOf(capturedName) + capturedName.length,
            confidence: 0.92,
            replacement: '[PACJENT]'
          });
        }
      }
    });

    // 2. Wykrywanie samodzielnych imion i nazwisk (gdy są w słownikach)
    if (this.polishNames) {
      const namePattern = /\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\b/g;
      let match;
      
      while ((match = namePattern.exec(text)) !== null) {
        const potentialName = match[0];
        
        if ((this.isPolishFirstName(potentialName) || this.isPolishLastName(potentialName)) &&
            !this.isCityName(potentialName) && 
            !this.isMedicalTerm(potentialName) &&
            !this.isDosage(potentialName)) {
          
          detections.push({
            type: 'NAME',
            text: potentialName,
            startIndex: match.index,
            endIndex: match.index + potentialName.length,
            confidence: 0.75,
            replacement: '[IMIĘ/NAZWISKO]'
          });
        }
      }
    }

    return detections;
  }

  detectFieldValues(text) {
    const detections = [];
    
    // Wykrywanie wartości po etykietach pól formularza
    const fieldPatterns = [
      // Numery domów i mieszkań
      /(?:Nr\s+domu|Numer\s+domu)[:\s]*(\d+[A-Za-z]?)/gi,
      /(?:Nr\s+mieszkania|Numer\s+mieszkania)[:\s]*(\d+[A-Za-z]?)/gi,
      
      // Telefon w kontekście
      /(?:Telefon|Tel\.?)[:\s]*([+\d\s\-()]+)/gi,
      
      // Email w kontekście  
      /(?:Email|E-mail)[:\s]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi
    ];

    fieldPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1].trim();
        
        if (value && value.length > 0) {
          // Określamy typ na podstawie zawartości
          let type = 'ADDRESS';
          let replacement = '[DANE]';
          
          if (/^\d+[A-Za-z]?$/.test(value)) {
            type = 'HOUSE_NUMBER';
            replacement = '[NR_DOMU]';
          } else if (/[+\d\s\-()]+/.test(value) && value.replace(/[\s\-()]/g, '').length >= 9) {
            type = 'PHONE';
            replacement = '[TELEFON]';
          } else if (/@/.test(value)) {
            type = 'EMAIL';
            replacement = '[EMAIL]';
          }
          
          detections.push({
            type,
            text: value,
            startIndex: match.index + match[0].indexOf(value),
            endIndex: match.index + match[0].indexOf(value) + value.length,
            confidence: 0.88,
            replacement
          });
        }
      }
    });

    return detections;
  }

  detectPostalCodes(text) {
    const detections = [];
    // Polski kod pocztowy: XX-XXX
    const postalPattern = /\b\d{2}-\d{3}\b/g;
    let match;

    while ((match = postalPattern.exec(text)) !== null) {
      const postalCode = match[0];
      detections.push({
        type: 'POSTAL_CODE',
        text: postalCode,
        startIndex: match.index,
        endIndex: match.index + postalCode.length,
        confidence: 0.95,
        replacement: '[KOD_POCZTOWY]'
      });
    }

    return detections;
  }

  detectEmails(text) {
    const detections = [];
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;

    while ((match = emailPattern.exec(text)) !== null) {
      const email = match[0];
      detections.push({
        type: 'EMAIL',
        text: email,
        startIndex: match.index,
        endIndex: match.index + email.length,
        confidence: 0.95,
        replacement: '[EMAIL]'
      });
    }

    return detections;
  }

  detectAddresses(text) {
    const detections = [];
    
    const addressPatterns = [
      // Ulica z wieloma spacjami i dowolną nazwą (format tabelaryczny)
      /(?:Ulica|ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż\s]+?)(?=\s*\n|\s{3,}|$)/gi,
      
      // Dwuczłonowe nazwy ulic: "Bolesława Prusa", "Jana Pawła II" (format ciągły)
      /(?:Ulica|ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż]+)/gi,
      
      // Specjalny pattern dla formatu tabelarycznego medycznego
      /Ulica\s{3,}([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż\s]+?)(?=\s*(?:Nr\s+domu|$))/gi,
      
      // Miasta w kontekście adresu
      /(?:Miasto|Miejscowość)[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/gi,
      
      // Województwa
      /(?:Województwo)[:\s]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/gi
    ];

    addressPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const address = match[1].trim();
        
        // Sprawdzamy czy to nie dawka leku ani termin medyczny
        if (!this.isDosage(address) && 
            !this.isMedicalTerm(address) && 
            !this.isCityName(address) &&
            address.length > 2) { // Minimum 3 znaki
          
          detections.push({
            type: 'ADDRESS',
            text: address,
            startIndex: match.index + match[0].indexOf(address),
            endIndex: match.index + match[0].indexOf(address) + address.length,
            confidence: 0.85, // Zwiększony confidence
            replacement: '[ADRES]'
          });
          
          console.log(`🏠 [PIIDetector] Address detected (pattern ${index + 1}): "${address}"`);
        }
      }
    });

    return detections;
  }

  detectIdentityDocuments(text) {
    const detections = [];
    
    // Wzorce dla dokumentów tożsamości
    const identityPatterns = [
      // Format tabelaryczny: "Dokument tożsamości:    Dowód osobisty\n           DFV497000"
      /Dokument\s+tożsamości[:\s]*.*?Dowód\s+osobisty.*?\n\s*([A-Z]{3}\d{6})/gi,
      
      // "Dokument tożsamości: Dowód osobisty DFV497000" - jedna linia
      /(?:Dokument\s+tożsamości[:\s]*)(Dowód\s+osobisty\s+[A-Z]{3}\d{6})/gi,
      
      // "Dokument tożsamości: Dowód osobisty\nDFV497000" - dwie linie bez wcięć  
      /(?:Dokument\s+tożsamości[:\s]*Dowód\s+osobisty[\s\n]+)([A-Z]{3}\d{6})/gi,
      
      // "Dowód osobisty DFV497000" (samodzielny - jedna linia)
      /(Dowód\s+osobisty\s+[A-Z]{3}\d{6})/gi,
      
      // "Dowód osobisty\nDFV497000" (samodzielny - dwie linie)
      /(Dowód\s+osobisty[\s\n]+[A-Z]{3}\d{6})/gi,
      
      // Tylko kod po "Dowód osobisty" w poprzedniej linii (format tabelaryczny)
      /Dowód\s+osobisty.*?\n\s*([A-Z]{3}\d{6})/gi,
      
      // "Paszport ER123456" (samodzielny)
      /(Paszport\s+[A-Z]{2}\d{6,})/gi,
      
      // "Prawo jazdy AB123456" (samodzielny)
      /(Prawo\s+jazdy\s+[A-Z0-9]{6,})/gi
    ];

    // Używamy Set żeby uniknąć duplikatów oraz sprawdzamy pozycje
    const foundDocuments = new Set();
    const foundPositions = [];

    identityPatterns.forEach((pattern, index) => {
      let match;
      pattern.lastIndex = 0; // Reset wzorca
      
      while ((match = pattern.exec(text)) !== null) {
        const documentInfo = match[1].trim();
        const matchStartIndex = match.index + match[0].indexOf(match[1]);
        const matchEndIndex = matchStartIndex + documentInfo.length;
        
        // Sprawdzamy czy ten tekst już istnieje lub nakłada się z istniejącym
        const isOverlapping = foundPositions.some(pos => 
          (matchStartIndex >= pos.start && matchStartIndex < pos.end) ||
          (matchEndIndex > pos.start && matchEndIndex <= pos.end) ||
          (matchStartIndex <= pos.start && matchEndIndex >= pos.end)
        );
        
        // Sprawdzamy czy to nie jest PESEL, telefon ani zbyt krótkie
        if (!this.isLikelyPESEL(documentInfo) && 
            !this.isLikelyPhone(documentInfo) &&
            documentInfo.length >= 6 &&
            !foundDocuments.has(documentInfo.toLowerCase()) &&
            !isOverlapping) {
          
          foundDocuments.add(documentInfo.toLowerCase());
          foundPositions.push({ start: matchStartIndex, end: matchEndIndex });
          
          detections.push({
            type: 'IDENTITY_DOCUMENT',
            text: documentInfo,
            startIndex: matchStartIndex,
            endIndex: matchEndIndex,
            confidence: 0.90,
            replacement: '[DOKUMENT_TOŻSAMOŚCI]'
          });
          
          console.log(`🆔 [PIIDetector] Identity document detected (pattern ${index + 1}): "${documentInfo}"`);
        }
      }
    });

    return detections;
  }

  // Pomocnicze metody
  isPolishFirstName(name) {
    if (!this.polishNames) return false;
    return this.polishNames.firstNames.male.includes(name) ||
           this.polishNames.firstNames.female.includes(name);
  }

  isPolishLastName(name) {
    if (!this.polishNames) return false;
    return this.polishNames.lastNames.some(lastName => 
      lastName.toLowerCase() === name.toLowerCase()
    );
  }

  isMedicalTerm(term) {
    if (!this.medicalTerms) return false;
    const lowerTerm = term.toLowerCase();
    return this.medicalTerms.preserve.some(medTerm => 
      medTerm.toLowerCase() === lowerTerm
    );
  }

  isCityName(name) {
    // Lista największych polskich miast (można rozszerzyć)
    const polishCities = [
      'warszawa', 'kraków', 'łódź', 'wrocław', 'poznań', 'gdańsk', 'szczecin',
      'bydgoszcz', 'lublin', 'białystok', 'katowice', 'gdynia', 'częstochowa',
      'radom', 'sosnowiec', 'toruń', 'kielce', 'gliwice', 'zabrze', 'bytom'
    ];
    return polishCities.includes(name.toLowerCase());
  }

  isDosage(text) {
    // Wykrywa dawki leków: "50mg", "2x dziennie", "1 tabletka", itp.
    const dosagePatterns = [
      /\d+\s*mg/i,
      /\d+\s*g/i,
      /\d+\s*ml/i,
      /\d+x\s*dziennie/i,
      /\d+\s*tablet/i,
      /\d+\s*kapsułk/i
    ];
    return dosagePatterns.some(pattern => pattern.test(text));
  }

  isLikelyPESEL(text) {
    return /^\d{11}$/.test(text.replace(/[\s\-]/g, ''));
  }

  isLikelyPostalCode(text) {
    return /^\d{2}-\d{3}$/.test(text);
  }

  isLikelyPhone(text) {
    // Sprawdza czy tekst wygląda jak numer telefonu
    const phonePattern = /^[\d\s\-+()]{9,}$/;
    return phonePattern.test(text);
  }

  removeOverlaps(detections) {
    const cleaned = [];
    
    for (let i = 0; i < detections.length; i++) {
      const current = detections[i];
      let isOverlapping = false;
      
      for (let j = 0; j < cleaned.length; j++) {
        const existing = cleaned[j];
        
        // Check for overlap
        if (current.startIndex < existing.endIndex && current.endIndex > existing.startIndex) {
          isOverlapping = true;
          
          // Keep the one with higher confidence
          if (current.confidence > existing.confidence) {
            cleaned.splice(j, 1);
            cleaned.push(current);
          }
          break;
        }
      }
      
      if (!isOverlapping) {
        cleaned.push(current);
      }
    }
    
    return cleaned.sort((a, b) => a.startIndex - b.startIndex);
  }

  calculateOverallConfidence(detections) {
    if (detections.length === 0) return 1.0;
    
    const avgConfidence = detections.reduce((sum, det) => sum + det.confidence, 0) / detections.length;
    return parseFloat(avgConfidence.toFixed(3));
  }

  generateSummary(detections) {
    const summary = {};
    
    detections.forEach(detection => {
      if (!summary[detection.type]) {
        summary[detection.type] = 0;
      }
      summary[detection.type]++;
    });
    
    return summary;
  }
}

export default PIIDetector; 