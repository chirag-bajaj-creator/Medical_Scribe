import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automatically detect audio files in the workspace
 * @returns {Promise<string>} Path to the audio file to use
 */
export async function detectAudioFile() {
  try {
    // Supported audio file extensions
    const audioExtensions = ['.m4a', '.mp3', '.wav', '.mp4', '.aac', '.flac'];
    
    // Read all files in the current directory
    const files = fs.readdirSync(__dirname);
    
    // Filter for audio files
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return audioExtensions.includes(ext);
    });
    
    if (audioFiles.length === 0) {
      throw new Error('No audio files found in workspace. Please add an audio file (.m4a, .mp3, .wav, etc.)');
    }
    
    // If multiple audio files, prioritize by common naming patterns
    const prioritizedFile = prioritizeAudioFile(audioFiles);
    
    console.log(`🎵 Auto-detected audio file: ${prioritizedFile}`);
    if (audioFiles.length > 1) {
      console.log(`📁 Other audio files found: ${audioFiles.filter(f => f !== prioritizedFile).join(', ')}`);
    }
    
    return prioritizedFile;
    
  } catch (error) {
    console.error('❌ Audio detection error:', error.message);
    throw error;
  }
}

/**
 * Prioritize which audio file to use when multiple are found
 * @param {string[]} audioFiles - Array of audio file names
 * @returns {string} The prioritized audio file name
 */
function prioritizeAudioFile(audioFiles) {
  // Priority order:
  // 1. Files with "recording" in name (most recent number)
  // 2. Files with "audio" in name
  // 3. Most recently modified file
  // 4. Alphabetically first
  
  // Check for recording files and get the highest number
  const recordingFiles = audioFiles.filter(file => 
    file.toLowerCase().includes('recording')
  );
  
  if (recordingFiles.length > 0) {
    // Sort by number in filename (Recording22.m4a > Recording16.m4a)
    recordingFiles.sort((a, b) => {
      const numA = extractNumber(a) || 0;
      const numB = extractNumber(b) || 0;
      return numB - numA; // Descending order (highest number first)
    });
    return recordingFiles[0];
  }
  
  // Check for audio files
  const audioNamedFiles = audioFiles.filter(file => 
    file.toLowerCase().includes('audio')
  );
  
  if (audioNamedFiles.length > 0) {
    return audioNamedFiles[0];
  }
  
  // Get most recently modified file
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filesWithStats = audioFiles.map(file => ({
      name: file,
      mtime: fs.statSync(path.join(__dirname, file)).mtime
    }));
    
    filesWithStats.sort((a, b) => b.mtime - a.mtime);
    return filesWithStats[0].name;
  } catch (error) {
    // Fallback to alphabetical
    return audioFiles.sort()[0];
  }
}

/**
 * Extract number from filename
 * @param {string} filename - The filename to extract number from
 * @returns {number|null} The extracted number or null
 */
function extractNumber(filename) {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * List all audio files in workspace
 * @returns {string[]} Array of audio file names
 */
export function listAudioFiles() {
  try {
    const audioExtensions = ['.m4a', '.mp3', '.wav', '.mp4', '.aac', '.flac'];
    const files = fs.readdirSync(__dirname);
    
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return audioExtensions.includes(ext);
    });
  } catch (error) {
    console.error('❌ Error listing audio files:', error.message);
    return [];
  }
}

// CLI Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Testing Audio File Detection...');
  
  detectAudioFile()
    .then(audioFile => {
      console.log(`✅ Selected audio file: ${audioFile}`);
      
      const allAudioFiles = listAudioFiles();
      console.log(`📁 All audio files found: ${allAudioFiles.join(', ')}`);
    })
    .catch(err => {
      console.error('❌ Detection failed:', err.message);
    });
}