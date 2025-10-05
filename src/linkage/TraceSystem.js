import { Vector } from '../utils/Vector.js';
import { MathUtils } from '../utils/MathUtils.js';

/**
 * System for tracking and rendering motion paths
 */
export class TraceSystem {
  constructor() {
    this.tracePaths = {}; // Object to hold multiple trace paths
    this.fullRodTracePaths = {}; // Object to hold full rod traces
    this.traceColor = [128, 0, 128];
    this.fullRodTraceColor = [255, 0, 255]; // Magenta for full rod traces
    this.fadeLifespan = 360; // 1 full rotation (360 frames)
    this.fullRodTraceSegments = 8; // Number of points to trace along rod length
  }

  setTraceColor(color) {
    // Convert color object {r, g, b} to array [r, g, b]
    this.traceColor = [color.r, color.g, color.b];

    // Calculate lighter version for rod traces
    // Increase each component by 50%, capping at 255
    this.fullRodTraceColor = [
      Math.min(255, Math.floor(color.r * 1.5)),
      Math.min(255, Math.floor(color.g * 1.5)),
      Math.min(255, Math.floor(color.b * 1.5))
    ];
  }

  getTraceColor() {
    return {
      r: this.traceColor[0],
      g: this.traceColor[1],
      b: this.traceColor[2]
    };
  }

  updateFadeLifespan(framesPerRound) {
    this.fadeLifespan = framesPerRound;
  }

  addTracePoint(rodId, position) {
    if (!this.tracePaths[rodId]) {
      this.tracePaths[rodId] = [];
    }
    
    const path = this.tracePaths[rodId];
    path.push({ pos: position.copy(), age: 0 });
  }

  addFullRodTrace(rodId, startPos, endPos) {
    if (!this.fullRodTracePaths[rodId]) {
      this.fullRodTracePaths[rodId] = [];
    }
    
    const path = this.fullRodTracePaths[rodId];
    const tracePoints = [];
    
    // Create multiple points along the rod length
    for (let i = 0; i <= this.fullRodTraceSegments; i++) {
      const t = i / this.fullRodTraceSegments;
      const x = startPos.x + (endPos.x - startPos.x) * t;
      const y = startPos.y + (endPos.y - startPos.y) * t;
      tracePoints.push(new Vector(x, y));
    }
    
    path.push({ points: tracePoints, age: 0 });
  }

  update() {
    // Age all trace points and remove completely faded ones
    for (const rodId in this.tracePaths) {
      let path = this.tracePaths[rodId];
      
      // Age all points
      for (let i = 0; i < path.length; i++) {
        path[i].age++;
      }
      
      // Remove completely faded points (age >= fadeLifespan)
      while (path.length > 0 && path[0].age >= this.fadeLifespan) {
        path.shift();
      }
    }

    // Age all full-rod trace points and remove completely faded ones
    for (const rodId in this.fullRodTracePaths) {
      let path = this.fullRodTracePaths[rodId];
      
      // Age all rod traces
      for (let i = 0; i < path.length; i++) {
        path[i].age++;
      }
      
      // Remove completely faded rod traces (age >= fadeLifespan)
      while (path.length > 0 && path[0].age >= this.fadeLifespan) {
        path.shift();
      }
    }
  }

  draw(p, cameraZoom) {
    p.noFill();

    // Draw full-rod traces first (bottom layer)
    p.strokeWeight(2);
    for (const rodId in this.fullRodTracePaths) {
      let path = this.fullRodTracePaths[rodId];

      if (path.length === 0) continue;

      // Use beginShape for better performance
      for (let frameIdx = 0; frameIdx < path.length; frameIdx++) {
        let frame = path[frameIdx];
        let alpha = MathUtils.map(frame.age, 0, this.fadeLifespan, 255, 0);
        if (alpha <= 0) continue;

        p.stroke(this.fullRodTraceColor[0], this.fullRodTraceColor[1], this.fullRodTraceColor[2], alpha);
        p.beginShape();
        for (let i = 0; i < frame.points.length; i++) {
          p.vertex(frame.points[i].x, frame.points[i].y);
        }
        p.endShape();
      }
    }

    // Draw joint point traces on top
    p.strokeWeight(8);
    for (const rodId in this.tracePaths) {
      let path = this.tracePaths[rodId];

      if (path.length < 2) continue;

      // Use beginShape for better performance
      p.beginShape();
      let prevAlpha = -1;
      for (let i = 0; i < path.length; i++) {
        let point = path[i];
        let alpha = MathUtils.map(point.age, 0, this.fadeLifespan, 255, 0);
        if (alpha <= 0) continue;

        // Only change stroke when alpha changes significantly
        if (Math.abs(alpha - prevAlpha) > 5) {
          if (i > 0) p.endShape();
          p.stroke(this.traceColor[0], this.traceColor[1], this.traceColor[2], alpha);
          if (i > 0) p.beginShape();
          prevAlpha = alpha;
        }
        p.vertex(point.pos.x, point.pos.y);
      }
      p.endShape();
    }
  }

  clearTrace(rodId = null) {
    if (rodId !== null) {
      delete this.tracePaths[rodId];
      delete this.fullRodTracePaths[rodId];
    } else {
      this.tracePaths = {};
      this.fullRodTracePaths = {};
    }
  }

  clearAllTraces() {
    this.tracePaths = {};
    this.fullRodTracePaths = {};
  }
}