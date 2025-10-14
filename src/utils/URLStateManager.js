/**
 * Manages encoding/decoding linkage state in URL hash
 * Format: #anchor=x,y&crank=len,trace,fulltrace&rod1=len,gpx,gpy,trace,fulltrace&camera=ox,oy,zoom&color=r,g,b&traceWidth=n&rodsWidth=n&stretch=0|1&inverse=0|1&fade=0|1
 */
export class URLStateManager {
  constructor(stateSerializer) {
    this.stateSerializer = stateSerializer;
    this.updateTimeout = null;
    this.historyManager = null;
  }

  /**
   * Set the history manager for undo/redo support
   */
  setHistoryManager(historyManager) {
    this.historyManager = historyManager;
  }

  /**
   * Encode current state to URL hash with readable parameters
   */
  encodeStateToURL() {
    const state = this.stateSerializer.exportState();
    const params = new URLSearchParams();

    // Encode anchor: anchor=x,y
    params.set('anchor', `${state.anchor.x.toFixed(1)},${state.anchor.y.toFixed(1)}`);

    // Encode crank: crank=length,isTracing,isFullRodTracing
    const crank = state.anchor.crank;
    params.set('crank', `${crank.length.toFixed(1)},${crank.isTracing ? 1 : 0},${crank.isFullRodTracing ? 1 : 0}`);

    // Encode rods: rod1=length,gpx,gpy,isTracing,isFullRodTracing
    state.rods.forEach(rod => {
      const rodKey = `rod${rod.id}`;
      const gp = rod.guidePoint;
      if (gp) {
        params.set(rodKey, `${rod.length.toFixed(1)},${gp.x.toFixed(1)},${gp.y.toFixed(1)},${rod.isTracing ? 1 : 0},${rod.isFullRodTracing ? 1 : 0}`);
      }
    });

    // Encode camera: camera=offsetX,offsetY,zoom
    params.set('camera', `${state.camera.offsetX.toFixed(1)},${state.camera.offsetY.toFixed(1)},${state.camera.zoom.toFixed(3)}`);

    // Encode color: color=r,g,b
    const color = state.traceColor;
    params.set('color', `${color.r},${color.g},${color.b}`);

    // Encode widths
    if (state.traceWidth !== undefined) {
      params.set('traceWidth', state.traceWidth.toString());
    }
    if (state.rodsWidth !== undefined) {
      params.set('rodsWidth', state.rodsWidth.toString());
    }

    // Encode stretching mode: stretch=0|1
    if (state.isStretchingMode !== undefined) {
      params.set('stretch', state.isStretchingMode ? '1' : '0');
    }

    // Encode inverse mode: inverse=0|1
    if (state.isInverse !== undefined) {
      params.set('inverse', state.isInverse ? '1' : '0');
    }

    // Encode fading enabled: fade=0|1
    if (state.fadingEnabled !== undefined) {
      params.set('fade', state.fadingEnabled ? '1' : '0');
    }

    // Update URL hash without triggering page reload
    window.history.replaceState(null, '', '#' + params.toString());
  }

