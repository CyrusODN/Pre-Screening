import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// PDF Anonymization imports
import upload, { cleanupTempFiles } from './middleware/fileUpload.js';
import PopplerPdfProcessor from './services/popplerPdfProcessor.js';
import PIIDetector from './services/piiDetector.js';
import Anonymizer from './services/anonymizer.js';

// Load environment variables from current directory (server/.env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize PDF processing services
const pdfProcessor = new PopplerPdfProcessor();
const piiDetector = new PIIDetector();
const anonymizer = new Anonymizer();

// In-memory storage for anonymization sessions
const anonymizationSessions = new Map();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Check API keys on startup
const checkApiKeys = () => {
  const keys = {
    'OpenAI (o3)': process.env.OPENAI_API_KEY,
    'Anthropic (Claude)': process.env.ANTHROPIC_API_KEY,
    'Google (Gemini)': process.env.GOOGLE_API_KEY
  };
  
  console.log('🔑 [Backend] Checking API keys...');
  Object.entries(keys).forEach(([name, key]) => {
    if (key) {
      console.log(`✅ [Backend] ${name}: Configured`);
    } else {
      console.log(`❌ [Backend] ${name}: Missing`);
    }
  });
};

checkApiKeys();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============ PDF ANONYMIZATION ENDPOINTS ============

// Step 1: Upload PDF and get basic info
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    console.log('📄 [Backend] PDF upload request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    const sessionId = uuidv4();
    
    // Get basic PDF info
    const pdfInfo = await pdfProcessor.getPDFInfo(filePath);
    
    if (!pdfInfo) {
      // Cleanup failed file
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    // Store session info
    anonymizationSessions.set(sessionId, {
      sessionId,
      filePath,
      originalFilename: req.file.originalname,
      pdfInfo,
      extractedText: null,
      piiDetection: null,
      anonymizedText: null,
      approved: false,
      createdAt: new Date()
    });

    console.log(`✅ [Backend] PDF uploaded successfully: ${sessionId}`);
    
    res.json({
      sessionId,
      filename: req.file.originalname,
      fileSize: pdfInfo.fileSize,
      pages: pdfInfo.pages,
      hasText: pdfInfo.hasText
    });

  } catch (error) {
    console.error('❌ [Backend] PDF upload error:', error);
    
    // Cleanup file if exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'PDF upload failed', 
      details: error.message 
    });
  }
});

// Step 2: Extract text and detect PII for preview
app.post('/api/anonymize-preview', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log(`🔍 [Backend] Anonymization preview request: ${sessionId}`);
    
    if (!sessionId || !anonymizationSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = anonymizationSessions.get(sessionId);
    
    // Extract text from PDF if not already done
    if (!session.extractedText) {
      console.log('📄 [Backend] Extracting text from PDF...');
      const textResult = await pdfProcessor.extractTextFromPDF(session.filePath);
      
      // Sprawdzamy czy PDF wymaga hasła
      if (textResult.error === 'PASSWORD_REQUIRED') {
        console.log(`🔒 [Backend] PDF requires password: ${sessionId}`);
        return res.status(423).json({ // 423 Locked
          error: 'PASSWORD_REQUIRED',
          message: textResult.message || 'Ten PDF jest zabezpieczony hasłem',
          sessionId,
          filename: session.originalFilename
        });
      }
      
      // Sprawdzamy czy hasło było nieprawidłowe
      if (textResult.error === 'WRONG_PASSWORD') {
        console.log(`❌ [Backend] Wrong password provided: ${sessionId}`);
        return res.status(401).json({ // 401 Unauthorized
          error: 'WRONG_PASSWORD',
          message: textResult.message || 'Podane hasło jest nieprawidłowe',
          sessionId,
          filename: session.originalFilename
        });
      }
      
      session.extractedText = textResult.text;
      session.extractionMethod = textResult.method;
      session.extractionConfidence = textResult.confidence;
    }

    // Detect PII if not already done
    if (!session.piiDetection) {
      console.log('🔍 [Backend] Detecting PII...');
      session.piiDetection = piiDetector.detectPII(session.extractedText);
    }

    // Generate anonymized text
    session.anonymizedText = anonymizer.anonymize(
      session.extractedText, 
      session.piiDetection.detections
    );

    // Get anonymization stats
    const anonymizationStats = anonymizer.getStats();

    console.log(`✅ [Backend] Anonymization preview ready: ${session.piiDetection.detections.length} PII entities found`);
    
    res.json({
      sessionId,
      originalText: session.extractedText,
      anonymizedText: session.anonymizedText,
      detections: session.piiDetection.detections,
      overallConfidence: session.piiDetection.overallConfidence,
      summary: session.piiDetection.summary,
      extractionMethod: session.extractionMethod,
      extractionConfidence: session.extractionConfidence,
      anonymizationStats: anonymizationStats
    });

  } catch (error) {
    console.error('❌ [Backend] Anonymization preview error:', error);
    res.status(500).json({ 
      error: 'Anonymization preview failed', 
      details: error.message 
    });
  }
});

