/**
 * Manages browser history for undo/redo functionality
 * Coordinates with URLStateManager to push states to browser history
 */
export class HistoryManager {
  constructor(urlStateManager) {
    this.urlStateManager = urlStateManager;
    this.isRestoringFromHistory = false;
    this.pendingPush = null;
    this.lastPushedState = null;
  }

  /**
   * Setup popstate listener to handle browser back/forward
   * @param {Function} onStateRestore - Callback when state is restored from history
   */
  setupPopStateListener(onStateRestore) {
    window.addEventListener('popstate', (event) => {
      if (this.isRestoringFromHistory) {
        return;
      }

      console.log('Popstate event - restoring from history, length:', window.history.length,
        'event.state:', event.state,
        'has linkageState:', !!(event.state?.linkageState),
        'has hash:', !!(event.state?.hash));
      this.isRestoringFromHistory = true;

      try {
        // Restore state from history entry (always available since we store it)
        if (event.state && event.state.linkageState) {
          console.log('Restoring from event.state.linkageState');
          this.urlStateManager.stateSerializer.importState(event.state.linkageState);
        } else if (event.state && event.state.hash) {
          // Fallback: parse the hash we stored in the state
          console.log('Restoring from event.state.hash');
          const params = new URLSearchParams(event.state.hash.split('#')[1]);
          // Manually build state from params and import
          // (This is a simplified version - we should use the stored linkageState above)
          console.warn('Hash-only restore not fully implemented, using current URL');
          this.urlStateManager.decodeStateFromURL();
        } else {
          // Last resort: decode from current URL (probably wrong)
          console.log('No state in history entry, using current URL (may be incorrect)');
          this.urlStateManager.decodeStateFromURL();
        }

        // Log what we restored
        const state = this.urlStateManager.stateSerializer.exportState();
        console.log('Restored to:',
          'anchor:', state.anchor.x.toFixed(1), state.anchor.y.toFixed(1),
          'camera:', state.camera.offsetX.toFixed(1), state.camera.offsetY.toFixed(1),
          'rod1:', state.rods[0]?.length.toFixed(1),
          'rod2:', state.rods[1]?.length.toFixed(1));

        if (onStateRestore) {
          onStateRestore();
        }
      } catch (error) {
        console.error('Error restoring state from history:', error);
      } finally {
        this.isRestoringFromHistory = false;
      }
    });
  }

  /**
   * Push current state to browser history immediately
   * Used for discrete actions (button clicks, toggles)
   */
  pushToHistoryNow() {
    if (this.isRestoringFromHistory) {
      return;
    }

    // Cancel any pending debounced push
    if (this.pendingPush) {
      clearTimeout(this.pendingPush);
      this.pendingPush = null;
    }

    this._pushState();
  }

  /**
   * Replace current history entry without creating a new one
   * Used for initial state on page load
   */
  replaceHistoryNow() {
    if (this.isRestoringFromHistory) {
      return;
    }

    // Cancel any pending debounced push
    if (this.pendingPush) {
      clearTimeout(this.pendingPush);
      this.pendingPush = null;
    }

    this._replaceState();
  }

  /**
   * Schedule a push to history with debouncing
   * Used for continuous actions (dragging, zooming)
   * @param {number} delayMs - Delay before pushing (default 500ms)
   */
  schedulePushToHistory(delayMs = 500) {
    if (this.isRestoringFromHistory) {
      return;
    }

    // Cancel previous pending push
    if (this.pendingPush) {
      clearTimeout(this.pendingPush);
    }

    // Schedule new push
    this.pendingPush = setTimeout(() => {
      this._pushState();
      this.pendingPush = null;
    }, delayMs);
  }

  /**
   * Update URL without creating history entry
   * Used for continuous visual feedback during drag/zoom
   * @param {number} delayMs - Delay before updating
   */
  updateURLWithoutHistory(delayMs = 100) {
    if (this.isRestoringFromHistory) {
      return;
    }

    this.urlStateManager.scheduleURLUpdate(delayMs);
  }

