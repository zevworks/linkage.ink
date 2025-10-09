import { Vector } from '../utils/Vector.js';

/**
 * Guide point that constrains rod movement
 */
export class GuidePoint {
  constructor(id, x, y) {
    this.id = id;
    this.pos = new Vector(x, y);
    this.radius = 10;
  }

  draw(p, cameraZoom, rodAngle, fillColor) {
    p.push();
    p.translate(this.pos.x, this.pos.y);

    if (rodAngle !== undefined) {
      p.rotate(rodAngle);
    }

    p.stroke(0);
    p.strokeWeight(8);
    p.strokeCap(p.SQUARE);
    p.line(-this.radius * 2, 0, this.radius * 2, 0);

    p.stroke(0);
    p.strokeWeight(2);
    if (fillColor) {
      p.fill(fillColor[0], fillColor[1], fillColor[2]);
    } else {
      p.fill(255);
    }
    p.ellipse(0, 0, this.radius * 2, this.radius * 2);

    p.strokeCap(p.ROUND);
    p.pop();
  }

  isMouseOver(worldMouse, hitRadius = null) {
    const checkRadius = hitRadius !== null ? hitRadius : this.radius;
    return Vector.dist(worldMouse, this.pos) < checkRadius;
  }
}