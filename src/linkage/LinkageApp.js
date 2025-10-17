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
import { HistoryManager } from '../utils/HistoryManager.js';
import { LocalStorageManager } from '../utils/LocalStorageManager.js';
import { presets } from '../data/presets.js';

/**
 * Main application class that orchestrates all components
 */
class LinkageApp {
  constructor() {
    // Full screen canvas
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Check if there's a URL state before initializing
    const hasUrlState = window.location.hash.length > 1;
    this.shouldLoadPreset = !hasUrlState && presets.length > 0;

    // Initialize core systems
    this.traceSystem = new TraceSystem();
    this.mechanism = new LinkageMechanism(this.width, this.height, this.traceSystem, this.shouldLoadPreset);
    this.camera = new Camera();
    this.videoExporter = new VideoExporter();


    // Initialize rendering first (needed for state serialization)
    this.renderer = new Renderer(this.mechanism, this.camera, this.traceSystem);

    // Initialize state serialization and URL state management
    this.stateSerializer = new StateSerializer(this.mechanism, this.camera, this.traceSystem, this.renderer);
    this.urlStateManager = new URLStateManager(this.stateSerializer);
    this.localStorageManager = new LocalStorageManager();

    // Initialize history manager for undo/redo with browser back/forward
    this.historyManager = new HistoryManager(this.urlStateManager);
    this.urlStateManager.setHistoryManager(this.historyManager);

    // Load state from URL if present, otherwise load first preset
    if (hasUrlState) {
      this.urlStateManager.decodeStateFromURL();
    } else if (presets.length > 0) {
      // Load first preset
      this.stateSerializer.importState(presets[0].state);
    }

    // Replace current history entry with initial state
    // Subsequent user actions will push new entries
    this.historyManager.replaceHistoryNow();

    // Initialize interaction
    this.inputHandler = new InputHandler(this.mechanism, this.camera, this.renderer, this.urlStateManager);

    // Setup popstate listener for browser back/forward buttons (after inputHandler exists)
    this.historyManager.setupPopStateListener(() => {
      // Clear input handler state to prevent spurious history pushes
      this.inputHandler.clearState();
      // Sync UI after state restoration
      this.uiController?.syncButtonStates();
    });

    this.uiController = new UIController(
      this.mechanism,
      this.traceSystem,
      this.videoExporter,
      this.camera,
      this.urlStateManager,
      this.renderer,
      this.stateSerializer,
      this.localStorageManager
    );

    // Connect UIController to InputHandler for button state sync
    this.inputHandler.setUIController(this.uiController);

    // Store p5 instance for GIF export
    this.p5Instance = null;

    // Setup p5.js sketch
    this.setupP5();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      if (this.p5Instance) {
        this.p5Instance.resizeCanvas(this.width, this.height);
      }
    });
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

        // Trigger auto-fit if we loaded a preset on initialization
        // if (this.shouldLoadPreset) {
        //   // Immediately fit to mechanism bounds (shows crank/rods right away)
        //   const mechanismBounds = this.mechanism.calculateBounds();
        //   if (mechanismBounds) {
        //     this.camera.fitToView(mechanismBounds, p.width, p.height, true);
        //   }

        //   // Set up auto-fit for after one full rotation
        //   this.uiController.autoFitStartAngle = this.mechanism.crankAngle;
        //   this.uiController.waitingForAutoFit = true;
        // }
      };

      p.draw = () => {
        // Update camera animations
        this.camera.update(p.deltaTime / 1000); // deltaTime is in ms, convert to seconds

        // Update mechanism
        this.mechanism.update();

        // Check if we should auto-fit after state load
        // if (this.uiController) {
        //   this.uiController.checkAutoFit();
        // }

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
      p.mousePressed = (event) => {
        // Check if mouse is on a button or UI element
        if (event && event.target && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) {
          return true; // Allow button clicks
        }
        if (p.mouseX < 0 || p.mouseX > this.width || p.mouseY < 0 || p.mouseY > this.height) return;
        this.inputHandler.handlePress(p.mouseX, p.mouseY);
      };

      p.mouseDragged = (event) => {
        // Check if mouse is on a button or UI element
        if (event && event.target && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) {
          return true;
        }
        this.inputHandler.handleDrag(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
      };

      p.mouseReleased = (event) => {
        // Check if mouse is on a button or UI element
        if (event && event.target && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) {
          return true;
        }
        this.inputHandler.handleRelease(p.mouseX, p.mouseY);
      };

      p.mouseWheel = (event) => {
        this.inputHandler.handleZoom(p.mouseX, p.mouseY, event.delta);
        return false;
      };

      // Touch events - single touch for objects, two-finger for pan/zoom
      let prevTouchMidpoint = null;
      let lastTapTime = 0;
      let lastTapPos = null;

      p.touchStarted = (event) => {
        // Check if touch is on canvas element
        if (event && event.target && event.target.tagName === 'BUTTON') {
          return true; // Allow button clicks
        }

        if (p.touches.length === 1) {
          // Check for double tap
          const now = Date.now();
          const tapPos = { x: p.touches[0].x, y: p.touches[0].y };

          if (lastTapPos &&
              now - lastTapTime < 300 &&
              Math.abs(tapPos.x - lastTapPos.x) < 20 &&
              Math.abs(tapPos.y - lastTapPos.y) < 20) {
            // Double tap detected - zoom in with animation
            const worldPos = this.camera.screenToWorld(tapPos.x, tapPos.y);
            this.camera.animatedZoomAt(worldPos, 1.3);
            // Push to history after animation completes
            setTimeout(() => {
              this.urlStateManager.pushToHistoryNow();
            }, 600);
            lastTapTime = 0; // Reset to prevent triple tap
            lastTapPos = null;
          } else {
            // Single touch - try to select object (with touch device flag)
            this.inputHandler.handlePress(tapPos.x, tapPos.y, true);
            lastTapTime = now;
            lastTapPos = tapPos;
          }
        } else if (p.touches.length === 2) {
          // Two fingers - prepare for pan/zoom
          this.inputHandler.prevPinchDist = p.dist(
            p.touches[0].x, p.touches[0].y,
            p.touches[1].x, p.touches[1].y
          );
          prevTouchMidpoint = {
            x: (p.touches[0].x + p.touches[1].x) / 2,
            y: (p.touches[0].y + p.touches[1].y) / 2
          };
        }
        return false;
      };

      p.touchMoved = (event) => {
        // Check if touch is on canvas element
        if (event && event.target && event.target.tagName === 'BUTTON') {
          return true;
        }

        if (p.touches.length === 1) {
          // Single touch - drag selected object
          this.inputHandler.handleDrag(p.touches[0].x, p.touches[0].y, p.pmouseX, p.pmouseY);
        } else if (p.touches.length === 2) {
          const currentDist = p.dist(
            p.touches[0].x, p.touches[0].y,
            p.touches[1].x, p.touches[1].y
          );
          const currentMidpoint = {
            x: (p.touches[0].x + p.touches[1].x) / 2,
            y: (p.touches[0].y + p.touches[1].y) / 2
          };

          // Check if it's a pinch (distance changing significantly)
          const distChange = Math.abs(currentDist - this.inputHandler.prevPinchDist);
          if (distChange > 3) {
            // Pinch zoom - only zoom, don't pan
            this.inputHandler.prevPinchDist = this.inputHandler.handlePinchZoom(
              { x: p.touches[0].x, y: p.touches[0].y },
              { x: p.touches[1].x, y: p.touches[1].y },
              this.inputHandler.prevPinchDist
            );
          } else if (prevTouchMidpoint) {
            // Two-finger pan - only when not pinching
            const dx = currentMidpoint.x - prevTouchMidpoint.x;
            const dy = currentMidpoint.y - prevTouchMidpoint.y;
            this.camera.pan(dx, dy);
            // Update URL during pan for visual feedback
            this.urlStateManager.updateURLWithoutHistory(50);
          }

          prevTouchMidpoint = currentMidpoint;
        }
        return false;
      };

      p.touchEnded = (event) => {
        // Check if touch is on canvas element
        if (event && event.target && event.target.tagName === 'BUTTON') {
          return true;
        }

        if (p.touches.length === 0) {
          this.inputHandler.handleRelease(p.mouseX, p.mouseY);
          prevTouchMidpoint = null;
          // Push to history after two-finger gesture completes
          this.urlStateManager.schedulePushToHistory(300);
        } else if (p.touches.length === 1) {
          // One finger lifted, reset for potential new gesture
          prevTouchMidpoint = null;
          // Push to history if was doing two-finger gesture
          this.urlStateManager.schedulePushToHistory(300);
        }
        return false;
      };
    };

    // Create p5 instance
    new p5(sketch);
  }
}

// Initialize and export the application
export const app = new LinkageApp();