import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download,
  Loader2,
  Shield,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard
} from 'lucide-react';

interface PDFUploadResult {
  sessionId: string;
  filename: string;
  fileSize: number;
  pages: number;
  hasText: boolean;
}

interface MultiplePDFResult {
  results: PDFUploadResult[];
  totalFiles: number;
  successCount: number;
  failedFiles: string[];
}

interface PIIDetection {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  replacement: string;
}

interface AnonymizationPreview {
  sessionId: string;
  filename: string;
  originalText: string;
  anonymizedText: string;
  detections: PIIDetection[];
  overallConfidence: number;
  summary: {
    totalDetections: number;
    byType: Record<string, number>;
  };
  extractionMethod: string;
  extractionConfidence: number;
  anonymizationStats: {
    totalReplacements: number;
    byType: Record<string, number>;
    uniqueEntities: Record<string, number>;
  };
}

interface PdfAnonymizerProps {
  onAnonymizedTextReady: (texts: string[], sessionIds: string[]) => void;
  onCancel: () => void;
  onAnonymizedDataReady?: (texts: string[], sessionIds: string[]) => void;
}

const getIconForPIIType = (type: string) => {
  switch (type.toUpperCase()) {
    case 'NAME': return <User className="w-4 h-4" />;
    case 'PESEL': return <CreditCard className="w-4 h-4" />;
    case 'PHONE': return <Phone className="w-4 h-4" />;
    case 'EMAIL': return <Mail className="w-4 h-4" />;
    case 'DATE': return <Calendar className="w-4 h-4" />;
    case 'ADDRESS': return <MapPin className="w-4 h-4" />;
    default: return <Shield className="w-4 h-4" />;
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

export const PdfAnonymizer: React.FC<PdfAnonymizerProps> = ({ 
  onAnonymizedTextReady, 
  onCancel,
  onAnonymizedDataReady
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'approve'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<PDFUploadResult[]>([]);
  const [previewsData, setPreviewsData] = useState<AnonymizationPreview[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [manualCorrections, setManualCorrections] = useState<any[]>([]);
  const [currentProcessing, setCurrentProcessing] = useState<number>(0);
  
  // Password handling states
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    filename: string;
    isRetry: boolean;
  }>({
    isOpen: false,
    sessionId: '',
    filename: '',
    isRetry: false
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleMultipleFileUpload = useCallback(async (files: FileList) => {
    setLoading(true);
    setError(null);
    setCurrentProcessing(0);

    try {
      const results: PDFUploadResult[] = [];
      const failedFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentProcessing(i + 1);

        try {
          console.log(`📄 Przetwarzam plik ${i + 1}/${files.length}: ${file.name}`);
          
          const formData = new FormData();
          formData.append('pdf', file);

          const response = await fetch('http://localhost:3001/api/upload-pdf', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'PDF upload failed');
          }

          const result: PDFUploadResult = await response.json();
          results.push(result);
          console.log(`✅ Plik ${file.name} uploaded: ${result.sessionId}`);
          
        } catch (fileError) {
          console.error(`❌ Błąd w pliku ${file.name}:`, fileError);
          failedFiles.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      // DODAJ do istniejących wyników zamiast zastępować
      setUploadResults(prev => [...prev, ...results]);
      
      if (results.length > 0) {
        // Jeśli jesteśmy już w preview step, po prostu generuj preview dla nowych plików
        if (step === 'preview') {
          await handleGenerateAdditionalPreviews(results.map(r => r.sessionId));
        } else {
          setStep('preview');
          // Generuj preview dla wszystkich plików (stare + nowe)
          const allSessionIds = [...uploadResults.map(r => r.sessionId), ...results.map(r => r.sessionId)];
          await handleGenerateMultiplePreviews(allSessionIds);
        }
      }

      if (failedFiles.length > 0) {
        setError(`Nie udało się przetworzyć ${failedFiles.length} plików: ${failedFiles.join(', ')}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas uploadu PDF-ów');
    } finally {
      setLoading(false);
      setCurrentProcessing(0);
    }
  }, [uploadResults, step]);

  const handleGenerateMultiplePreviews = async (sessionIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const previews: AnonymizationPreview[] = [];
      const pendingPasswordSessions: string[] = [];

      for (let i = 0; i < sessionIds.length; i++) {
        const sessionId = sessionIds[i];
        setCurrentProcessing(i + 1);

        try {
          const response = await fetch('http://localhost:3001/api/anonymize-preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
          });

          if (response.status === 423) { // PASSWORD_REQUIRED
            const errorData = await response.json();
            console.log(`🔒 PDF wymaga hasła: ${errorData.filename}`);
            
            // Otwórz modal dla pierwszego PDF wymagającego hasła
            if (pendingPasswordSessions.length === 0) {
              const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
              setPasswordModal({
                isOpen: true,
                sessionId,
                filename: uploadResult?.filename || errorData.filename || 'Nieznany plik',
                isRetry: false
              });
              setPasswordError(null);
              setCurrentPassword('');
            }
            
            pendingPasswordSessions.push(sessionId);
            continue;
          }

          if (response.status === 401) { // WRONG_PASSWORD
            const errorData = await response.json();
            console.log(`❌ Nieprawidłowe hasło: ${errorData.filename}`);
            
            // Ten przypadek nie powinien się zdarzyć w tej metodzie
            // bo nie używamy jeszcze hasła, ale dla kompletności:
            throw new Error(`Błąd hasła dla ${errorData.filename}`);
          }

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Anonymization preview failed');
          }

          const preview: AnonymizationPreview = await response.json();
          // Dodaj nazwę pliku z uploadResults
          const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
          preview.filename = uploadResult?.filename || 'Nieznany plik';
          
          previews.push(preview);
          
        } catch (previewError) {
          console.error(`❌ Błąd preview dla sesji ${sessionId}:`, previewError);
          // Dodaj komunikat o błędzie do preview data
          const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
          previews.push({
            sessionId,
            filename: uploadResult?.filename || 'Nieznany plik',
            originalText: `BŁĄD EKSTRAKCJI: ${previewError instanceof Error ? previewError.message : 'Unknown error'}`,
            anonymizedText: `BŁĄD EKSTRAKCJI: Nie udało się wyciągnąć tekstu z tego PDF-a.

INSTRUKCJE DLA UŻYTKOWNIKA:
1. Otwórz plik PDF w przeglądarce lub Adobe Reader
2. Zaznacz cały tekst (Ctrl+A / Cmd+A)
3. Skopiuj tekst (Ctrl+C / Cmd+C)  
4. Użyj opcji "Wklej tekst" zamiast "Wczytaj PDF"

Ten PDF może mieć specjalne kodowanie lub być skanowanym dokumentem.`,
            detections: [],
            overallConfidence: 0,
            summary: { totalDetections: 0, byType: {} },
            extractionMethod: 'failed',
            extractionConfidence: 0,
            anonymizationStats: { totalReplacements: 0, byType: {}, uniqueEntities: {} }
          });
        }
      }

      setPreviewsData(previews);

      // Jeśli wszystkie PDF-y wymagają hasła, nie wyświetlamy loader
      if (pendingPasswordSessions.length === sessionIds.length) {
        setLoading(false);
        setCurrentProcessing(0);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas generowania podglądu');
      setLoading(false);
      setCurrentProcessing(0);
    } finally {
      // Loading zostanie wyłączony przez password modal lub wcześniej
      if (!passwordModal.isOpen) {
        setLoading(false);
        setCurrentProcessing(0);
      }
    }
  };

  const handleGenerateAdditionalPreviews = async (newSessionIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const newPreviews: AnonymizationPreview[] = [];
      const pendingPasswordSessions: string[] = [];

      for (let i = 0; i < newSessionIds.length; i++) {
        const sessionId = newSessionIds[i];
        setCurrentProcessing(i + 1);

        try {
          const response = await fetch('http://localhost:3001/api/anonymize-preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
          });

          if (response.status === 423) { // PASSWORD_REQUIRED
            const errorData = await response.json();
            console.log(`🔒 PDF wymaga hasła: ${errorData.filename}`);
            
            // Otwórz modal dla pierwszego PDF wymagającego hasła
            if (pendingPasswordSessions.length === 0) {
              const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
              setPasswordModal({
                isOpen: true,
                sessionId,
                filename: uploadResult?.filename || errorData.filename || 'Nieznany plik',
                isRetry: false
              });
              setPasswordError(null);
              setCurrentPassword('');
            }
            
            pendingPasswordSessions.push(sessionId);
            continue;
          }

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Anonymization preview failed');
          }

          const preview: AnonymizationPreview = await response.json();
          // Dodaj nazwę pliku z uploadResults
          const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
          preview.filename = uploadResult?.filename || 'Nieznany plik';
          
          newPreviews.push(preview);
          
        } catch (previewError) {
          console.error(`❌ Błąd preview dla sesji ${sessionId}:`, previewError);
          // Dodaj komunikat o błędzie do preview data
          const uploadResult = uploadResults.find(r => r.sessionId === sessionId);
          newPreviews.push({
            sessionId,
            filename: uploadResult?.filename || 'Nieznany plik',
            originalText: `BŁĄD EKSTRAKCJI: ${previewError instanceof Error ? previewError.message : 'Unknown error'}`,
            anonymizedText: `BŁĄD EKSTRAKCJI: Nie udało się wyciągnąć tekstu z tego PDF-a.`,
            detections: [],
            overallConfidence: 0,
            summary: { totalDetections: 0, byType: {} },
            extractionMethod: 'failed',
            extractionConfidence: 0,
            anonymizationStats: { totalReplacements: 0, byType: {}, uniqueEntities: {} }
          });
        }
      }

      // DODAJ nowe previews do istniejących zamiast zastępować
      setPreviewsData(prev => [...prev, ...newPreviews]);

      // Jeśli wszystkie nowe PDF-y wymagają hasła, nie wyświetlamy loader
      if (pendingPasswordSessions.length === newSessionIds.length) {
        setLoading(false);
        setCurrentProcessing(0);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas generowania podglądu dodatkowych plików');
      setLoading(false);
      setCurrentProcessing(0);
    } finally {
      // Loading zostanie wyłączony przez password modal lub wcześniej
      if (!passwordModal.isOpen) {
        setLoading(false);
        setCurrentProcessing(0);
      }
    }
  };

  const handleApproveAnalysis = async () => {
    if (!previewsData || previewsData.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const anonymizedTexts: string[] = [];
      const sessionIds: string[] = [];

      for (let i = 0; i < previewsData.length; i++) {
        const preview = previewsData[i];
        setCurrentProcessing(i + 1);

        try {
          const response = await fetch('http://localhost:3001/api/approve-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: preview.sessionId,
              manualCorrections
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis approval failed');
          }

          const result = await response.json();
          anonymizedTexts.push(result.anonymizedText);
          sessionIds.push(preview.sessionId);
          
        } catch (approvalError) {
          console.error(`❌ Błąd approval dla ${preview.filename}:`, approvalError);
        }
      }
      
      // Notify parent component that anonymized texts are ready
      onAnonymizedTextReady(anonymizedTexts, sessionIds);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zatwierdzania analiz');
    } finally {
      setLoading(false);
      setCurrentProcessing(0);
    }
  };

  const handleFinishAndAnalyze = async () => {
    // Ta funkcja wywołuje handleApproveAnalysis która automatycznie przekierowuje do analizy
    await handleApproveAnalysis();
  };

  const handlePrepareDataAndReturn = async () => {
    if (!previewsData || previewsData.length === 0) {
      onCancel();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const anonymizedTexts: string[] = [];
      const sessionIds: string[] = [];

      for (let i = 0; i < previewsData.length; i++) {
        const preview = previewsData[i];
        setCurrentProcessing(i + 1);

        try {
          const response = await fetch('http://localhost:3001/api/approve-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: preview.sessionId,
              manualCorrections
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis approval failed');
          }

          const result = await response.json();
          anonymizedTexts.push(result.anonymizedText);
          sessionIds.push(preview.sessionId);
          
        } catch (approvalError) {
          console.error(`❌ Błąd approval dla ${preview.filename}:`, approvalError);
        }
      }
      
      // Przekaż zanonimizowane dane do rodzica bez rozpoczynania analizy
      if (onAnonymizedDataReady && anonymizedTexts.length > 0) {
        onAnonymizedDataReady(anonymizedTexts, sessionIds);
      } else {
        onCancel();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas przygotowywania danych');
      setTimeout(() => onCancel(), 2000); // Auto-wróć po błędzie
    } finally {
      setLoading(false);
      setCurrentProcessing(0);
    }
  };

  const handleRemoveFile = async (sessionId: string, filename: string) => {
    try {
      // Usuń sesję z serwera
      await fetch(`http://localhost:3001/api/pdf-session/${sessionId}`, {
        method: 'DELETE'
      });
      
      console.log(`🗑️ Usunięto plik: ${filename} (${sessionId})`);
      
      // Usuń z previewsData
      setPreviewsData(prev => {
        const updated = prev.filter(p => p.sessionId !== sessionId);
        // Jeśli to był ostatni plik, wróć do kroku upload
        if (updated.length === 0) {
          setStep('upload');
        }
        return updated;
      });
      
      // Usuń z uploadResults  
      setUploadResults(prev => prev.filter(r => r.sessionId !== sessionId));
      
    } catch (error) {
      console.warn(`⚠️ Błąd podczas usuwania pliku ${filename}:`, error);
      // Usuń z interfejsu nawet jeśli nie udało się wyczyścić serwera
      setPreviewsData(prev => {
        const updated = prev.filter(p => p.sessionId !== sessionId);
        if (updated.length === 0) {
          setStep('upload');
        }
        return updated;
      });
      setUploadResults(prev => prev.filter(r => r.sessionId !== sessionId));
    }
  };

  const handleReject = async () => {
    // Clean up sessions
    if (previewsData && previewsData.length > 0) {
      try {
        await Promise.all(
          previewsData.map(preview =>
            fetch(`http://localhost:3001/api/pdf-session/${preview.sessionId}`, {
              method: 'DELETE'
            })
          )
        );
      } catch (error) {
        console.warn('Error cleaning up sessions:', error);
      }
    }
    onCancel();
  };

  const handlePasswordSubmit = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Hasło jest wymagane');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const response = await fetch('http://localhost:3001/api/retry-with-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: passwordModal.sessionId,
          password: currentPassword
        })
      });

      if (response.status === 401) { // WRONG_PASSWORD
        const errorData = await response.json();
        setPasswordError(errorData.message || 'Nieprawidłowe hasło');
        setPasswordLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Retry with password failed');
      }

      const preview: AnonymizationPreview = await response.json();
      preview.filename = passwordModal.filename;

      // Dodaj lub zaktualizuj preview w liście
      setPreviewsData(prev => {
        const existingIndex = prev.findIndex(p => p.sessionId === passwordModal.sessionId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = preview;
          return updated;
        } else {
          return [...prev, preview];
        }
      });

      // Zamknij modal
      setPasswordModal({
        isOpen: false,
        sessionId: '',
        filename: '',
        isRetry: false
      });
      setCurrentPassword('');
      setPasswordError(null);

      console.log(`✅ PDF odblokowany hasłem: ${passwordModal.filename}`);

    } catch (error) {
      console.error('❌ Błąd przy retry z hasłem:', error);
      setPasswordError(error instanceof Error ? error.message : 'Błąd przy wprowadzaniu hasła');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordModal({
      isOpen: false,
      sessionId: '',
      filename: '',
      isRetry: false
    });
    setCurrentPassword('');
    setPasswordError(null);
    setPasswordLoading(false);
    
    // Jeśli anulujemy, wyłączamy loading
    setLoading(false);
    setCurrentProcessing(0);
  };

  const renderUploadStep = () => (
    <div className="card-remedy">
      <div className="flex items-center gap-3 mb-6">
        <div className="icon-circle">
          <Upload className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Upload PDF History</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Bezpieczeństwo danych</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• PDF-y są przetwarzane lokalnie na serwerze</li>
                <li>• Dane osobowe są automatycznie wykrywane i anonimizowane</li>
                <li>• Otrzymasz podgląd przed wysłaniem do analizy AI</li>
                <li>• Żadne dane PII nie trafiają do modeli AI</li>
                <li>• <strong>Możesz wrzucić wiele PDF-ów naraz!</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-remedy-accent transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Przeciągnij PDF-y tutaj lub kliknij aby wybrać
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Obsługiwane formaty: PDF (max 10MB każdy) • <strong>Można wybrać wiele plików</strong>
          </p>
          <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Wybierz pliki PDF
            <input
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleMultipleFileUpload(files);
              }}
            />
          </label>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  Przetwarzam plik {currentProcessing} z {uploadResults.length + (step === 'upload' ? 1 : 0)}
                </p>
                <p className="text-sm text-blue-700">
                  Trwa upload i wstępne przetwarzanie PDF-ów...
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!previewsData || previewsData.length === 0) {
      return (
        <div className="card-remedy">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-remedy-accent" />
            <span className="ml-3 text-lg">Przetwarzanie PDF-ów i wykrywanie danych osobowych...</span>
          </div>
          {loading && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    Analizuję plik {currentProcessing} z {previewsData.length || uploadResults.length}
                  </p>
                  <p className="text-sm text-blue-700">
                    Trwa ekstrakcja tekstu i wykrywanie danych osobowych...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Agreguj statystyki ze wszystkich plików
    const totalDetections = previewsData.reduce((sum, preview) => sum + (preview.detections?.length || 0), 0);
    const avgConfidence = previewsData.reduce((sum, preview) => sum + (preview.overallConfidence || 0), 0) / previewsData.length;
    const totalReplacements = previewsData.reduce((sum, preview) => sum + (preview.anonymizationStats?.totalReplacements || 0), 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="card-remedy">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="icon-circle">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Podgląd Anonimizacji ({previewsData.length} plików)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={`btn-secondary flex items-center gap-2 ${showOriginal ? 'bg-yellow-50 border-yellow-200' : ''}`}
              >
                {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showOriginal ? 'Ukryj oryginał' : 'Pokaż oryginał'}
              </button>
            </div>
          </div>

          {/* Aggregate Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Pliki PDF</div>
              <div className="text-2xl font-bold text-blue-900">{previewsData.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Łącznie PII</div>
              <div className="text-2xl font-bold text-green-900">{totalDetections}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Średnia pewność</div>
              <div className="text-2xl font-bold text-purple-900">{Math.round(avgConfidence * 100)}%</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Zamienione</div>
              <div className="text-2xl font-bold text-orange-900">{totalReplacements}</div>
            </div>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    Zatwierdzam plik {currentProcessing} z {previewsData.length}
                  </p>
                  <p className="text-sm text-blue-700">
                    Trwa finalizacja anonimizacji...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Individual File Cards */}
        {previewsData.map((previewData, index) => {
          const anonymizationStats = previewData.anonymizationStats || {
            totalReplacements: 0,
            byType: {},
            uniqueEntities: {}
          };

          const summaryByType = previewData.summary?.byType || {};

          return (
            <div key={previewData.sessionId} className="card-remedy relative">
              {/* Przycisk usuwania pliku */}
              <button
                onClick={() => handleRemoveFile(previewData.sessionId, previewData.filename)}
                className="absolute top-4 right-4 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-full flex items-center justify-center transition-colors duration-200 z-10"
                title={`Usuń plik: ${previewData.filename}`}
              >
                <XCircle className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Plik {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  📄 {previewData.filename}
                </h3>
              </div>

              {/* Individual File Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Wykryte PII</div>
                  <div className="text-xl font-bold text-gray-900">{previewData.detections?.length || 0}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Pewność</div>
                  <div className="text-xl font-bold text-gray-900">{Math.round((previewData.overallConfidence || 0) * 100)}%</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Metoda</div>
                  <div className="text-sm font-bold text-gray-900">{previewData.extractionMethod || 'nieznana'}</div>
                </div>
              </div>

              {/* Extraction Method Warning */}
              {(previewData.extractionMethod === 'emergency_fallback' || previewData.extractionMethod === 'error_fallback') && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-2">Problem z odczytem PDF</h4>
                      <p className="text-amber-800 text-sm mb-3">
                        Nie udało się automatycznie wyodrębnić tekstu z pliku <strong>{previewData.filename}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detection Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">Wykryte typy danych:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summaryByType).map(([type, count]) => (
                    <span key={type} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm">
                      {getIconForPIIType(type)}
                      <span className="font-medium">{type}</span>
                      <span className="text-gray-500">({count})</span>
                    </span>
                  ))}
                  {Object.keys(summaryByType).length === 0 && (
                    <span className="text-gray-500 text-sm">Brak wykrytych danych osobowych</span>
                  )}
                </div>
              </div>

              {/* Text Preview - Show for all files */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Text (if shown) */}
                {showOriginal && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Tekst oryginalny
                    </h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap text-gray-800">
                        {previewData.originalText || 'Brak tekstu'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Anonymized Text */}
                <div className={showOriginal ? '' : 'lg:col-span-2'}>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Tekst zanonimizowany
                  </h4>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap text-gray-800">
                      {previewData.anonymizedText || 'Brak tekstu'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Detection Details */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Wykryte dane osobowe:</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {(previewData.detections || []).map((detection, detIndex) => (
                    <div key={detIndex} className={`p-2 rounded-lg border ${getConfidenceColor(detection.confidence)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getIconForPIIType(detection.type)}
                          <span className="font-medium text-sm">{detection.type}</span>
                          <span className="text-xs bg-white px-2 py-1 rounded border">
                            "{detection.text}" → "{detection.replacement}"
                          </span>
                        </div>
                        <span className="text-xs font-medium">
                          {Math.round((detection.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!previewData.detections || previewData.detections.length === 0) && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <p>Nie wykryto danych osobowych w tym pliku</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="btn-secondary flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Odrzuć wszystkie
            </button>
            
            {/* Przycisk do dodania kolejnych PDF-ów */}
            <div>
              <label className="btn-secondary cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Wrzuć kolejny PDF
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleMultipleFileUpload(files);
                  }}
                />
              </label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleFinishAndAnalyze}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {loading ? 'Zatwierdzam...' : `Zatwierdź ${previewsData.length} plików i rozpocznij analizę`}
            </button>
            
            <button
              onClick={handlePrepareDataAndReturn}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {loading ? 'Przygotowuję...' : `Zakończ i wybierz model AI`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-theme-light py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-remedy-light via-white to-remedy-secondary/10 rounded-xl p-4 shadow-lg border border-remedy-border/30">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-remedy-primary via-remedy-accent to-remedy-secondary bg-clip-text text-transparent mb-2">
                Bezpieczna Anonimizacja PDF
              </h1>
              <p className="text-lg text-slate-700 font-medium">
                Upload i automatyczna anonimizacja dokumentów medycznych
              </p>
            </div>
          </div>
        </header>

        {loading && step === 'upload' && (
          <div className="card-remedy mb-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-remedy-accent" />
              <span className="ml-3 text-lg">Przetwarzanie pliku PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-900">Błąd</h3>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {step === 'upload' && renderUploadStep()}
        {step === 'preview' && renderPreviewStep()}
      </div>

      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">PDF zabezpieczony hasłem</h3>
                  <p className="text-sm text-gray-600">Plik: {passwordModal.filename}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-4">
                  Ten plik PDF jest zabezpieczony hasłem. Wprowadź hasło aby odblokować i przetworzyć dokument.
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasło PDF
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Wprowadź hasło..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-remedy-accent focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !passwordLoading) {
                      handlePasswordSubmit();
                    }
                  }}
                  autoFocus
                />
                
                {passwordError && (
                  <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handlePasswordCancel}
                  disabled={passwordLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anuluj
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={passwordLoading || !currentPassword.trim()}
                  className="px-4 py-2 bg-remedy-accent text-white rounded-md hover:bg-remedy-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sprawdzam...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Odblokuj PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 