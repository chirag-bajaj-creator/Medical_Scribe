import { createInterface } from 'readline';
import { processMedicalAudioWithCorrection } from './medicalTranscriber.js';
import { formatCompleteResponse } from './completeFormatter.js';
import { detectAudioFile, listAudioFiles } from './audioDetector.js';
import { 
  displayTemplateOptions, 
  validateTemplateSelection, 
  getAvailableTemplates 
} from './templateSelector.js';

/**
 * Interactive workflow that auto-detects audio files and prompts for corrections and template selection
 */
async function runInteractiveWorkflow() {
  console.log('🚀 Starting Interactive Medical Audio Workflow...');
  console.log('═'.repeat(60));
  
  try {
    // Step 1: Auto-detect audio file
    console.log('🔍 Auto-detecting audio files in workspace...');
    const audioFile = await detectAudioFile();
    
    console.log(`📁 Using audio file: ${audioFile}`);
    console.log('─'.repeat(60));
    
    // Step 2: Transcribe audio
    console.log('🎤 Step 1: Transcribing audio...');
    const { transcribeAudio } = await import('./medicalTranscriber.js');
    const originalTranscript = await transcribeAudio(audioFile);
    
    if (!originalTranscript) {
      throw new Error('Failed to transcribe audio');
    }
    
    console.log('\n✅ Transcription Complete!');
    console.log('─'.repeat(60));
    console.log('📝 ORIGINAL TRANSCRIPT:');
    console.log('─'.repeat(60));
    console.log(originalTranscript);
    console.log('─'.repeat(60));
    
    // Step 3: Ask user for corrections
    const correction = await promptForCorrection();
    
    // Step 4: Template selection
    const selectedTemplate = await promptForTemplateSelection();
    
    // Step 5: Process with correction and template
    console.log('\n🔄 Processing medical analysis...');
    
    let finalResult;
    if (correction && correction.trim()) {
      console.log(`🔧 Applying correction: "${correction}"`);
      console.log(`🩺 Using template: ${selectedTemplate}`);
      finalResult = await processMedicalAudioWithCorrection(audioFile, correction, selectedTemplate);
    } else {
      console.log('📋 No correction provided, using original transcript');
      console.log(`🩺 Using template: ${selectedTemplate}`);
      const { processMedicalAudio } = await import('./medicalTranscriber.js');
      finalResult = await processMedicalAudio(audioFile, selectedTemplate);
      finalResult.originalTranscript = originalTranscript;
      finalResult.correctedTranscript = originalTranscript;
      finalResult.correction = null;
    }
    
    if (finalResult.error) {
      throw new Error(finalResult.error);
    }
    
    // Step 6: Display results
    console.log('\n🎉 Processing Complete!');
    console.log('═'.repeat(60));
    
    console.log(`🩺 Template Used: ${finalResult.templateUsed}`);
    
    if (correction && correction.trim()) {
      console.log('📝 CORRECTED TRANSCRIPT:');
      console.log('─'.repeat(60));
      console.log(finalResult.correctedTranscript);
      console.log('─'.repeat(60));
    }
    
    console.log('\n📋 MEDICAL ANALYSIS:');
    console.log('═'.repeat(60));
    console.log(finalResult.formatted);
    
    // Step 7: Ask if user wants to save to PDF
    const shouldSavePDF = await promptForPDF();
    if (shouldSavePDF) {
      await saveToPDF(finalResult.formatted, finalResult.templateUsed);
    }
    
    console.log('\n✨ Workflow completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Workflow error:', error.message);
    
    // If no audio files found, show helpful message
    if (error.message.includes('No audio files found')) {
      console.log('\n💡 To add an audio file:');
      console.log('   1. Drag and drop your audio file into the workspace');
      console.log('   2. Or upload via the file manager');
      console.log('   3. Supported formats: .m4a, .mp3, .wav, .mp4, .aac, .flac');
    }
  }
}

/**
 * Prompt user for transcript corrections
 * @returns {Promise<string>} User's correction instruction
 */
