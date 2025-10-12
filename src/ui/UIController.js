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
    // Use debounced update to avoid rate limiting when dragging sliders
    this.urlStateManager.scheduleURLUpdate();
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
  }
}