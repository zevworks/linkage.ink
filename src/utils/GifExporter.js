import GIF from 'gif.js';
import workerUrl from './gif.worker.js?url';

/**
 * Handles GIF export functionality
 */
export class GifExporter {
  constructor() {
    this.isRecording = false;
    this.gif = null;
    this.frameCount = 0;
    this.targetFrames = 0;
    this.onComplete = null;
    this.startAngle = 0;
  }

  startRecording(framesPerRound, currentAngle, onComplete) {
    this.isRecording = true;
    this.frameCount = 0;
    this.startAngle = currentAngle;
    // Record exactly 2 full rotations (subtract 1 to avoid duplicate last frame)
    this.targetFrames = (framesPerRound * 2) - 1;
    this.onComplete = onComplete;

    console.log(`Starting GIF recording: ${this.targetFrames} frames (${framesPerRound} frames per round)`);

    // Initialize gif.js with worker script
    this.gif = new GIF({
      workers: 2,
      quality: 20,
      workerScript: workerUrl,
      repeat: 0 // Loop forever
    });

    this.gif.on('finished', (blob) => {
      // Download the GIF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkage-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);

      if (this.onComplete) {
        this.onComplete();
      }
    });
  }

  captureFrame(canvas, currentAngle) {
    if (!this.isRecording) return false;

    this.frameCount++;

    // Add every frame for smooth playback
    try {
      // Get the canvas element (p5.js wraps it)
      const canvasElement = canvas.elt || canvas;
      this.gif.addFrame(canvasElement, { delay: 16, copy: true }); // 60fps
    } catch (error) {
      console.error('Error adding frame to GIF:', error);
      this.isRecording = false;
      if (this.onComplete) {
        this.onComplete();
      }
      return true;
    }

    // Check if we've captured enough frames (exactly 2 cycles)
    if (this.frameCount >= this.targetFrames) {
      console.log(`Recording complete: captured ${this.frameCount} frames`);
      this.isRecording = false;
      this.gif.render();
      return true; // Recording complete
    }

    return false;
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }

  cancel() {
    this.isRecording = false;
    this.gif = null;
  }
}
