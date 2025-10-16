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

    // Auto-fit after state load
    this.waitingForAutoFit = false;
    this.autoFitStartAngle = 0;

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
      playPauseBtn.textContent = this.mechanism.isPlaying ? 'PAUSE' : 'PLAY';
    }
  }

  setupEventListeners() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        const isPlaying = this.mechanism.togglePlayPause();
        playPauseBtn.textContent = isPlaying ? 'PAUSE' : 'PLAY';
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

    // Sidebar Save button
    const sidebarSaveBtn = document.getElementById('sidebarSaveBtn');
    if (sidebarSaveBtn) {
      sidebarSaveBtn.onclick = () => {
        this.saveCurrentState();
      };
    }

    // Sidebar Link button
    const sidebarLinkBtn = document.getElementById('sidebarLinkBtn');
    if (sidebarLinkBtn) {
      sidebarLinkBtn.onclick = async () => {
        // First update URL to ensure it's current
        this.urlStateManager.updateURLNow();

        const success = await this.urlStateManager.copyURLToClipboard();
        if (success) {
          // Visual feedback
          const originalText = sidebarLinkBtn.textContent;
          sidebarLinkBtn.textContent = 'COPIED!';
          setTimeout(() => {
            sidebarLinkBtn.textContent = originalText;
          }, 2000);
        } else {
          alert('Failed to copy link to clipboard');
        }
      };
    }

    // Sidebar Video button
    const sidebarVideoBtn = document.getElementById('sidebarVideoBtn');
    if (sidebarVideoBtn) {
      sidebarVideoBtn.onclick = () => {
        if (this.videoExporter.isCurrentlyRecording()) {
          // Cancel recording
          this.videoExporter.cancel();
          sidebarVideoBtn.textContent = 'VIDEO';
        } else {
          // Start recording
          const canvas = this.p5Instance.canvas;
          const framesPerRound = this.mechanism.FRAMES_PER_ROUND;

          sidebarVideoBtn.textContent = 'RECORDING...';

          this.videoExporter.startRecording(canvas, framesPerRound, this.mechanism, () => {
            sidebarVideoBtn.textContent = 'VIDEO';
          });
        }
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

    // Populate sidebar on init
    this.populatePresetsGrid();
    this.populateSavedGrid();
  }

  /**
   * Generate a 100x100 thumbnail fitted to trace bounds
   */
  generateThumbnail() {
    // Get trace bounds
    const bounds = this.traceSystem.calculateBounds();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      // No trace yet, just capture current view
      const canvas = this.p5Instance.canvas;
      const thumbnailCanvas = document.createElement('canvas');
      const size = 100;
      thumbnailCanvas.width = size;
      thumbnailCanvas.height = size;
      const ctx = thumbnailCanvas.getContext('2d');

      const sourceSize = Math.min(canvas.width, canvas.height);
      const sourceX = (canvas.width - sourceSize) / 2;
      const sourceY = (canvas.height - sourceSize) / 2;

      ctx.drawImage(canvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      return thumbnailCanvas.toDataURL('image/png', 0.9);
    }

    // Save current camera state
    const savedCamera = {
      offsetX: this.camera.offset.x,
      offsetY: this.camera.offset.y,
      zoom: this.camera.zoom
    };

    // Calculate zoom to fit trace bounds in the canvas viewport with padding
    const padding = 80; // world-space padding
    const canvasWidth = this.p5Instance.width;
    const canvasHeight = this.p5Instance.height;

    // Calculate zoom that fits the bounds (with padding) in the canvas
    const boundsWithPadding = {
      width: bounds.width + 2 * padding,
      height: bounds.height + 2 * padding
    };

    const zoomX = canvasWidth / boundsWithPadding.width;
    const zoomY = canvasHeight / boundsWithPadding.height;
    const zoom = Math.min(zoomX, zoomY);

    // Calculate offset to center the trace bounds on canvas
    // offset = screenCenter - worldCenter * zoom
    const offsetX = canvasWidth / 2 - bounds.centerX * zoom;
    const offsetY = canvasHeight / 2 - bounds.centerY * zoom;

    // Set camera transform
    this.camera.offset.x = offsetX;
    this.camera.offset.y = offsetY;
    this.camera.zoom = zoom;

    // Force a synchronous redraw with the new camera position
    this.renderer.draw(this.p5Instance);

    // Capture the canvas
    const canvas = this.p5Instance.canvas;
    const thumbnailCanvas = document.createElement('canvas');
    const size = 100;
    thumbnailCanvas.width = size;
    thumbnailCanvas.height = size;
    const ctx = thumbnailCanvas.getContext('2d');

    // Crop to square from center and scale to 100x100
    const sourceSize = Math.min(canvas.width, canvas.height);
    const sourceX = (canvas.width - sourceSize) / 2;
    const sourceY = (canvas.height - sourceSize) / 2;

    ctx.drawImage(
      canvas,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, size, size
    );

    // Restore camera state
    this.camera.offset.x = savedCamera.offsetX;
    this.camera.offset.y = savedCamera.offsetY;
    this.camera.zoom = savedCamera.zoom;

    return thumbnailCanvas.toDataURL('image/png', 0.9);
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
      // Generate fitted thumbnail
      const thumbnail = this.generateThumbnail();

      // Get current state
      const stateData = this.stateSerializer.exportState();

      // Save to localStorage
      const id = this.localStorageManager.saveState(stateData, thumbnail);

      if (id) {
        // Refresh the saved grid immediately
        this.populateSavedGrid();

        // Visual feedback
        const sidebarSaveBtn = document.getElementById('sidebarSaveBtn');
        if (sidebarSaveBtn) {
          const originalText = sidebarSaveBtn.textContent;
          sidebarSaveBtn.textContent = 'SAVED!';
          setTimeout(() => {
            sidebarSaveBtn.textContent = originalText;
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error saving state:', error);
      alert('Failed to save state. Please try again.');
    }
  }

  /**
   * Check if sidebar is open
   */
  isSidebarOpen() {
    const sidebar = document.getElementById('statesSidebar');
    return sidebar && sidebar.classList.contains('open');
  }

  /**
   * Close the sidebar
   */
  closeSidebar() {
    const sidebar = document.getElementById('statesSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const icon = document.getElementById('sidebarToggleIcon');

    if (!sidebar || !toggleBtn || !icon) return;

    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      toggleBtn.classList.remove('open');
      icon.style.transform = 'rotate(0deg)';
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
      // On narrow screens, close menu if open
      const isNarrowScreen = window.innerWidth < 768;
      if (isNarrowScreen) {
        const menuPanel = document.getElementById('menuPanel');
        const menuIconSvg = document.getElementById('menuIconSvg');
        if (menuPanel && menuPanel.classList.contains('opacity-100')) {
          // Close menu
          menuPanel.classList.add('-translate-y-[500px]', 'opacity-0', 'pointer-events-none');
          menuPanel.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
          if (menuIconSvg) {
            menuIconSvg.style.transform = 'rotate(0deg)';
          }
        }
      }

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

    if (savedStates.length === 0) {
      if (noSavesMessage) {
        noSavesMessage.classList.remove('hidden');
      }
      return;
    }

    if (noSavesMessage) {
      noSavesMessage.classList.add('hidden');
    }

    savedStates.forEach((saveData) => {
      const card = this.createStateCard(saveData);
      card.dataset.stateId = saveData.id;
      savedGrid.appendChild(card);
    });
  }

  /**
   * Create a state card element
   * @param {Object} data - State data with {id, thumbnail, state}
   */
  createStateCard(data) {
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

    // Add delete button for saved states (has an id and not a preset) when in edit mode
    if (data.id && !data.id.startsWith('preset-') && this.isEditMode) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'state-card-delete';
      deleteBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

      // Flag to prevent double-firing on touch devices
      let touchHandled = false;

      deleteBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        touchHandled = true;
        this.deleteState(data.id);
        setTimeout(() => { touchHandled = false; }, 500);
      });

      deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!touchHandled) {
          this.deleteState(data.id);
        }
      };

      card.appendChild(deleteBtn);
    }

    // Click card to load state (only when not in edit mode)
    if (!this.isEditMode) {
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

      // Immediately fit to mechanism bounds (shows crank/rods right away)
      if (this.p5Instance) {
        const mechanismBounds = this.mechanism.calculateBounds();
        if (mechanismBounds) {
          this.camera.fitToView(mechanismBounds, this.p5Instance.width, this.p5Instance.height, true);
        }
      }

      // Initiate auto-fit: record start angle and set flag for re-fit after one round
      this.autoFitStartAngle = this.mechanism.crankAngle;
      this.waitingForAutoFit = true;
    } catch (error) {
      console.error('Error loading state:', error);
      alert('Failed to load state. The data may be corrupted.');
    }
  }

  /**
   * Check if rotation is complete and trigger auto-fit
   * Call this from the draw loop
   */
  checkAutoFit() {
    if (!this.waitingForAutoFit || !this.p5Instance) {
      return;
    }

    // Calculate angle difference (handle wraparound)
    const currentAngle = this.mechanism.crankAngle;
    let angleDiff = currentAngle - this.autoFitStartAngle;

    // Normalize to 0 to 2*PI range
    while (angleDiff < 0) angleDiff += Math.PI * 2;
    while (angleDiff >= Math.PI * 2) angleDiff -= Math.PI * 2;

    // Check if we've completed at least one full rotation
    if (angleDiff >= Math.PI * 2 - 0.1) { // Small tolerance for rounding
      this.waitingForAutoFit = false;

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

      if (bounds) {
        this.camera.fitToView(bounds, this.p5Instance.width, this.p5Instance.height, true);
        // Push to history after fit view completes (wait for animation)
        setTimeout(() => {
          this.urlStateManager.pushToHistoryNow();
        }, 600);
      }
    }
  }

  /**
   * Delete a saved state
   * @param {string} id - State ID to delete
   */
  deleteState(id) {
    const success = this.localStorageManager.deleteState(id);
    if (success) {
      this.populateSavedGrid();
    }
  }

  /**
   * Toggle edit mode for saved states
   */
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const editSavedBtn = document.getElementById('editSavedBtn');

    if (editSavedBtn) {
      editSavedBtn.textContent = this.isEditMode ? 'Close' : 'Edit';
    }

    // Refresh grid to show/hide delete buttons
    this.populateSavedGrid();
    this.populatePresetsGrid();
  }
}