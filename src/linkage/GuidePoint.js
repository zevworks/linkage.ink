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

  draw(p, cameraZoom, rodAngle, fillColor, rodsWidth = 4) {
    p.push();
    p.translate(this.pos.x, this.pos.y);

    if (rodAngle !== undefined) {
      p.rotate(rodAngle);
    }

    // GP circle size based on rod width
    const gpSize = rodsWidth * 5;
    const sleeveLength = gpSize;
    const gpStrokeWeight = rodsWidth / 2;

    // Sleeves are always double the rod width
    p.stroke(0);
    p.strokeWeight(rodsWidth * 2);
    p.strokeCap(p.SQUARE);
    p.line(-sleeveLength, 0, sleeveLength, 0);

    p.stroke(0);
    p.strokeWeight(gpStrokeWeight);
    if (fillColor) {
      p.fill(fillColor[0], fillColor[1], fillColor[2]);
    } else {
      p.fill(255);
    }
    p.ellipse(0, 0, gpSize, gpSize);

    p.strokeCap(p.ROUND);
    p.pop();
  }

  isMouseOver(worldMouse, hitRadius = null) {
    const checkRadius = hitRadius !== null ? hitRadius : this.radius;
    return Vector.dist(worldMouse, this.pos) < checkRadius;
  }
}