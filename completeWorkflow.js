import { processMedicalAudioToText } from './voiceSynthesis.js';

/**
 * Complete workflow: Audio → Medical Analysis → Formatted Text
 */
async function runCompleteWorkflow() {
  const audioFile = "Recording22.m4a";
  
  console.log('🚀 Starting Complete Medical Audio Workflow...');
  console.log(`📁 Input audio: ${audioFile}`);
  
  try {
    const result = await processMedicalAudioToText(audioFile);
    
    if (result.complete) {
      console.log('\n🎉 Complete workflow finished successfully!');
      console.log('\n📋 Medical Analysis:');
      console.log(result.medicalData.formatted);
      
      console.log('\n📝 SOAP Text Output:');
      console.log(result.soapText);
      
    } else {
      console.error('❌ Workflow failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Workflow error:', error.message);
  }
}

// Run the complete workflow
runCompleteWorkflow();