/**
 * Built-in preset linkage configurations
 */

export const presets = [
  {
    id: 'preset-simple-circle',
    name: 'Simple Circle',
    description: 'Basic single-rod circular motion',
    thumbnail: null, // Will be generated on first load
    state: {
      version: '1.0',
      anchor: {
        x: 0,
        y: 0,
        crank: {
          length: 150,
          isTracing: true,
          isFullRodTracing: false
        }
      },
      rods: [],
      camera: {
        offsetX: 400,
        offsetY: 300,
        zoom: 1.0
      },
      traceColor: { r: 128, g: 0, b: 128 },
      traceWidth: 4,
      rodsWidth: 4,
      fadingEnabled: false,
      isStretchingMode: false,
      isInverse: false
    }
  },
  {
    id: 'preset-double-rod',
    name: 'Double Rod',
    description: 'Two-rod linkage creating complex patterns',
    thumbnail: null,
    state: {
      version: '1.0',
      anchor: {
        x: 0,
        y: 0,
        crank: {
          length: 120,
          isTracing: false,
          isFullRodTracing: false
        }
      },
      rods: [
        {
          id: 1,
          length: 180,
          isTracing: true,
          isFullRodTracing: false,
          guidePoint: {
            x: 200,
            y: 0
          }
        }
      ],
      camera: {
        offsetX: 400,
        offsetY: 300,
        zoom: 0.8
      },
      traceColor: { r: 0, g: 150, b: 255 },
      traceWidth: 4,
      rodsWidth: 4,
      fadingEnabled: false,
      isStretchingMode: false,
      isInverse: false
    }
  },
  {
    id: 'preset-figure-eight',
    name: 'Figure Eight',
    description: 'Three-rod configuration creating figure-eight pattern',
    thumbnail: null,
    state: {
      version: '1.0',
      anchor: {
        x: 0,
        y: 0,
        crank: {
          length: 100,
          isTracing: false,
          isFullRodTracing: false
        }
      },
      rods: [
        {
          id: 1,
          length: 150,
          isTracing: false,
          isFullRodTracing: false,
          guidePoint: {
            x: 180,
            y: 0
          }
        },
        {
          id: 2,
          length: 120,
          isTracing: true,
          isFullRodTracing: false,
          guidePoint: {
            x: 90,
            y: -150
          }
        }
      ],
      camera: {
        offsetX: 400,
        offsetY: 300,
        zoom: 0.7
      },
      traceColor: { r: 255, g: 100, b: 0 },
      traceWidth: 4,
      rodsWidth: 4,
      fadingEnabled: true,
      isStretchingMode: false,
      isInverse: false
    }
  },
  {
    id: 'preset-complex-pattern',
    name: 'Complex Pattern',
    description: 'Multi-rod linkage with intricate motion',
    thumbnail: null,
    state: {
      version: '1.0',
      anchor: {
        x: 0,
        y: 0,
        crank: {
          length: 80,
          isTracing: false,
          isFullRodTracing: false
        }
      },
      rods: [
        {
          id: 1,
          length: 140,
          isTracing: false,
          isFullRodTracing: false,
          guidePoint: {
            x: 150,
            y: 0
          }
        },
        {
          id: 2,
          length: 100,
          isTracing: false,
          isFullRodTracing: false,
          guidePoint: {
            x: 80,
            y: -120
          }
        },
        {
          id: 3,
          length: 110,
          isTracing: true,
          isFullRodTracing: false,
          guidePoint: {
            x: -50,
            y: -80
          }
        }
      ],
      camera: {
        offsetX: 400,
        offsetY: 300,
        zoom: 0.6
      },
      traceColor: { r: 0, g: 255, b: 150 },
      traceWidth: 4,
      rodsWidth: 4,
      fadingEnabled: true,
      isStretchingMode: false,
      isInverse: false
    }
  },
  {
    id: 'preset-full-rod-trace',
    name: 'Full Rod Trace',
    description: 'Rod with full-length tracing enabled',
    thumbnail: null,
    state: {
      version: '1.0',
      anchor: {
        x: 0,
        y: 0,
        crank: {
          length: 100,
          isTracing: false,
          isFullRodTracing: true
        }
      },
      rods: [
        {
          id: 1,
          length: 180,
          isTracing: true,
          isFullRodTracing: false,
          guidePoint: {
            x: 160,
            y: -40
          }
        }
      ],
      camera: {
        offsetX: 400,
        offsetY: 300,
        zoom: 0.8
      },
      traceColor: { r: 255, g: 50, b: 150 },
      traceWidth: 3,
      rodsWidth: 4,
      fadingEnabled: false,
      isStretchingMode: false,
      isInverse: false
    }
  }
];
