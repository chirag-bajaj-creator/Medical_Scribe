import OpenAI from 'openai';
import { createInterface } from 'readline';
import { OCRExtractor, processImageFromWorkspace } from './ocrExtractor.js';
import { extractBillInfo } from './claimProcessor.js';

// OpenAI API key
const openai = new OpenAI({
  apiKey: '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'
});

/**
 * Apply user-specified correction to OCR text using AI
 * @param {string} ocrText - Original OCR extracted text
 * @param {string} correctionPrompt - User's correction instruction
 * @returns {Promise<Object>} Corrected text result
 */
export async function applyUserCorrectionWithAI(ocrText, correctionPrompt) {
  try {
    console.log('🤖 Applying AI correction based on your instruction...');
    console.log(`📝 Correction instruction: "${correctionPrompt}"`);

    // Validate inputs
    if (!ocrText || typeof ocrText !== 'string') {
      throw new Error('Invalid OCR text provided');
    }

    if (!correctionPrompt || typeof correctionPrompt !== 'string') {
      throw new Error('Invalid correction instruction provided');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an OCR text correction assistant. Apply the user's correction instruction to the given OCR text. Only make the specific changes requested by the user. Do not make any other modifications. Return only the corrected text without any additional commentary or formatting."
        },
        {
          role: "user",
          content: `Original OCR Text:
"${ocrText}"

User's Correction Instruction:
"${correctionPrompt}"

Please apply this correction to the OCR text and return the corrected version.`
        }
      ],
      temperature: 0.1, // Low temperature for consistent corrections
      max_tokens: 2000
    });

    const correctedText = completion.choices[0].message.content.trim();

    // Validate the corrected text
    if (!correctedText || correctedText.length === 0) {
      console.warn('⚠️ AI returned empty correction, using original text');
      return {
        success: true,
        originalText: ocrText,
        correctedText: ocrText,
        correctionApplied: false,
        userInstruction: correctionPrompt
      };
    }

    console.log('✅ AI correction applied successfully');
    
    return {
      success: true,
      originalText: ocrText,
      correctedText: correctedText,
      correctionApplied: true,
      userInstruction: correctionPrompt,
      lengthChange: correctedText.length - ocrText.length
    };

  } catch (error) {
    console.error('❌ AI correction error:', error.message);
    
    return {
      success: false,
      error: error.message,
      originalText: ocrText,
      correctedText: ocrText,
      correctionApplied: false,
      userInstruction: correctionPrompt
    };
  }
}

/**
 * Prompt user for correction instruction
 * @param {string} ocrText - The original OCR text to show for reference
 * @returns {Promise<string>} User's correction instruction
 */
function promptForCorrectionInstruction(ocrText) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🤖 AI-POWERED OCR CORRECTION:');
    console.log('─'.repeat(80));
    console.log('The AI will apply your correction instruction to the OCR text.');
    console.log('');
    console.log('📝 Example correction instructions:');
    console.log('  • "Change Apollo Hospital to Apollo Hospitals"');
    console.log('  • "Fix the amount from Rs. 1O,5OO to Rs. 10,500"');
    console.log('  • "Correct the date from 15-Jun-2O25 to 15-Jun-2025"');
    console.log('  • "Replace patient name John5mith with John Smith"');
    console.log('  • "Fix all O (letter O) that should be 0 (zero) in numbers"');
    console.log('  • "Correct spelling mistakes in medical terms"');
    console.log('');
    console.log('💡 Leave empty and press Enter to use original text without correction');
    console.log('─'.repeat(80));
    
    rl.question('🖊️  Enter your correction instruction: ', (instruction) => {
      rl.close();
      resolve(instruction.trim());
    });
  });
}

/**
 * Display OCR text for user review
 * @param {string} ocrText - The extracted OCR text
 * @param {number} confidence - OCR confidence score
 */
function displayOCRForReview(ocrText, confidence) {
  console.log('\n📄 OCR EXTRACTED TEXT:');
  console.log('═'.repeat(80));
  console.log(ocrText);
  console.log('═'.repeat(80));
  console.log(`🎯 OCR Confidence: ${confidence.toFixed(2)}%`);
}

/**
 * Show before/after comparison
 * @param {string} originalText - Original OCR text
 * @param {string} correctedText - AI corrected text
 * @param {string} instruction - User's correction instruction
 */
function showCorrectionComparison(originalText, correctedText, instruction) {
  console.log('\n📊 CORRECTION APPLIED:');
  console.log('─'.repeat(80));
  console.log(`🔧 Instruction: "${instruction}"`);
  console.log('');
  console.log('📝 BEFORE (Original OCR):');
  console.log('─'.repeat(40));
  console.log(originalText.substring(0, 300) + (originalText.length > 300 ? '...' : ''));
  console.log('');
  console.log('✅ AFTER (AI Corrected):');
  console.log('─'.repeat(40));
  console.log(correctedText.substring(0, 300) + (correctedText.length > 300 ? '...' : ''));
  console.log('─'.repeat(80));
}

/**
 * Complete OCR workflow with AI-based correction
 * @param {string} imageFileName - Optional specific image file name
 * @returns {Promise<Object>} Complete processing result
 */
