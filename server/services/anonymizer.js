import { v4 as uuidv4 } from 'uuid';

class Anonymizer {
  constructor() {
    // Maps to ensure consistent pseudonymization
    this.nameMap = new Map();
    this.peselMap = new Map();
    this.phoneMap = new Map();
    this.emailMap = new Map();
    this.addressMap = new Map();
    this.postalCodeMap = new Map();
    this.houseNumberMap = new Map();
    this.identityDocumentMap = new Map();
    
    // Counters for generating unique IDs
    this.counters = {
      name: 0,
      pesel: 0,
      phone: 0,
      email: 0,
      address: 0,
      postalCode: 0,
      houseNumber: 0,
      identityDocument: 0
    };
  }

  /**
   * Generate anonymized text by replacing PII with consistent placeholders
   */
  anonymize(originalText, detections) {
    if (!detections || detections.length === 0) {
      return originalText;
    }

    let anonymizedText = originalText;
    
    // Sort detections by start position (descending) to avoid index shifting
    const sortedDetections = [...detections].sort((a, b) => b.startIndex - a.startIndex);
    
    sortedDetections.forEach(detection => {
      const replacement = this.getConsistentReplacement(detection);
      const before = anonymizedText.substring(0, detection.startIndex);
      const after = anonymizedText.substring(detection.endIndex);
      anonymizedText = before + replacement + after;
    });
    
    return anonymizedText;
  }

  /**
   * Get consistent replacement for PII entity
   */
  getConsistentReplacement(detection) {
    const { type, text } = detection;
    
    switch (type) {
      case 'NAME':
        return this.getConsistentName(text);
      case 'PESEL':
        return this.getConsistentPESEL(text);
      case 'PHONE':
        return this.getConsistentPhone(text);
      case 'EMAIL':
        return this.getConsistentEmail(text);
      case 'ADDRESS':
        return this.getConsistentAddress(text);
      case 'POSTAL_CODE':
        return this.getConsistentPostalCode(text);
      case 'HOUSE_NUMBER':
        return this.getConsistentHouseNumber(text);
      case 'IDENTITY_DOCUMENT':
        return this.getConsistentIdentityDocument(text);
      default:
        return `[${type}]`;
    }
  }

  getConsistentName(originalName) {
    if (this.nameMap.has(originalName)) {
      return this.nameMap.get(originalName);
    }
    
    this.counters.name++;
    const replacement = `[PACJENT_${this.counters.name.toString().padStart(3, '0')}]`;
    this.nameMap.set(originalName, replacement);
    return replacement;
  }

  getConsistentPESEL(originalPesel) {
    if (this.peselMap.has(originalPesel)) {
      return this.peselMap.get(originalPesel);
    }
    
    this.counters.pesel++;
    const replacement = `[PESEL_${this.counters.pesel.toString().padStart(3, '0')}]`;
    this.peselMap.set(originalPesel, replacement);
    return replacement;
  }

  getConsistentPhone(originalPhone) {
    if (this.phoneMap.has(originalPhone)) {
      return this.phoneMap.get(originalPhone);
    }
    
    this.counters.phone++;
    const replacement = `[TELEFON_${this.counters.phone.toString().padStart(3, '0')}]`;
    this.phoneMap.set(originalPhone, replacement);
    return replacement;
  }

  getConsistentEmail(originalEmail) {
    if (this.emailMap.has(originalEmail)) {
      return this.emailMap.get(originalEmail);
    }
    
    this.counters.email++;
    const replacement = `[EMAIL_${this.counters.email.toString().padStart(3, '0')}]`;
    this.emailMap.set(originalEmail, replacement);
    return replacement;
  }

  getConsistentAddress(originalAddress) {
    if (this.addressMap.has(originalAddress)) {
      return this.addressMap.get(originalAddress);
    }
    
    this.counters.address++;
    const replacement = `[ADRES_${this.counters.address.toString().padStart(3, '0')}]`;
    this.addressMap.set(originalAddress, replacement);
    return replacement;
  }

  getConsistentPostalCode(originalPostalCode) {
    if (this.postalCodeMap.has(originalPostalCode)) {
      return this.postalCodeMap.get(originalPostalCode);
    }
    
    this.counters.postalCode++;
    const replacement = `[KOD_POCZTOWY_${this.counters.postalCode.toString().padStart(3, '0')}]`;
    this.postalCodeMap.set(originalPostalCode, replacement);
    return replacement;
  }

  getConsistentHouseNumber(originalHouseNumber) {
    if (this.houseNumberMap.has(originalHouseNumber)) {
      return this.houseNumberMap.get(originalHouseNumber);
    }
    
    this.counters.houseNumber++;
    const replacement = `[NR_DOMU_${this.counters.houseNumber.toString().padStart(3, '0')}]`;
    this.houseNumberMap.set(originalHouseNumber, replacement);
    return replacement;
  }

  getConsistentIdentityDocument(originalDocument) {
    if (this.identityDocumentMap.has(originalDocument)) {
      return this.identityDocumentMap.get(originalDocument);
    }
    
    this.counters.identityDocument++;
    const replacement = `[DOKUMENT_${this.counters.identityDocument.toString().padStart(3, '0')}]`;
    this.identityDocumentMap.set(originalDocument, replacement);
    return replacement;
  }

  /**
   * Apply manual corrections to anonymized text
   */
  applyManualCorrections(text, corrections) {
    let correctedText = text;
    
    // Sort corrections by start position (descending) to avoid index shifting
    const sortedCorrections = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
    
    sortedCorrections.forEach(correction => {
      const before = correctedText.substring(0, correction.startIndex);
      const after = correctedText.substring(correction.endIndex);
      correctedText = before + correction.replacement + after;
    });
    
    return correctedText;
  }

  /**
   * Get anonymization statistics
   */
  getStats() {
    return {
      totalReplacements: Object.values(this.counters).reduce((sum, count) => sum + count, 0),
      byType: { ...this.counters },
      uniqueEntities: {
        names: this.nameMap.size,
        pesels: this.peselMap.size,
        phones: this.phoneMap.size,
        emails: this.emailMap.size,
        addresses: this.addressMap.size,
        postalCodes: this.postalCodeMap.size,
        houseNumbers: this.houseNumberMap.size,
        identityDocuments: this.identityDocumentMap.size
      }
    };
  }

  /**
   * Reset all mappings (for new session)
   */
  reset() {
    this.nameMap.clear();
    this.peselMap.clear();
    this.phoneMap.clear();
    this.emailMap.clear();
    this.addressMap.clear();
    this.postalCodeMap.clear();
    this.houseNumberMap.clear();
    this.identityDocumentMap.clear();
    
    this.counters = {
      name: 0,
      pesel: 0,
      phone: 0,
      email: 0,
      address: 0,
      postalCode: 0,
      houseNumber: 0,
      identityDocument: 0
    };
  }
}

export default Anonymizer; 