import { Vector } from '../utils/Vector.js';

/**
 * Anchor point - the fixed point where the linkage mechanism is attached
 */
export class Anchor {
  constructor(x, y) {
    this.pos = new Vector(x, y);
    this.radius = 10;
  }

  draw(p, cameraZoom, rodsWidth = 4) {
    // Anchor size based on rod width
    const anchorSize = rodsWidth * 5;
    const anchorStrokeWeight = rodsWidth / 2;

    // Draw outer black circle
    p.stroke(0);
    p.strokeWeight(anchorStrokeWeight);
    p.fill(0);
    p.ellipse(this.pos.x, this.pos.y, anchorSize, anchorSize);

    // Draw inner white circle (hole)
    p.fill(255);
    p.noStroke();
    p.ellipse(this.pos.x, this.pos.y, anchorSize / 2, anchorSize / 2);
  }

  isMouseOver(worldMouse, hitRadius = null) {
    const checkRadius = hitRadius !== null ? hitRadius : this.radius;
    return Vector.dist(worldMouse, this.pos) < checkRadius;
  }
}