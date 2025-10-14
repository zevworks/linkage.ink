import presetsConfig from '../../presets.config.json';

/**
 * Parse state from URL hash string
 * Uses the same format as URLStateManager: anchor=x,y&crank=len,trace,fulltrace&rod1=len,gpx,gpy,trace,fulltrace
 */
function parseStateFromHash(hash) {
  // Remove '#' if present
  const hashStr = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!hashStr) {
    return null;
  }

  try {
    const params = new URLSearchParams(hashStr);

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

    return state;
  } catch (error) {
    console.error('Error parsing state from hash:', error);
    return null;
  }
}

/**
 * Load presets from config file
 */
function loadPresetsFromConfig() {
  return presetsConfig.map(preset => {
    const state = parseStateFromHash(preset.stateUrl);

    if (!state) {
      console.error(`Failed to parse state for preset: ${preset.id}`);
      return null;
    }

    return {
      id: `preset-${preset.id}`,
      name: preset.name,
      description: preset.description,
      thumbnail: preset.thumbnail ? `./presets/${preset.thumbnail}` : null,
      state: state
    };
  }).filter(Boolean); // Remove null entries
}

/**
 * Built-in preset linkage configurations
 */
export const presets = loadPresetsFromConfig();
