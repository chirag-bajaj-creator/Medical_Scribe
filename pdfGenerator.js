import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a clean, printable PDF from clinical summary text
 * @param {string} clinicalText - Full clinical summary text with SOAP notes, prescription, and follow-up
 * @param {string} fileName - Optional custom filename (default: 'clinical-summary.pdf')
 * @returns {Promise<string>} Path to the generated PDF file
 */
export async function generateClinicalPDF(clinicalText, fileName = 'clinical-summary.pdf') {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Set up the output file path
      const outputPath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(outputPath);
      
      // Pipe the PDF to the file stream
      doc.pipe(stream);

      // Add header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Clinical Summary Report', { align: 'center' })
         .moveDown(0.5);

      // Add date
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Generated: ${new Date().toLocaleDateString('en-US', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
         })}`, { align: 'center' })
         .moveDown(1);

      // Draw a line separator
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke()
         .moveDown(1);

      // Parse and format the clinical text
      const sections = parseClinicalText(clinicalText);

      // Define section styling
      const sectionTitleStyle = {
        fontSize: 14,
        font: 'Helvetica-Bold'
      };

      const sectionContentStyle = {
        fontSize: 11,
        font: 'Helvetica'
      };

      // Add each section to the PDF
      sections.forEach((section, index) => {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Section title
        doc.fontSize(sectionTitleStyle.fontSize)
           .font(sectionTitleStyle.font)
           .fillColor('#2c3e50')
           .text(section.title, { continued: false })
           .moveDown(0.3);

        // Section content
        doc.fontSize(sectionContentStyle.fontSize)
           .font(sectionContentStyle.font)
           .fillColor('#34495e')
           .text(section.content, { 
             align: 'left',
             lineGap: 2
           })
           .moveDown(0.8);

        // Add separator line between sections (except last)
        if (index < sections.length - 1) {
          doc.moveTo(50, doc.y)
             .lineTo(545, doc.y)
             .strokeColor('#bdc3c7')
             .lineWidth(0.5)
             .stroke()
             .moveDown(0.8);
        }
      });

      // Add footer to all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#7f8c8d')
           .text(
             `Page ${i - range.start + 1} of ${range.count} | Clinical Summary Report`,
             50,
             doc.page.height - 30,
             { align: 'center' }
           );
      }

      // Handle stream completion
      stream.on('finish', () => {
        console.log(`✅ PDF generated successfully: ${outputPath}`);
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        console.error('❌ Stream error:', error);
        reject(error);
      });

      // End the document - this triggers the 'finish' event
      doc.end();

    } catch (error) {
      console.error('❌ PDF creation error:', error);
      reject(error);
    }
  });
}

/**
 * Parse clinical text into structured sections
 * @param {string} clinicalText - Raw clinical summary text
 * @returns {Array} Array of section objects with title and content
 */
function parseClinicalText(clinicalText) {
  const sections = [];
  
  // Define section patterns and their display titles
  const sectionPatterns = [
    { pattern: /🧾 SOAP Note/i, title: 'SOAP Note', isHeader: true },
    { pattern: /🟡 Subjective:/i, title: 'Subjective', emoji: '🟡' },
    { pattern: /🔵 Objective:/i, title: 'Objective', emoji: '🔵' },
    { pattern: /🟣 Assessment:/i, title: 'Assessment', emoji: '🟣' },
    { pattern: /🟢 Plan:/i, title: 'Plan', emoji: '🟢' },
    { pattern: /📝 Summary:/i, title: 'Summary', emoji: '📝' },
    { pattern: /🏥 Clinical Response/i, title: 'Clinical Response', isHeader: true },
    { pattern: /💊 Prescription Sheet/i, title: 'Prescription', emoji: '💊' },
    { pattern: /📅 Follow-Up Reminder/i, title: 'Follow-Up Instructions', emoji: '📅' },
    { pattern: /🧭 Next Step Suggestions/i, title: 'Next Steps', emoji: '🧭' }
  ];

  // Split text into lines and process
  const lines = clinicalText.split('\n');
  let currentSection = null;
  let currentContent = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines and separators
    if (!trimmedLine || trimmedLine === '---') {
      return;
    }

    // Check if this line starts a new section
    const matchedPattern = sectionPatterns.find(pattern => 
      pattern.pattern.test(trimmedLine)
    );

    if (matchedPattern) {
      // Save previous section if it exists
      if (currentSection && currentContent.length > 0) {
        sections.push({
          title: currentSection.title,
          content: currentContent.join('\n').trim()
        });
      }

      // Skip header sections, start new content section
      if (!matchedPattern.isHeader) {
        currentSection = matchedPattern;
        currentContent = [];
        
        // Remove the section title from the line
        const contentLine = trimmedLine.replace(matchedPattern.pattern, '').trim();
        if (contentLine) {
          currentContent.push(contentLine);
        }
      } else {
        currentSection = null;
        currentContent = [];
      }
    } else if (currentSection) {
      // Add content to current section
      currentContent.push(trimmedLine);
    }
  });

  // Add the last section
  if (currentSection && currentContent.length > 0) {
    sections.push({
      title: currentSection.title,
      content: currentContent.join('\n').trim()
    });
  }

  return sections;
}

/**
 * Generate PDF from medical data object (alternative interface)
 * @param {Object} medicalData - Structured medical data from medicalTranscriber.js
 * @param {string} fileName - Optional custom filename
 * @returns {Promise<string>} Path to the generated PDF file
 */
export async function generatePDFFromMedicalData(medicalData, fileName = 'clinical-summary.pdf') {
  if (!medicalData || !medicalData.formatted) {
    throw new Error('Invalid medical data provided. Expected formatted text.');
  }
  
  return generateClinicalPDF(medicalData.formatted, fileName);
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test with sample clinical text
  const sampleClinicalText = `🧾 SOAP Note

