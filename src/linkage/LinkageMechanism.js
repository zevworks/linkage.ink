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
    this.crankAngularVelocity = (Math.PI * 2) / (this.FRAMES_PER_ROUND / 60); // radians per second at 60fps
    this.crankAngle = 0;
    this.prevCrankAngle = 0;
    this.isPlaying = true;

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

  update(deltaTime = 1/60) {
    if (this.isPlaying) {
      this.crankAngle += this.crankAngularVelocity * deltaTime;
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

  getTracingRods() {
    return this.rods.filter(rod => rod.isTracing);
  }
}