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
    // Draw outer black circle
    p.stroke(0);
    p.strokeWeight(2);
    p.fill(0);
    p.ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);

    // Draw inner white circle (hole)
    p.fill(255);
    p.noStroke();
    p.ellipse(this.pos.x, this.pos.y, this.radius, this.radius);
  }

  isMouseOver(worldMouse, hitRadius = null) {
    const checkRadius = hitRadius !== null ? hitRadius : this.radius;
    return Vector.dist(worldMouse, this.pos) < checkRadius;
  }
}