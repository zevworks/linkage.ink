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
    this.isInverse = false;
  }

  setInverse(isInverse) {
    this.isInverse = isInverse;
    this.traceSystem.setInverse(isInverse);
    this.updateMenuIconColor();
    this.updateBodyBackground();
  }

  updateBodyBackground() {
    document.body.style.backgroundColor = this.isInverse ? '#000000' : '#f5f5f5';
  }

  updateMenuIconColor() {
    const color = this.isInverse ? '#ffffff' : '#000000';
    const textColor = this.isInverse ? 'white' : 'black';
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');

    if (menuIcon) {
      const circles = menuIcon.querySelectorAll('circle');
      circles.forEach(circle => {
        circle.setAttribute('stroke', color);
        if (circle.getAttribute('fill') !== 'none') {
          circle.setAttribute('fill', color);
        }
      });

      const rects = menuIcon.querySelectorAll('rect');
      rects.forEach(rect => {
        rect.setAttribute('stroke', color);
        rect.setAttribute('fill', color);
      });
    }

    if (closeIcon) {
      const lines = closeIcon.querySelectorAll('line');
      lines.forEach(line => {
        line.setAttribute('stroke', color);
      });
    }

    // Update menu button styles for inverse mode
    const menuButtons = ['playPauseBtn', 'addRodBtn', 'removeRodBtn', 'fitViewBtn', 'copyLinkBtn', 'saveVideoBtn'];
    menuButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        if (this.isInverse) {
          btn.style.color = 'white';
        } else {
          btn.style.color = 'black';
        }
      }
    });

    // Update menu panel background
    const menuPanel = document.getElementById('menuPanel');
    if (menuPanel) {
      if (this.isInverse) {
        menuPanel.style.background = 'rgba(0, 0, 0, 0.92)';
      } else {
        menuPanel.style.background = 'rgba(255, 255, 255, 0.92)';
      }
    }

    // Update all slider labels and values
    const labels = document.querySelectorAll('#menuPanel span');
    labels.forEach(label => {
      // Value texts have monospace font
      if (label.style.fontFamily === 'monospace') {
        label.style.color = this.isInverse ? '#eee' : '#333';
      } else if (label.style.fontWeight === '500') {
        // Regular labels
        label.style.color = this.isInverse ? '#aaa' : '#555';
      }
    });

    // Update width slider backgrounds for dark mode
    const widthSliders = document.querySelectorAll('#widthSlidersContainer input[type="range"]');
    const sliderBg = this.isInverse
      ? 'linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.3))'
      : 'linear-gradient(to right, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.15))';
    widthSliders.forEach(slider => {
      slider.style.background = sliderBg;
    });
  }

  getInverse() {
    return this.isInverse;
  }

  draw(p) {
    p.background(this.isInverse ? 0 : 245);

    // Apply camera transformation
    p.push();
    this.camera.applyTransform(p);

    // Draw components in proper order: traces first, then mechanism on top
    this.traceSystem.draw(p, this.camera.zoom);
    this.drawMechanism(p);

    p.pop();
  }

  drawMechanism(p) {
    // Draw joints
    for (let i = 0; i < this.mechanism.joints.length; i++) {
      const endPos = this.mechanism.joints[i];
      const rod = this.mechanism.rods[i];

      // Joint size: use traceWidth with multiplier for all joints
      const jointSize = this.traceSystem.traceWidth * this.traceSystem.jointSizeMultiplier;
      const jointStrokeWeight = this.traceSystem.traceWidth;

      if (rod.isTracing) {
        p.fill(this.traceSystem.traceColor[0], this.traceSystem.traceColor[1], this.traceSystem.traceColor[2]);
      } else {
        p.fill(this.isInverse ? 0 : 255);
      }
      p.stroke(this.isInverse ? 255 : 0);
      p.strokeWeight(jointStrokeWeight);
      p.ellipse(endPos.x, endPos.y, jointSize, jointSize);
    }

    // Draw rods
    let startPos = this.mechanism.anchor.pos;
    for (let i = 0; i < this.mechanism.rods.length; i++) {
      let endPos = this.mechanism.joints[i];
      p.stroke(this.isInverse ? 200 : 50);
      p.strokeWeight(this.traceSystem.rodsWidth);
      p.line(startPos.x, startPos.y, endPos.x, endPos.y);
      startPos = endPos;
    }

    // Draw guide lines
    for (let i = 0; i < this.mechanism.guidePoints.length; i++) {
      let gp = this.mechanism.guidePoints[i];
      let guidedJoint = this.mechanism.joints[i];
      if (guidedJoint) {
        p.drawingContext.setLineDash([5, 5]);
        p.stroke(this.isInverse ? 100 : 150, this.isInverse ? 100 : 150, this.isInverse ? 100 : 150, 150);
        p.strokeWeight(1);
        p.line(gp.pos.x, gp.pos.y, guidedJoint.x, guidedJoint.y);
        p.drawingContext.setLineDash([]);
      }
    }

    // Draw anchor and guide points on top
    this.mechanism.anchor.draw(p, this.camera.zoom, this.traceSystem.rodsWidth, this.isInverse);
    for (let i = 0; i < this.mechanism.guidePoints.length; i++) {
      let correspondingRod = this.mechanism.rods[i + 1];
      if (correspondingRod) {
        this.mechanism.guidePoints[i].draw(p, this.camera.zoom, correspondingRod.angle, correspondingRod.isFullRodTracing ? this.traceSystem.fullRodTraceColor : null, this.traceSystem.rodsWidth, this.isInverse);
      } else {
        this.mechanism.guidePoints[i].draw(p, this.camera.zoom, null, null, this.traceSystem.rodsWidth, this.isInverse);
      }
    }
  }

  setSelectedObject(selectedObject) {
    this.selectedObject = selectedObject;
  }
}