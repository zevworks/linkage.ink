import { ColorPicker } from './ColorPicker.js';
import { SaveLoadManager } from '../utils/SaveLoadManager.js';

/**
 * Manages UI button interactions and state updates
 */
export class UIController {
  constructor(mechanism, traceSystem, gifExporter, videoExporter, camera) {
    this.mechanism = mechanism;
    this.traceSystem = traceSystem;
    this.gifExporter = gifExporter;
    this.videoExporter = videoExporter;
    this.camera = camera;
    this.p5Instance = null;
    this.colorPicker = new ColorPicker((color) => this.handleColorChange(color));
    this.saveLoadManager = new SaveLoadManager(mechanism, camera, traceSystem);
    this.setupEventListeners();
  }

  handleColorChange(color) {
    this.traceSystem.setTraceColor(color);
     this.updateButtonColors(color);
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
      };
    }

    // Clear Trace button
    const clearTraceBtn = document.getElementById('clearTraceBtn');
    if (clearTraceBtn) {
      clearTraceBtn.onclick = () => {
        this.traceSystem.clearAllTraces();
      };
    }

    // Save GIF button
    const saveGifBtn = document.getElementById('saveGifBtn');
    if (saveGifBtn) {
      saveGifBtn.onclick = () => {
        if (this.gifExporter.isCurrentlyRecording()) {
          return; // Already recording
        }

        // Update button text
        saveGifBtn.textContent = 'Recording...';
        saveGifBtn.disabled = true;

        // Start recording with current crank angle
        this.gifExporter.startRecording(
          this.mechanism.FRAMES_PER_ROUND,
          this.mechanism.crankAngle,
          () => {
            // Reset button when complete
            saveGifBtn.textContent = 'Save GIF';
            saveGifBtn.disabled = false;
          }
        );
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

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `linkage-${timestamp}.lnk`;
        this.saveLoadManager.saveToFile(filename);
      };
    }

    // Open button
    const openBtn = document.getElementById('openBtn');
    if (openBtn) {
      openBtn.onclick = () => {
        this.saveLoadManager.openFilePicker((success, message) => {
          if (success) {
            // Clear traces when loading new configuration
            this.traceSystem.clearAllTraces();
            // Update button colors to match loaded trace color
            this.updateButtonColors(this.traceSystem.getTraceColor());
          } else {
            alert(message);
          }
        });
      };
    }
  }
}