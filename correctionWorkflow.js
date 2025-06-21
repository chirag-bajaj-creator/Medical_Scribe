import { processMedicalAudioWithCorrection } from './medicalTranscriber.js';
import { formatCompleteResponse } from './completeFormatter.js';

/**
 * Complete workflow with transcript correction: Audio → Correction → Medical Analysis → Formatted Text
 */
async function runCorrectionWorkflow() {
  const audioFile = "Recording22.m4a";
  const correction = "Change hypotension to hypertension"; // Example correction
  
  console.log('🚀 Starting Medical Audio Workflow with Correction...');
  console.log(`📁 Input audio: ${audioFile}`);
  console.log(`🔧 Correction: "${correction}"`);
  
  try {
    const result = await processMedicalAudioWithCorrection(audioFile, correction);
    
    if (!result.error) {
      console.log('\n🎉 Workflow with correction finished successfully!');
      
      console.log('\n📝 Original Transcript:');
      console.log(result.originalTranscript);
      
      console.log('\n🔧 Corrected Transcript:');
      console.log(result.correctedTranscript);
      
      console.log('\n📋 Medical Analysis:');
      console.log(result.formatted);
      
    } else {
      console.error('❌ Workflow failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Workflow error:', error.message);
  }
}

// Example usage functions for different correction scenarios
async function testCorrections() {
  const audioFile = "Recording22.m4a";
  
  console.log('🧪 Testing Different Correction Scenarios...\n');
  
  // Test 1: Name correction
  console.log('Test 1: Name Correction');
  await testSingleCorrection(audioFile, "Change the patient name to John Smith");
  
  // Test 2: Medical term correction
  console.log('\nTest 2: Medical Term Correction');
  await testSingleCorrection(audioFile, "Replace fever with headache");
  
  // Test 3: Vital signs correction
  console.log('\nTest 3: Vital Signs Correction');
  await testSingleCorrection(audioFile, "Change blood pressure from 120/80 to 140/90");
  
  // Test 4: Remove incorrect information
  console.log('\nTest 4: Remove Information');
  await testSingleCorrection(audioFile, "Remove any mention of diabetes");
}

async function testSingleCorrection(audioFile, correction) {
  try {
    const result = await processMedicalAudioWithCorrection(audioFile, correction);
    
    if (!result.error) {
      console.log(`✅ Correction applied: "${correction}"`);
      console.log(`📝 Result: ${result.correctedTranscript.substring(0, 100)}...`);
    } else {
      console.log(`❌ Correction failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  }
}

// Run the workflow based on command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    testCorrections();
  } else {
    runCorrectionWorkflow();
  }
}