// New endpoint: Retry PDF extraction with password
app.post('/api/retry-with-password', async (req, res) => {
  try {
    const { sessionId, password } = req.body;
    console.log(`🔐 [Backend] Password retry request: ${sessionId}`);
    
    if (!sessionId || !anonymizationSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const session = anonymizationSessions.get(sessionId);
    
    // Clear previous failed extraction attempts
    session.extractedText = null;
    session.extractionMethod = null;
    session.extractionConfidence = null;
    session.piiDetection = null;
    session.anonymizedText = null;
    
    console.log('📄 [Backend] Retrying text extraction with password...');
    const textResult = await pdfProcessor.extractTextFromPDF(session.filePath, password);
    
    // Sprawdzamy czy hasło było nieprawidłowe
    if (textResult.error === 'WRONG_PASSWORD') {
      console.log(`❌ [Backend] Wrong password provided for retry: ${sessionId}`);
      return res.status(401).json({
        error: 'WRONG_PASSWORD',
        message: textResult.message || 'Podane hasło jest nieprawidłowe',
        sessionId,
        filename: session.originalFilename
      });
    }
    
    // Sprawdzamy czy nadal wymaga hasła (nie powinno się zdarzyć)
    if (textResult.error === 'PASSWORD_REQUIRED') {
      console.log(`🔒 [Backend] Still requires password after retry: ${sessionId}`);
      return res.status(423).json({
        error: 'PASSWORD_REQUIRED',
        message: 'PDF nadal wymaga hasła',
        sessionId,
        filename: session.originalFilename
      });
    }
    
    // Sukces - zapisujemy wyniki
    session.extractedText = textResult.text;
    session.extractionMethod = textResult.method;
    session.extractionConfidence = textResult.confidence;
    session.passwordUsed = true; // Oznaczamy że użyto hasła
    
    // Detect PII
    console.log('🔍 [Backend] Detecting PII...');
    session.piiDetection = piiDetector.detectPII(session.extractedText);

    // Generate anonymized text
    session.anonymizedText = anonymizer.anonymize(
      session.extractedText, 
      session.piiDetection.detections
    );

    // Get anonymization stats
    const anonymizationStats = anonymizer.getStats();

    console.log(`✅ [Backend] Password retry successful: ${session.piiDetection.detections.length} PII entities found`);
    
    res.json({
      sessionId,
      originalText: session.extractedText,
      anonymizedText: session.anonymizedText,
      detections: session.piiDetection.detections,
      overallConfidence: session.piiDetection.overallConfidence,
      summary: session.piiDetection.summary,
      extractionMethod: session.extractionMethod,
      extractionConfidence: session.extractionConfidence,
      anonymizationStats: anonymizationStats,
      passwordSuccess: true
    });

  } catch (error) {
    console.error('❌ [Backend] Password retry error:', error);
    res.status(500).json({ 
      error: 'Password retry failed', 
      details: error.message 
    });
  }
});

// Step 3: Approve and get final anonymized text for analysis
app.post('/api/approve-analysis', async (req, res) => {
  try {
    const { sessionId, manualCorrections } = req.body;
    console.log(`✅ [Backend] Analysis approval request: ${sessionId}`);
    
    if (!sessionId || !anonymizationSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = anonymizationSessions.get(sessionId);
    
    // Apply manual corrections if provided
    let finalAnonymizedText = session.anonymizedText;
    if (manualCorrections && manualCorrections.length > 0) {
      console.log(`🔧 [Backend] Applying ${manualCorrections.length} manual corrections`);
      finalAnonymizedText = anonymizer.applyManualCorrections(finalAnonymizedText, manualCorrections);
    }

    // Mark session as approved
    session.approved = true;
    session.finalAnonymizedText = finalAnonymizedText;
    session.approvedAt = new Date();

    console.log(`✅ [Backend] Analysis approved and ready for LLM: ${sessionId}`);
    
    res.json({
      sessionId,
      anonymizedText: finalAnonymizedText,
      ready: true,
      message: 'PDF successfully anonymized and ready for analysis'
    });

  } catch (error) {
    console.error('❌ [Backend] Analysis approval error:', error);
    res.status(500).json({ 
      error: 'Analysis approval failed', 
      details: error.message 
    });
  }
});

// Helper endpoint: Get session status
app.get('/api/pdf-session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!anonymizationSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = anonymizationSessions.get(sessionId);
    
    res.json({
      sessionId,
      originalFilename: session.originalFilename,
      hasExtractedText: !!session.extractedText,
      hasPIIDetection: !!session.piiDetection,
      hasAnonymizedText: !!session.anonymizedText,
      approved: session.approved,
      createdAt: session.createdAt,
      approvedAt: session.approvedAt
    });

  } catch (error) {
    console.error('❌ [Backend] Session status error:', error);
    res.status(500).json({ 
      error: 'Failed to get session status', 
      details: error.message 
    });
  }
});

