/**
 * SOAP Template Selector - Handles template selection and customized prompts
 */

export const SOAP_TEMPLATES = {
  'Practice SOAP': {
    name: 'Practice SOAP',
    description: 'General practice consultation',
    prompt: 'Generate a comprehensive SOAP note for a general practice consultation. Include vital signs, general health assessment, and routine care recommendations.'
  },
  'Pediatrics SOAP': {
    name: 'Pediatrics SOAP',
    description: 'Pediatric consultation',
    prompt: 'Generate a SOAP note tailored for a pediatric consultation. Include child\'s age, weight, height, developmental milestones, immunization status, growth parameters, parent/guardian concerns, and age-appropriate treatment plans.'
  },
  'Cardiology SOAP': {
    name: 'Cardiology SOAP',
    description: 'Cardiovascular consultation',
    prompt: 'Generate a SOAP note for a cardiology consultation. Focus on cardiovascular symptoms, heart rate, blood pressure, ECG findings, cardiac risk factors, chest pain assessment, and cardiac-specific treatment plans.'
  },
  'Orthopedics SOAP': {
    name: 'Orthopedics SOAP',
    description: 'Orthopedic consultation',
    prompt: 'Generate a SOAP note for an orthopedic consultation. Include musculoskeletal examination, range of motion, pain assessment, imaging findings, mobility status, and orthopedic treatment recommendations.'
  },
  'Mental Health SOAP': {
    name: 'Mental Health SOAP',
    description: 'Mental health consultation',
    prompt: 'Generate a SOAP note for a mental health consultation. Include mental status examination, mood assessment, cognitive function, risk assessment, psychiatric history, and mental health treatment plans with appropriate safety considerations.'
  },
  'Dermatology SOAP': {
    name: 'Dermatology SOAP',
    description: 'Dermatological consultation',
    prompt: 'Generate a SOAP note for a dermatology consultation. Include skin examination findings, lesion descriptions, dermatological history, skin condition assessment, and dermatology-specific treatment recommendations.'
  },
  'Gynecology SOAP': {
    name: 'Gynecology SOAP',
    description: 'Gynecological consultation',
    prompt: 'Generate a SOAP note for a gynecology consultation. Include menstrual history, reproductive health, pelvic examination findings, gynecological symptoms, and women\'s health-specific care plans.'
  },
  'ENT SOAP': {
    name: 'ENT SOAP',
    description: 'Ear, Nose, Throat consultation',
    prompt: 'Generate a SOAP note for an ENT consultation. Include ear, nose, and throat examination, hearing assessment, respiratory symptoms, ENT-specific findings, and otolaryngology treatment plans.'
  },
  'Neurology SOAP': {
    name: 'Neurology SOAP',
    description: 'Neurological consultation',
    prompt: 'Generate a SOAP note for a neurology consultation. Include neurological examination, cognitive assessment, motor and sensory function, reflexes, neurological symptoms, and neurology-specific treatment plans.'
  },
  'Gastro SOAP': {
    name: 'Gastro SOAP',
    description: 'Gastroenterology consultation',
    prompt: 'Generate a SOAP note for a gastroenterology consultation. Include gastrointestinal symptoms, abdominal examination, digestive health history, and gastroenterology-specific treatment recommendations.'
  },
  'Pulmonology SOAP': {
    name: 'Pulmonology SOAP',
    description: 'Pulmonology consultation',
    prompt: 'Generate a SOAP note for a pulmonology consultation. Include respiratory symptoms, lung function assessment, breathing patterns, chest examination, and pulmonary-specific treatment plans.'
  },
  'Emergency SOAP': {
    name: 'Emergency SOAP',
    description: 'Emergency department consultation',
    prompt: 'Generate a SOAP note for an emergency department consultation. Include triage assessment, acute symptoms, vital signs, emergency interventions, disposition planning, and urgent care recommendations.'
  },
  'Diabetology SOAP': {
    name: 'Diabetology SOAP',
    description: 'Diabetes and endocrine consultation',
    prompt: 'Generate a SOAP note for a diabetology consultation. Include blood glucose levels, HbA1c, diabetic complications assessment, endocrine function, and diabetes management plans.'
  },
  'Obstetrics SOAP': {
    name: 'Obstetrics SOAP',
    description: 'Obstetric consultation',
    prompt: 'Generate a SOAP note for an obstetrics consultation. Include gestational age, fetal development, maternal health, prenatal care, and obstetric-specific monitoring and care plans.'
  },
  'Oncology SOAP': {
    name: 'Oncology SOAP',
    description: 'Oncology consultation',
    prompt: 'Generate a SOAP note for an oncology consultation. Include cancer staging, treatment response, side effects assessment, performance status, and oncology-specific treatment plans with supportive care.'
  },
  'Nephrology SOAP': {
    name: 'Nephrology SOAP',
    description: 'Nephrology consultation',
    prompt: 'Generate a SOAP note for a nephrology consultation. Include kidney function assessment, fluid balance, electrolyte status, renal symptoms, and nephrology-specific treatment recommendations.'
  },
  'Urology SOAP': {
    name: 'Urology SOAP',
    description: 'Urological consultation',
    prompt: 'Generate a SOAP note for a urology consultation. Include urogenital symptoms, urological examination, kidney and bladder function, and urology-specific treatment plans.'
  },
  'Rehab SOAP': {
    name: 'Rehab SOAP',
    description: 'Rehabilitation consultation',
    prompt: 'Generate a SOAP note for a rehabilitation consultation. Include functional assessment, mobility status, rehabilitation goals, therapy progress, and rehabilitation-specific treatment plans.'
  }
};