  /**
   * Internal method to push state to history
   */
  _pushState() {
    // Get current state
    const state = this.urlStateManager.stateSerializer.exportState();
    const stateString = JSON.stringify(state);

    // Don't push if state hasn't changed
    if (stateString === this.lastPushedState) {
      console.log('Skipped push - state unchanged');
      return;
    }

    // Encode state to URL format
    const params = this._encodeStateToParams(state);
    const url = window.location.pathname + '#' + params.toString();

    // Push to browser history - store both the state object AND the URL hash
    window.history.pushState({ linkageState: state, hash: url }, '', url);
    this.lastPushedState = stateString;

    console.log('Pushed state to history, length:', window.history.length,
      'anchor:', state.anchor.x.toFixed(1), state.anchor.y.toFixed(1),
      'camera:', state.camera.offsetX.toFixed(1), state.camera.offsetY.toFixed(1),
      'rod1:', state.rods[0]?.length.toFixed(1),
      'rod2:', state.rods[1]?.length.toFixed(1));
  }

  /**
   * Internal method to replace current history entry
   */
  _replaceState() {
    // Get current state
    const state = this.urlStateManager.stateSerializer.exportState();
    const stateString = JSON.stringify(state);

    // Encode state to URL format
    const params = this._encodeStateToParams(state);
    const url = window.location.pathname + '#' + params.toString();

    // Replace current history entry - store both the state object AND the URL hash
    window.history.replaceState({ linkageState: state, hash: url }, '', url);
    this.lastPushedState = stateString;

    console.log('Replaced current history entry, length:', window.history.length,
      'anchor:', state.anchor.x.toFixed(1), state.anchor.y.toFixed(1),
      'camera:', state.camera.offsetX.toFixed(1), state.camera.offsetY.toFixed(1),
      'rod1:', state.rods[0]?.length.toFixed(1),
      'rod2:', state.rods[1]?.length.toFixed(1));
  }

  /**
   * Encode state to URLSearchParams (same logic as URLStateManager)
   */
  _encodeStateToParams(state) {
    const params = new URLSearchParams();

    // Encode anchor
    params.set('anchor', `${state.anchor.x.toFixed(1)},${state.anchor.y.toFixed(1)}`);

    // Encode crank
    const crank = state.anchor.crank;
    params.set('crank', `${crank.length.toFixed(1)},${crank.isTracing ? 1 : 0},${crank.isFullRodTracing ? 1 : 0}`);

    // Encode rods
    state.rods.forEach(rod => {
      const rodKey = `rod${rod.id}`;
      const gp = rod.guidePoint;
      if (gp) {
        params.set(rodKey, `${rod.length.toFixed(1)},${gp.x.toFixed(1)},${gp.y.toFixed(1)},${rod.isTracing ? 1 : 0},${rod.isFullRodTracing ? 1 : 0}`);
      }
    });

    // Encode camera
    params.set('camera', `${state.camera.offsetX.toFixed(1)},${state.camera.offsetY.toFixed(1)},${state.camera.zoom.toFixed(3)}`);

    // Encode color
    const color = state.traceColor;
    params.set('color', `${color.r},${color.g},${color.b}`);

    // Encode widths
    if (state.traceWidth !== undefined) {
      params.set('traceWidth', state.traceWidth.toString());
    }
    if (state.rodsWidth !== undefined) {
      params.set('rodsWidth', state.rodsWidth.toString());
    }

    // Encode modes
    if (state.isStretchingMode !== undefined) {
      params.set('stretch', state.isStretchingMode ? '1' : '0');
    }
    if (state.isInverse !== undefined) {
      params.set('inverse', state.isInverse ? '1' : '0');
    }
    if (state.fadingEnabled !== undefined) {
      params.set('fade', state.fadingEnabled ? '1' : '0');
    }

    return params;
  }

  /**
   * Check if currently restoring from history (to prevent loops)
   */
  isRestoring() {
    return this.isRestoringFromHistory;
  }
}
