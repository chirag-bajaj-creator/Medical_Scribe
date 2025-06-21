import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3000/api';

/**
 * Test the complete API workflow
 */
async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Clinical Automation API Workflow');
  console.log('═'.repeat(80));

  try {
    // Step 1: Test health check
    console.log('\n🔍 Step 1: Health Check');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Step 2: Test audio upload (if audio file exists)
    console.log('\n🎤 Step 2: Audio Upload');
    const audioFiles = ['Recording22.m4a', 'Recording16.m4a'];
    let audioFile = null;
    
    for (const file of audioFiles) {
      if (fs.existsSync(path.join(__dirname, file))) {
        audioFile = file;
        break;
      }
    }

    if (!audioFile) {
      console.log('⚠️ No audio file found, skipping audio workflow');
      return;
    }

    const formData = new FormData();
    const audioBuffer = fs.readFileSync(path.join(__dirname, audioFile));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
    formData.append('audio', audioBlob, audioFile);

    const audioResponse = await fetch(`${API_BASE}/audio-upload`, {
      method: 'POST',
      body: formData
    });

    if (!audioResponse.ok) {
      throw new Error(`Audio upload failed: ${audioResponse.statusText}`);
    }

    const audioData = await audioResponse.json();
    console.log('✅ Audio uploaded, session:', audioData.session_id);
    console.log('📝 Transcript preview:', audioData.transcript_raw.substring(0, 100) + '...');

    const sessionId = audioData.session_id;

    // Step 3: Confirm transcript
    console.log('\n📝 Step 3: Confirm Transcript');
    const transcriptResponse = await fetch(`${API_BASE}/transcript/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        transcript_clean: audioData.transcript_raw // Using original for test
      })
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcript confirm failed: ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    console.log('✅ Transcript confirmed');

    // Step 4: Generate SOAP
    console.log('\n🩺 Step 4: Generate SOAP');
    const soapResponse = await fetch(`${API_BASE}/soap/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        transcript_clean: audioData.transcript_raw,
        template_type: 'Cardiology SOAP'
      })
    });

    if (!soapResponse.ok) {
      throw new Error(`SOAP generation failed: ${soapResponse.statusText}`);
    }

    const soapData = await soapResponse.json();
    console.log('✅ SOAP generated');
    console.log('📋 SOAP Preview:');
    console.log('   Subjective:', soapData.soap.Subjective.substring(0, 100) + '...');
    console.log('   Assessment:', soapData.soap.Assessment.substring(0, 100) + '...');

    // Step 5: Generate PDF
    console.log('\n📄 Step 5: Generate PDF');
    const pdfResponse = await fetch(`${API_BASE}/pdf/download?session_id=${sessionId}`);

    if (!pdfResponse.ok) {
      throw new Error(`PDF generation failed: ${pdfResponse.statusText}`);
    }

    const pdfData = await pdfResponse.json();
    console.log('✅ PDF generated:', pdfData.pdf_path);

    // Step 6: Test OCR (if image file exists)
    console.log('\n🖼️ Step 6: OCR Upload');
    const imageFiles = ['Apollo_Medical_reciept.png'];
    let imageFile = null;
    
    for (const file of imageFiles) {
      if (fs.existsSync(path.join(__dirname, file))) {
        imageFile = file;
        break;
      }
    }

    let ocrSessionId = null;
    if (imageFile) {
      const ocrFormData = new FormData();
      const imageBuffer = fs.readFileSync(path.join(__dirname, imageFile));
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      ocrFormData.append('image', imageBlob, imageFile);

      const ocrResponse = await fetch(`${API_BASE}/ocr-upload`, {
        method: 'POST',
        body: ocrFormData
      });

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();
        console.log('✅ OCR processed, session:', ocrData.ocr_session_id);
        console.log('📝 OCR preview:', ocrData.ocr_raw.substring(0, 100) + '...');
        
        ocrSessionId = ocrData.ocr_session_id;

        // Confirm OCR text
        const ocrConfirmResponse = await fetch(`${API_BASE}/ocr/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ocr_session_id: ocrSessionId,
            ocr_clean: ocrData.ocr_raw
          })
        });

        if (ocrConfirmResponse.ok) {
          console.log('✅ OCR text confirmed');
        }
      } else {
        console.log('⚠️ OCR upload failed, continuing without OCR');
      }
    } else {
      console.log('⚠️ No image file found, skipping OCR');
    }

    // Step 7: Get final response
    console.log('\n📋 Step 7: Final Response');
    const finalUrl = `${API_BASE}/final-response?session_id=${sessionId}${ocrSessionId ? `&ocr_session_id=${ocrSessionId}` : ''}`;
    const finalResponse = await fetch(finalUrl);

    if (!finalResponse.ok) {
      throw new Error(`Final response failed: ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    console.log('✅ Final response generated');
    console.log('📊 Final Data Summary:');
    console.log('   Session ID:', finalData.session_id);
    console.log('   Template:', finalData.template_type);
    console.log('   Has Transcript:', !!finalData.transcript);
    console.log('   Has SOAP:', !!finalData.soap);
    console.log('   Has Prescription:', !!finalData.prescription);
    console.log('   Has PDF:', !!finalData.pdf_path);
    console.log('   Has OCR:', !!finalData.ocr_text);

    // Test templates endpoint
    console.log('\n🩺 Step 8: Test Templates Endpoint');
    const templatesResponse = await fetch(`${API_BASE}/templates`);
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('✅ Templates retrieved:', templatesData.count, 'templates available');
    }

    // Test session status
    console.log('\n📊 Step 9: Test Session Status');
    const statusResponse = await fetch(`${API_BASE}/session/${sessionId}/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Session status:', statusData.status.completionPercentage + '% complete');
    }

    console.log('\n🎉 Complete API Workflow Test Successful!');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

/**
 * Test individual endpoints
 */
async function testIndividualEndpoints() {
  console.log('\n🔧 Testing Individual Endpoints');
  console.log('─'.repeat(50));

  const tests = [
    {
      name: 'Health Check',
      url: `${API_BASE}/health`,
      method: 'GET'
    },
    {
      name: 'Templates List',
      url: `${API_BASE}/templates`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      const response = await fetch(test.url, { method: test.method });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name}: Success`);
      } else {
        console.log(`❌ ${test.name}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting API Tests...');
  console.log('Make sure the server is running on http://localhost:3000');
  console.log('');

  // Wait a moment for server to be ready
  setTimeout(async () => {
    await testIndividualEndpoints();
    await testCompleteWorkflow();
  }, 1000);
}