/**
 * Get list of available templates
 * @returns {Array} Array of template objects
 */
export function getAvailableTemplates() {
  return Object.keys(SOAP_TEMPLATES).map(key => ({
    key: key,
    name: SOAP_TEMPLATES[key].name,
    description: SOAP_TEMPLATES[key].description
  }));
}

/**
 * Get template by key
 * @param {string} templateKey - The template key
 * @returns {Object|null} Template object or null if not found
 */
export function getTemplate(templateKey) {
  return SOAP_TEMPLATES[templateKey] || null;
}

/**
 * Display template selection prompt
 * @returns {string} Formatted template selection text
 */
export function displayTemplateOptions() {
  const templates = getAvailableTemplates();
  
  let output = '🩺 Please select the SOAP template that fits your consultation:\n\n';
  
  templates.forEach((template, index) => {
    output += `${index + 1}. ${template.name} - ${template.description}\n`;
  });
  
  output += '\n💡 Enter the number (1-18) of your chosen template:';
  
  return output;
}

/**
 * Validate template selection
 * @param {string|number} selection - User's template selection
 * @returns {Object} Validation result with template info
 */
export function validateTemplateSelection(selection) {
  const templates = getAvailableTemplates();
  const selectionNum = parseInt(selection, 10);
  
  if (isNaN(selectionNum) || selectionNum < 1 || selectionNum > templates.length) {
    return {
      valid: false,
      error: `Invalid selection. Please enter a number between 1 and ${templates.length}.`
    };
  }
  
  const selectedTemplate = templates[selectionNum - 1];
  const templateData = getTemplate(selectedTemplate.key);
  
  return {
    valid: true,
    templateKey: selectedTemplate.key,
    templateName: selectedTemplate.name,
    templateData: templateData
  };
}

/**
 * Build customized GPT prompt based on template
 * @param {string} templateKey - The selected template key
 * @param {string} transcript - The medical transcript
 * @returns {string} Customized GPT prompt
 */
