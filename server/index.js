import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from current directory (server/.env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
  methods: ['GET', 'POST'],
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

    // Dynamiczny import serwisu
    const { default: drugMappingService } = await import('../src/services/drugMappingService.js');
    const result = await drugMappingService.mapDrugToStandard(drugName);
    
    console.log(`✅ [Backend] Drug mapping completed for: ${drugName}, found: ${result.found}`);
    res.json(result);
    
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [Backend] Server running on http://localhost:${PORT}`);
  console.log(`🔗 [Backend] CORS enabled for frontend ports`);
  console.log(`🤖 [Backend] AI API proxy ready`);
}); 