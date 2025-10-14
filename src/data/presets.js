import presetsConfig from '../../presets.config.json';

/**
 * Parse state from URL hash string
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
      traceColor: { r: 128, g: 0, b: 128 },
      traceWidth: 4,
      rodsWidth: 4,
      fadingEnabled: false,
      isStretchingMode: false,
      isInverse: false
    };

    // Parse anchor position
    state.anchor.x = parseFloat(params.get('ax')) || 0;
    state.anchor.y = parseFloat(params.get('ay')) || 0;

    // Parse crank
    state.anchor.crank = {
      length: parseFloat(params.get('cl')) || 150,
      isTracing: params.get('ct') === '1',
      isFullRodTracing: params.get('cfr') === '1'
    };

    // Parse camera
    state.camera.offsetX = parseFloat(params.get('ox')) || 400;
    state.camera.offsetY = parseFloat(params.get('oy')) || 300;
    state.camera.zoom = parseFloat(params.get('z')) || 1.0;

    // Parse trace color
    const tcHex = params.get('tc');
    if (tcHex) {
      const hex = tcHex.replace('#', '').replace('%23', '');
      state.traceColor = {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }

    // Parse trace and rod widths
    state.traceWidth = parseFloat(params.get('tw')) || 4;
    state.rodsWidth = parseFloat(params.get('rw')) || 4;

    // Parse settings
    state.fadingEnabled = params.get('f') === '1';
    state.isStretchingMode = params.get('s') === '1';
    state.isInverse = params.get('inv') === '1';

    // Parse rods (r1, r2, r3, etc.)
    let rodId = 1;
    while (params.has(`r${rodId}l`)) {
      const rod = {
        id: rodId,
        length: parseFloat(params.get(`r${rodId}l`)),
        isTracing: params.get(`r${rodId}t`) === '1',
        isFullRodTracing: params.get(`r${rodId}fr`) === '1',
        guidePoint: {
          x: parseFloat(params.get(`r${rodId}gx`)) || 0,
          y: parseFloat(params.get(`r${rodId}gy`)) || 0
        }
      };
      state.rods.push(rod);
      rodId++;
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
