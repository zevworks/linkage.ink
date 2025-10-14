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

    // Update menu button styles - normal: white on black, dark: black on white
    const menuButtons = ['playPauseBtn', 'addRodBtn', 'removeRodBtn', 'fitViewBtn', 'saveStateBtn', 'openStatesBtn', 'copyLinkBtn', 'saveVideoBtn'];
    menuButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        if (this.isInverse) {
          btn.style.color = 'black';
          btn.style.border = '1px solid black';
          btn.style.background = 'transparent';
        } else {
          btn.style.color = 'white';
          btn.style.border = '1px solid white';
          btn.style.background = 'transparent';
        }
      }
    });

    // Update menu panel background - normal: black, dark: white
    const menuPanel = document.getElementById('menuPanel');
    if (menuPanel) {
      if (this.isInverse) {
        menuPanel.style.background = 'rgba(255, 255, 255, 0.6)';
      } else {
        menuPanel.style.background = 'rgba(0, 0, 0, 0.6)';
      }
    }

    // Update sidebar background - normal: black, dark: white
    const statesSidebar = document.getElementById('statesSidebar');
    if (statesSidebar) {
      if (this.isInverse) {
        statesSidebar.style.background = 'rgba(255, 255, 255, 0.6)';
      } else {
        statesSidebar.style.background = 'rgba(0, 0, 0, 0.6)';
      }
    }

    // Update sidebar toggle button background - normal: black, dark: white
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
      if (this.isInverse) {
        sidebarToggle.style.background = 'rgba(255, 255, 255, 0.6)';
      } else {
        sidebarToggle.style.background = 'rgba(0, 0, 0, 0.6)';
      }
    }

    // Update sidebar toggle icon color
    const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
    if (sidebarToggleIcon) {
      const path = sidebarToggleIcon.querySelector('path');
      if (path) {
        path.setAttribute('stroke', this.isInverse ? '#000000' : '#ffffff');
      }
    }

    // Update sidebar section headers
    const sidebarHeaders = document.querySelectorAll('#statesSidebar h3');
    sidebarHeaders.forEach(header => {
      if (this.isInverse) {
        header.style.color = 'black';
      } else {
        header.style.color = 'white';
      }
    });

    // Update edit mode controls colors
    const editSavedBtn = document.getElementById('editSavedBtn');
    if (editSavedBtn) {
      editSavedBtn.style.color = this.isInverse ? 'black' : 'white';
    }

    const saveEditLink = document.getElementById('saveEditLink');
    if (saveEditLink) {
      saveEditLink.style.color = this.isInverse ? 'black' : 'white';
    }

    const cancelEditLink = document.getElementById('cancelEditLink');
    if (cancelEditLink) {
      cancelEditLink.style.color = this.isInverse ? 'black' : 'white';
    }

    // Update "No saved states" message
    const noSavesMessage = document.getElementById('noSavesMessage');
    if (noSavesMessage) {
      if (this.isInverse) {
        noSavesMessage.style.color = '#666666'; // darker gray for light background
      } else {
        noSavesMessage.style.color = '#9ca3af'; // lighter gray for dark background
      }
    }

    // Update all slider labels and values to match button text colors
    const spans = document.querySelectorAll('#menuPanel span');
    spans.forEach(span => {
      // All labels should match button colors: white in normal mode, black in dark mode
      if (this.isInverse) {
        span.style.color = 'black';
      } else {
        span.style.color = 'white';
      }
    });

    // Update checkbox labels (label elements)
    const labelElements = document.querySelectorAll('#menuPanel label');
    labelElements.forEach(label => {
      if (this.isInverse) {
        label.style.color = 'black';
      } else {
        label.style.color = 'white';
      }
    });

    // Update width slider backgrounds to match menu
    const widthSliders = document.querySelectorAll('#widthSlidersContainer input[type="range"]');
    const sliderBg = this.isInverse
      ? 'linear-gradient(to right, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.15))'
      : 'linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.3))';
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