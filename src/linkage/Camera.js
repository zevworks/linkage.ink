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

  zoomAt(worldPos, zoomFactor) {
    const newZoom = MathUtils.constrain(this.zoom * zoomFactor, this.minZoom, this.maxZoom);
    
    // Zoom towards the specified world position
    this.offset.sub(worldPos).mult(newZoom / this.zoom).add(worldPos);
    this.zoom = newZoom;
  }

  applyTransform(p) {
    p.translate(this.offset.x, this.offset.y);
    p.scale(this.zoom);
  }
}