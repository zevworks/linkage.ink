import { Rod } from '../linkage/Rod.js';
import { GuidePoint } from '../linkage/GuidePoint.js';

/**
 * Handles saving and loading linkage configurations to/from .lnk files
 */
export class SaveLoadManager {
  constructor(mechanism, camera, traceSystem) {
    this.mechanism = mechanism;
    this.camera = camera;
    this.traceSystem = traceSystem;
  }

  /**
   * Export current state to a .json file
   */
  saveToFile(filename = 'linkage.json') {
    const state = this.exportState();
    const json = JSON.stringify(state, null, 2);

    // Use a data URL instead of blob URL to avoid .download suffix
    const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);

    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export current state as JSON object
   */
  exportState() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      anchor: {
        x: this.mechanism.anchor.pos.x,
        y: this.mechanism.anchor.pos.y
      },
      rods: this.mechanism.rods.map(rod => {
        const rodData = {
          id: rod.id,
          length: rod.length,
          isTracing: rod.isTracing,
          isFullRodTracing: rod.isFullRodTracing
        };

        // Find corresponding guide point (rod 0 doesn't have one)
        if (rod.id > 0) {
          const gp = this.mechanism.guidePoints.find(gp => gp.id === rod.id);
          if (gp) {
            rodData.guidePoint = {
              x: gp.pos.x,
              y: gp.pos.y
            };
          }
        }

        return rodData;
      }),
      camera: {
        offsetX: this.camera.offset.x,
        offsetY: this.camera.offset.y,
        zoom: this.camera.zoom
      },
      traceColor: this.traceSystem.getTraceColor()
    };
  }

  /**
   * Load state from a .json file
   */
  loadFromFile(file, onComplete) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target.result;
        const state = JSON.parse(json);
        this.importState(state);
        if (onComplete) onComplete(true, 'File loaded successfully');
      } catch (error) {
        console.error('Error loading file:', error);
        if (onComplete) onComplete(false, `Error: ${error.message}`);
      }
    };

    reader.onerror = () => {
      if (onComplete) onComplete(false, 'Error reading file');
    };

    reader.readAsText(file);
  }

  /**
   * Import state from JSON object
   */
  importState(state) {
    // Validate version
    if (!state.version || state.version !== '1.0') {
      throw new Error('Unsupported file version');
    }

    // Clear existing configuration
    this.mechanism.rods = [];
    this.mechanism.guidePoints = [];

    // Restore anchor
    this.mechanism.anchor.pos.set(state.anchor.x, state.anchor.y);

    // Restore rods and their guide points
    state.rods.forEach(rodData => {
      const rod = new Rod(rodData.id, rodData.length);
      rod.isTracing = rodData.isTracing;
      rod.isFullRodTracing = rodData.isFullRodTracing;
      this.mechanism.rods.push(rod);

      // Restore guide point if rod has one (nested in rod)
      if (rodData.guidePoint) {
        const gp = new GuidePoint(rodData.id, rodData.guidePoint.x, rodData.guidePoint.y);
        this.mechanism.guidePoints.push(gp);
      }
    });

    // Backward compatibility: restore guide points from old format (separate array)
    if (state.guidePoints && state.guidePoints.length > 0) {
      this.mechanism.guidePoints = [];
      state.guidePoints.forEach(gpData => {
        const gp = new GuidePoint(gpData.id, gpData.x, gpData.y);
        this.mechanism.guidePoints.push(gp);
      });
    }

    // Restore camera
    this.camera.offset.set(state.camera.offsetX, state.camera.offsetY);
    this.camera.zoom = state.camera.zoom;

    // Restore trace color
    if (state.traceColor) {
      this.traceSystem.setTraceColor(state.traceColor);
    }

    // Update joints
    this.mechanism.updateJoints();
  }

  /**
   * Open file picker dialog
   */
  openFilePicker(onComplete) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadFromFile(file, onComplete);
      }
    };

    input.click();
  }
}
