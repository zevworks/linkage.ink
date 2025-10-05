import { Vector } from '../utils/Vector.js';

/**
 * Anchor point - the fixed point where the linkage mechanism is attached
 */
export class Anchor {
  constructor(x, y) {
    this.pos = new Vector(x, y);
    this.radius = 10;
  }

  draw(p, cameraZoom) {
    p.stroke(0);
    p.strokeWeight(2);
    p.fill(0);
    p.ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
  }

  isMouseOver(worldMouse) {
    return Vector.dist(worldMouse, this.pos) < this.radius;
  }
}