🟡 Subjective:
Patient reports chest pain and shortness of breath for the past 2 hours. Pain is described as crushing, radiating to left arm. Associated with nausea and diaphoresis.

🔵 Objective:
Blood pressure 140/90 mmHg, heart rate 95 bpm, respiratory rate 22/min, oxygen saturation 96% on room air. Patient appears anxious and diaphoretic. Chest examination reveals clear lung sounds bilaterally.

🟣 Assessment:
Possible acute coronary syndrome. Differential diagnosis includes unstable angina, myocardial infarction, and anxiety disorder.

🟢 Plan:
Immediate ECG, cardiac enzymes (troponin), chest X-ray. Cardiology consultation. Continuous cardiac monitoring. Aspirin 325mg given.

📝 Summary:
Patient with acute chest pain requiring immediate cardiac evaluation and monitoring.

---

🏥 Clinical Response

💊 Prescription Sheet
• Aspirin 81mg
   - Dosage: Once daily with food
   - Duration: Ongoing
   - Instructions: For cardiovascular protection

• Nitroglycerin 0.4mg sublingual
   - Dosage: As needed for chest pain
   - Duration: PRN
   - Instructions: Maximum 3 doses in 15 minutes

📅 Follow-Up Reminder
• Return in 24-48 hours for repeat cardiac enzymes
• Immediate return if chest pain worsens or new symptoms develop
• Cardiology appointment within 1 week

🧭 Next Step Suggestions
• Complete cardiac workup including stress test
• Lifestyle modifications for cardiovascular health
• Monitor blood pressure daily
• Smoking cessation counseling if applicable`;

  console.log('🎯 Testing PDF Generation...');
  
  generateClinicalPDF(sampleClinicalText)
    .then(pdfPath => {
      console.log('\n✅ PDF generation test complete!');
      console.log(`📄 PDF saved to: ${pdfPath}`);
      
      // Check if file exists and has content
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`📊 File size: ${stats.size} bytes`);
        if (stats.size > 0) {
          console.log('✅ PDF file appears to be valid');
        } else {
          console.log('❌ PDF file is empty');
        }
      } else {
        console.log('❌ PDF file was not created');
      }
    })
    .catch(err => {
      console.error('❌ PDF generation test failed:', err.message);
    });
}