import { Vector } from '../utils/Vector.js';
import { MathUtils } from '../utils/MathUtils.js';

/**
 * System for tracking and rendering motion paths
 */
export class TraceSystem {
  constructor() {
    this.tracePaths = {}; // Object to hold multiple trace paths
    this.fullRodTracePaths = {}; // Object to hold full rod traces
    this.traceColor = [0, 100, 0]; // Dark green
    this.fullRodTraceColor = [0, 150, 0]; // Lighter green for full rod traces
    this.fadeLifespan = 360; // 1 full rotation (360 frames)
    this.fullRodTraceSegments = 8; // Number of points to trace along rod length
    this.traceWidth = 8; // Trace stroke width
    this.rodsWidth = 4; // Rods stroke width
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

  setTraceWidth(width) {
    this.traceWidth = width;
  }

  getTraceWidth() {
    return this.traceWidth;
  }

  setRodsWidth(width) {
    this.rodsWidth = width;
  }

  getRodsWidth() {
    return this.rodsWidth;
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

  getLastPoint(rodId) {
    const path = this.tracePaths[rodId];
    if (!path || path.length === 0) {
      return null;
    }
    return path[path.length - 1];
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
    // Age trace points using original "flowing" logic
    for (const rodId in this.tracePaths) {
      let path = this.tracePaths[rodId];

      // Original logic: iterate backwards, age each point, and remove chunks when finding old point
      for (let i = path.length - 1; i >= 0; i--) {
        path[i].age++;
        if (path[i].age > this.fadeLifespan) {
          path.splice(0, i + 1); // Remove from start to current position
          break;
        }
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
    p.strokeWeight(this.rodsWidth);
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

    // Draw joint point traces on top with smooth curves and flowing bands
    p.strokeWeight(this.traceWidth);
    for (const rodId in this.tracePaths) {
      let path = this.tracePaths[rodId];

      if (path.length < 2) continue;

      // Draw smooth curves with batched alpha changes for flow effect
      let i = 0;
      while (i < path.length - 1) {
        // Calculate alpha for current point
        let currentAlpha = MathUtils.map(path[i].age, 0, this.fadeLifespan, 255, 0);
        if (currentAlpha <= 0) {
          i++;
          continue;
        }

        // Set stroke for this band
        p.stroke(this.traceColor[0], this.traceColor[1], this.traceColor[2], currentAlpha);

        // Start a curve segment
        p.beginShape();
        p.noFill();

        // Add first control point (before current)
        let p0 = (i > 0) ? path[i - 1] : path[i];
        p.curveVertex(p0.pos.x, p0.pos.y);

        // Add current point
        p.curveVertex(path[i].pos.x, path[i].pos.y);

        // Continue adding points while alpha is similar (within 10 units)
        let j = i + 1;
        while (j < path.length) {
          let nextAlpha = MathUtils.map(path[j].age, 0, this.fadeLifespan, 255, 0);

          // If alpha difference is too large, stop this segment
          if (Math.abs(nextAlpha - currentAlpha) > 10) {
            break;
          }

          p.curveVertex(path[j].pos.x, path[j].pos.y);
          j++;
        }

        // Add final control point (after last point)
        if (j < path.length) {
          p.curveVertex(path[j].pos.x, path[j].pos.y);
        } else if (j - 1 < path.length) {
          p.curveVertex(path[j - 1].pos.x, path[j - 1].pos.y);
        }

        p.endShape();

        // Move to next segment
        i = Math.max(i + 1, j - 1);
      }
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

  calculateBounds() {
    const points = [];

    // Collect all point trace positions
    for (const rodId in this.tracePaths) {
      const path = this.tracePaths[rodId];
      path.forEach(tracePoint => {
        points.push(tracePoint.pos);
      });
    }

    // Collect all full rod trace positions
    for (const rodId in this.fullRodTracePaths) {
      const path = this.fullRodTracePaths[rodId];
      path.forEach(frame => {
        frame.points.forEach(point => {
          points.push(point);
        });
      });
    }

    if (points.length === 0) {
      return null; // No traces yet
    }

    // Find min/max coordinates
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    // Add padding for stroke width
    const padding = 10; // Half of stroke weight
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }
}