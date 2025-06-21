import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatCompleteResponse } from './completeFormatter.js';
import { 
  getAvailableTemplates, 
  validateTemplateSelection, 
  buildTemplatePrompt,
  displayTemplateOptions,
  SOAP_TEMPLATES
} from './templateSelector.js';

// OpenAI API key
const openai = new OpenAI({
  apiKey: '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'
});

/**
 * Main function to transcribe audio and generate complete medical response with template selection
 * @param {string} audioFileName - Name of the audio file in the project folder
 * @param {string} templateKey - Selected SOAP template key
 * @returns {Promise<Object>} Complete medical response with SOAP note and clinical sections
 */
export async function processMedicalAudio(audioFileName, templateKey = null) {
  try {
    // Step 1: Transcribe the audio file
    console.log('Step 1: Transcribing audio...');
    const transcript = await transcribeAudio(audioFileName);
    
    if (!transcript) {
      throw new Error('Failed to transcribe audio');
    }
    
    console.log('Transcript obtained:', transcript.substring(0, 100) + '...');
    
    // Step 2: Template selection (if not provided)
    let selectedTemplate = templateKey;
    if (!selectedTemplate) {
      console.log('\n🩺 Template selection required...');
      console.log(displayTemplateOptions());
      throw new Error('Template selection required. Please provide a templateKey parameter.');
    }
    
    // Validate template selection
    const templateValidation = validateTemplateSelection(
      Object.keys(SOAP_TEMPLATES).indexOf(selectedTemplate) + 1
    );
    
    if (!templateValidation.valid) {
      throw new Error(`Invalid template: ${selectedTemplate}`);
    }
    
    console.log(`✅ Using template: ${templateValidation.templateName}`);
    
    // Step 3: Generate complete medical response from transcript with template
    console.log('Step 3: Generating specialized medical response...');
    const medicalResult = await generateCompleteResponseWithTemplate(transcript, selectedTemplate);
    
    // Step 4: Format the complete response for display
    console.log('Step 4: Formatting complete response...');
    const formattedResponse = formatCompleteResponse(medicalResult);
    
    return {
      ...medicalResult,
      originalTranscript: transcript,
      templateUsed: selectedTemplate,
      formatted: formattedResponse
    };
    
  } catch (error) {
    console.error('Error processing medical audio:', error.message);
    return { error: error.message };
  }
}

/**
 * Process medical audio with optional transcript correction and template selection
 * @param {string} audioFileName - Name of the audio file
 * @param {string} correction - Optional correction instruction
 * @param {string} templateKey - Selected SOAP template key
 * @returns {Promise<Object>} Complete medical response with corrected transcript
 */
export async function processMedicalAudioWithCorrection(audioFileName, correction = null, templateKey = null) {
  try {
    // Step 1: Transcribe the audio file
    console.log('Step 1: Transcribing audio...');
    const originalTranscript = await transcribeAudio(audioFileName);
    
    if (!originalTranscript) {
      throw new Error('Failed to transcribe audio');
    }
    
    console.log('Original transcript obtained:', originalTranscript.substring(0, 100) + '...');
    
    let finalTranscript = originalTranscript;

    // Step 2: Apply correction if provided
    if (correction && correction.trim()) {
      console.log('Step 2: Applying transcript correction...');
      const { correctTranscript } = await import('./transcriptCorrector.js');
      finalTranscript = await correctTranscript(originalTranscript, correction);
      console.log('Corrected transcript:', finalTranscript.substring(0, 100) + '...');
    }

    // Step 3: Template selection (if not provided)
    let selectedTemplate = templateKey;
    if (!selectedTemplate) {
      console.log('\n🩺 Template selection required...');
      console.log(displayTemplateOptions());
      throw new Error('Template selection required. Please provide a templateKey parameter.');
    }
    
    // Validate template selection
    const templateValidation = validateTemplateSelection(
      Object.keys(SOAP_TEMPLATES).indexOf(selectedTemplate) + 1
    );
    
    if (!templateValidation.valid) {
      throw new Error(`Invalid template: ${selectedTemplate}`);
    }
    
    console.log(`✅ Using template: ${templateValidation.templateName}`);

    // Step 4: Generate complete medical response from final transcript with template
    console.log('Step 4: Generating specialized medical response...');
    const medicalResult = await generateCompleteResponseWithTemplate(finalTranscript, selectedTemplate);
    
    // Step 5: Format the complete response for display
    console.log('Step 5: Formatting complete response...');
    const formattedResponse = formatCompleteResponse(medicalResult);
    
    return {
      ...medicalResult,
      originalTranscript: originalTranscript,
      correctedTranscript: finalTranscript,
      correction: correction,
      templateUsed: selectedTemplate,
      formatted: formattedResponse
    };
    
  } catch (error) {
    console.error('Error processing medical audio with correction:', error.message);
    return { error: error.message };
  }
}

/**
 * Transcribe local audio file using OpenAI Whisper
 * @param {string} fileName - Audio file name
 * @returns {Promise<string>} Transcript text
 */
export async function transcribeAudio(fileName) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, fileName);

    console.log(`Transcribing file: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${fileName}`);
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    return transcription.text;

  } catch (error) {
    console.error("Transcription Error:", error.message);
    throw error;
  }
}

/**
 * Generate complete medical response from transcript using GPT-4 with template customization
 * @param {string} transcript - The transcribed text
 * @param {string} templateKey - The selected template key
 * @returns {Promise<Object>} Complete medical response with SOAP note and clinical sections
 */
async function generateCompleteResponseWithTemplate(transcript, templateKey) {
  try {
    // Build customized prompt based on template
    const prompt = buildTemplatePrompt(templateKey, transcript);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: D   },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const response = completion.choices[0].message.content;
    
    // Parse the JSON response
    const medicalResult = JSON.parse(response);
    
    return medicalResult;

  } catch (error) {
    console.error("Medical Response Generation Error:", error.message);
    throw error;
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  const audioFile = "Recording22.m4a"; 
  const testTemplate = "Cardiology SOAP"; // Test with cardiology template
  
  console.log('🎯 Starting Medical Audio Processing with Template...');
  console.log(`Audio file: ${audioFile}`);
  console.log(`Template: ${testTemplate}`);
  
  processMedicalAudio(audioFile, testTemplate)
    .then(result => {
      console.log('\n✅ Processing Complete!');
      console.log(`📋 Template Used: ${result.templateUsed}`);
      console.log('📋 Complete Medical Response:');
      console.log(result.formatted);
      console.log('\n📄 Raw JSON:');
      console.log(JSON.stringify({
        templateType: result.templateType,
        SOAP_Note: result.SOAP_Note,
        summary: result.summary,
        prescription: result.prescription,
        followUp: result.followUp,
        nextSteps: result.nextSteps
      }, null, 2));
    })
    .catch(err => {
      console.error('❌ Processing Failed:', err.message);
    });
}