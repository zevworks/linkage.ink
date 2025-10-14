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
    // Maintain our own history stack since browser history state is unreliable
    this.stateHistory = [];
    this.historyIndex = -1;
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

      console.log('Popstate event',
        'event.state:', event.state,
        'history.state:', window.history.state,
        'our historyIndex before:', this.historyIndex);

      this.isRestoringFromHistory = true;

      try {
        // Use our index from browser state to look up in our history stack
        let targetIndex = this.historyIndex;

        if (event.state && event.state.ourIndex !== undefined) {
          targetIndex = event.state.ourIndex;
        } else if (window.history.state && window.history.state.ourIndex !== undefined) {
          targetIndex = window.history.state.ourIndex;
        } else {
          console.warn('No history index found in popstate, cannot restore state reliably');
          this.isRestoringFromHistory = false;
          return;
        }

        console.log('Restoring to index:', targetIndex);

        // Get state from our history stack
        const targetState = this.stateHistory[targetIndex];
        if (targetState) {
          console.log('Restoring state from our history stack');
          this.urlStateManager.stateSerializer.importState(targetState);
          this.historyIndex = targetIndex;

          // Update URL to match
          const params = this._encodeStateToParams(targetState);
          const url = window.location.pathname + '#' + params.toString();
          window.history.replaceState({ ourIndex: this.historyIndex }, '', url);

          // Log what we restored
          console.log('Restored to:',
            'anchor:', targetState.anchor.x.toFixed(1), targetState.anchor.y.toFixed(1),
            'camera:', targetState.camera.offsetX.toFixed(1), targetState.camera.offsetY.toFixed(1),
            'rod1:', targetState.rods[0]?.length.toFixed(1),
            'rod2:', targetState.rods[1]?.length.toFixed(1));
        } else {
          console.error('No state found at index', targetIndex);
        }

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

    // Store in our own history stack
    this.historyIndex++;
    this.stateHistory[this.historyIndex] = state;
    // Truncate any forward history
    this.stateHistory.length = this.historyIndex + 1;

    // Encode state to URL format
    const params = this._encodeStateToParams(state);
    const url = window.location.pathname + '#' + params.toString();

    // Push to browser history - store only our index, not the full state
    window.history.pushState({ ourIndex: this.historyIndex }, '', url);
    this.lastPushedState = stateString;

    console.log('Pushed state to history, length:', window.history.length,
      'ourIndex:', this.historyIndex,
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

    // Store in our history stack at current index (don't increment)
    if (this.historyIndex === -1) {
      // First replace initializes the stack
      this.historyIndex = 0;
    }
    this.stateHistory[this.historyIndex] = state;

    // Encode state to URL format
    const params = this._encodeStateToParams(state);
    const url = window.location.pathname + '#' + params.toString();

    // Replace current history entry - store only our index
    window.history.replaceState({ ourIndex: this.historyIndex }, '', url);
    this.lastPushedState = stateString;

    console.log('Replaced current history entry, length:', window.history.length,
      'ourIndex:', this.historyIndex,
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