export function buildTemplatePrompt(templateKey, transcript) {
  const template = getTemplate(templateKey);
  
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }
  
  return `You are an expert medical assistant AI specializing in ${template.name}. ${template.prompt}

Transcript: "${transcript}"

IMPORTANT: Generate detailed, practical information for each section specific to ${template.name}. Do not leave any section empty or vague.

CRITICAL SAFETY REQUIREMENTS FOR PRESCRIPTIONS:
- Always include clear dosing instructions with maximum daily limits
- For PRN (as needed) medications, specify maximum frequency and total daily dose
- Include specific safety warnings and contraindications
- For emergency medications like nitroglycerin, provide clear protocols with proper timing
- Never suggest dangerous dosing patterns without proper medical supervision

Provide a complete medical response with:

1. SOAP NOTE (Medical Documentation for ${template.name}):
   - Subjective: Patient's symptoms, complaints, history, concerns they mentioned
   - Objective: Physical findings, vital signs, examination results, observable data
   - Assessment: Clinical diagnosis, differential diagnosis, medical impression
   - Plan: Treatment approach, management strategy, medical recommendations

2. SUMMARY: 1-2 sentences summarizing the key medical findings and plan

3. PRESCRIPTION SHEET (For Pharmacist & Patient):
   Format each medicine exactly like this:
   • Medicine Name (Strength/Dosage Form)
      - Dosage: [How much, how often, when to take]
      - Duration: [How many days/weeks]
      - Maximum: [Daily/weekly limits for safety]
      - Instructions: [Special instructions, food interactions, timing]
      - ⚠️ Warning: [Important safety information]

4. FOLLOW-UP REMINDER (For Patient & Doctor):
   • When: [Specific timeframe with clear reasoning]
   • Reason: [Why follow-up is needed - monitor progress, check response, adjust treatment]
   • Warning signs: [Specific symptoms requiring immediate medical attention]
   • Emergency: [When to call 911 or go to ER immediately]

5. NEXT STEP SUGGESTIONS (For Doctor & Patient):
   • Laboratory tests: [Specific tests with timing and reasoning]
   • Imaging: [Specific studies if clinically indicated]
   • Specialist referral: [Which specialist and urgency level]
   • Monitoring: [What to track, how often, normal vs concerning values]
   • Lifestyle: [Specific modifications with measurable goals]

CRITICAL: Prioritize patient safety. Include appropriate warnings, contraindications, and emergency instructions for all medications and treatments.

Return response in this exact JSON format:
{
  "templateType": "${templateKey}",
  "SOAP_Note": {
    "Subjective": "Detailed patient complaints and history...",
    "Objective": "Physical examination findings and vital signs...",
    "Assessment": "Clinical diagnosis and medical impression...",
    "Plan": "Treatment plan and management approach..."
  },
  "summary": "Brief summary of condition and treatment plan...",
  "prescription": "• Medicine Name (Strength)\\n   - Dosage: Safe dosing instructions\\n   - Duration: Time period\\n   - Maximum: Daily/weekly limits\\n   - Instructions: Special notes\\n   - ⚠️ Warning: Safety information\\n\\n• Additional medicines with complete safety info...",
  "followUp": "• When: Specific timeframe\\n• Reason: Why follow-up needed\\n• Warning signs: Symptoms requiring immediate attention\\n• Emergency: When to seek immediate care",
  "nextSteps": "• Laboratory: Specific tests with timing\\n• Imaging: Studies if needed\\n• Monitoring: What to track and how often\\n• Lifestyle: Specific modifications\\n• Emergency plan: Clear instructions for urgent situations"
}`;
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing Template Selector...');
  
  // Display template options
  console.log(displayTemplateOptions());
  
  // Test template validation
  console.log('\n🔍 Testing template validation:');
  
  const testSelections = ['1', '5', '18', '0', '19', 'abc'];
  
  testSelections.forEach(selection => {
    const result = validateTemplateSelection(selection);
    if (result.valid) {
      console.log(`✅ Selection "${selection}": ${result.templateName}`);
    } else {
      console.log(`❌ Selection "${selection}": ${result.error}`);
    }
  });
  
  // Test prompt building
  console.log('\n📝 Testing prompt building:');
  const testPrompt = buildTemplatePrompt('Cardiology SOAP', 'Patient reports chest pain...');
  console.log(`✅ Generated prompt length: ${testPrompt.length} characters`);
  console.log(`📋 Template type included: ${testPrompt.includes('Cardiology SOAP')}`);
}