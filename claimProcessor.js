/**
 * Medical Claim Processor
 * Processes OCR extracted text from medical bills and extracts bill information
 */

/**
 * Sample OCR extracted text from a medical bill
 * This would typically come from your OCR extractor
 */
const SAMPLE_OCR_TEXT = `
Apollo Hospitals
Enterprise Limited
Jubilee Hills, Hyderabad - 500033
Tel: +91-40-23607777

MEDICAL BILL
Bill No: APL-2025-001234
Date: 15-Jun-2025
Patient: John Smith
Registration No: REG123456

SERVICES PROVIDED:
Consultation Fee         Rs. 1,500
Laboratory Tests         Rs. 2,800
Medicines               Rs. 1,200
Room Charges            Rs. 5,000
Total Amount:           Rs. 10,500

Payment Status: Paid
Payment Method: Credit Card
Transaction ID: TXN789012345

Thank you for choosing Apollo Hospitals
`;

/**
 * Extract medical bill information from OCR text
 * @param {string} ocrText - Raw OCR extracted text
 * @returns {Object} Extracted bill information
 */
export function extractBillInfo(ocrText) {
  const billInfo = {
    hospitalName: '',
    amount: '',
    billDate: '',
    billNumber: '',
    patientName: ''
  };

  try {
    // Extract hospital name (look for common hospital patterns)
    const hospitalPatterns = [
      /([A-Za-z\s]+(?:Hospital|Medical|Clinic|Healthcare|Centre|Center)[A-Za-z\s]*)/i,
      /^([A-Za-z\s]+)\n/m // First line often contains hospital name
    ];

    for (const pattern of hospitalPatterns) {
      const hospitalMatch = ocrText.match(pattern);
      if (hospitalMatch) {
        billInfo.hospitalName = hospitalMatch[1].trim();
        break;
      }
    }

    // Extract amount (look for total amount patterns)
    const amountPatterns = [
      /Total\s*Amount[:\s]*Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /Total[:\s]*Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /Amount[:\s]*Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/g // Last resort - any Rs. amount
    ];

    for (const pattern of amountPatterns) {
      const amountMatch = ocrText.match(pattern);
      if (amountMatch) {
        billInfo.amount = `Rs. ${amountMatch[1]}`;
        break;
      }
    }

    // Extract bill date
    const datePatterns = [
      /Date[:\s]*([0-9]{1,2}[-\/][A-Za-z]{3}[-\/][0-9]{4})/i,
      /Date[:\s]*([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{4})/i,
      /([0-9]{1,2}[-\/][A-Za-z]{3}[-\/][0-9]{4})/g,
      /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{4})/g
    ];

    for (const pattern of datePatterns) {
      const dateMatch = ocrText.match(pattern);
      if (dateMatch) {
        billInfo.billDate = dateMatch[1];
        break;
      }
    }

    // Extract bill number
    const billNumberPatterns = [
      /Bill\s*No[:\s]*([A-Z0-9\-]+)/i,
      /Invoice\s*No[:\s]*([A-Z0-9\-]+)/i,
      /Receipt\s*No[:\s]*([A-Z0-9\-]+)/i
    ];

    for (const pattern of billNumberPatterns) {
      const billNumberMatch = ocrText.match(pattern);
      if (billNumberMatch) {
        billInfo.billNumber = billNumberMatch[1];
        break;
      }
    }

    // Extract patient name
    const patientPatterns = [
      /Patient[:\s]*([A-Za-z\s]+)/i,
      /Name[:\s]*([A-Za-z\s]+)/i
    ];

    for (const pattern of patientPatterns) {
      const patientMatch = ocrText.match(pattern);
      if (patientMatch) {
        billInfo.patientName = patientMatch[1].trim();
        break;
      }
    }

    // Clean up extracted data
    billInfo.hospitalName = billInfo.hospitalName.replace(/\n.*/, '').trim();
    billInfo.patientName = billInfo.patientName.replace(/\n.*/, '').trim();

  } catch (error) {
    console.error('❌ Error extracting bill info:', error.message);
  }

  return billInfo;
}

// CLI Test function - Test the extraction with sample data
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing Bill Information Extraction...');
  console.log('═'.repeat(60));
  
  // Test the extraction function with sample OCR text
  const extractedInfo = extractBillInfo(SAMPLE_OCR_TEXT);
  
  console.log('📋 Extracted Information:');
  console.log(`   Hospital: ${extractedInfo.hospitalName}`);
  console.log(`   Amount: ${extractedInfo.amount}`);
  console.log(`   Date: ${extractedInfo.billDate}`);
  console.log(`   Bill No: ${extractedInfo.billNumber}`);
  console.log(`   Patient: ${extractedInfo.patientName}`);
  
  console.log('\n💡 Usage:');
  console.log('   import { extractBillInfo } from "./claimProcessor.js";');
  console.log('   const info = extractBillInfo(ocrText);');
}