export async function processImageWithAICorrection(imageFileName = null) {
  try {
    console.log('🚀 Starting AI-Powered OCR Correction Workflow...');
    console.log('═'.repeat(80));
    
    // Step 1: Extract text using OCR
    console.log('🔍 Step 1: Extracting text from image...');
    const ocrResult = await processImageFromWorkspace(imageFileName);
    
    if (!ocrResult.success) {
      throw new Error(`OCR extraction failed: ${ocrResult.error}`);
    }
    
    console.log(`✅ OCR completed with ${ocrResult.confidence.toFixed(2)}% confidence`);
    
    // Step 2: Display extracted text for review
    displayOCRForReview(ocrResult.text, ocrResult.confidence);
    
    // Step 3: Ask user for correction instruction
    console.log('\n🤖 Step 2: AI Correction Setup...');
    const correctionInstruction = await promptForCorrectionInstruction(ocrResult.text);
    
    let finalText = ocrResult.text;
    let correctionResult = null;
    
    // Step 4: Apply AI correction if instruction provided
    if (correctionInstruction) {
      console.log('\n🔄 Step 3: Applying AI correction...');
      correctionResult = await applyUserCorrectionWithAI(ocrResult.text, correctionInstruction);
      
      if (correctionResult.success && correctionResult.correctionApplied) {
        finalText = correctionResult.correctedText;
        showCorrectionComparison(ocrResult.text, finalText, correctionInstruction);
      } else {
        console.log('⚠️ AI correction failed, using original text');
      }
    } else {
      console.log('\n✅ No correction instruction provided, using original OCR text');
    }
    
    // Step 5: Process the final text
    console.log('\n🔄 Step 4: Processing final text...');
    const billInfo = extractBillInfo(finalText);
    
    return {
      success: true,
      originalText: ocrResult.text,
      finalText: finalText,
      correctionInstruction: correctionInstruction,
      correctionApplied: correctionResult?.correctionApplied || false,
      ocrConfidence: ocrResult.confidence,
      extractedInfo: billInfo,
      fileName: ocrResult.fileName,
      correctionResult: correctionResult
    };
    
  } catch (error) {
    console.error('❌ AI OCR correction workflow error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Display final results
 * @param {Object} result - Processing result
 */
function displayFinalResults(result) {
  if (!result.success) {
    console.log(`❌ Processing failed: ${result.error}`);
    return;
  }
  
  console.log('\n🎉 AI OCR CORRECTION WORKFLOW COMPLETED!');
  console.log('═'.repeat(80));
  
  console.log(`📁 Image File: ${result.fileName}`);
  console.log(`🎯 OCR Confidence: ${result.ocrConfidence.toFixed(2)}%`);
  console.log(`🤖 AI Correction Applied: ${result.correctionApplied ? 'Yes' : 'No'}`);
  
  if (result.correctionInstruction) {
    console.log(`🔧 Correction Instruction: "${result.correctionInstruction}"`);
  }
  
  console.log('\n📋 EXTRACTED INFORMATION:');
  console.log('─'.repeat(80));
  console.log(`🏥 Hospital: ${result.extractedInfo.hospitalName || 'Not found'}`);
  console.log(`💰 Amount: ${result.extractedInfo.amount || 'Not found'}`);
  console.log(`📅 Date: ${result.extractedInfo.billDate || 'Not found'}`);
  console.log(`🧾 Bill No: ${result.extractedInfo.billNumber || 'Not found'}`);
  console.log(`👤 Patient: ${result.extractedInfo.patientName || 'Not found'}`);
  
  console.log('\n📝 FINAL PROCESSED TEXT:');
  console.log('─'.repeat(80));
  console.log(result.finalText);
  console.log('─'.repeat(80));
}

/**
 * Interactive workflow for multiple images with AI correction
 */
async function runInteractiveAICorrection() {
  try {
    const { listImageFiles } = await import('./ocrExtractor.js');
    const imageFiles = listImageFiles();
    
    if (imageFiles.length === 0) {
      console.log('⚠️ No image files found in workspace.');
      console.log('\n💡 To add an image file:');
      console.log('   1. Drag and drop your image into the workspace');
      console.log('   2. Or upload via the file manager');
      console.log('   3. Supported formats: .png, .jpg, .jpeg, .gif, .bmp, .tiff, .webp');
      return;
    }
    
    console.log('🖼️ Available image files:');
    imageFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n📁 Enter file number (or press Enter for auto-detection): ', async (choice) => {
      rl.close();
      
      let selectedFile = null;
      if (choice.trim()) {
        const fileIndex = parseInt(choice.trim()) - 1;
        if (fileIndex >= 0 && fileIndex < imageFiles.length) {
          selectedFile = imageFiles[fileIndex];
        } else {
          console.log('❌ Invalid file number');
          return;
        }
      }
      
      const result = await processImageWithAICorrection(selectedFile);
      displayFinalResults(result);
    });
    
  } catch (error) {
    console.error('❌ Interactive AI correction workflow error:', error.message);
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive')) {
    runInteractiveAICorrection();
  } else {
    // Process specific file or auto-detect
    const specifiedFile = args[0];
    
    processImageWithAICorrection(specifiedFile)
      .then(result => {
        displayFinalResults(result);
      })
      .catch(err => {
        console.error('❌ Processing error:', err.message);
      });
  }
}

export { 
  promptForCorrectionInstruction, 
  runInteractiveAICorrection 
};