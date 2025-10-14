/**
 * Manages saving and loading linkage states to/from browser localStorage
 */
export class LocalStorageManager {
  constructor() {
    this.STORAGE_KEY_SAVES = 'linkage-saves';
    this.STORAGE_KEY_PREFIX = 'linkage-save-';
  }

  /**
   * Save current state with thumbnail to localStorage
   * @param {Object} stateData - State object from StateSerializer
   * @param {string} thumbnail - Base64 data URL of screenshot
   * @returns {string} - ID of saved state
   */
  saveState(stateData, thumbnail) {
    const id = this.generateId();
    const saveObject = {
      id,
      timestamp: new Date().toISOString(),
      thumbnail,
      state: stateData
    };

    // Save the state object
    try {
      const key = this.STORAGE_KEY_PREFIX + id;
      const value = JSON.stringify(saveObject);
      console.log('Saving to localStorage with key:', key);
      console.log('Save object size:', value.length, 'characters');
      localStorage.setItem(key, value);

      // Add ID to saves list
      const saves = this.getSaveIds();
      console.log('Current save IDs before adding:', saves);
      saves.unshift(id); // Add to beginning (most recent first)
      localStorage.setItem(this.STORAGE_KEY_SAVES, JSON.stringify(saves));
      console.log('Updated save IDs:', saves);

      console.log(`Saved state with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some saved states.');
      }
      return null;
    }
  }

  /**
   * Load state by ID
   * @param {string} id - State ID
   * @returns {Object|null} - Save object with {id, timestamp, thumbnail, state}
   */
  loadState(id) {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_PREFIX + id);
      if (!data) {
        console.warn(`State ${id} not found`);
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  }

  /**
   * Delete state by ID
   * @param {string} id - State ID to delete
   * @returns {boolean} - Success status
   */
  deleteState(id) {
    try {
      // Remove the state object
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + id);

      // Remove ID from saves list
      const saves = this.getSaveIds();
      const filtered = saves.filter(saveId => saveId !== id);
      localStorage.setItem(this.STORAGE_KEY_SAVES, JSON.stringify(filtered));

      console.log(`Deleted state: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting state:', error);
      return false;
    }
  }

  /**
   * Get all saved states with thumbnails
   * @returns {Array} - Array of save objects
   */
  getSavedStates() {
    const ids = this.getSaveIds();
    console.log('Save IDs from localStorage:', ids);
    const states = [];

    for (const id of ids) {
      const state = this.loadState(id);
      console.log('Loaded state for ID', id, ':', state ? 'found' : 'null');
      if (state) {
        states.push(state);
      }
    }

    console.log('Total states to return:', states.length);
    return states;
  }

  /**
   * Get list of save IDs
   * @returns {Array} - Array of save IDs
   */
  getSaveIds() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_SAVES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading save IDs:', error);
      return [];
    }
  }

  /**
   * Save the order of saved states
   * @param {Array} orderArray - Array of save IDs in desired order
   * @returns {boolean} - Success status
   */
  saveSaveOrder(orderArray) {
    try {
      localStorage.setItem(this.STORAGE_KEY_SAVES, JSON.stringify(orderArray));
      console.log('Saved order:', orderArray);
      return true;
    } catch (error) {
      console.error('Error saving order:', error);
      return false;
    }
  }

  /**
   * Get preset states (imported from presets data)
   * @returns {Array} - Array of preset objects
   */
  getPresetStates() {
    // Will be populated from presets.js
    return [];
  }

  /**
   * Generate unique ID for save
   * @returns {string} - Unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage usage info
   * @returns {Object} - {used, total, percentage}
   */
  getStorageInfo() {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Typical localStorage limit is 5MB (5 * 1024 * 1024 bytes)
    const total = 5 * 1024 * 1024;
    return {
      used,
      total,
      percentage: (used / total * 100).toFixed(2)
    };
  }
}