  /**
   * Decode state from URL hash and load it
   */
  decodeStateFromURL() {
    const hash = window.location.hash.slice(1); // Remove '#'

    if (!hash) {
      return false; // No state in URL
    }

    try {
      const params = new URLSearchParams(hash);

      // Build state object
      const state = {
        version: '1.0',
        anchor: {},
        rods: [],
        camera: {},
        traceColor: {}
      };

      // Decode anchor
      const anchorStr = params.get('anchor');
      if (anchorStr) {
        const [x, y] = anchorStr.split(',').map(Number);
        state.anchor.x = x;
        state.anchor.y = y;
      }

      // Decode crank
      const crankStr = params.get('crank');
      if (crankStr) {
        const [length, isTracing, isFullRodTracing] = crankStr.split(',');
        state.anchor.crank = {
          length: Number(length),
          isTracing: isTracing === '1',
          isFullRodTracing: isFullRodTracing === '1'
        };
      }

      // Decode rods
      let rodId = 1;
      while (params.has(`rod${rodId}`)) {
        const rodStr = params.get(`rod${rodId}`);
        const [length, gpx, gpy, isTracing, isFullRodTracing] = rodStr.split(',');
        state.rods.push({
          id: rodId,
          length: Number(length),
          isTracing: isTracing === '1',
          isFullRodTracing: isFullRodTracing === '1',
          guidePoint: {
            x: Number(gpx),
            y: Number(gpy)
          }
        });
        rodId++;
      }

      // Decode camera
      const cameraStr = params.get('camera');
      if (cameraStr) {
        const [offsetX, offsetY, zoom] = cameraStr.split(',').map(Number);
        state.camera.offsetX = offsetX;
        state.camera.offsetY = offsetY;
        state.camera.zoom = zoom;
      }

      // Decode color
      const colorStr = params.get('color');
      if (colorStr) {
        const [r, g, b] = colorStr.split(',').map(Number);
        state.traceColor = { r, g, b };
      }

      // Decode widths
      const traceWidthStr = params.get('traceWidth');
      if (traceWidthStr !== null) {
        state.traceWidth = parseInt(traceWidthStr);
      }

      const rodsWidthStr = params.get('rodsWidth');
      if (rodsWidthStr !== null) {
        state.rodsWidth = parseInt(rodsWidthStr);
      }

      // Decode stretching mode
      const stretchStr = params.get('stretch');
      if (stretchStr !== null) {
        state.isStretchingMode = stretchStr === '1';
      }

      // Decode inverse mode
      const inverseStr = params.get('inverse');
      if (inverseStr !== null) {
        state.isInverse = inverseStr === '1';
      }

      // Decode fading enabled
      const fadeStr = params.get('fade');
      if (fadeStr !== null) {
        state.fadingEnabled = fadeStr === '1';
      }

      // Import the state
      this.stateSerializer.importState(state);
      return true;
    } catch (error) {
      console.error('Error decoding state from URL:', error);
      return false;
    }
  }

  /**
   * Update URL with debouncing to avoid constant updates during drag
   * This updates the URL without creating history entries
   */
  scheduleURLUpdate(delayMs = 500) {
    if (this.historyManager && this.historyManager.isRestoring()) {
      return;
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.encodeStateToURL();
    }, delayMs);
  }

  /**
   * Immediately update URL (for discrete actions like color change)
   * This updates the URL without creating history entries
   */
  updateURLNow() {
    if (this.historyManager && this.historyManager.isRestoring()) {
      return;
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.encodeStateToURL();
  }

  /**
   * Push current state to browser history immediately
   * Used for discrete actions (button clicks, toggles)
   */
  pushToHistoryNow() {
    if (this.historyManager) {
      this.historyManager.pushToHistoryNow();
    } else {
      // Fallback to simple URL update if no history manager
      this.updateURLNow();
    }
  }

  /**
   * Schedule a push to browser history with debouncing
   * Used for continuous actions that should create a history entry when complete
   */
  schedulePushToHistory(delayMs = 500) {
    if (this.historyManager) {
      this.historyManager.schedulePushToHistory(delayMs);
    } else {
      // Fallback to simple URL update if no history manager
      this.scheduleURLUpdate(delayMs);
    }
  }

  /**
   * Update URL without creating history entry (for continuous visual feedback)
   */
  updateURLWithoutHistory(delayMs = 100) {
    if (this.historyManager) {
      this.historyManager.updateURLWithoutHistory(delayMs);
    } else {
      this.scheduleURLUpdate(delayMs);
    }
  }

  /**
   * Copy current URL to clipboard
   */
  async copyURLToClipboard() {
    const url = window.location.href;

    // Try modern Clipboard API first (requires HTTPS/localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch (error) {
        console.error('Clipboard API failed:', error);
      }
    }

    // Fallback: use temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      return successful;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }
}
