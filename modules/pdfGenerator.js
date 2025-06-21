import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFGenerator {
  constructor() {
    // Create PDFs directory if it doesn't exist
    this.pdfDir = path.join(path.dirname(__dirname), 'pdfs');
    if (!fs.existsSync(this.pdfDir)) {
      fs.mkdirSync(this.pdfDir, { recursive: true });
    }
  }

  /**
   * Generate PDF from SOAP data
   * @param {Object} soapData - The SOAP data object
   * @param {string} templateType - The template type used
   * @param {string} sessionId - Session ID for filename
   * @returns {Promise<Object>} PDF generation result
   */
  async generatePDF(soapData, templateType, sessionId) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`📄 Generating PDF for ${templateType}...`);

        // Create filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `clinical-summary-${sessionId}-${timestamp}.pdf`;
        const filePath = path.join(this.pdfDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        // Create write stream
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Generate PDF content
        this.addHeader(doc, templateType);
        this.addSOAPSection(doc, soapData.SOAP_Note);
        this.addSummarySection(doc, soapData.summary);
        this.addPrescriptionSection(doc, soapData.prescription);
        this.addFollowUpSection(doc, soapData.followUp);
        this.addNextStepsSection(doc, soapData.nextSteps);
        this.addFooter(doc, sessionId);

        // Handle stream completion
        stream.on('finish', () => {
          console.log(`✅ PDF generated: ${fileName}`);
          resolve({
            success: true,
            pdfPath: filePath,
            fileName: fileName
          });
        });

        stream.on('error', (error) => {
          console.error('❌ PDF stream error:', error);
          reject(error);
        });

        // Finalize the PDF
        doc.end();

      } catch (error) {
        console.error('❌ PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} templateType - Template type
   */
  addHeader(doc, templateType) {
    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Clinical Summary Report', { align: 'center' })
       .moveDown(0.3);

    // Template type
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(`Template: ${templateType}`, { align: 'center' })
       .moveDown(0.3);

    // Date
    doc.fontSize(12)
       .text(`Generated: ${new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, { align: 'center' })
       .moveDown(1);

    // Separator line
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke()
       .moveDown(1);
  }

  /**
   * Add SOAP section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} soapNote - SOAP note data
   */
  addSOAPSection(doc, soapNote) {
    this.addSectionTitle(doc, 'SOAP Note');

    const soapSections = [
      { title: 'Subjective', content: soapNote.Subjective, color: '#f39c12' },
      { title: 'Objective', content: soapNote.Objective, color: '#3498db' },
      { title: 'Assessment', content: soapNote.Assessment, color: '#9b59b6' },
      { title: 'Plan', content: soapNote.Plan, color: '#27ae60' }
    ];

    soapSections.forEach(section => {
      this.checkPageBreak(doc);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(section.color)
         .text(section.title + ':', { continued: false })
         .moveDown(0.2);

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#2c3e50')
         .text(section.content, { 
           align: 'left',
           lineGap: 2
         })
         .moveDown(0.5);
    });

    this.addSectionSeparator(doc);
  }

  /**
   * Add summary section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} summary - Summary text
   */
  addSummarySection(doc, summary) {
    this.checkPageBreak(doc);
    this.addSectionTitle(doc, 'Summary');
    this.addSectionContent(doc, summary);
    this.addSectionSeparator(doc);
  }

  /**
   * Add prescription section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} prescription - Prescription text
   */
  addPrescriptionSection(doc, prescription) {
    this.checkPageBreak(doc);
    this.addSectionTitle(doc, 'Prescription');
    this.addSectionContent(doc, prescription);
    this.addSectionSeparator(doc);
  }

  /**
   * Add follow-up section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} followUp - Follow-up text
   */
  addFollowUpSection(doc, followUp) {
    this.checkPageBreak(doc);
    this.addSectionTitle(doc, 'Follow-Up Instructions');
    this.addSectionContent(doc, followUp);
    this.addSectionSeparator(doc);
  }

  /**
   * Add next steps section to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} nextSteps - Next steps text
   */
  addNextStepsSection(doc, nextSteps) {
    this.checkPageBreak(doc);
    this.addSectionTitle(doc, 'Next Steps');
    this.addSectionContent(doc, nextSteps);
  }

  /**
   * Add section title
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Section title
   */
  addSectionTitle(doc, title) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text(title, { continued: false })
       .moveDown(0.3);
  }

  /**
   * Add section content
   * @param {PDFDocument} doc - PDF document
   * @param {string} content - Section content
   */
  addSectionContent(doc, content) {
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#34495e')
       .text(content, { 
         align: 'left',
         lineGap: 2
       })
       .moveDown(0.8);
  }

  /**
   * Add section separator
   * @param {PDFDocument} doc - PDF document
   */
  addSectionSeparator(doc) {
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#ecf0f1')
       .lineWidth(0.5)
       .stroke()
       .moveDown(0.8);
  }

  /**
   * Check if page break is needed
   * @param {PDFDocument} doc - PDF document
   */
  checkPageBreak(doc) {
    if (doc.y > 700) {
      doc.addPage();
    }
  }

  /**
   * Add footer to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {string} sessionId - Session ID
   */
  addFooter(doc, sessionId) {
    const range = doc.bufferedPageRange();
    
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#7f8c8d')
         .text(
           `Page ${i - range.start + 1} of ${range.count} | Session: ${sessionId} | Generated: ${new Date().toLocaleDateString()}`,
           50,
           doc.page.height - 30,
           { align: 'center' }
         );
    }
  }
}