import { createInterface } from 'readline';
import { OCRExtractor, processImageFromWorkspace } from './ocrExtractor.js';
import { extractBillInfo } from './claimProcessor.js';

/**
 * CLI OCR Text Correction Interface
 * Allows users to review and edit OCR extracted text in the terminal
 */

/**
 * Display OCR text in a formatted way for review
 * @param {string} ocrText - The extracted OCR text
 */
function displayOCRText(ocrText) {
  console.log('\n📄 OCR EXTRACTED TEXT:');
  console.log('═'.repeat(80));
  console.log(ocrText);
  console.log('═'.repeat(80));
}

/**
 * Prompt user to review and correct OCR text
 * @param {string} originalText - The original OCR extracted text
 * @returns {Promise<string>} The corrected text from user input
 */
function promptForTextCorrection(originalText) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🔧 TEXT CORRECTION INTERFACE:');
    console.log('─'.repeat(80));
    console.log('Please review the extracted text above and make any necessary corrections.');
    console.log('');
    console.log('💡 Instructions:');
    console.log('  • Copy the text above and paste it below');
    console.log('  • Make any corrections needed');
    console.log('  • Press Enter when finished');
    console.log('  • Leave empty and press Enter to use original text');
    console.log('─'.repeat(80));
    
    // Create a multi-line input interface
    console.log('\n📝 Enter corrected text (press Enter twice when finished):');
    
    let correctedText = '';
    let emptyLineCount = 0;
    
    const handleLine = (line) => {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          // User pressed Enter twice, finish input
          rl.close();
          
          // Use original text if no correction provided
          const finalText = correctedText.trim() || originalText;
          
          console.log('\n✅ Text correction completed!');
          resolve(finalText);
          return;
        }
        correctedText += '\n';
      } else {
        emptyLineCount = 0;
        correctedText += line + '\n';
      }
    };
    
    rl.on('line', handleLine);
  });
}

/**
 * Alternative single-line correction prompt (simpler interface)
 * @param {string} originalText - The original OCR extracted text
 * @returns {Promise<string>} The corrected text from user input
 */
function promptForSimpleCorrection(originalText) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🔧 TEXT CORRECTION:');
    console.log('─'.repeat(80));
    console.log('Review the text above. You can either:');
    console.log('1. Press Enter to use the original text as-is');
    console.log('2. Type "edit" to manually enter corrected text');
    console.log('─'.repeat(80));
    
    rl.question('🖊️  Your choice (Enter or "edit"): ', (choice) => {
      if (choice.toLowerCase().trim() === 'edit') {
        rl.close();
        // Start multi-line editing
        promptForTextCorrection(originalText).then(resolve);
      } else {
        rl.close();
        console.log('\n✅ Using original OCR text');
        resolve(originalText);
      }
    });
  });
}

/**
 * Process image with OCR and correction workflow
 * @param {string} imageFileName - Optional specific image file name
 * @returns {Promise<Object>} Processing result with corrected text
 */
export async function processImageWithCorrection(imageFileName = null) {
  try {
    console.log('🖼️ Starting OCR Text Correction Workflow...');
    console.log('═'.repeat(80));
    
    // Step 1: Extract text using OCR
    console.log('🔍 Step 1: Extracting text from image...');
    const ocrResult = await processImageFromWorkspace(imageFileName);
    
    if (!ocrResult.success) {
      throw new Error(`OCR extraction failed: ${ocrResult.error}`);
    }
    
    console.log(`✅ OCR completed with ${ocrResult.confidence.toFixed(2)}% confidence`);
    
    // Step 2: Display extracted text for review
    displayOCRText(ocrResult.text);
    
    // Step 3: Prompt for corrections
    console.log('\n🔧 Step 2: Text Review and Correction...');
    const correctedText = await promptForSimpleCorrection(ocrResult.text);
    
    // Step 4: Show comparison if text was changed
    if (correctedText !== ocrResult.text) {
      console.log('\n📊 TEXT COMPARISON:');
      console.log('─'.repeat(40) + ' ORIGINAL ' + '─'.repeat(40));
      console.log(ocrResult.text.substring(0, 200) + '...');
      console.log('─'.repeat(40) + ' CORRECTED ' + '─'.repeat(39));
      console.log(correctedText.substring(0, 200) + '...');
      console.log('─'.repeat(90));
    }
    
    // Step 5: Process the corrected text
    console.log('\n🔄 Step 3: Processing corrected text...');
    const billInfo = extractBillInfo(correctedText);
    
    return {
      success: true,
      originalText: ocrResult.text,
      correctedText: correctedText,
      wasEdited: correctedText !== ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      extractedInfo: billInfo,
      fileName: ocrResult.fileName
    };
    
  } catch (error) {
    console.error('❌ OCR correction workflow error:', error.message);
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
function displayResults(result) {
  if (!result.success) {
    console.log(`❌ Processing failed: ${result.error}`);
    return;
  }
  
  console.log('\n🎉 OCR CORRECTION WORKFLOW COMPLETED!');
  console.log('═'.repeat(80));
  
  console.log(`📁 Image File: ${result.fileName}`);
  console.log(`🎯 OCR Confidence: ${result.ocrConfidence.toFixed(2)}%`);
  console.log(`✏️  Text Edited: ${result.wasEdited ? 'Yes' : 'No'}`);
  
  console.log('\n📋 EXTRACTED INFORMATION:');
  console.log('─'.repeat(80));
  console.log(`🏥 Hospital: ${result.extractedInfo.hospitalName || 'Not found'}`);
  console.log(`💰 Amount: ${result.extractedInfo.amount || 'Not found'}`);
  console.log(`📅 Date: ${result.extractedInfo.billDate || 'Not found'}`);
  console.log(`🧾 Bill No: ${result.extractedInfo.billNumber || 'Not found'}`);
  console.log(`👤 Patient: ${result.extractedInfo.patientName || 'Not found'}`);
  
  console.log('\n📝 FINAL CORRECTED TEXT:');
  console.log('─'.repeat(80));
  console.log(result.correctedText);
  console.log('─'.repeat(80));
}

/**
 * Interactive workflow for multiple images
 */
async function runInteractiveOCRCorrection() {
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
      
      const result = await processImageWithCorrection(selectedFile);
      displayResults(result);
    });
    
  } catch (error) {
    console.error('❌ Interactive workflow error:', error.message);
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive')) {
    runInteractiveOCRCorrection();
  } else {
    // Process specific file or auto-detect
    const specifiedFile = args[0];
    
    processImageWithCorrection(specifiedFile)
      .then(result => {
        displayResults(result);
      })
      .catch(err => {
        console.error('❌ Processing error:', err.message);
      });
  }
}

export { promptForTextCorrection, promptForSimpleCorrection, displayOCRText };