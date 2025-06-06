import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

class PopplerPdfProcessor {
    constructor() {
        console.log('✅ [PopplerPdfProcessor] Initialized with pdftotext');
    }

    async extractTextFromPDF(pdfPath, password = null) {
        const fullPath = path.resolve(pdfPath);
        
        console.log(`📄 [PopplerPdfProcessor] Starting pdftotext extraction: ${path.basename(pdfPath)}${password ? ' (with password)' : ''}`);
        
        try {
            // Sprawdzamy czy plik istnieje
            if (!fs.existsSync(fullPath)) {
                throw new Error(`PDF file not found: ${fullPath}`);
            }

            // Budujemy komendę z opcjonalnym hasłem
            let command = `pdftotext -enc UTF-8 -layout`;
            
            // Dodajemy hasło jeśli zostało podane
            if (password) {
                // Escapujemy hasło dla bezpieczeństwa
                const escapedPassword = password.replace(/"/g, '\\"');
                command += ` -upw "${escapedPassword}"`;
                console.log(`🔐 [PopplerPdfProcessor] Using provided password`);
            }
            
            command += ` "${fullPath}" -`;
            
            console.log(`🔍 [PopplerPdfProcessor] Running: pdftotext -enc UTF-8 -layout${password ? ' -upw [HIDDEN]' : ''}`);
            
            const { stdout, stderr } = await execAsync(command, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            // Sprawdzamy błędy związane z hasłem
            if (stderr && stderr.trim()) {
                const stderrLower = stderr.toLowerCase();
                
                // Wykrywamy błędy hasła
                if (stderrLower.includes('incorrect password') || 
                    stderrLower.includes('incorrect owner password') ||
                    stderrLower.includes('may not be copied') ||
                    stderrLower.includes('command line error')) {
                    
                    if (!password) {
                        console.log(`🔒 [PopplerPdfProcessor] PDF requires password`);
                        return {
                            error: 'PASSWORD_REQUIRED',
                            message: 'Ten PDF jest zabezpieczony hasłem',
                            method: 'password-required',
                            confidence: 0
                        };
                    } else {
                        console.log(`❌ [PopplerPdfProcessor] Incorrect password provided`);
                        return {
                            error: 'WRONG_PASSWORD', 
                            message: 'Podane hasło jest nieprawidłowe',
                            method: 'wrong-password',
                            confidence: 0
                        };
                    }
                }
                
                console.log(`⚠️ [PopplerPdfProcessor] Warning: ${stderr.trim()}`);
            }

            const extractedText = stdout.trim();
            
            if (!extractedText) {
                console.log(`❌ [PopplerPdfProcessor] No text extracted`);
                return this.fallbackExtraction(fullPath, password);
            }

            console.log(`✅ [PopplerPdfProcessor] Successfully extracted ${extractedText.length} characters`);
            
            // Sprawdzamy czy tekst zawiera polskie znaki (dobry znak!)
            const polishChars = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
            const hasPolishChars = polishChars.test(extractedText);
            if (hasPolishChars) {
                console.log(`🇵🇱 [PopplerPdfProcessor] Polish characters detected - good sign!`);
            }

            // Zwracamy w formacie kompatybilnym z API
            return {
                text: extractedText,
                method: password ? 'pdftotext-password' : 'pdftotext-poppler',
                confidence: hasPolishChars ? 0.95 : 0.85
            };

        } catch (error) {
            console.log(`❌ [PopplerPdfProcessor] pdftotext error: ${error.message}`);
            
            // Sprawdzamy czy błąd może być związany z hasłem
            if (error.message && error.message.toLowerCase().includes('password')) {
                if (!password) {
                    return {
                        error: 'PASSWORD_REQUIRED',
                        message: 'Ten PDF jest zabezpieczony hasłem',
                        method: 'password-required',
                        confidence: 0
                    };
                } else {
                    return {
                        error: 'WRONG_PASSWORD',
                        message: 'Podane hasło jest nieprawidłowe', 
                        method: 'wrong-password',
                        confidence: 0
                    };
                }
            }
            
            return this.fallbackExtraction(fullPath, password);
        }
    }

    async fallbackExtraction(pdfPath, password = null) {
        console.log(`🔄 [PopplerPdfProcessor] Trying fallback with different encoding...`);
        
        try {
            // Próbujemy bez -layout dla trudnych PDF-ów
            let command = `pdftotext -enc UTF-8`;
            
            // Dodajemy hasło jeśli zostało podane
            if (password) {
                const escapedPassword = password.replace(/"/g, '\\"');
                command += ` -upw "${escapedPassword}"`;
            }
            
            command += ` "${pdfPath}" -`;
            
            const { stdout, stderr } = await execAsync(command, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024
            });

            // Sprawdzamy błędy hasła w fallback
            if (stderr && stderr.trim()) {
                const stderrLower = stderr.toLowerCase();
                if (stderrLower.includes('incorrect password') || 
                    stderrLower.includes('incorrect owner password')) {
                    
                    if (!password) {
                        return {
                            error: 'PASSWORD_REQUIRED',
                            message: 'Ten PDF jest zabezpieczony hasłem',
                            method: 'password-required',
                            confidence: 0
                        };
                    } else {
                        return {
                            error: 'WRONG_PASSWORD',
                            message: 'Podane hasło jest nieprawidłowe',
                            method: 'wrong-password', 
                            confidence: 0
                        };
                    }
                }
            }

            if (stdout && stdout.trim()) {
                console.log(`✅ [PopplerPdfProcessor] Fallback extraction successful: ${stdout.length} characters`);
                return {
                    text: stdout.trim(),
                    method: password ? 'pdftotext-fallback-password' : 'pdftotext-fallback',
                    confidence: 0.75
                };
            }

        } catch (fallbackError) {
            console.log(`❌ [PopplerPdfProcessor] Fallback also failed: ${fallbackError.message}`);
            
            // Sprawdzamy błędy hasła w exception
            if (fallbackError.message && fallbackError.message.toLowerCase().includes('password')) {
                if (!password) {
                    return {
                        error: 'PASSWORD_REQUIRED',
                        message: 'Ten PDF jest zabezpieczony hasłem',
                        method: 'password-required',
                        confidence: 0
                    };
                } else {
                    return {
                        error: 'WRONG_PASSWORD',
                        message: 'Podane hasło jest nieprawidłowe',
                        method: 'wrong-password',
                        confidence: 0
                    };
                }
            }
        }

        // Ostateczny fallback
        return this.emergencyFallback();
    }

    emergencyFallback() {
        console.log(`🆘 [PopplerPdfProcessor] Emergency fallback - manual extraction needed`);
        const errorText = `BŁĄD EKSTRAKCJI: Nie udało się wyciągnąć tekstu z tego PDF-a.

INSTRUKCJE DLA UŻYTKOWNIKA:
1. Otwórz plik PDF w przeglądarce lub Adobe Reader
2. Zaznacz cały tekst (Ctrl+A / Cmd+A)
3. Skopiuj tekst (Ctrl+C / Cmd+C)  
4. Użyj opcji "Wklej tekst" zamiast "Wczytaj PDF"

Ten PDF może mieć specjalne kodowanie lub być skanowanym dokumentem.`;

        return {
            text: errorText,
            method: 'emergency-fallback',
            confidence: 0.1
        };
    }

    async getPDFInfo(pdfPath) {
        try {
            const fullPath = path.resolve(pdfPath);
            const stats = fs.statSync(fullPath);
            
            // Używamy pdfinfo do uzyskania informacji o PDF
            const command = `pdfinfo "${fullPath}"`;
            const { stdout } = await execAsync(command);
            
            // Parsujemy podstawowe info
            const lines = stdout.split('\n');
            let pages = 0;
            let pdfVersion = '';
            
            lines.forEach(line => {
                if (line.startsWith('Pages:')) {
                    pages = parseInt(line.split(':')[1].trim());
                }
                if (line.startsWith('PDF version:')) {
                    pdfVersion = line.split(':')[1].trim();
                }
            });

            const info = {
                fileSize: stats.size,
                pages: pages || 1,
                hasText: true, // Zakładamy że PDF ma tekst, sprawdzimy przy ekstrakcji
                version: pdfVersion || 'unknown'
            };

            console.log(`✅ [PopplerPdfProcessor] PDF info: ${info.pages} pages, ${info.fileSize} bytes, v${info.version}`);
            return info;

        } catch (error) {
            console.log(`❌ [PopplerPdfProcessor] Error getting PDF info: ${error.message}`);
            // Fallback info
            const stats = fs.statSync(path.resolve(pdfPath));
            return {
                fileSize: stats.size,
                pages: 1,
                hasText: true,
                version: 'unknown'
            };
        }
    }
}

export default PopplerPdfProcessor; 