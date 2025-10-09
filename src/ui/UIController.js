import { ColorPicker } from './ColorPicker.js';

/**
 * Manages UI button interactions and state updates
 */
export class UIController {
  constructor(mechanism, traceSystem, videoExporter, camera, urlStateManager) {
    this.mechanism = mechanism;
    this.traceSystem = traceSystem;
    this.videoExporter = videoExporter;
    this.camera = camera;
    this.urlStateManager = urlStateManager;
    this.p5Instance = null;
    this.colorPicker = new ColorPicker((color) => this.handleColorChange(color));
    this.setupEventListeners();

    // Set initial button colors based on current trace color
    this.updateButtonColors(this.traceSystem.getTraceColor());
  }

  handleColorChange(color) {
    this.traceSystem.setTraceColor(color);
    this.updateButtonColors(color);
    this.urlStateManager.updateURLNow();
  }

  updateButtonColors(color) {
    const buttons = document.querySelectorAll('#controls button');
    const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const hoverColor = `rgb(${Math.max(0, color.r - 28)}, ${Math.max(0, color.g - 28)}, ${Math.max(0, color.b - 28)})`;

    buttons.forEach(button => {
      button.style.backgroundColor = rgbColor;
    });

    // Update hover style
    const styleId = 'button-hover-style';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      #controls button:hover {
        background-color: ${hoverColor} !important;
      }
    `;
  }

  setP5Instance(p5Instance, mechanism) {
    this.p5Instance = p5Instance;
    this.mechanism = mechanism;
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

    // Color Picker button
    const colorPickerBtn = document.getElementById('colorPickerBtn');
    if (colorPickerBtn) {
      colorPickerBtn.onclick = () => {
        // Set current color before opening
        this.colorPicker.setColor(this.traceSystem.getTraceColor());
        this.colorPicker.open();
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