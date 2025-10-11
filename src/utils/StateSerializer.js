import { Rod } from '../linkage/Rod.js';
import { GuidePoint } from '../linkage/GuidePoint.js';

/**
 * Serializes and deserializes linkage state for URL encoding
 */
export class StateSerializer {
  constructor(mechanism, camera, traceSystem, renderer) {
    this.mechanism = mechanism;
    this.camera = camera;
    this.traceSystem = traceSystem;
    this.renderer = renderer;
  }

  /**
   * Export current state as JSON object
   */
  exportState() {
    const crank = this.mechanism.rods[0];
    const followerRods = this.mechanism.rods.slice(1);

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      anchor: {
        x: this.mechanism.anchor.pos.x,
        y: this.mechanism.anchor.pos.y,
        crank: {
          length: crank.length,
          isTracing: crank.isTracing,
          isFullRodTracing: crank.isFullRodTracing
        }
      },
      rods: followerRods.map(rod => {
        const rodData = {
          id: rod.id,
          length: rod.length,
          isTracing: rod.isTracing,
          isFullRodTracing: rod.isFullRodTracing
        };

        // Find corresponding guide point
        const gp = this.mechanism.guidePoints.find(gp => gp.id === rod.id);
        if (gp) {
          rodData.guidePoint = {
            x: gp.pos.x,
            y: gp.pos.y
          };
        }

        return rodData;
      }),
      camera: {
        offsetX: this.camera.offset.x,
        offsetY: this.camera.offset.y,
        zoom: this.camera.zoom
      },
      traceColor: this.traceSystem.getTraceColor(),
      traceWidth: this.traceSystem.getTraceWidth(),
      rodsWidth: this.traceSystem.getRodsWidth(),
      isStretchingMode: this.mechanism.isStretchingMode,
      isInverse: this.renderer.getInverse()
    };
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

    // Restore anchor position
    this.mechanism.anchor.pos.set(state.anchor.x, state.anchor.y);

    // Restore crank (rod 0) from anchor
    const crank = new Rod(0, state.anchor.crank.length);
    crank.isTracing = state.anchor.crank.isTracing;
    crank.isFullRodTracing = state.anchor.crank.isFullRodTracing;
    this.mechanism.rods.push(crank);

    // Restore follower rods and their guide points
    state.rods.forEach(rodData => {
      const rod = new Rod(rodData.id, rodData.length);
      rod.isTracing = rodData.isTracing;
      rod.isFullRodTracing = rodData.isFullRodTracing;
      this.mechanism.rods.push(rod);

      // Restore guide point
      if (rodData.guidePoint) {
        const gp = new GuidePoint(rodData.id, rodData.guidePoint.x, rodData.guidePoint.y);
        this.mechanism.guidePoints.push(gp);
      }
    });

    // Restore camera
    this.camera.offset.set(state.camera.offsetX, state.camera.offsetY);
    this.camera.zoom = state.camera.zoom;

    // Restore trace color
    if (state.traceColor) {
      this.traceSystem.setTraceColor(state.traceColor);
    }

    // Restore trace width
    if (state.traceWidth !== undefined) {
      this.traceSystem.setTraceWidth(state.traceWidth);
    }

    // Restore rods width
    if (state.rodsWidth !== undefined) {
      this.traceSystem.setRodsWidth(state.rodsWidth);
    }

    // Restore stretching mode
    if (state.isStretchingMode !== undefined) {
      this.mechanism.isStretchingMode = state.isStretchingMode;
    }

    // Restore inverse mode
    if (state.isInverse !== undefined) {
      this.renderer.setInverse(state.isInverse);
    }

    // Update joints
    this.mechanism.updateJoints();
  }
}
