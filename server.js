import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import our modules
import { AudioProcessor } from './modules/audioProcessor.js';
import { SOAPGenerator } from './modules/soapGenerator.js';
import { PDFGenerator } from './modules/pdfGenerator.js';
import { OCRProcessor } from './modules/ocrProcessor.js';
import { DataStore } from './modules/dataStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Audio files for audio upload
    if (req.path === '/api/audio-upload') {
      const allowedAudio = ['.wav', '.mp3', '.m4a', '.mp4', '.aac', '.flac'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedAudio.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file format. Allowed: .wav, .mp3, .m4a, .mp4, .aac, .flac'));
      }
    }
    // Image files for OCR upload
    else if (req.path === '/api/ocr-upload') {
      const allowedImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.pdf'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedImages.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image file format. Allowed: .jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp, .pdf'));
      }
    } else {
      cb(new Error('Invalid upload endpoint'));
    }
  }
});

// Initialize modules
const audioProcessor = new AudioProcessor();
const soapGenerator = new SOAPGenerator();
const pdfGenerator = new PDFGenerator();
const ocrProcessor = new OCRProcessor();
const dataStore = new DataStore();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 🔹 Step 1: POST /api/audio-upload
app.post('/api/audio-upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please upload an audio file (.wav, .mp3, .m4a, etc.)'
      });
    }

    console.log(`📤 Audio upload received: ${req.file.originalname}`);
    
    // Process audio to text
    const result = await audioProcessor.transcribeAudio(req.file.path);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Audio transcription failed',
        message: result.error
      });
    }

    // Generate session ID for tracking
    const sessionId = uuidv4();
    
    // Store transcript
    await dataStore.store(sessionId, 'transcript_raw', result.transcript);
    await dataStore.store(sessionId, 'audio_file', req.file.path);
    
    console.log(`✅ Audio transcribed successfully for session: ${sessionId}`);
    
    res.json({
      success: true,
      session_id: sessionId,
      transcript_raw: result.transcript,
      confidence: result.confidence,
      duration: result.duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Audio upload error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 2: POST /api/transcript/confirm
app.post('/api/transcript/confirm', async (req, res) => {
  try {
    const { session_id, transcript_clean } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }

    if (!transcript_clean || typeof transcript_clean !== 'string') {
      return res.status(400).json({
        error: 'Invalid transcript_clean',
        message: 'transcript_clean must be a non-empty string'
      });
    }

    // Store cleaned transcript
    await dataStore.store(session_id, 'transcript_clean', transcript_clean);
    
    console.log(`✅ Transcript confirmed for session: ${session_id}`);
    
    res.json({
      success: true,
      session_id: session_id,
      message: 'Transcript confirmed and saved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Transcript confirm error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 3: POST /api/soap/generate
app.post('/api/soap/generate', async (req, res) => {
  try {
    const { session_id, transcript_clean, template_type } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }

    if (!transcript_clean || typeof transcript_clean !== 'string') {
      return res.status(400).json({
        error: 'Invalid transcript_clean',
        message: 'transcript_clean must be a non-empty string'
      });
    }

    if (!template_type || typeof template_type !== 'string') {
      return res.status(400).json({
        error: 'Invalid template_type',
        message: 'template_type must be specified (e.g., "Cardiology SOAP")'
      });
    }

    console.log(`🔄 Generating SOAP for session: ${session_id}, template: ${template_type}`);

    // Generate SOAP note using AI
    const result = await soapGenerator.generateSOAP(transcript_clean, template_type);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'SOAP generation failed',
        message: result.error
      });
    }

    // Store SOAP data
    await dataStore.store(session_id, 'soap_data', result.soapData);
    await dataStore.store(session_id, 'template_type', template_type);
    
    console.log(`✅ SOAP generated successfully for session: ${session_id}`);
    
    res.json({
      success: true,
      session_id: session_id,
      template_type: template_type,
      soap: result.soapData.SOAP_Note,
      prescription: result.soapData.prescription,
      follow_up: result.soapData.followUp,
      next_steps: result.soapData.nextSteps,
      summary: result.soapData.summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SOAP generation error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 4: GET /api/pdf/download
app.get('/api/pdf/download', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing session_id',
        message: 'session_id query parameter is required'
      });
    }

    // Retrieve SOAP data
    const soapData = await dataStore.get(session_id, 'soap_data');
    const templateType = await dataStore.get(session_id, 'template_type');
    
    if (!soapData) {
      return res.status(404).json({
        error: 'SOAP data not found',
        message: 'No SOAP data found for this session. Generate SOAP first.'
      });
    }

    console.log(`📄 Generating PDF for session: ${session_id}`);

    // Generate PDF
    const result = await pdfGenerator.generatePDF(soapData, templateType, session_id);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'PDF generation failed',
        message: result.error
      });
    }

    // Store PDF path
    await dataStore.store(session_id, 'pdf_path', result.pdfPath);
    
    console.log(`✅ PDF generated successfully for session: ${session_id}`);
    
    res.json({
      success: true,
      session_id: session_id,
      pdf_path: result.pdfPath,
      pdf_url: `/api/pdf/file/${session_id}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ PDF download error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PDF file serving endpoint
app.get('/api/pdf/file/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const pdfPath = await dataStore.get(session_id, 'pdf_path');
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return res.status(404).json({
        error: 'PDF file not found',
        message: 'PDF file does not exist for this session'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="clinical-summary-${session_id}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ PDF file serving error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 5: POST /api/ocr-upload
app.post('/api/ocr-upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        message: 'Please upload an image file (.jpg, .png, .pdf, etc.)'
      });
    }

    console.log(`📤 OCR upload received: ${req.file.originalname}`);
    
    // Process image with OCR
    const result = await ocrProcessor.extractText(req.file.path);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'OCR processing failed',
        message: result.error
      });
    }

    // Generate session ID for OCR tracking
    const ocrSessionId = uuidv4();
    
    // Store OCR data
    await dataStore.store(ocrSessionId, 'ocr_raw', result.text);
    await dataStore.store(ocrSessionId, 'image_file', req.file.path);
    await dataStore.store(ocrSessionId, 'ocr_confidence', result.confidence);
    
    console.log(`✅ OCR processed successfully for session: ${ocrSessionId}`);
    
    res.json({
      success: true,
      ocr_session_id: ocrSessionId,
      ocr_raw: result.text,
      confidence: result.confidence,
      character_count: result.text.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OCR upload error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 6: POST /api/ocr/confirm
app.post('/api/ocr/confirm', async (req, res) => {
  try {
    const { ocr_session_id, ocr_clean } = req.body;

    if (!ocr_session_id) {
      return res.status(400).json({
        error: 'Missing ocr_session_id',
        message: 'ocr_session_id is required'
      });
    }

    if (!ocr_clean || typeof ocr_clean !== 'string') {
      return res.status(400).json({
        error: 'Invalid ocr_clean',
        message: 'ocr_clean must be a non-empty string'
      });
    }

    // Store cleaned OCR text
    await dataStore.store(ocr_session_id, 'ocr_clean', ocr_clean);
    
    console.log(`✅ OCR text confirmed for session: ${ocr_session_id}`);
    
    res.json({
      success: true,
      ocr_session_id: ocr_session_id,
      message: 'OCR text confirmed and saved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OCR confirm error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 🔹 Step 7: GET /api/final-response
app.get('/api/final-response', async (req, res) => {
  try {
    const { session_id, ocr_session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing session_id',
        message: 'session_id query parameter is required'
      });
    }

    console.log(`📋 Generating final response for session: ${session_id}`);

    // Retrieve all data
    const transcriptClean = await dataStore.get(session_id, 'transcript_clean');
    const soapData = await dataStore.get(session_id, 'soap_data');
    const pdfPath = await dataStore.get(session_id, 'pdf_path');
    const templateType = await dataStore.get(session_id, 'template_type');

    // OCR data (optional)
    let ocrText = null;
    if (ocr_session_id) {
      ocrText = await dataStore.get(ocr_session_id, 'ocr_clean') || 
                await dataStore.get(ocr_session_id, 'ocr_raw');
    }

    if (!transcriptClean || !soapData) {
      return res.status(404).json({
        error: 'Incomplete data',
        message: 'Missing transcript or SOAP data. Complete the workflow first.'
      });
    }

    const finalResponse = {
      success: true,
      session_id: session_id,
      transcript: transcriptClean,
      soap: soapData.SOAP_Note,
      prescription: soapData.prescription,
      follow_up: soapData.followUp,
      next_steps: soapData.nextSteps,
      summary: soapData.summary,
      template_type: templateType,
      ocr_text: ocrText,
      pdf_path: pdfPath,
      pdf_url: pdfPath ? `/api/pdf/file/${session_id}` : null,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Final response generated for session: ${session_id}`);
    
    res.json(finalResponse);

  } catch (error) {
    console.error('❌ Final response error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get available SOAP templates
app.get('/api/templates', (req, res) => {
  try {
    const templates = soapGenerator.getAvailableTemplates();
    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Session status endpoint
app.get('/api/session/:session_id/status', async (req, res) => {
  try {
    const { session_id } = req.params;
    const status = await dataStore.getSessionStatus(session_id);
    
    res.json({
      success: true,
      session_id: session_id,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size exceeds 50MB limit'
      });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Clinical Automation API Server Started');
  console.log('═'.repeat(60));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Available endpoints:`);
  console.log(`   POST /api/audio-upload`);
  console.log(`   POST /api/transcript/confirm`);
  console.log(`   POST /api/soap/generate`);
  console.log(`   GET  /api/pdf/download`);
  console.log(`   POST /api/ocr-upload`);
  console.log(`   POST /api/ocr/confirm`);
  console.log(`   GET  /api/final-response`);
  console.log(`   GET  /api/templates`);
  console.log('═'.repeat(60));
});

export default app;