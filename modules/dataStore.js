import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DataStore {
  constructor() {
    // Create data directory if it doesn't exist
    this.dataDir = path.join(path.dirname(__dirname), 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // In-memory store for quick access
    this.memoryStore = new Map();
  }

  /**
   * Store data for a session
   * @param {string} sessionId - Session identifier
   * @param {string} key - Data key
   * @param {any} value - Data value
   * @returns {Promise<void>}
   */
  async store(sessionId, key, value) {
    try {
      // Store in memory
      const sessionKey = `${sessionId}:${key}`;
      this.memoryStore.set(sessionKey, value);

      // Also persist to file for durability
      const sessionDir = path.join(this.dataDir, sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const filePath = path.join(sessionDir, `${key}.json`);
      const data = {
        sessionId: sessionId,
        key: key,
        value: value,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`💾 Stored ${key} for session ${sessionId}`);

    } catch (error) {
      console.error(`❌ Error storing ${key} for session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve data for a session
   * @param {string} sessionId - Session identifier
   * @param {string} key - Data key
   * @returns {Promise<any>} Retrieved data or null
   */
  async get(sessionId, key) {
    try {
      // Try memory first
      const sessionKey = `${sessionId}:${key}`;
      if (this.memoryStore.has(sessionKey)) {
        return this.memoryStore.get(sessionKey);
      }

      // Try file system
      const filePath = path.join(this.dataDir, sessionId, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Cache in memory
        this.memoryStore.set(sessionKey, data.value);
        
        return data.value;
      }

      return null;

    } catch (error) {
      console.error(`❌ Error retrieving ${key} for session ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Get all data for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} All session data
   */
  async getSessionData(sessionId) {
    try {
      const sessionDir = path.join(this.dataDir, sessionId);
      if (!fs.existsSync(sessionDir)) {
        return {};
      }

      const files = fs.readdirSync(sessionDir);
      const sessionData = {};

      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = path.basename(file, '.json');
          const filePath = path.join(sessionDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent);
          sessionData[key] = data.value;
        }
      }

      return sessionData;

    } catch (error) {
      console.error(`❌ Error retrieving session data for ${sessionId}:`, error.message);
      return {};
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session status
   */
  async getSessionStatus(sessionId) {
    try {
      const sessionData = await this.getSessionData(sessionId);
      
      const status = {
        sessionId: sessionId,
        hasTranscriptRaw: !!sessionData.transcript_raw,
        hasTranscriptClean: !!sessionData.transcript_clean,
        hasSOAPData: !!sessionData.soap_data,
        hasPDF: !!sessionData.pdf_path,
        hasOCRRaw: !!sessionData.ocr_raw,
        hasOCRClean: !!sessionData.ocr_clean,
        templateType: sessionData.template_type || null,
        completionPercentage: 0
      };

      // Calculate completion percentage
      const steps = [
        status.hasTranscriptRaw,
        status.hasTranscriptClean,
        status.hasSOAPData,
        status.hasPDF
      ];
      
      const completedSteps = steps.filter(step => step).length;
      status.completionPercentage = Math.round((completedSteps / steps.length) * 100);

      return status;

    } catch (error) {
      console.error(`❌ Error getting session status for ${sessionId}:`, error.message);
      return {
        sessionId: sessionId,
        error: error.message,
        completionPercentage: 0
      };
    }
  }

  /**
   * Delete session data
   * @param {string} sessionId - Session identifier
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    try {
      // Remove from memory
      const keysToDelete = [];
      for (const key of this.memoryStore.keys()) {
        if (key.startsWith(`${sessionId}:`)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.memoryStore.delete(key));

      // Remove from file system
      const sessionDir = path.join(this.dataDir, sessionId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      console.log(`🗑️ Deleted session data for ${sessionId}`);

    } catch (error) {
      console.error(`❌ Error deleting session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * List all sessions
   * @returns {Promise<Array>} Array of session IDs
   */
  async listSessions() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        return [];
      }

      const entries = fs.readdirSync(this.dataDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    } catch (error) {
      console.error('❌ Error listing sessions:', error.message);
      return [];
    }
  }

  /**
   * Clean up old sessions (older than specified days)
   * @param {number} daysOld - Number of days to keep sessions
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupOldSessions(daysOld = 7) {
    try {
      const sessions = await this.listSessions();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let cleanedCount = 0;

      for (const sessionId of sessions) {
        const sessionDir = path.join(this.dataDir, sessionId);
        const stats = fs.statSync(sessionDir);
        
        if (stats.mtime < cutoffDate) {
          await this.deleteSession(sessionId);
          cleanedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
      return cleanedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error.message);
      return 0;
    }
  }
}