function promptForCorrection() {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🔧 CORRECTION OPPORTUNITY:');
    console.log('─'.repeat(60));
    console.log('You can now correct any mistakes in the transcript above.');
    console.log('');
    console.log('📝 Example corrections:');
    console.log('  • "Change name to John Smith"');
    console.log('  • "Replace fever with headache"');
    console.log('  • "Change BP from 120/80 to 140/90"');
    console.log('  • "Remove any mention of diabetes"');
    console.log('  • "Replace hypotension with hypertension"');
    console.log('');
    console.log('💡 Leave empty and press Enter to use original transcript');
    console.log('─'.repeat(60));
    
    rl.question('🖊️  Enter your correction (or press Enter to skip): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for template selection
 * @returns {Promise<string>} Selected template key
 */
function promptForTemplateSelection() {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🩺 TEMPLATE SELECTION:');
    console.log('═'.repeat(60));
    console.log(displayTemplateOptions());
    console.log('─'.repeat(60));
    
    rl.question('🔢 Enter template number (1-18): ', (answer) => {
      rl.close();
      
      const validation = validateTemplateSelection(answer.trim());
      
      if (validation.valid) {
        console.log(`✅ Selected: ${validation.templateName}`);
        resolve(validation.templateKey);
      } else {
        console.log(`❌ ${validation.error}`);
        reject(new Error(validation.error));
      }
    });
  });
}

/**
 * Prompt user to save PDF
 * @returns {Promise<boolean>} Whether to save PDF
 */
function promptForPDF() {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n📄 PDF GENERATION:');
    console.log('─'.repeat(60));
    
    rl.question('💾 Save medical analysis to PDF? (y/N): ', (answer) => {
      rl.close();
      const shouldSave = answer.toLowerCase().startsWith('y');
      resolve(shouldSave);
    });
  });
}

/**
 * Save formatted text to PDF
 * @param {string} formattedText - The formatted medical text
 * @param {string} templateType - The template type used
 */
async function saveToPDF(formattedText, templateType) {
  try {
    console.log('\n📄 Generating PDF...');
    const { generateClinicalPDF } = await import('./pdfGenerator.js');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const templateName = templateType.replace(' ', '-').toLowerCase();
    const fileName = `${templateName}-analysis-${timestamp}.pdf`;
    
    const pdfPath = await generateClinicalPDF(formattedText, fileName);
    console.log(`✅ PDF saved: ${fileName}`);
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
  }
}

/**
 * Quick workflow for testing with command line arguments
 */
async function runQuickWorkflow() {
  const args = process.argv.slice(3); // Skip 'node', 'script', '--quick'
  let audioFile = args[0];
  const correction = args[1];
  const templateNumber = args[2] || '1'; // Default to Practice SOAP
  
  // If no audio file specified, auto-detect
  if (!audioFile) {
    try {
      audioFile = await detectAudioFile();
      console.log(`🎵 Auto-detected: ${audioFile}`);
    } catch (error) {
      console.log('❌ No audio file specified and auto-detection failed');
      console.log('📝 Usage: npm run quick [audioFile] "<correction>" [templateNumber]');
      console.log('📝 Example: npm run quick "Change name to John" 2');
      console.log('📝 Example: npm run quick Recording22.m4a "Replace fever with headache" 5');
      return;
    }
  }
  
  // Validate template selection
  const templateValidation = validateTemplateSelection(templateNumber);
  if (!templateValidation.valid) {
    console.log(`❌ ${templateValidation.error}`);
    return;
  }
  
  console.log('🚀 Quick Workflow Mode');
  console.log(`📁 Audio: ${audioFile}`);
  console.log(`🔧 Correction: ${correction || 'None'}`);
  console.log(`🩺 Template: ${templateValidation.templateName}`);
  console.log('─'.repeat(60));
  
  try {
    const result = await processMedicalAudioWithCorrection(
      audioFile, 
      correction, 
      templateValidation.templateKey
    );
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    console.log('\n📝 Original:', result.originalTranscript.substring(0, 100) + '...');
    if (correction) {
      console.log('\n🔧 Corrected:', result.correctedTranscript.substring(0, 100) + '...');
    }
    console.log(`\n🩺 Template: ${result.templateUsed}`);
    console.log('\n📋 Medical Analysis:');
    console.log('═'.repeat(60));
    console.log(result.formatted);
    
  } catch (error) {
    console.error('❌ Quick workflow failed:', error.message);
  }
}

// Handle different modes
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    runQuickWorkflow();
  } else {
    runInteractiveWorkflow();
  }
}

export { runInteractiveWorkflow, promptForCorrection, promptForTemplateSelection };