// Helper endpoint: Cleanup session
app.delete('/api/pdf-session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🗑️ [Backend] Session cleanup request: ${sessionId}`);
    
    if (!anonymizationSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = anonymizationSessions.get(sessionId);
    
    // Delete file
    try {
      if (fs.existsSync(session.filePath)) {
        fs.unlinkSync(session.filePath);
        console.log(`🗑️ [Backend] File deleted: ${session.filePath}`);
      }
    } catch (fileError) {
      console.warn('⚠️ [Backend] Could not delete file:', fileError);
    }

    // Remove session
    anonymizationSessions.delete(sessionId);
    
    console.log(`✅ [Backend] Session cleaned up: ${sessionId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ [Backend] Session cleanup error:', error);
    res.status(500).json({ 
      error: 'Session cleanup failed', 
      details: error.message 
    });
  }
});

// ============ END PDF ANONYMIZATION ENDPOINTS ============

// AI API proxy endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { model, messages, temperature, maxTokens, systemPrompt, userPrompt } = req.body;
    
    console.log(`🤖 [Backend] Processing AI request for model: ${model}`);
    
    let apiResponse;
    
    if (model === 'o3') {
      // OpenAI API call
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
      }
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'o3-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_completion_tokens: maxTokens
          // Note: o3 uses max_completion_tokens instead of max_tokens
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API Error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await openaiResponse.json();
      apiResponse = data.choices[0]?.message?.content || '';
      
    } else if (model === 'gemini') {
      // Google Gemini API call
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Google API key is not configured. Please set GOOGLE_API_KEY in your .env file.');
      }
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        throw new Error(`Gemini API Error: ${geminiResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await geminiResponse.json();
      apiResponse = data.candidates[0]?.content?.parts[0]?.text || '';
      
    } else if (model === 'claude-opus') {
      // Anthropic Claude API call
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your .env file.');
      }
      
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-20250514',
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!claudeResponse.ok) {
        const errorData = await claudeResponse.json();
        throw new Error(`Claude API Error: ${claudeResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await claudeResponse.json();
      apiResponse = data.content[0]?.text || '';
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    console.log(`✅ [Backend] AI request completed for model: ${model}`);
    res.json({ content: apiResponse });
    
  } catch (error) {
    console.error('💥 [Backend] AI API Error:', error);
    res.status(500).json({ 
      error: 'AI API Error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint do mapowania leków
app.post('/api/drug-mapping/search', async (req, res) => {
  try {
    console.log('🔍 [Backend] Drug mapping search request:', req.body.drugName);
    
    const { drugName } = req.body;
    
    if (!drugName) {
      return res.status(400).json({ error: 'Drug name is required' });
    }

    // TEMPORARY: Return mock response to prevent errors
    // The drug mapping service requires TypeScript compilation which is not available in this Node.js server
    console.log(`⚠️ [Backend] Drug mapping temporarily disabled. Returning mock response for: ${drugName}`);
    
    const mockResult = {
      found: false,
      standardName: drugName,
      activeSubstance: drugName,
      atcCode: '',
      alternatives: [],
      confidence: 0.1,
      details: []
    };
    
    res.json(mockResult);
    
  } catch (error) {
    console.error('💥 [Backend] Drug mapping error:', error);
    res.status(500).json({ 
      error: 'Drug mapping failed', 
      details: error.message 
    });
  }
});

// Endpoint do wyszukiwania leków
app.post('/api/drug-mapping/detailed-search', async (req, res) => {
  try {
    console.log('🔍 [Backend] Detailed drug search request:', req.body.searchTerm);
    
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // Dynamiczny import serwisu
    const { default: drugMappingService } = await import('../src/services/drugMappingService.js');
    const result = await drugMappingService.searchDrugs(searchTerm);
    
    console.log(`✅ [Backend] Detailed search completed for: ${searchTerm}, matches: ${result.exactMatches.length + result.partialMatches.length + result.substanceMatches.length}`);
    res.json(result);
    
  } catch (error) {
    console.error('💥 [Backend] Detailed drug search error:', error);
    res.status(500).json({ 
      error: 'Drug search failed', 
      details: error.message 
    });
  }
});

// Endpoint do pobierania statystyk bazy danych leków
app.get('/api/drug-mapping/stats', async (req, res) => {
  try {
    console.log('📊 [Backend] Drug database stats request');
    
    // Dynamiczny import serwisu
    const { default: drugMappingService } = await import('../src/services/drugMappingService.js');
    const stats = await drugMappingService.getDatabaseStats();
    
    console.log(`✅ [Backend] Stats retrieved: ${stats.totalDrugs} drugs, ${stats.uniqueSubstances} substances`);
    res.json(stats);
    
  } catch (error) {
    console.error('💥 [Backend] Drug stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get drug database stats', 
      details: error.message 
    });
  }
});

// Endpoint do pobierania leków przeciwdepresyjnych
app.get('/api/drug-mapping/antidepressants', async (req, res) => {
  try {
    console.log('💊 [Backend] Antidepressants request');
    
    // Dynamiczny import serwisu
    const { default: drugMappingService } = await import('../src/services/drugMappingService.js');
    const antidepressants = await drugMappingService.getAntidepressants();
    
    console.log(`✅ [Backend] Found ${antidepressants.length} antidepressants`);
    res.json(antidepressants);
    
  } catch (error) {
    console.error('💥 [Backend] Antidepressants error:', error);
    res.status(500).json({ 
      error: 'Failed to get antidepressants', 
      details: error.message 
    });
  }
});

// Endpoint do sprawdzania czy lek jest przeciwdepresyjny
app.post('/api/drug-mapping/is-antidepressant', async (req, res) => {
  try {
    console.log('🔍 [Backend] Is antidepressant check:', req.body.drugName);
    
    const { drugName } = req.body;
    
    if (!drugName) {
      return res.status(400).json({ error: 'Drug name is required' });
    }

    // Dynamiczny import serwisu
    const { default: drugMappingService } = await import('../src/services/drugMappingService.js');
    const isAntidepressant = await drugMappingService.isAntidepressant(drugName);
    
    console.log(`✅ [Backend] Antidepressant check completed for: ${drugName}, result: ${isAntidepressant}`);
    res.json({ drugName, isAntidepressant });
    
  } catch (error) {
    console.error('💥 [Backend] Antidepressant check error:', error);
    res.status(500).json({ 
      error: 'Antidepressant check failed', 
      details: error.message 
    });
  }
});

// ============================================================================
// ENDPOINTY DO ZAPISYWANIA ANALIZ
// ============================================================================

// Endpoint do zapisywania analizy
app.post('/api/analysis/save', async (req, res) => {
  try {
    console.log('💾 [Backend] Save analysis request');
    
    const analysisData = req.body;
    
    if (!analysisData) {
      return res.status(400).json({ error: 'Analysis data is required' });
    }

    // Dynamiczny import LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });
    
    const analysisId = await storage.save(analysisData);
    
    console.log(`✅ [Backend] Analysis saved with ID: ${analysisId}`);
    res.json({ id: analysisId, success: true });
    
  } catch (error) {
    console.error('💥 [Backend] Save analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to save analysis', 
      details: error.message 
    });
  }
});

// Endpoint do wczytywania analizy
app.get('/api/analysis/load/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📖 [Backend] Load analysis request: ${id}`);
    
    // Dynamiczny import LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false
    });
    
    const analysis = await storage.load(id);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    console.log(`✅ [Backend] Analysis loaded: ${id}`);
    res.json(analysis);
    
  } catch (error) {
    console.error('💥 [Backend] Load analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to load analysis', 
      details: error.message 
    });
  }
});

