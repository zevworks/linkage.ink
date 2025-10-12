/**
 * Design panel component embedded in menu for selecting trace colors and widths
 */
export class ColorPicker {
  constructor(onDesignChange, renderer, traceSystem, mechanism) {
    this.onDesignChange = onDesignChange;
    this.renderer = renderer;
    this.traceSystem = traceSystem;
    this.mechanism = mechanism;
    this.currentColor = { r: 128, g: 0, b: 128 }; // Default purple
    this.currentHSV = this.rgbToHSV(128, 0, 128); // Store HSV separately
    this.traceWidth = 4; // Default trace width
    this.rodsWidth = 4; // Default rods width
    this.sliders = {};
    this.initialize();
  }

  /**
   * Convert RGB to HSV
   */
  rgbToHSV(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    let v = max;

    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / delta + 2) / 6;
      } else {
        h = ((r - g) / delta + 4) / 6;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100)
    };
  }

  /**
   * Convert HSV to RGB
   */
  hsvToRGB(h, s, v) {
    h = h / 360;
    s = s / 100;
    v = v / 100;

    let r, g, b;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  initialize() {
    // Get containers
    this.hsvSlidersContainer = document.getElementById('hsvSlidersContainer');
    this.widthSlidersContainer = document.getElementById('widthSlidersContainer');
    this.togglesContainer = document.getElementById('togglesContainer');

    // Load current design values
    this.currentColor = this.traceSystem.getTraceColor();
    this.currentHSV = this.rgbToHSV(this.currentColor.r, this.currentColor.g, this.currentColor.b);
    this.traceWidth = this.traceSystem.getTraceWidth();
    this.rodsWidth = this.traceSystem.getRodsWidth();

    // Create HSV sliders
    this.createHSVSliders();

    // Create width sliders
    this.createWidthSliders();

    // Create toggles
    this.createToggles();
  }

  createHSVSliders() {
    const sliderConfigs = [
      {
        name: 'h',
        label: 'Hue',
        min: 0,
        max: 360,
        suffix: '°',
        gradient: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
      },
      {
        name: 's',
        label: 'Saturation',
        min: 0,
        max: 100,
        suffix: '%',
        getGradient: (hsv) => {
          const rgb1 = this.hsvToRGB(hsv.h, 0, hsv.v);
          const rgb2 = this.hsvToRGB(hsv.h, 100, hsv.v);
          return `linear-gradient(to right, rgb(${rgb1.r},${rgb1.g},${rgb1.b}), rgb(${rgb2.r},${rgb2.g},${rgb2.b}))`;
        }
      },
      {
        name: 'v',
        label: 'Brightness',
        min: 0,
        max: 100,
        suffix: '%',
        getGradient: (hsv) => {
          const rgb1 = this.hsvToRGB(hsv.h, hsv.s, 0);
          const rgb2 = this.hsvToRGB(hsv.h, hsv.s, 100);
          return `linear-gradient(to right, rgb(${rgb1.r},${rgb1.g},${rgb1.b}), rgb(${rgb2.r},${rgb2.g},${rgb2.b}))`;
        }
      }
    ];

    sliderConfigs.forEach(({ name, label, min, max, suffix, gradient, getGradient }) => {
      const sliderGroup = document.createElement('div');

      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
        font-size: 12px;
        color: #555;
      `;

      const labelText = document.createElement('span');
      labelText.textContent = label;
      labelText.style.cssText = `
        font-weight: 500;
      `;

      const valueText = document.createElement('span');
      valueText.textContent = this.currentHSV[name] + suffix;
      valueText.style.cssText = `
        font-weight: 600;
        color: #333;
        font-size: 11px;
        font-family: monospace;
      `;

      labelDiv.appendChild(labelText);
      labelDiv.appendChild(valueText);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min.toString();
      slider.max = max.toString();
      slider.value = this.currentHSV[name];
      slider.style.cssText = `
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: ${gradient || ''};
        cursor: pointer;
      `;

      // Style the slider thumb
      if (!document.getElementById('slider-styles')) {
        const style = document.createElement('style');
        style.id = 'slider-styles';
        style.textContent = `
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            border: 2px solid #444;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          input[type="range"]::-webkit-slider-thumb:active {
            transform: scale(1.05);
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            border: 2px solid #444;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.1);
          }
          input[type="range"]::-moz-range-thumb:active {
            transform: scale(1.05);
          }
        `;
        document.head.appendChild(style);
      }

      slider.oninput = (e) => {
        e.stopPropagation();
        this.currentHSV[name] = parseInt(slider.value);
        valueText.textContent = slider.value + suffix;

        // Convert HSV to RGB
        this.currentColor = this.hsvToRGB(this.currentHSV.h, this.currentHSV.s, this.currentHSV.v);

        // Update dependent slider gradients
        this.updateSliderGradients();

        // Apply changes live
        if (this.onDesignChange) {
          this.onDesignChange(this.getDesign());
        }
      };

      // Prevent events from propagating
      slider.onmousedown = (e) => e.stopPropagation();
      slider.onmousemove = (e) => e.stopPropagation();
      slider.onmouseup = (e) => e.stopPropagation();
      slider.ontouchstart = (e) => e.stopPropagation();
      slider.ontouchmove = (e) => e.stopPropagation();
      slider.ontouchend = (e) => e.stopPropagation();

      sliderGroup.appendChild(labelDiv);
      sliderGroup.appendChild(slider);
      this.hsvSlidersContainer.appendChild(sliderGroup);

      this.sliders[name] = { slider, valueText, suffix, gradient, getGradient };
    });
  }

  createWidthSliders() {
    const widthConfigs = [
      { name: 'traceWidth', label: 'Trace Width', value: this.traceWidth },
      { name: 'rodsWidth', label: 'Rods Width', value: this.rodsWidth }
    ];

    widthConfigs.forEach(({ name, label, value }) => {
      const sliderGroup = document.createElement('div');

      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
        font-size: 12px;
        color: #555;
      `;

      const labelText = document.createElement('span');
      labelText.textContent = label;
      labelText.style.cssText = `
        font-weight: 500;
      `;

      const valueText = document.createElement('span');
      valueText.textContent = value + 'px';
      valueText.style.cssText = `
        font-weight: 600;
        color: #333;
        font-size: 11px;
        font-family: monospace;
      `;

      labelDiv.appendChild(labelText);
      labelDiv.appendChild(valueText);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '2';
      slider.max = '20';
      slider.value = value;
      slider.style.cssText = `
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.15));
        cursor: pointer;
      `;

      slider.oninput = (e) => {
        e.stopPropagation();
        this[name] = parseInt(slider.value);
        valueText.textContent = slider.value + 'px';

        // Apply changes live
        if (this.onDesignChange) {
          this.onDesignChange(this.getDesign());
        }
      };

      // Prevent events from propagating
      slider.onmousedown = (e) => e.stopPropagation();
      slider.onmousemove = (e) => e.stopPropagation();
      slider.onmouseup = (e) => e.stopPropagation();
      slider.ontouchstart = (e) => e.stopPropagation();
      slider.ontouchmove = (e) => e.stopPropagation();
      slider.ontouchend = (e) => e.stopPropagation();

      sliderGroup.appendChild(labelDiv);
      sliderGroup.appendChild(slider);
      this.widthSlidersContainer.appendChild(sliderGroup);

      this.sliders[name] = { slider, valueText };
    });
  }

  createToggles() {
    const toggleConfigs = [
      { name: 'inverse', label: 'Inverse Colors', getValue: () => this.renderer.getInverse() },
      { name: 'fade', label: 'Fade Traces', getValue: () => this.traceSystem.getFading() },
      { name: 'stretch', label: 'Stretch Mode', getValue: () => this.mechanism.isStretchingMode }
    ];

    toggleConfigs.forEach(({ name, label, getValue }) => {
      const toggleContainer = document.createElement('div');
      toggleContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-radius: 6px;
        transition: background 0.15s ease;
      `;

      const toggleLabel = document.createElement('label');
      toggleLabel.textContent = label;
      toggleLabel.style.cssText = `
        font-size: 12px;
        color: #555;
        cursor: pointer;
        flex: 1;
        font-weight: 500;
      `;

      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.style.cssText = `
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = getValue();
      checkbox.style.cssText = `
        width: 18px;
        height: 18px;
        cursor: pointer;
        pointer-events: auto;
        accent-color: rgba(100, 100, 255, 0.8);
      `;

      const handleToggle = () => {
        checkbox.checked = !checkbox.checked;
        if (name === 'inverse') {
          this.renderer.setInverse(checkbox.checked);
        } else if (name === 'stretch') {
          this.mechanism.toggleStretchingMode();
        }
        if (this.onDesignChange) {
          this.onDesignChange(this.getDesign());
        }
      };

      checkbox.onclick = (e) => {
        e.stopPropagation();
        if (name === 'inverse') {
          this.renderer.setInverse(checkbox.checked);
        } else if (name === 'stretch') {
          this.mechanism.toggleStretchingMode();
        }
        if (this.onDesignChange) {
          this.onDesignChange(this.getDesign());
        }
      };

      toggleLabel.onclick = (e) => {
        e.stopPropagation();
        handleToggle();
      };

      checkboxWrapper.appendChild(checkbox);
      toggleContainer.appendChild(toggleLabel);
      toggleContainer.appendChild(checkboxWrapper);
      this.togglesContainer.appendChild(toggleContainer);

      this.sliders[name] = { checkbox };
    });
  }

  updateSliderGradients() {
    // Update saturation and brightness gradients based on current hue
    Object.entries(this.sliders).forEach(([name, config]) => {
      if (config.getGradient) {
        config.slider.style.background = config.getGradient(this.currentHSV);
      }
    });
  }

  setDesign(design) {
    if (design.color) {
      this.currentColor = { ...design.color };
      this.currentHSV = this.rgbToHSV(this.currentColor.r, this.currentColor.g, this.currentColor.b);

      // Update HSV sliders
      ['h', 's', 'v'].forEach(name => {
        if (this.sliders[name]) {
          this.sliders[name].slider.value = this.currentHSV[name];
          this.sliders[name].valueText.textContent = this.currentHSV[name] + this.sliders[name].suffix;
        }
      });

      this.updateSliderGradients();
    }

    if (design.traceWidth !== undefined) {
      this.traceWidth = design.traceWidth;
      if (this.sliders.traceWidth) {
        this.sliders.traceWidth.slider.value = design.traceWidth;
        this.sliders.traceWidth.valueText.textContent = design.traceWidth + 'px';
      }
    }

    if (design.rodsWidth !== undefined) {
      this.rodsWidth = design.rodsWidth;
      if (this.sliders.rodsWidth) {
        this.sliders.rodsWidth.slider.value = design.rodsWidth;
        this.sliders.rodsWidth.valueText.textContent = design.rodsWidth + 'px';
      }
    }

    if (design.fadingEnabled !== undefined && this.sliders.fade) {
      this.sliders.fade.checkbox.checked = design.fadingEnabled;
    }

    // Sync inverse checkbox with current renderer state
    if (this.sliders.inverse) {
      this.sliders.inverse.checkbox.checked = this.renderer.getInverse();
    }

    // Sync stretch checkbox with mechanism state
    if (this.sliders.stretch) {
      this.sliders.stretch.checkbox.checked = this.mechanism.isStretchingMode;
    }
  }

  getDesign() {
    return {
      color: { ...this.currentColor },
      traceWidth: this.traceWidth,
      rodsWidth: this.rodsWidth,
      fadingEnabled: this.sliders.fade ? this.sliders.fade.checkbox.checked : true
    };
  }
}
