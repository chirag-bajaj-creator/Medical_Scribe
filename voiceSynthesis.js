import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Convert medical response data to readable SOAP text format
 * @param {Object} medicalData - Structured medical response from medicalTranscriber.js
 * @returns {string} Formatted SOAP text for display
 */
export function createSoapText(medicalData) {
  if (!medicalData || !medicalData.SOAP_Note) {
    throw new Error('Invalid medical data provided');
  }

  const { SOAP_Note, summary, prescription, followUp, nextSteps } = medicalData;

  const soapText = `
Medical Documentation Summary:

Subjective: ${SOAP_Note.Subjective || 'No subjective data provided'}

Objective: ${SOAP_Note.Objective || 'No objective data provided'}

Assessment: ${SOAP_Note.Assessment || 'No assessment provided'}

Plan: ${SOAP_Note.Plan || 'No plan provided'}

Summary: ${summary || 'No summary provided'}

Prescription: ${prescription || 'No prescription provided'}

Follow-up Instructions: ${followUp || 'No follow-up instructions provided'}

Next Steps: ${nextSteps || 'No next steps provided'}
  `.trim();

  return soapText;
}

/**
 * Process medical audio and return formatted text output
 * @param {string} audioFileName - Input audio file name
 * @returns {Promise<Object>} Medical processing result with formatted text
 */
export async function processMedicalAudioToText(audioFileName) {
  try {
    // Import the medical transcriber
    const { processMedicalAudio } = await import('./medicalTranscriber.js');
    
    // Process medical audio
    console.log('🎯 Processing medical audio...');
    const medicalResult = await processMedicalAudio(audioFileName);
    
    if (medicalResult.error) {
      throw new Error(`Medical processing failed: ${medicalResult.error}`);
    }

    // Create formatted SOAP text
    console.log('📝 Creating formatted SOAP text...');
    const soapText = createSoapText(medicalResult);
    
    return {
      medicalData: medicalResult,
      soapText: soapText,
      complete: true
    };

  } catch (error) {
    console.error('Medical processing error:', error.message);
    return {
      error: error.message,
      complete: false
    };
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example usage with test data
  const testMedicalData = {
    "SOAP_Note": {
      "Subjective": "Patient reports chest pain and shortness of breath for the past 2 hours.",
      "Objective": "Blood pressure 140/90, heart rate 95 bpm, respiratory rate 22, oxygen saturation 96%.",
      "Assessment": "Possible acute coronary syndrome, requires immediate evaluation.",
      "Plan": "ECG, cardiac enzymes, chest X-ray, cardiology consultation."
    },
    "summary": "Patient with acute chest pain requiring immediate cardiac evaluation and monitoring.",
    "prescription": "• Aspirin 325mg - Take immediately, then 81mg daily\n• Nitroglycerin 0.4mg - Sublingual as needed for chest pain",
    "followUp": "• Immediate cardiology follow-up\n• Return if chest pain worsens or new symptoms develop",
    "nextSteps": "• Complete cardiac workup including stress test\n• Lifestyle modifications for cardiovascular health"
  };
  
  console.log('🎯 Testing SOAP Text Creation...');
  
  try {
    const soapText = createSoapText(testMedicalData);
    console.log('\n✅ SOAP text creation complete!');
    console.log('\n📝 Formatted SOAP Text:');
    console.log(soapText);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}