// Endpoint do listowania analiz
app.get('/api/analysis/list', async (req, res) => {
  try {
    console.log('📋 [Backend] List analyses request');
    
    // Dynamiczny import LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false
    });
    
    const options = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };
    
    const analysesList = await storage.list(options);
    
    console.log(`✅ [Backend] Listed ${analysesList.analyses.length} analyses`);
    res.json(analysesList);
    
  } catch (error) {
    console.error('💥 [Backend] List analyses error:', error);
    res.status(500).json({ 
      error: 'Failed to list analyses', 
      details: error.message 
    });
  }
});

// Endpoint do usuwania analizy
app.delete('/api/analysis/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [Backend] Delete analysis request: ${id}`);
    
    // Dynamiczny import LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false
    });
    
    const deleted = await storage.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    console.log(`✅ [Backend] Analysis deleted: ${id}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('💥 [Backend] Delete analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to delete analysis', 
      details: error.message 
    });
  }
});

// Endpoint do statystyk analiz
app.get('/api/analysis/stats', async (req, res) => {
  try {
    console.log('📊 [Backend] Analysis stats request');
    
    // Dynamiczny import LocalAnalysisStorage
    const { LocalAnalysisStorage } = await import('./storage/LocalAnalysisStorage.js');
    const storage = new LocalAnalysisStorage({
      basePath: '../History',
      compression: false
    });
    
    const stats = await storage.getStats();
    
    console.log(`✅ [Backend] Stats retrieved: ${stats.total} total analyses`);
    res.json(stats);
    
  } catch (error) {
    console.error('💥 [Backend] Analysis stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get analysis stats', 
      details: error.message 
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS FOR PDF ANONYMIZATION
// ============================================================================

/**
 * Schedule cleanup of old anonymization sessions
 */
function cleanupOldSessions() {
  const now = new Date();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  for (const [sessionId, session] of anonymizationSessions.entries()) {
    const sessionAge = now.getTime() - session.createdAt.getTime();
    
    if (sessionAge > maxAge) {
      console.log(`🧹 [Backend] Cleaning up old session: ${sessionId}`);
      
      // Delete file
      try {
        if (fs.existsSync(session.filePath)) {
          fs.unlinkSync(session.filePath);
        }
      } catch (error) {
        console.warn(`⚠️ [Backend] Could not delete file for session ${sessionId}:`, error);
      }
      
      // Remove from memory
      anonymizationSessions.delete(sessionId);
    }
  }
}

// Schedule session cleanup every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);

// ============================================================================
// SERVER START
// ============================================================================

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [Backend] Server running on http://localhost:${PORT}`);
  console.log(`🔗 [Backend] CORS enabled for frontend ports`);
  console.log(`🤖 [Backend] AI API proxy ready`);
  console.log(`📄 [Backend] PDF anonymization system ready`);
  console.log(`🛡️ [Backend] PII detection enabled for Polish documents`);
}); 