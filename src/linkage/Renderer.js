import { Vector } from '../utils/Vector.js';

/**
 * Rendering system for the linkage mechanism
 */
export class Renderer {
  constructor(mechanism, camera, traceSystem) {
    this.mechanism = mechanism;
    this.camera = camera;
    this.traceSystem = traceSystem;
    this.selectedObject = null;
  }

  draw(p) {
    p.background(245);

    // Apply camera transformation
    p.push();
    this.camera.applyTransform(p);

    // Draw components in proper order: traces first, then mechanism on top
    this.traceSystem.draw(p, this.camera.zoom);
    this.drawMechanism(p);
    this.drawSelectionHighlight(p);

    p.pop();
  }

  drawMechanism(p) {
    // Draw joints
    for (let i = 0; i < this.mechanism.joints.length; i++) {
      const endPos = this.mechanism.joints[i];
      const rod = this.mechanism.rods[i];

      if (rod.isTracing) {
        p.fill(this.traceSystem.traceColor[0], this.traceSystem.traceColor[1], this.traceSystem.traceColor[2]);
      } else {
        p.fill(255);
      }
      p.stroke(0);
      p.strokeWeight(2);
      p.ellipse(endPos.x, endPos.y, 20, 20);
    }

    // Draw rods
    let startPos = this.mechanism.anchor.pos;
    for (let i = 0; i < this.mechanism.rods.length; i++) {
      let endPos = this.mechanism.joints[i];
      p.stroke(50);
      p.strokeWeight(4);
      p.line(startPos.x, startPos.y, endPos.x, endPos.y);
      startPos = endPos;
    }

    // Draw guide lines
    for (let i = 0; i < this.mechanism.guidePoints.length; i++) {
      let gp = this.mechanism.guidePoints[i];
      let guidedJoint = this.mechanism.joints[i];
      if (guidedJoint) {
        p.drawingContext.setLineDash([5, 5]);
        p.stroke(150, 150, 150, 150);
        p.strokeWeight(1);
        p.line(gp.pos.x, gp.pos.y, guidedJoint.x, guidedJoint.y);
        p.drawingContext.setLineDash([]);
      }
    }

    // Draw anchor and guide points on top
    this.mechanism.anchor.draw(p, this.camera.zoom);
    for (let i = 0; i < this.mechanism.guidePoints.length; i++) {
      let correspondingRod = this.mechanism.rods[i + 1];
      if (correspondingRod) {
        this.mechanism.guidePoints[i].draw(p, this.camera.zoom, correspondingRod.angle, correspondingRod.isFullRodTracing ? this.traceSystem.fullRodTraceColor : null);
      } else {
        this.mechanism.guidePoints[i].draw(p, this.camera.zoom);
      }
    }
  }

  drawSelectionHighlight(p) {
    if (!this.selectedObject) return;
    
    let pos;
    let radius = 20;
    
    if (this.selectedObject.type === 'anchor') {
      pos = this.selectedObject.obj.pos;
      radius = this.selectedObject.obj.radius + 5;
    } else if (this.selectedObject.type === 'guidePoint') {
      pos = this.selectedObject.obj.pos;
      radius = this.selectedObject.obj.radius + 5;
    } else if (this.selectedObject.type === 'rod') {
      pos = this.mechanism.joints[this.selectedObject.obj.id];
      radius = 15;
    }
    
    if (pos) {
      p.noFill();
      p.stroke(255, 204, 0);
      p.strokeWeight(3);
      p.ellipse(pos.x, pos.y, radius * 2, radius * 2);
    }
  }

  setSelectedObject(selectedObject) {
    this.selectedObject = selectedObject;
  }
}