import { Vector } from '../utils/Vector.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Anchor } from './Anchor.js';
import { Rod } from './Rod.js';
import { GuidePoint } from './GuidePoint.js';

/**
 * Core linkage mechanism with physics simulation
 */
export class LinkageMechanism {
  constructor(width, height) {
    this.FRAMES_PER_ROUND = 360;
    this.crankSpeed = Math.PI * 2 / this.FRAMES_PER_ROUND;
    this.crankAngle = 0;
    this.isPlaying = true;
    this.isStretchingMode = false;

    // Initialize mechanism components
    this.anchor = new Anchor(width / 2, height / 2 + 50);
    this.rods = [];
    this.guidePoints = [];
    this.joints = [];

    // Initialize with heart shape configuration like reference
    this.setupDefaultConfiguration(width, height);
  }

  setupDefaultConfiguration(width, height) {
    // Add rods
    this.rods.push(new Rod(0, 80));  // Crank
    this.rods.push(new Rod(1, 120)); // First Follower (stretchy)
    this.rods.push(new Rod(2, 60));  // Second Follower (fixed length for pinch)
    
    // Add guide points
    this.guidePoints.push(new GuidePoint(1, width / 2, height / 2 + 80)); // GP for Rod 1
    this.guidePoints.push(new GuidePoint(2, width / 2, height / 2 - 100)); // GP for Rod 2
    
    // Enable tracing for the last rod
    this.rods[this.rods.length - 1].isTracing = true;
  }

  update() {
    if (this.isPlaying) {
      this.crankAngle += this.crankSpeed;
    }

    this.updateJoints();
  }

  updateJoints() {
    this.joints = [];

    // Calculate crank endpoint
    let currentPos = this.anchor.pos.copy();
    this.rods[0].angle = this.crankAngle;
    let crankEndpoint = new Vector(
      currentPos.x + this.rods[0].length * Math.cos(this.rods[0].angle),
      currentPos.y + this.rods[0].length * Math.sin(this.rods[0].angle)
    );
    this.joints.push(crankEndpoint);

    // Calculate follower rod endpoints
    for (let i = 1; i < this.rods.length; i++) {
      let parentJointPos = this.joints[i - 1];
      let guide = this.guidePoints[i - 1];

      let angle = Math.atan2(guide.pos.y - parentJointPos.y, guide.pos.x - parentJointPos.x);
      this.rods[i].angle = angle;

      // Stretching mode: grow rod if needed to keep joint inside GP
      if (this.isStretchingMode) {
        let distanceToGP = Vector.dist(parentJointPos, guide.pos);
        if (distanceToGP > this.rods[i].length) {
          this.rods[i].length = distanceToGP;
        }
      }

      let nextJointPos = new Vector(
        parentJointPos.x + this.rods[i].length * Math.cos(angle),
        parentJointPos.y + this.rods[i].length * Math.sin(angle)
      );
      this.joints.push(nextJointPos);
    }
  }

  addRod() {
    const newId = this.rods.length;
    if (this.joints.length === 0) return;
    
    const lastJointPos = this.joints[this.joints.length - 1];
    
    // Turn off tracing for current last rod
    if (this.rods.length > 0) {
      this.rods[this.rods.length - 1].isTracing = false;
    }

    // Add new rod with random length between 50-150
    const randomLength = 50 + Math.random() * 100;
    let newRod = new Rod(newId, randomLength);
    newRod.isTracing = true;
    this.rods.push(newRod);

    // Add corresponding guide point at random position within rod's reach
    const randomAngle = Math.random() * Math.PI * 2;
    const randomDistance = Math.random() * randomLength;
    const gpX = lastJointPos.x + randomDistance * Math.cos(randomAngle);
    const gpY = lastJointPos.y + randomDistance * Math.sin(randomAngle);
    this.guidePoints.push(new GuidePoint(newId, gpX, gpY));
  }

  removeRod() {
    if (this.rods.length > 1) {
      this.rods.pop();
      this.guidePoints.pop();
      
      // Enable tracing for new last rod
      if (this.rods.length > 0) {
        this.rods[this.rods.length - 1].isTracing = true;
      }
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  toggleStretchingMode() {
    this.isStretchingMode = !this.isStretchingMode;
    return this.isStretchingMode;
  }

  getTracingRods() {
    return this.rods.filter(rod => rod.isTracing);
  }
}