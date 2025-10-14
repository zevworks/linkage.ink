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

/**
 * Main application class that orchestrates all components
 */
class LinkageApp {
  constructor() {
    // Full screen canvas
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Initialize core systems
    this.traceSystem = new TraceSystem();
    this.mechanism = new LinkageMechanism(this.width, this.height, this.traceSystem);
    this.camera = new Camera();
    this.videoExporter = new VideoExporter();

    // Auto-fit flag
    this.hasAutoFitted = false;
    this.frameCount = 0;

    // Initialize rendering first (needed for state serialization)
    this.renderer = new Renderer(this.mechanism, this.camera, this.traceSystem);

    // Initialize state serialization and URL state management
    this.stateSerializer = new StateSerializer(this.mechanism, this.camera, this.traceSystem, this.renderer);
    this.urlStateManager = new URLStateManager(this.stateSerializer);
    this.localStorageManager = new LocalStorageManager();

    // Initialize history manager for undo/redo with browser back/forward
    this.historyManager = new HistoryManager(this.urlStateManager);
    this.urlStateManager.setHistoryManager(this.historyManager);

    // Try to load state from URL, if not present, use default configuration
    const loadedFromURL = this.urlStateManager.decodeStateFromURL();
    if (loadedFromURL) {
      console.log('Loaded configuration from URL');
    }

    // Replace initial state in history (don't create new entry to avoid duplicate)
    setTimeout(() => {
      this.historyManager.replaceHistoryNow();
    }, 100);

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
      };

      p.draw = () => {
        // Update camera animations
        this.camera.update(p.deltaTime / 1000); // deltaTime is in ms, convert to seconds

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

        // Auto-fit view on first load after some traces have been drawn
        if (!this.hasAutoFitted && this.mechanism.isPlaying) {
          this.frameCount++;
          if (this.frameCount >= 90) { // Wait 1.5 seconds for traces to build up
            this.hasAutoFitted = true;

            // Get both trace and mechanism bounds
            const traceBounds = this.traceSystem.calculateBounds();
            const mechanismBounds = this.mechanism.calculateBounds();

            // Merge bounds to get the larger extent
            let bounds = null;
            if (traceBounds && mechanismBounds) {
              bounds = {
                minX: Math.min(traceBounds.minX, mechanismBounds.minX),
                maxX: Math.max(traceBounds.maxX, mechanismBounds.maxX),
                minY: Math.min(traceBounds.minY, mechanismBounds.minY),
                maxY: Math.max(traceBounds.maxY, mechanismBounds.maxY)
              };
              bounds.width = bounds.maxX - bounds.minX;
              bounds.height = bounds.maxY - bounds.minY;
              bounds.centerX = (bounds.minX + bounds.maxX) / 2;
              bounds.centerY = (bounds.minY + bounds.maxY) / 2;
            } else {
              bounds = traceBounds || mechanismBounds;
            }

            if (bounds) {
              this.camera.fitToView(bounds, p.width, p.height, true);
            }
          }
        }

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