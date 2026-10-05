/**
 * Wavelength Recording Store - IndexedDB Storage
 * Stores meeting audio recordings, metadata, and audio chunks locally.
 * Retains chunks for crash-resilience and tracks Supabase upload lifecycle.
 */

const DB_NAME = 'WavelengthRecordingsDB';
const DB_VERSION = 2;
const STORE_RECORDINGS = 'recordings';
const STORE_CHUNKS = 'chunks';

class RecordingStore {
  constructor() {
    this.db = null;
  }

  async getDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
          const recordingStore = db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
          recordingStore.createIndex('startedAt', 'startedAt', { unique: false });
          recordingStore.createIndex('platform', 'platform', { unique: false });
          recordingStore.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
          const chunkStore = db.createObjectStore(STORE_CHUNKS, { autoIncrement: true });
          chunkStore.createIndex('recordingId', 'recordingId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
      };
    });
  }

  /**
   * Save a stream chunk for crash-resilience
   */
  async saveChunk(recordingId, chunkIndex, chunkBlob) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CHUNKS], 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      const req = store.add({
        recordingId,
        chunkIndex,
        blob: chunkBlob,
        timestamp: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get all chunks for a recording ID
   */
  async getChunks(recordingId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CHUNKS], 'readonly');
      const store = tx.objectStore(STORE_CHUNKS);
      const index = store.index('recordingId');
      const req = index.getAll(recordingId);
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => a.chunkIndex - b.chunkIndex);
        resolve(items.map((item) => item.blob));
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete chunks for a recording after final assembly
   */
  async deleteChunks(recordingId) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CHUNKS], 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      const index = store.index('recordingId');
      const req = index.openCursor(IDBKeyRange.only(recordingId));

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save complete recording metadata and final audio blob
   */
  async saveRecording(metadata, blob) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readwrite');
      const store = tx.objectStore(STORE_RECORDINGS);
      const record = {
        id: metadata.id,
        platform: metadata.platform || 'unknown',
        meetingUrl: metadata.meetingUrl || '',
        startedAt: metadata.startedAt || new Date().toISOString(),
        stoppedAt: metadata.stoppedAt || new Date().toISOString(),
        durationSeconds: metadata.durationSeconds || 0,
        status: metadata.status || 'local_saved',
        salespersonAudioSource: metadata.salespersonAudioSource || 'SALESPERSON_MIC',
        remoteAudioSource: metadata.remoteAudioSource || 'REMOTE_AUDIO',
        disclosureAttempted: Boolean(metadata.disclosureAttempted),
        disclosureDelivered: Boolean(metadata.disclosureDelivered),
        disclosureMethod: metadata.disclosureMethod || 'local_only',
        disclosureTimestamp: metadata.disclosureTimestamp || null,
        disclosureNotes: metadata.disclosureNotes || '',
        speakerTimeline: metadata.speakerTimeline || [],
        speakerStats: metadata.speakerStats || {},
        mimeType: metadata.mimeType || 'audio/webm',
        chunkCount: metadata.chunkCount || 0,
        storagePath: metadata.storagePath || `recordings/${metadata.id}.webm`,
        blob: blob || metadata.blob,
        updatedAt: new Date().toISOString()
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Update recording status / upload metadata
   */
  async updateRecording(id, updates) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readwrite');
      const store = tx.objectStore(STORE_RECORDINGS);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Recording not found: ${id}`));
          return;
        }

        const updated = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = (e) => reject(e.target.error);
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get recording by ID
   */
  async getRecording(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readonly');
      const store = tx.objectStore(STORE_RECORDINGS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * List all stored recordings (ordered by newest first)
   */
  async listRecordings() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readonly');
      const store = tx.objectStore(STORE_RECORDINGS);
      const index = store.index('startedAt');
      const req = index.openCursor(null, 'prev');
      const results = [];

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Avoid passing huge blob in summary list for performance
          const { blob, ...meta } = cursor.value;
          results.push({
            ...meta,
            sizeBytes: blob ? blob.size : 0,
            hasBlob: Boolean(blob)
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete a recording by ID
   */
  async deleteRecording(id) {
    const db = await this.getDB();
    await this.deleteChunks(id);
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readwrite');
      const store = tx.objectStore(STORE_RECORDINGS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

// Global instance for extension context
if (typeof window !== 'undefined') {
  window.recordingStore = new RecordingStore();
}

// Support ES/CommonJS if required
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RecordingStore };
}
