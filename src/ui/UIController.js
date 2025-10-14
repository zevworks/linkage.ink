import { ColorPicker } from './ColorPicker.js';
import { presets } from '../data/presets.js';

/**
 * Manages UI button interactions and state updates
 */
export class UIController {
  constructor(mechanism, traceSystem, videoExporter, camera, urlStateManager, renderer, stateSerializer, localStorageManager) {
    this.mechanism = mechanism;
    this.traceSystem = traceSystem;
    this.videoExporter = videoExporter;
    this.camera = camera;
    this.urlStateManager = urlStateManager;
    this.renderer = renderer;
    this.stateSerializer = stateSerializer;
    this.localStorageManager = localStorageManager;
    this.p5Instance = null;
    this.colorPicker = new ColorPicker((design) => this.handleDesignChange(design), renderer, traceSystem, mechanism);
    this.isEditMode = false;
    this.savedStatesOrder = []; // Track order of saved states

    // Defer event listener setup until DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.syncButtonStates();
      });
    } else {
      this.setupEventListeners();
      this.syncButtonStates();
    }
  }

  handleDesignChange(design) {
    this.traceSystem.setTraceColor(design.color);
    this.traceSystem.setTraceWidth(design.traceWidth);
    this.traceSystem.setRodsWidth(design.rodsWidth);
    if (design.fadingEnabled !== undefined) {
      this.traceSystem.setFading(design.fadingEnabled);
    }
    // Use debounced push to history for slider changes
    this.urlStateManager.updateURLWithoutHistory(50);
    this.urlStateManager.schedulePushToHistory(400);
  }

  setP5Instance(p5Instance, mechanism) {
    this.p5Instance = p5Instance;
    this.mechanism = mechanism;
  }

  syncButtonStates() {
    // Sync play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.textContent = this.mechanism.isPlaying ? 'Pause' : 'Play';
    }
  }

  setupEventListeners() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        const isPlaying = this.mechanism.togglePlayPause();
        playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
      };
    }

    // Fit View button
    const fitViewBtn = document.getElementById('fitViewBtn');
    if (fitViewBtn) {
      fitViewBtn.onclick = () => {
        // Get both trace and mechanism bounds and merge them
        const traceBounds = this.traceSystem.calculateBounds();
        const mechanismBounds = this.mechanism.calculateBounds();

        // Merge bounds to get the larger extent
        let bounds = null;
        if (traceBounds && mechanismBounds) {
          bounds = {
            minX: Math.min(traceBounds.minX, mechanismBounds.minX),
            maxX: Math.max(traceBounds.maxX, mechanismBounds.maxX),
            minY: Math.min(traceBounds.minY, mechanismBounds.minY),
            maxY: Math.max(traceBounds.maxY, mechanismBounds.maxY)
          };
          bounds.width = bounds.maxX - bounds.minX;
          bounds.height = bounds.maxY - bounds.minY;
          bounds.centerX = (bounds.minX + bounds.maxX) / 2;
          bounds.centerY = (bounds.minY + bounds.maxY) / 2;
        } else {
          bounds = traceBounds || mechanismBounds;
        }

        if (bounds && this.p5Instance) {
          // Use p5 instance width/height which accounts for display size
          this.camera.fitToView(bounds, this.p5Instance.width, this.p5Instance.height, true);
          // Push to history after fit view completes (wait for animation)
          setTimeout(() => {
            this.urlStateManager.pushToHistoryNow();
          }, 600);
        }
      };
    }

    // Add Rod button
    const addRodBtn = document.getElementById('addRodBtn');
    if (addRodBtn) {
      addRodBtn.onclick = () => {
        this.mechanism.addRod();
        this.traceSystem.updateFadeLifespan(this.mechanism.FRAMES_PER_ROUND);
        this.urlStateManager.pushToHistoryNow();
      };
    }

    // Remove Rod button
    const removeRodBtn = document.getElementById('removeRodBtn');
    if (removeRodBtn) {
      removeRodBtn.onclick = () => {
        // Clear trace for the rod being removed
        const lastRodId = this.mechanism.rods.length - 1;
        this.traceSystem.clearTrace(lastRodId);

        this.mechanism.removeRod();
        this.traceSystem.updateFadeLifespan(this.mechanism.FRAMES_PER_ROUND);
        this.urlStateManager.pushToHistoryNow();
      };
    }

    // Copy Link button
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.onclick = async () => {
        // First update URL to ensure it's current
        this.urlStateManager.updateURLNow();

        const success = await this.urlStateManager.copyURLToClipboard();
        if (success) {
          // Visual feedback
          const originalText = copyLinkBtn.textContent;
          copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyLinkBtn.textContent = originalText;
          }, 2000);
        } else {
          alert('Failed to copy link to clipboard');
        }
      };
    }

    // Save Video button
    const saveVideoBtn = document.getElementById('saveVideoBtn');
    if (saveVideoBtn) {
      saveVideoBtn.onclick = () => {
        if (this.videoExporter.isCurrentlyRecording()) {
          // Cancel recording
          this.videoExporter.cancel();
          saveVideoBtn.textContent = 'Save Video';
        } else {
          // Start recording
          const canvas = this.p5Instance.canvas;
          const framesPerRound = this.mechanism.FRAMES_PER_ROUND;

          saveVideoBtn.textContent = 'Recording...';

          this.videoExporter.startRecording(canvas, framesPerRound, () => {
            saveVideoBtn.textContent = 'Save Video';
          });
        }
      };
    }

    // Save State button
    const saveStateBtn = document.getElementById('saveStateBtn');
    if (saveStateBtn) {
      saveStateBtn.onclick = () => {
        this.saveCurrentState();
      };
    }

    // Open States button - toggles sidebar
    const openStatesBtn = document.getElementById('openStatesBtn');
    if (openStatesBtn) {
      openStatesBtn.onclick = () => {
        this.toggleStatesSidebar();
      };
    }

    // Sidebar toggle button
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
      sidebarToggle.onclick = () => {
        this.toggleStatesSidebar();
      };
      // Add touch event handling for mobile
      sidebarToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleStatesSidebar();
      });
    }

    // Edit saved states button
    const editSavedBtn = document.getElementById('editSavedBtn');
    if (editSavedBtn) {
      editSavedBtn.onclick = () => {
        this.toggleEditMode();
      };
      editSavedBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleEditMode();
      });
    }

    // Save edit link
    const saveEditLink = document.getElementById('saveEditLink');
    if (saveEditLink) {
      saveEditLink.onclick = () => {
        this.saveEditOrder();
      };
      saveEditLink.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveEditOrder();
      });
    }

    // Cancel edit link
    const cancelEditLink = document.getElementById('cancelEditLink');
    if (cancelEditLink) {
      cancelEditLink.onclick = () => {
        this.cancelEditMode();
      };
      cancelEditLink.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancelEditMode();
      });
    }

    // Populate sidebar on init
    this.populatePresetsGrid();
    this.populateSavedGrid();
  }

  /**
   * Capture current canvas as thumbnail and save state
   */
  saveCurrentState() {
    if (!this.p5Instance) {
      console.error('p5 instance not available');
      return;
    }

    try {
      // Capture canvas as data URL
      const canvas = this.p5Instance.canvas;
      const thumbnail = canvas.toDataURL('image/png', 0.8);

      // Get current state
      const stateData = this.stateSerializer.exportState();

      // Save to localStorage
      const id = this.localStorageManager.saveState(stateData, thumbnail);

      if (id) {
        // Refresh the saved grid immediately
        this.populateSavedGrid();

        // Visual feedback
        const saveStateBtn = document.getElementById('saveStateBtn');
        if (saveStateBtn) {
          const originalText = saveStateBtn.textContent;
          saveStateBtn.textContent = 'Saved!';
          setTimeout(() => {
            saveStateBtn.textContent = originalText;
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error saving state:', error);
      alert('Failed to save state. Please try again.');
    }
  }

  /**
   * Toggle the states sidebar
   */
  toggleStatesSidebar() {
    const sidebar = document.getElementById('statesSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const icon = document.getElementById('sidebarToggleIcon');

    if (!sidebar || !toggleBtn || !icon) return;

    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
      // Close sidebar
      sidebar.classList.remove('open');
      toggleBtn.classList.remove('open');
      icon.style.transform = 'rotate(0deg)';
    } else {
      // Open sidebar
      sidebar.classList.add('open');
      toggleBtn.classList.add('open');
      icon.style.transform = 'rotate(180deg)';
      // Refresh grids when opening
      this.populatePresetsGrid();
      this.populateSavedGrid();
    }
  }

  /**
   * Populate presets grid
   */
  populatePresetsGrid() {
    const presetsGrid = document.getElementById('presetsGrid');
    if (!presetsGrid) return;

    presetsGrid.innerHTML = '';

    presets.forEach(preset => {
      const card = this.createStateCard(preset, false);
      presetsGrid.appendChild(card);
    });
  }

  /**
   * Populate saved states grid
   */
  populateSavedGrid() {
    const savedGrid = document.getElementById('savedGrid');
    const noSavesMessage = document.getElementById('noSavesMessage');
    if (!savedGrid) return;

    savedGrid.innerHTML = '';

    const savedStates = this.localStorageManager.getSavedStates();

    // Initialize order if not already set or if it's different
    if (this.savedStatesOrder.length !== savedStates.length) {
      this.savedStatesOrder = savedStates.map(s => s.id);
    }

    if (savedStates.length === 0) {
      if (noSavesMessage) {
        noSavesMessage.classList.remove('hidden');
      }
      return;
    }

    if (noSavesMessage) {
      noSavesMessage.classList.add('hidden');
    }

    // Sort savedStates according to savedStatesOrder
    const orderedStates = [...savedStates].sort((a, b) => {
      const indexA = this.savedStatesOrder.indexOf(a.id);
      const indexB = this.savedStatesOrder.indexOf(b.id);
      return indexA - indexB;
    });

    orderedStates.forEach((saveData, index) => {
      const isFirst = index === 0;
      const isLast = index === orderedStates.length - 1;
      const card = this.createStateCard(saveData, this.isEditMode, isFirst, isLast, index);
      card.dataset.stateId = saveData.id;
      card.dataset.index = index;

      savedGrid.appendChild(card);
    });
  }

  /**
   * Create a state card element
   * @param {Object} data - State data with {id, thumbnail, state}
   * @param {boolean} showEditControls - Whether to show edit controls (only in edit mode)
   * @param {boolean} isFirst - Whether this is the first item
   * @param {boolean} isLast - Whether this is the last item
   * @param {number} index - Index in the array
   */
  createStateCard(data, showEditControls, isFirst, isLast, index) {
    const card = document.createElement('div');
    card.className = 'state-card';

    // Create thumbnail image or placeholder
    if (data.thumbnail) {
      const img = document.createElement('img');
      img.src = data.thumbnail;
      img.alt = data.name || 'Linkage state';
      card.appendChild(img);
    } else {
      // Placeholder with preset name
      const placeholder = document.createElement('div');
      placeholder.className = 'state-card-placeholder';
      placeholder.textContent = data.name || data.description || 'Preset';
      card.appendChild(placeholder);
    }

    // Add edit controls for saved states in edit mode
    if (showEditControls) {
      // Up arrow (if not first)
      if (!isFirst) {
        const upBtn = document.createElement('button');
        upBtn.className = 'state-card-arrow state-card-arrow-up';
        upBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        upBtn.onclick = (e) => {
          e.stopPropagation();
          this.moveStateUp(index);
        };
        upBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.moveStateUp(index);
        });
        card.appendChild(upBtn);
      }

      // Down arrow (if not last)
      if (!isLast) {
        const downBtn = document.createElement('button');
        downBtn.className = 'state-card-arrow state-card-arrow-down';
        downBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        downBtn.onclick = (e) => {
          e.stopPropagation();
          this.moveStateDown(index);
        };
        downBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.moveStateDown(index);
        });
        card.appendChild(downBtn);
      }

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'state-card-delete-edit';
      deleteBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteState(data.id);
      };
      deleteBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deleteState(data.id);
      });
      card.appendChild(deleteBtn);
    }

    // Click card to load state (only when not in edit mode)
    if (!showEditControls) {
      card.onclick = () => {
        this.loadState(data.state);
      };
    }

    return card;
  }

  /**
   * Load a state
   * @param {Object} state - State object to load
   */
  loadState(state) {
    try {
      // Clear existing traces
      this.traceSystem.clearAllTraces();

      // Import the state
      this.stateSerializer.importState(state);

      // Update UI
      this.syncButtonStates();
      this.colorPicker.setDesign({
        color: state.traceColor,
        traceWidth: state.traceWidth,
        rodsWidth: state.rodsWidth,
        fadingEnabled: state.fadingEnabled
      });

      // Push to history when loading a state
      this.urlStateManager.pushToHistoryNow();

      // Close sidebar
      this.toggleStatesSidebar();
    } catch (error) {
      console.error('Error loading state:', error);
      alert('Failed to load state. The data may be corrupted.');
    }
  }

  /**
   * Delete a saved state
   * @param {string} id - State ID to delete
   */
  deleteState(id) {
    const success = this.localStorageManager.deleteState(id);
    if (success) {
      // Remove from order array
      this.savedStatesOrder = this.savedStatesOrder.filter(stateId => stateId !== id);
      // Refresh the saved grid
      this.populateSavedGrid();
    }
  }

  /**
   * Toggle edit mode for saved states
   */
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const editSavedBtn = document.getElementById('editSavedBtn');
    const saveEditLink = document.getElementById('saveEditLink');
    const cancelEditLink = document.getElementById('cancelEditLink');

    if (this.isEditMode) {
      // Show Save/Cancel links, hide Edit button
      if (editSavedBtn) editSavedBtn.classList.add('hidden');
      if (saveEditLink) saveEditLink.classList.remove('hidden');
      if (cancelEditLink) cancelEditLink.classList.remove('hidden');
    } else {
      // Show Edit button, hide Save/Cancel links
      if (editSavedBtn) editSavedBtn.classList.remove('hidden');
      if (saveEditLink) saveEditLink.classList.add('hidden');
      if (cancelEditLink) cancelEditLink.classList.add('hidden');
    }

    // Refresh grid to show/hide edit controls
    this.populateSavedGrid();
  }

  /**
   * Save the current order of saved states
   */
  saveEditOrder() {
    // Order is already being tracked in this.savedStatesOrder
    // Exit edit mode
    this.isEditMode = false;
    const editSavedBtn = document.getElementById('editSavedBtn');
    const saveEditLink = document.getElementById('saveEditLink');
    const cancelEditLink = document.getElementById('cancelEditLink');

    if (editSavedBtn) editSavedBtn.classList.remove('hidden');
    if (saveEditLink) saveEditLink.classList.add('hidden');
    if (cancelEditLink) cancelEditLink.classList.add('hidden');

    this.populateSavedGrid();
  }

  /**
   * Cancel edit mode and revert order
   */
  cancelEditMode() {
    this.isEditMode = false;
    const editSavedBtn = document.getElementById('editSavedBtn');
    const saveEditLink = document.getElementById('saveEditLink');
    const cancelEditLink = document.getElementById('cancelEditLink');

    if (editSavedBtn) editSavedBtn.classList.remove('hidden');
    if (saveEditLink) saveEditLink.classList.add('hidden');
    if (cancelEditLink) cancelEditLink.classList.add('hidden');

    // Reset order to match localStorage order
    const savedStates = this.localStorageManager.getSavedStates();
    this.savedStatesOrder = savedStates.map(s => s.id);
    this.populateSavedGrid();
  }

  /**
   * Move a state up in the order
   */
  moveStateUp(index) {
    if (index > 0) {
      // Swap with previous item
      const temp = this.savedStatesOrder[index];
      this.savedStatesOrder[index] = this.savedStatesOrder[index - 1];
      this.savedStatesOrder[index - 1] = temp;
      this.populateSavedGrid();
    }
  }

  /**
   * Move a state down in the order
   */
  moveStateDown(index) {
    if (index < this.savedStatesOrder.length - 1) {
      // Swap with next item
      const temp = this.savedStatesOrder[index];
      this.savedStatesOrder[index] = this.savedStatesOrder[index + 1];
      this.savedStatesOrder[index + 1] = temp;
      this.populateSavedGrid();
    }
  }
}