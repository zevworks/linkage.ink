import p5 from 'p5';
import { LinkageMechanism } from './LinkageMechanism.js';
import { Camera } from './Camera.js';
import { TraceSystem } from './TraceSystem.js';
import { Renderer } from './Renderer.js';
import { InputHandler } from '../ui/InputHandler.js';
import { UIController } from '../ui/UIController.js';
import { VideoExporter } from '../utils/VideoExporter.js';
import { StateSerializer } from '../utils/StateSerializer.js';
import { URLStateManager } from '../utils/URLStateManager.js';

/**
 * Main application class that orchestrates all components
 */
class LinkageApp {
  constructor() {
    // Make canvas responsive to screen size
    this.width = Math.min(1000, window.innerWidth - 40);
    this.height = Math.min(800, window.innerHeight - 120);

    // Initialize core systems
    this.mechanism = new LinkageMechanism(this.width, this.height);
    this.camera = new Camera();
    this.traceSystem = new TraceSystem();
    this.videoExporter = new VideoExporter();

    // Initialize state serialization and URL state management
    this.stateSerializer = new StateSerializer(this.mechanism, this.camera, this.traceSystem);
    this.urlStateManager = new URLStateManager(this.stateSerializer);

    // Try to load state from URL, if not present, use default configuration
    const loadedFromURL = this.urlStateManager.decodeStateFromURL();
    if (loadedFromURL) {
      console.log('Loaded configuration from URL');
    }

    // Initialize rendering and interaction
    this.renderer = new Renderer(this.mechanism, this.camera, this.traceSystem);
    this.inputHandler = new InputHandler(this.mechanism, this.camera, this.renderer, this.urlStateManager);
    this.uiController = new UIController(
      this.mechanism,
      this.traceSystem,
      this.videoExporter,
      this.camera,
      this.urlStateManager
    );

    // Store p5 instance for GIF export
    this.p5Instance = null;

    // Setup p5.js sketch
    this.setupP5();
  }

  setupP5() {
    const sketch = (p) => {
      p.setup = () => {
        const canvasContainer = document.getElementById('canvas-container');
        const canvas = p.createCanvas(this.width, this.height);
        canvas.parent(canvasContainer);

        // Set frame rate to 60fps for smooth animation
        p.frameRate(60);

        // Initialize trace system fade lifespan
        this.traceSystem.updateFadeLifespan(this.mechanism.FRAMES_PER_ROUND);

        // Store p5 instance
        this.p5Instance = p;

        // Pass p5 instance to UIController for GIF export
        this.uiController.setP5Instance(p, this.mechanism);
      };

      p.draw = () => {
        // Update mechanism
        this.mechanism.update();

        // Only add trace points when mechanism is playing
        if (this.mechanism.isPlaying) {
          for (let i = 0; i < this.mechanism.rods.length; i++) {
            const rod = this.mechanism.rods[i];

            // Regular point tracing - add every frame for flow effect
            if (rod.isTracing && this.mechanism.joints[i]) {
              this.traceSystem.addTracePoint(i, this.mechanism.joints[i]);
            }

            // Full-rod tracing
            if (rod.isFullRodTracing) {
              const startPos = (i === 0) ? this.mechanism.anchor.pos : this.mechanism.joints[i - 1];
              const endPos = this.mechanism.joints[i];
              if (startPos && endPos) {
                this.traceSystem.addFullRodTrace(`fullrod_${i}`, startPos, endPos);
              }
            }
          }
        }
        
        // Update trace aging
        this.traceSystem.update();

        // Render everything
        this.renderer.draw(p);

        // Update frame count for video recording
        if (this.videoExporter.isCurrentlyRecording()) {
          this.videoExporter.updateFrameCount();
        }
      };

      // Mouse events
      p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > this.width || p.mouseY < 0 || p.mouseY > this.height) return;
        this.inputHandler.handlePress(p.mouseX, p.mouseY);
      };

      p.mouseDragged = () => {
        this.inputHandler.handleDrag(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
      };

      p.mouseReleased = () => {
        this.inputHandler.handleRelease(p.mouseX, p.mouseY);
      };

      p.mouseWheel = (event) => {
        this.inputHandler.handleZoom(p.mouseX, p.mouseY, event.delta);
        return false;
      };

      // Touch events
      p.touchStarted = () => {
        // Only handle touches on canvas, allow buttons to work
        if (p.touches.length > 0) {
          const touch = p.touches[0];
          if (touch.x < 0 || touch.x > this.width || touch.y < 0 || touch.y > this.height) {
            return; // Let buttons handle the touch
          }
        }

        if (p.touches.length === 1) {
          this.inputHandler.handlePress(p.touches[0].x, p.touches[0].y);
        } else if (p.touches.length === 2) {
          this.inputHandler.prevPinchDist = p.dist(
            p.touches[0].x, p.touches[0].y,
            p.touches[1].x, p.touches[1].y
          );
        }
        return false;
      };

      p.touchMoved = () => {
        if (p.touches.length === 1 && !this.inputHandler.isPanning) {
          this.inputHandler.handleDrag(p.touches[0].x, p.touches[0].y, p.pwinMouseX, p.pwinMouseY);
        } else if (p.touches.length === 1 && this.inputHandler.isPanning) {
          this.inputHandler.handleDrag(p.touches[0].x, p.touches[0].y, p.pmouseX, p.pmouseY);
        } else if (p.touches.length === 2) {
          this.inputHandler.prevPinchDist = this.inputHandler.handlePinchZoom(
            { x: p.touches[0].x, y: p.touches[0].y },
            { x: p.touches[1].x, y: p.touches[1].y },
            this.inputHandler.prevPinchDist
          );
        }
        return false;
      };

      p.touchEnded = () => {
        if (p.touches.length === 0) {
          this.inputHandler.handleRelease(p.mouseX, p.mouseY);
        }
        return false;
      };
    };

    // Create p5 instance
    new p5(sketch);
  }
}

// Initialize the application
new LinkageApp();