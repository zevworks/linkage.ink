import { Vector } from '../utils/Vector.js';
import { MathUtils } from '../utils/MathUtils.js';

/**
 * Camera system for pan and zoom functionality
 */
export class Camera {
  constructor() {
    this.offset = new Vector(0, 0);
    this.zoom = 1.0;
    this.maxZoom = 5.0;
    this.minZoom = 0.2;

    // Animation properties
    this.isAnimating = false;
    this.animStartZoom = 1.0;
    this.animTargetZoom = 1.0;
    this.animProgress = 0;
    this.animDuration = 0.3; // seconds
    this.animStartTime = 0;
    this.animWorldPos = null;
  }

  screenToWorld(x, y) {
    return new Vector(
      (x - this.offset.x) / this.zoom,
      (y - this.offset.y) / this.zoom
    );
  }

  worldToScreen(worldPos) {
    return new Vector(
      worldPos.x * this.zoom + this.offset.x,
      worldPos.y * this.zoom + this.offset.y
    );
  }

  pan(deltaX, deltaY) {
    this.offset.add(new Vector(deltaX, deltaY));
  }

  update(deltaTime) {
    if (!this.isAnimating) return;

    this.animProgress += deltaTime / this.animDuration;

    if (this.animProgress >= 1.0) {
      // Animation complete
      this.animProgress = 1.0;
      this.isAnimating = false;
    }

    // Ease-out cubic for smooth animation
    const t = this.animProgress;
    const eased = 1 - Math.pow(1 - t, 3);

    // Interpolate zoom
    const newZoom = this.animStartZoom + (this.animTargetZoom - this.animStartZoom) * eased;

    // Directly set the zoom while maintaining the world position at screen center
    if (this.animWorldPos) {
      const oldZoom = this.zoom;
      const screenX = this.animWorldPos.x * oldZoom + this.offset.x;
      const screenY = this.animWorldPos.y * oldZoom + this.offset.y;

      this.zoom = newZoom;
      this.offset.x = screenX - this.animWorldPos.x * newZoom;
      this.offset.y = screenY - this.animWorldPos.y * newZoom;
    }
  }

  animatedZoomAt(worldPos, zoomFactor) {
    this.animStartZoom = this.zoom;
    this.animTargetZoom = MathUtils.constrain(this.zoom * zoomFactor, this.minZoom, this.maxZoom);
    this.animProgress = 0;
    this.animWorldPos = worldPos;
    this.isAnimating = true;
  }

  zoomAt(worldPos, zoomFactor) {
    const oldZoom = this.zoom;
    const newZoom = MathUtils.constrain(this.zoom * zoomFactor, this.minZoom, this.maxZoom);

    // Calculate screen position of the zoom center point
    const screenX = worldPos.x * oldZoom + this.offset.x;
    const screenY = worldPos.y * oldZoom + this.offset.y;

    // Adjust offset so the same world point stays at the same screen position
    this.offset.x = screenX - worldPos.x * newZoom;
    this.offset.y = screenY - worldPos.y * newZoom;

    this.zoom = newZoom;
  }

  applyTransform(p) {
    p.translate(this.offset.x, this.offset.y);
    p.scale(this.zoom);
  }
}