import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: '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'
});

export class AudioProcessor {
  constructor() {
    this.supportedFormats = ['.wav', '.mp3', '.m4a', '.mp4', '.aac', '.flac'];
  }

  /**
   * Transcribe audio file to text using OpenAI Whisper
   * @param {string} audioFilePath - Path to the audio file
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioFilePath) {
    try {
      console.log(`🎤 Transcribing audio file: ${path.basename(audioFilePath)}`);

      // Validate file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Validate file format
      const ext = path.extname(audioFilePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported audio format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`);
      }

      // Get file stats for duration estimation
      const stats = fs.statSync(audioFilePath);
      const fileSizeKB = Math.round(stats.size / 1024);

      console.log(`📊 File size: ${fileSizeKB} KB`);

      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
        response_format: "verbose_json"
      });

      const transcript = transcription.text;
      const duration = transcription.duration || null;

      // Estimate confidence based on response quality
      const confidence = this.estimateConfidence(transcript, duration);

      console.log(`✅ Transcription completed: ${transcript.length} characters`);
      console.log(`⏱️ Duration: ${duration ? `${duration}s` : 'Unknown'}`);
      console.log(`🎯 Estimated confidence: ${confidence.toFixed(2)}%`);

      return {
        success: true,
        transcript: transcript,
        duration: duration,
        confidence: confidence,
        fileSize: fileSizeKB,
        format: ext
      };

    } catch (error) {
      console.error('❌ Audio transcription error:', error.message);
      
      return {
        success: false,
        error: error.message,
        transcript: '',
        duration: null,
        confidence: 0
      };
    }
  }

  /**
   * Estimate transcription confidence based on various factors
   * @param {string} transcript - The transcribed text
   * @param {number} duration - Audio duration in seconds
   * @returns {number} Confidence score (0-100)
   */
  estimateConfidence(transcript, duration) {
    let confidence = 85; // Base confidence for Whisper

    // Adjust based on transcript length
    if (transcript.length < 50) {
      confidence -= 15; // Very short transcripts might be less reliable
    } else if (transcript.length > 500) {
      confidence += 5; // Longer transcripts usually more reliable
    }

    // Adjust based on duration vs text ratio
    if (duration) {
      const wordsPerSecond = transcript.split(' ').length / duration;
      if (wordsPerSecond < 1) {
        confidence -= 10; // Very slow speech might indicate issues
      } else if (wordsPerSecond > 5) {
        confidence -= 5; // Very fast speech might have errors
      }
    }

    // Check for common transcription artifacts
    const artifacts = [
      /\[.*?\]/g, // Bracketed content
      /\(.*?\)/g, // Parenthetical content
      /\b[A-Z]{3,}\b/g, // All caps words (often errors)
    ];

    artifacts.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        confidence -= matches.length * 2;
      }
    });

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Validate audio file format
   * @param {string} filePath - Path to the audio file
   * @returns {boolean} True if format is supported
   */
  isValidAudioFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  /**
   * Get supported audio formats
   * @returns {Array} Array of supported file extensions
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }
}