import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OCR Text Extractor using Tesseract.js
 * Extracts text from image files (PNG, JPG, JPEG, etc.)
 */
export class OCRExtractor {
  constructor() {
    this.supportedFormats = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
  }

  /**
   * Extract text from image file using Tesseract.js
   * @param {string|Buffer|File} imageInput - Image file path, buffer, or File object
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result with extracted text
   */
  async extractText(imageInput, options = {}) {
    try {
      console.log('🔍 Starting OCR text extraction...');
      
      // Validate input
      const validation = this.validateInput(imageInput);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Set default options
      const ocrOptions = {
        lang: options.language || 'eng',
        logger: options.verbose ? this.createLogger() : undefined,
        ...options
      };

      console.log(`📖 Using language: ${ocrOptions.lang}`);
      
      // Perform OCR
      const result = await Tesseract.recognize(imageInput, ocrOptions.lang, {
        logger: ocrOptions.logger
      });

      // Extract and clean text
      const extractedText = this.cleanExtractedText(result.data.text);
      
      console.log('✅ OCR extraction completed successfully');
      console.log(`📝 Extracted ${extractedText.length} characters`);

      return {
        success: true,
        text: extractedText,
        confidence: result.data.confidence,
        metadata: {
          language: ocrOptions.lang,
          processingTime: Date.now(),
          wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
          characterCount: extractedText.length,
          confidence: result.data.confidence
        },
        rawData: options.includeRawData ? result.data : undefined
      };

    } catch (error) {
      console.error('❌ OCR extraction error:', error.message);
      
      return {
        success: false,
        error: error.message,
        errorType: this.categorizeError(error),
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Extract text from image file path
   * @param {string} imagePath - Path to image file
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result
   */
  async extractFromFile(imagePath, options = {}) {
    try {
      // Validate file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Validate file format
      const ext = path.extname(imagePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`);
      }

      console.log(`📁 Processing image file: ${path.basename(imagePath)}`);
      
      return await this.extractText(imagePath, options);

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'FILE_ERROR',
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Extract text from image buffer
   * @param {Buffer} imageBuffer - Image buffer data
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result
   */
  async extractFromBuffer(imageBuffer, options = {}) {
    try {
      if (!Buffer.isBuffer(imageBuffer)) {
        throw new Error('Invalid buffer provided');
      }

      if (imageBuffer.length === 0) {
        throw new Error('Empty buffer provided');
      }

      console.log(`📊 Processing image buffer: ${imageBuffer.length} bytes`);
      
      return await this.extractText(imageBuffer, options);

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'BUFFER_ERROR',
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Extract text from File object (browser environment)
   * @param {File} imageFile - File object from file input
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result
   */
  async extractFromFileObject(imageFile, options = {}) {
    try {
      if (!imageFile || typeof imageFile.type !== 'string') {
        throw new Error('Invalid File object provided');
      }

      // Validate MIME type
      const validMimeTypes = [
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 
        'image/bmp', 'image/tiff', 'image/webp'
      ];
      
      if (!validMimeTypes.includes(imageFile.type)) {
        throw new Error(`Unsupported MIME type: ${imageFile.type}`);
      }

      console.log(`📎 Processing file: ${imageFile.name} (${imageFile.type})`);
      
      return await this.extractText(imageFile, options);

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'FILE_OBJECT_ERROR',
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Batch process multiple images
   * @param {Array} imageInputs - Array of image paths, buffers, or File objects
   * @param {Object} options - OCR options
   * @returns {Promise<Array>} Array of OCR results
   */
  async extractFromMultiple(imageInputs, options = {}) {
    console.log(`🔄 Processing ${imageInputs.length} images...`);
    
    const results = [];
    
    for (let i = 0; i < imageInputs.length; i++) {
      const imageInput = imageInputs[i];
      console.log(`\n📍 Processing image ${i + 1}/${imageInputs.length}`);
      
      try {
        const result = await this.extractText(imageInput, options);
        results.push({
          index: i,
          input: typeof imageInput === 'string' ? path.basename(imageInput) : `Image ${i + 1}`,
          ...result
        });
      } catch (error) {
        results.push({
          index: i,
          input: typeof imageInput === 'string' ? path.basename(imageInput) : `Image ${i + 1}`,
          success: false,
          error: error.message,
          text: '',
          confidence: 0
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ Batch processing complete: ${successCount}/${imageInputs.length} successful`);
    
    return results;
  }

  /**
   * Validate input type and format
   * @param {*} input - Input to validate
   * @returns {Object} Validation result
   */
  validateInput(input) {
    // String (file path)
    if (typeof input === 'string') {
      return { valid: true, type: 'path' };
    }
    
    // Buffer
    if (Buffer.isBuffer(input)) {
      return { valid: true, type: 'buffer' };
    }
    
    // File object (browser)
    if (input && typeof input === 'object' && input.type && input.name) {
      return { valid: true, type: 'file' };
    }
    
    return {
      valid: false,
      error: 'Invalid input type. Expected: file path (string), Buffer, or File object'
    };
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
      // Remove common OCR artifacts
      .replace(/[^\w\s\.,!?;:()\-'"]/g, '')
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n')
      // Remove empty lines
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  /**
   * Create logger for verbose output
   * @returns {Function} Logger function
   */
  createLogger() {
    return (m) => {
      if (m.status === 'recognizing text') {
        const progress = Math.round(m.progress * 100);
        process.stdout.write(`\r🔍 OCR Progress: ${progress}%`);
      }
    };
  }

  /**
   * Categorize errors for better error handling
   * @param {Error} error - The error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) return 'FILE_NOT_FOUND';
    if (message.includes('unsupported')) return 'UNSUPPORTED_FORMAT';
    if (message.includes('invalid')) return 'INVALID_INPUT';
    if (message.includes('buffer')) return 'BUFFER_ERROR';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('tesseract')) return 'TESSERACT_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get supported image formats
   * @returns {Array} Array of supported file extensions
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }
}

/**
 * Automatically detect image files in the workspace
 * @returns {Promise<string>} Path to the image file to use
 */
export async function detectImageFile() {
  try {
    // Supported image file extensions
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
    
    // Read all files in the current directory
    const files = fs.readdirSync(__dirname);
    
    // Filter for image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    if (imageFiles.length === 0) {
      throw new Error('No image files found in workspace. Please add an image file (.png, .jpg, .jpeg, etc.)');
    }
    
    // If multiple image files, prioritize by common naming patterns
    const prioritizedFile = prioritizeImageFile(imageFiles);
    
    console.log(`🖼️ Auto-detected image file: ${prioritizedFile}`);
    if (imageFiles.length > 1) {
      console.log(`📁 Other image files found: ${imageFiles.filter(f => f !== prioritizedFile).join(', ')}`);
    }
    
    return prioritizedFile;
    
  } catch (error) {
    console.error('❌ Image detection error:', error.message);
    throw error;
  }
}

/**
 * Prioritize which image file to use when multiple are found
 * @param {string[]} imageFiles - Array of image file names
 * @returns {string} The prioritized image file name
 */
function prioritizeImageFile(imageFiles) {
  // Priority order:
  // 1. Files with "document", "prescription", "medical" in name
  // 2. Files with "scan", "photo" in name
  // 3. Most recently modified file
  // 4. Alphabetically first
  
  // Check for medical/document files
  const medicalFiles = imageFiles.filter(file => {
    const name = file.toLowerCase();
    return name.includes('document') || 
           name.includes('prescription') || 
           name.includes('medical') ||
           name.includes('report') ||
           name.includes('lab');
  });
  
  if (medicalFiles.length > 0) {
    return medicalFiles[0];
  }
  
  // Check for scan/photo files
  const scanFiles = imageFiles.filter(file => {
    const name = file.toLowerCase();
    return name.includes('scan') || name.includes('photo');
  });
  
  if (scanFiles.length > 0) {
    return scanFiles[0];
  }
  
  // Get most recently modified file
  try {
    const filesWithStats = imageFiles.map(file => ({
      name: file,
      mtime: fs.statSync(path.join(__dirname, file)).mtime
    }));
    
    filesWithStats.sort((a, b) => b.mtime - a.mtime);
    return filesWithStats[0].name;
  } catch (error) {
    // Fallback to alphabetical
    return imageFiles.sort()[0];
  }
}

/**
 * List all image files in workspace
 * @returns {string[]} Array of image file names
 */
export function listImageFiles() {
  try {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
    const files = fs.readdirSync(__dirname);
    
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
  } catch (error) {
    console.error('❌ Error listing image files:', error.message);
    return [];
  }
}

/**
 * Process image from workspace and extract text
 * @param {string} imageFileName - Optional specific image file name
 * @returns {Promise<Object>} OCR extraction result
 */
export async function processImageFromWorkspace(imageFileName = null) {
  try {
    console.log('🖼️ Processing image from workspace...');
    
    // Use specified file or auto-detect
    const selectedFile = imageFileName || await detectImageFile();
    const imagePath = path.join(__dirname, selectedFile);
    
    console.log(`📁 Selected image: ${selectedFile}`);
    
    // Extract text using OCR
    const extractor = new OCRExtractor();
    const result = await extractor.extractFromFile(imagePath, {
      verbose: true,
      includeRawData: false
    });
    
    if (result.success) {
      console.log('✅ OCR processing completed successfully!');
      console.log(`📝 Extracted ${result.metadata.characterCount} characters`);
      console.log(`🎯 Confidence: ${result.confidence.toFixed(2)}%`);
    } else {
      console.log('❌ OCR processing failed:', result.error);
    }
    
    return {
      ...result,
      fileName: selectedFile,
      filePath: imagePath
    };
    
  } catch (error) {
    console.error('❌ Workspace image processing error:', error.message);
    return {
      success: false,
      error: error.message,
      text: '',
      confidence: 0
    };
  }
}

/**
 * Convenience function for quick text extraction
 * @param {string|Buffer|File} imageInput - Image input
 * @param {Object} options - OCR options
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromImage(imageInput, options = {}) {
  const extractor = new OCRExtractor();
  const result = await extractor.extractText(imageInput, options);
  
  if (result.success) {
    return result.text;
  } else {
    throw new Error(result.error);
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing OCR Text Extraction from Workspace...');
  console.log('═'.repeat(60));
  
  // Check if specific file was provided as argument
  const specifiedFile = process.argv[2];
  
  if (specifiedFile) {
    console.log(`📁 Processing specified file: ${specifiedFile}`);
    
    processImageFromWorkspace(specifiedFile)
      .then(result => {
        if (result.success) {
          console.log('\n✅ OCR processing completed successfully!');
          console.log(`📝 Extracted text from ${result.fileName}:`);
          console.log('─'.repeat(50));
          console.log(result.text);
          console.log('─'.repeat(50));
          console.log(`🎯 Confidence: ${result.confidence.toFixed(2)}%`);
          console.log(`📊 Word count: ${result.metadata.wordCount}`);
        } else {
          console.log('❌ OCR processing failed:', result.error);
        }
      })
      .catch(err => {
        console.error('❌ Processing error:', err.message);
      });
  } else {
    // Auto-detect and process
    console.log('🔍 Auto-detecting image files in workspace...');
    
    try {
      const imageFiles = listImageFiles();
      
      if (imageFiles.length === 0) {
        console.log('⚠️ No image files found in workspace.');
        console.log('\n💡 To add an image file:');
        console.log('   1. Drag and drop your image into the workspace');
        console.log('   2. Or upload via the file manager');
        console.log('   3. Supported formats: .png, .jpg, .jpeg, .gif, .bmp, .tiff, .webp');
        console.log('\n📝 Usage examples:');
        console.log('   npm run ocr');
        console.log('   npm run ocr prescription.png');
        console.log('   node ocrExtractor.js document.jpg');
      } else {
        console.log(`📁 Found ${imageFiles.length} image file(s): ${imageFiles.join(', ')}`);
        
        processImageFromWorkspace()
          .then(result => {
            if (result.success) {
              console.log('\n✅ OCR processing completed successfully!');
              console.log(`📝 Extracted text from ${result.fileName}:`);
              console.log('─'.repeat(50));
              console.log(result.text);
              console.log('─'.repeat(50));
              console.log(`🎯 Confidence: ${result.confidence.toFixed(2)}%`);
              console.log(`📊 Word count: ${result.metadata.wordCount}`);
              
              // Show usage for other files if multiple exist
              if (imageFiles.length > 1) {
                console.log('\n💡 To process other images:');
                imageFiles.forEach(file => {
                  if (file !== result.fileName) {
                    console.log(`   npm run ocr ${file}`);
                  }
                });
              }
            } else {
              console.log('❌ OCR processing failed:', result.error);
            }
          })
          .catch(err => {
            console.error('❌ Processing error:', err.message);
          });
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}