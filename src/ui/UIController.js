import { ColorPicker } from './ColorPicker.js';

/**
 * Manages UI button interactions and state updates
 */
export class UIController {
  constructor(mechanism, traceSystem, videoExporter, camera, urlStateManager, renderer) {
    this.mechanism = mechanism;
    this.traceSystem = traceSystem;
    this.videoExporter = videoExporter;
    this.camera = camera;
    this.urlStateManager = urlStateManager;
    this.renderer = renderer;
    this.p5Instance = null;
    this.colorPicker = new ColorPicker((design) => this.handleDesignChange(design), renderer, traceSystem, mechanism);
    this.setupEventListeners();

    // Sync button states with mechanism state (for loading from URL)
    this.syncButtonStates();
  }

  handleDesignChange(design) {
    this.traceSystem.setTraceColor(design.color);
    this.traceSystem.setTraceWidth(design.traceWidth);
    this.traceSystem.setRodsWidth(design.rodsWidth);
    if (design.fadingEnabled !== undefined) {
      this.traceSystem.setFading(design.fadingEnabled);
    }
    this.urlStateManager.updateURLNow();
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
        // Use trace bounds if available, otherwise fall back to mechanism bounds
        let bounds = this.traceSystem.calculateBounds();
        if (!bounds) {
          bounds = this.mechanism.calculateBounds();
        }

        if (bounds && this.p5Instance) {
          // Use p5 instance width/height which accounts for display size
          this.camera.fitToView(bounds, this.p5Instance.width, this.p5Instance.height, true);
          this.urlStateManager.scheduleURLUpdate();
        }
      };
    }

    // Add Rod button
    const addRodBtn = document.getElementById('addRodBtn');
    if (addRodBtn) {
      addRodBtn.onclick = () => {
        this.mechanism.addRod();
        this.traceSystem.updateFadeLifespan(this.mechanism.FRAMES_PER_ROUND);
        this.urlStateManager.updateURLNow();
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
        this.urlStateManager.updateURLNow();
      };
    }

    // Save Video button
    const saveVideoBtn = document.getElementById('saveVideoBtn');
    if (saveVideoBtn) {
      saveVideoBtn.onclick = () => {
        if (this.videoExporter.isCurrentlyRecording()) {
          return; // Already recording
        }

        // Update button text
        saveVideoBtn.textContent = 'Recording...';
        saveVideoBtn.disabled = true;

        // Start recording
        this.videoExporter.startRecording(
          this.p5Instance.canvas,
          this.mechanism.FRAMES_PER_ROUND,
          () => {
            // Reset button when complete
            saveVideoBtn.textContent = 'Save Video';
            saveVideoBtn.disabled = false;
          }
        );
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
  }
}