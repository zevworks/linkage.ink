import { Vector } from '../utils/Vector.js';

/**
 * Rod component of the linkage mechanism
 */
export class Rod {
  constructor(id, length) {
    this.id = id;
    this.length = length;
    this.angle = 0;
    this.isTracing = false;
    this.isFullRodTracing = false;
  }

  isMouseOver(jointPos, worldMouse, hitRadius = 10) {
    return Vector.dist(worldMouse, jointPos) < hitRadius;
  }
}