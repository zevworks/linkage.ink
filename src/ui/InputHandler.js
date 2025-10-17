import { Vector } from '../utils/Vector.js';

/**
 * Handles mouse and touch input events
 */
export class InputHandler {
  constructor(mechanism, camera, renderer, urlStateManager) {
    this.mechanism = mechanism;
    this.camera = camera;
    this.renderer = renderer;
    this.urlStateManager = urlStateManager;
    this.uiController = null;

    this.selectedObject = null;
    this.dragOffset = null;
    this.isPanning = false;
    this.pressPos = null;
    this.prevPinchDist = 0;
  }

  setUIController(uiController) {
    this.uiController = uiController;
  }

  /**
   * Clear all input state (used when restoring from history)
   */
  clearState() {
    this.selectedObject = null;
    this.dragOffset = null;
    this.isPanning = false;
    this.pressPos = null;
    this.renderer.setSelectedObject(null);
  }

  handlePress(x, y, isTouchDevice = false) {
    this.pressPos = new Vector(x, y);
    let worldMouse = this.camera.screenToWorld(x, y);
    this.selectedObject = null;

    // Hit radius in screen pixels (constant regardless of zoom)
    const screenJointRadius = isTouchDevice ? 40 : 20;
    const screenObjectRadius = isTouchDevice ? 35 : 15;

    // Convert to world space (divide by zoom so it stays constant in screen space)
    const jointRadius = screenJointRadius / this.camera.zoom;
    const objectRadius = screenObjectRadius / this.camera.zoom;

    // Collect all potential hits with their distances
    let candidates = [];

    // Check for anchor selection
    if (this.mechanism.anchor.isMouseOver(worldMouse, objectRadius)) {
      const dist = Vector.dist(this.mechanism.anchor.pos, worldMouse);
      candidates.push({
        type: 'anchor',
        obj: this.mechanism.anchor,
        distance: dist,
        dragOffset: Vector.sub(this.mechanism.anchor.pos, worldMouse)
      });
    }

    // Check for guide point selection
    for (let i = 0; i < this.mechanism.guidePoints.length; i++) {
      let gp = this.mechanism.guidePoints[i];
      if (gp.isMouseOver(worldMouse, objectRadius)) {
        const dist = Vector.dist(gp.pos, worldMouse);
        candidates.push({
          type: 'guidePoint',
          obj: gp,
          rodIndex: i + 1,
          distance: dist,
          dragOffset: Vector.sub(gp.pos, worldMouse)
        });
      }
    }

    // Check for joint selection
    for (let i = 0; i < this.mechanism.joints.length; i++) {
      let joint = this.mechanism.joints[i];
      let dist = Vector.dist(joint, worldMouse);
      if (dist < jointRadius) {
        candidates.push({
          type: 'joint',
          obj: joint,
          rodIndex: i,
          distance: dist
        });
      }
    }

    // If we have candidates, select the closest one
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.distance - b.distance);
      const closest = candidates[0];

      this.selectedObject = {
        type: closest.type,
        obj: closest.obj,
        rodIndex: closest.rodIndex
      };

      if (closest.dragOffset) {
        this.dragOffset = closest.dragOffset;
      }

