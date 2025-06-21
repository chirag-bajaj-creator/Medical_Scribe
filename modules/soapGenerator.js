import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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'
});

export class SOAPGenerator {
  constructor() {
    this.templates = {
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
      'Emergency SOAP': {
        name: 'Emergency SOAP',
        description: 'Emergency department consultation',
        prompt: 'Generate a SOAP note for an emergency department consultation. Include triage assessment, acute symptoms, vital signs, emergency interventions, disposition planning, and urgent care recommendations.'
      },
      'Neurology SOAP': {
        name: 'Neurology SOAP',
        description: 'Neurological consultation',
        prompt: 'Generate a SOAP note for a neurology consultation. Include neurological examination, cognitive assessment, motor and sensory function, reflexes, neurological symptoms, and neurology-specific treatment plans.'
      }
    };
  }

  /**
   * Generate SOAP note from transcript using AI
   * @param {string} transcript - The cleaned transcript
   * @param {string} templateType - The SOAP template type
   * @returns {Promise<Object>} Generated SOAP data
   */
  async generateSOAP(transcript, templateType) {
    try {
      console.log(`🔄 Generating ${templateType} from transcript...`);

      // Validate template
      const template = this.templates[templateType];
      if (!template) {
        throw new Error(`Invalid template type: ${templateType}. Available: ${Object.keys(this.templates).join(', ')}`);
      }

      // Build the prompt
      const prompt = this.buildPrompt(transcript, template);

      // Generate SOAP using GPT
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert medical assistant AI with extensive clinical knowledge and a strong focus on patient safety. You help doctors by providing comprehensive medical documentation and practical clinical guidance. Always prioritize patient safety by including appropriate warnings, contraindications, maximum dosing limits, and emergency instructions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      const response = completion.choices[0].message.content;
      
      // Parse the JSON response
      const soapData = JSON.parse(response);
      
      // Validate the response structure
      this.validateSOAPData(soapData);

      console.log(`✅ ${templateType} generated successfully`);

      return {
        success: true,
        soapData: soapData,
        templateType: templateType
      };

    } catch (error) {
      console.error('❌ SOAP generation error:', error.message);
      
      return {
        success: false,
        error: error.message,
        soapData: null
      };
    }
  }

  /**
   * Build the AI prompt for SOAP generation
   * @param {string} transcript - The medical transcript
   * @param {Object} template - The template configuration
   * @returns {string} The complete prompt
   */
  buildPrompt(transcript, template) {
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
  "templateType": "${template.name}",
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

  /**
   * Validate SOAP data structure
   * @param {Object} soapData - The generated SOAP data
   * @throws {Error} If validation fails
   */
  validateSOAPData(soapData) {
    const requiredFields = ['SOAP_Note', 'summary', 'prescription', 'followUp', 'nextSteps'];
    const requiredSOAPFields = ['Subjective', 'Objective', 'Assessment', 'Plan'];

    // Check main fields
    for (const field of requiredFields) {
      if (!soapData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check SOAP note fields
    for (const field of requiredSOAPFields) {
      if (!soapData.SOAP_Note[field]) {
        throw new Error(`Missing required SOAP field: ${field}`);
      }
    }
  }

  /**
   * Get available templates
   * @returns {Array} Array of template information
   */
  getAvailableTemplates() {
    return Object.keys(this.templates).map(key => ({
      key: key,
      name: this.templates[key].name,
      description: this.templates[key].description
    }));
  }

  /**
   * Check if template exists
   * @param {string} templateType - Template type to check
   * @returns {boolean} True if template exists
   */
  isValidTemplate(templateType) {
    return templateType in this.templates;
  }
}