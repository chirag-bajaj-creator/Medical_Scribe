import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

export class OCRProcessor {
  constructor() {
    this.supportedFormats = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.pdf'];
  }

  /**
   * Extract text from image using OCR
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} OCR extraction result
   */
  async extractText(imagePath) {
    try {
      console.log(`🔍 Processing image with OCR: ${path.basename(imagePath)}`);

      // Validate file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Validate file format
      const ext = path.extname(imagePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`);
      }

      // Get file stats
      const stats = fs.statSync(imagePath);
      const fileSizeKB = Math.round(stats.size / 1024);

      console.log(`📊 File size: ${fileSizeKB} KB`);

      // Perform OCR
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            if (progress % 20 === 0) { // Log every 20%
              console.log(`🔍 OCR Progress: ${progress}%`);
            }
          }
        }
      });

      // Clean extracted text
      const cleanedText = this.cleanExtractedText(result.data.text);
      const confidence = result.data.confidence;

      console.log(`✅ OCR completed: ${cleanedText.length} characters`);
      console.log(`🎯 Confidence: ${confidence.toFixed(2)}%`);

      return {
        success: true,
        text: cleanedText,
        confidence: confidence,
        characterCount: cleanedText.length,
        wordCount: cleanedText.split(/\s+/).filter(word => word.length > 0).length,
        fileSize: fileSizeKB,
        format: ext
      };

    } catch (error) {
      console.error('❌ OCR processing error:', error.message);
      
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0,
        characterCount: 0,
        wordCount: 0
      };
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} rawText - Raw text from OCR
   * @returns {string} Cleaned text
   */
  cleanExtractedText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    return rawText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n')
      // Remove empty lines
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  /**
   * Validate image file format
   * @param {string} filePath - Path to the image file
   * @returns {boolean} True if format is supported
   */
  isValidImageFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  /**
   * Get supported image formats
   * @returns {Array} Array of supported file extensions
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Estimate text quality based on various factors
   * @param {string} text - Extracted text
   * @param {number} confidence - OCR confidence score
   * @returns {Object} Quality assessment
   */
  assessTextQuality(text, confidence) {
    const assessment = {
      confidence: confidence,
      length: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      hasNumbers: /\d/.test(text),
      hasSpecialChars: /[^\w\s]/.test(text),
      quality: 'good'
    };

    // Determine overall quality
    if (confidence < 70) {
      assessment.quality = 'poor';
    } else if (confidence < 85) {
      assessment.quality = 'fair';
    } else if (confidence >= 95) {
      assessment.quality = 'excellent';
    }

    return assessment;
  }
}