      this.renderer.setSelectedObject(this.selectedObject);
      return;
    }

    // Check for rod selection (in reverse order for proper layering)
    for (let i = this.mechanism.rods.length - 1; i >= 0; i--) {
      if (this.mechanism.joints[i] && this.mechanism.rods[i].isMouseOver(this.mechanism.joints[i], worldMouse, jointRadius)) {
        this.selectedObject = { type: 'rod', obj: this.mechanism.rods[i] };
        this.renderer.setSelectedObject(this.selectedObject);
        return;
      }
    }

    // If nothing is selected, enable panning (only for mouse, not touch)
    if (!this.selectedObject && !isTouchDevice) {
      this.isPanning = true;
    }

    this.renderer.setSelectedObject(this.selectedObject);
  }

  handleDrag(x, y, px, py) {
    let worldMouse = this.camera.screenToWorld(x, y);

    if (this.isPanning) {
      this.camera.pan(x - px, y - py);
      // Update URL during drag for visual feedback (without creating history)
      if (this.urlStateManager) {
        this.urlStateManager.updateURLWithoutHistory(50);
      }
    } else if (this.selectedObject) {
      if (this.selectedObject.type === 'anchor' && this.dragOffset) {
        this.selectedObject.obj.pos.set(
          worldMouse.x + this.dragOffset.x,
          worldMouse.y + this.dragOffset.y
        );
      } else if (this.selectedObject.type === 'guidePoint' && this.dragOffset) {
        this.selectedObject.obj.pos.set(
          worldMouse.x + this.dragOffset.x,
          worldMouse.y + this.dragOffset.y
        );
      } else if (this.selectedObject.type === 'rod') {
        let startPos = (this.selectedObject.obj.id === 0) ?
          this.mechanism.anchor.pos :
          this.mechanism.joints[this.selectedObject.obj.id - 1];
        let newLength = Vector.dist(startPos, worldMouse);
        this.selectedObject.obj.length = newLength;
      } else if (this.selectedObject.type === 'joint') {
        // Dragging joint changes the rod length
        const rod = this.mechanism.rods[this.selectedObject.rodIndex];
        if (rod) {
          let startPos = (rod.id === 0) ?
            this.mechanism.anchor.pos :
            this.mechanism.joints[rod.id - 1];
          let newLength = Vector.dist(startPos, worldMouse);
          rod.length = newLength;
        }
      }

      // Update URL during drag for visual feedback (without creating history)
      if (this.urlStateManager) {
        this.urlStateManager.updateURLWithoutHistory(50);
      }
    }
  }

  handleRelease(x, y) {
    if (!this.pressPos) {
      this.selectedObject = null;
      this.dragOffset = null;
      this.isPanning = false;
      this.renderer.setSelectedObject(null);
      return;
    }

    const dragDist = Vector.dist(new Vector(x, y), this.pressPos);
    let wasClick = dragDist < 5 * (window.devicePixelRatio || 1);

    // Handle anchor click - reverse spin direction
    if (this.selectedObject && this.selectedObject.type === 'anchor') {
      if (wasClick) {
        this.mechanism.reverseSpinDirection();
        // Push to history immediately for toggle action
        if (this.urlStateManager) {
          this.urlStateManager.pushToHistoryNow();
        }
      }
    }

    // Handle joint click - toggle point tracing
    if (this.selectedObject && this.selectedObject.type === 'joint') {
      if (wasClick) {
        const rodIndex = this.selectedObject.rodIndex;
        const rod = this.mechanism.rods[rodIndex];
        if (rod) {
          rod.isTracing = !rod.isTracing;
          // Push to history immediately for toggle action
          if (this.urlStateManager) {
            this.urlStateManager.pushToHistoryNow();
          }
        }
      }
    }

    // Handle guide point click - toggle full rod tracing
    if (this.selectedObject && this.selectedObject.type === 'guidePoint') {
      if (wasClick) {
        const rodIndex = this.selectedObject.rodIndex;
        const rod = this.mechanism.rods[rodIndex];
        if (rod) {
          rod.isFullRodTracing = !rod.isFullRodTracing;
          // Push to history immediately for toggle action
          if (this.urlStateManager) {
            this.urlStateManager.pushToHistoryNow();
          }
        }
      }
    }

    // Handle canvas click (no object selected) - toggle play/pause
    // wasClick means it wasn't dragged, so it's a click even if isPanning was set
    if (!this.selectedObject && wasClick) {
      this.mechanism.togglePlayPause();
      // Sync button state if UIController is available
      if (this.uiController) {
        this.uiController.syncButtonStates();
      }
      // Don't push to history for play/pause toggle
    }

    // If it was a drag (not a click), push state to history after completion
    if (!wasClick && this.urlStateManager) {
      if (this.isPanning || this.selectedObject) {
        this.urlStateManager.schedulePushToHistory(300);
      }
    }

    this.selectedObject = null;
    this.dragOffset = null;
    this.isPanning = false;
    this.renderer.setSelectedObject(null);
  }

  handleZoom(x, y, delta) {
    let worldMouse = this.camera.screenToWorld(x, y);
    let zoomFactor = 1 - delta * 0.001;
    this.camera.zoomAt(worldMouse, zoomFactor);

    // Update URL and push to history after zoom (debounced)
    if (this.urlStateManager) {
      this.urlStateManager.updateURLWithoutHistory(50);
      this.urlStateManager.schedulePushToHistory(500);
    }
  }

  handlePinchZoom(touch1, touch2, prevDist) {
    const currentDist = Vector.dist(touch1, touch2);
    const zoomFactor = currentDist / prevDist;
    
    let midPoint = new Vector((touch1.x + touch2.x) / 2, (touch1.y + touch2.y) / 2);
    let worldMouse = this.camera.screenToWorld(midPoint.x, midPoint.y);
    
    this.camera.zoomAt(worldMouse, zoomFactor);
    return currentDist;
  }
}