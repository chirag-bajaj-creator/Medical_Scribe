/**
 * Format complete medical response JSON into readable text with emojis and sections
 * @param {Object} medicalData - JSON object containing SOAP_Note, summary, prescription, followUp, and nextSteps
 * @returns {string} Formatted complete medical response text
 */
export function formatCompleteResponse(medicalData) {
  if (!medicalData) {
    return "❌ Error: Invalid medical response data provided";
  }

  const { templateType, SOAP_Note, summary, prescription, followUp, nextSteps } = medicalData;

  return `🩺 ${templateType || 'SOAP Note'}

🟡 Subjective:
${SOAP_Note?.Subjective || 'No subjective data provided'}

🔵 Objective:
${SOAP_Note?.Objective || 'No objective data provided'}

🟣 Assessment:
${SOAP_Note?.Assessment || 'No assessment provided'}

🟢 Plan:
${SOAP_Note?.Plan || 'No plan provided'}

📝 Summary:
${summary || 'No summary provided'}

---

🏥 Clinical Response

💊 Prescription Sheet
${prescription || 'No prescription provided'}

📅 Follow-Up Reminder
${followUp || 'No follow-up instructions provided'}

🧭 Next Step Suggestions
${nextSteps || 'No next steps provided'}`;
}

// Test with example data
if (import.meta.url === `file://${process.argv[1]}`) {
  const exampleData = {
    "templateType": "Cardiology SOAP",
    "SOAP_Note": {
      "Subjective": "The patient reports chest pain and shortness of breath.",
      "Objective": "Blood pressure 140/90, heart rate 95 bpm, clear lung sounds.",
      "Assessment": "Possible hypertension with cardiac symptoms.",
      "Plan": "ECG, cardiac enzymes, antihypertensive medication."
    },
    "summary": "Patient with chest pain and elevated blood pressure requiring cardiac evaluation.",
    "prescription": "• Lisinopril 10mg\n   - Dosage: Once daily in the morning\n   - Duration: Ongoing\n   - Maximum: 40mg daily\n   - Instructions: Take with or without food\n   - ⚠️ Warning: Monitor blood pressure regularly",
    "followUp": "• Return in 2 weeks for blood pressure check\n• Cardiology consultation within 1 month",
    "nextSteps": "• ECG and cardiac enzymes\n• Lifestyle modifications for heart health\n• Monitor blood pressure daily"
  };

  console.log(formatCompleteResponse(exampleData));
}