/**
 * Design panel component for selecting trace colors and widths
 */
export class ColorPicker {
  constructor(onDesignChange) {
    this.onDesignChange = onDesignChange;
    this.isOpen = false;
    this.currentColor = { r: 128, g: 0, b: 128 }; // Default purple
    this.currentHSV = this.rgbToHSV(128, 0, 128); // Store HSV separately
    this.traceWidth = 8; // Default trace width
    this.rodsWidth = 4; // Default rods width
    this.createElements();
    this.setupEventListeners();
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

  createElements() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    `;

    // Create picker container
    this.picker = document.createElement('div');
    this.picker.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      min-width: 300px;
    `;

    // Create title container with close button
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Design';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#333';
    closeBtn.onmouseout = () => closeBtn.style.color = '#666';
    closeBtn.onclick = () => this.close();

    titleContainer.appendChild(title);
    titleContainer.appendChild(closeBtn);

    // Create color preview
    this.colorPreview = document.createElement('div');
    this.colorPreview.style.cssText = `
      width: 100%;
      height: 60px;
      border-radius: 8px;
      margin-bottom: 15px;
      border: 2px solid #ddd;
      background: rgb(${this.currentColor.r}, ${this.currentColor.g}, ${this.currentColor.b});
    `;

    // Create sliders container
    const slidersContainer = document.createElement('div');
    slidersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    `;

    // Create HSV sliders
    this.sliders = {};
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
        margin-bottom: 5px;
        font-size: 14px;
        color: #666;
      `;

      const labelText = document.createElement('span');
      labelText.textContent = label;

      const valueText = document.createElement('span');
      valueText.textContent = this.currentHSV[name] + suffix;
      valueText.style.cssText = `
        font-weight: 600;
        color: #333;
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
        height: 8px;
        border-radius: 4px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: ${gradient || ''};
        cursor: pointer;
      `;

      // Style the slider thumb
      const style = document.createElement('style');
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #333;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #333;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `;
      document.head.appendChild(style);

      sliderGroup.appendChild(labelDiv);
      sliderGroup.appendChild(slider);
      slidersContainer.appendChild(sliderGroup);

      this.sliders[name] = { slider, valueText, suffix, gradient, getGradient };
    });

    // Create width sliders container
    const widthSlidersContainer = document.createElement('div');
    widthSlidersContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    `;

    // Add trace width slider
    this.createWidthSlider(widthSlidersContainer, 'traceWidth', 'Trace Width', 2, 20, this.traceWidth, 'px');

    // Add rods width slider
    this.createWidthSlider(widthSlidersContainer, 'rodsWidth', 'Rods Width', 2, 20, this.rodsWidth, 'px');

    // Assemble picker
    this.picker.appendChild(titleContainer);
    this.picker.appendChild(this.colorPreview);
    this.picker.appendChild(slidersContainer);
    this.picker.appendChild(widthSlidersContainer);
    this.overlay.appendChild(this.picker);
    document.body.appendChild(this.overlay);
  }

  createWidthSlider(container, propertyName, label, min, max, value, suffix) {
    const sliderGroup = document.createElement('div');

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 14px;
      color: #666;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueText = document.createElement('span');
    valueText.textContent = value + suffix;
    valueText.style.cssText = `
      font-weight: 600;
      color: #333;
    `;

    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueText);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value;
    slider.style.cssText = `
      width: 100%;
      height: 8px;
      border-radius: 4px;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      background: #ddd;
      cursor: pointer;
    `;

    slider.oninput = (e) => {
      e.stopPropagation();
      this[propertyName] = parseInt(slider.value);
      valueText.textContent = slider.value + suffix;

      // Apply changes live
      if (this.onDesignChange) {
        this.onDesignChange({
          color: this.currentColor,
          traceWidth: this.traceWidth,
          rodsWidth: this.rodsWidth
        });
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
    container.appendChild(sliderGroup);
  }

  setupEventListeners() {
    // Slider input events
    Object.entries(this.sliders).forEach(([name, { slider, valueText, suffix }]) => {
      slider.oninput = (e) => {
        e.stopPropagation();
        this.currentHSV[name] = parseInt(slider.value);
        valueText.textContent = slider.value + suffix;

        // Convert HSV to RGB
        this.currentColor = this.hsvToRGB(this.currentHSV.h, this.currentHSV.s, this.currentHSV.v);

        // Update dependent slider gradients
        this.updateSliderGradients();

        this.updatePreview();

        // Apply changes live
        if (this.onDesignChange) {
          this.onDesignChange({
            color: this.currentColor,
            traceWidth: this.traceWidth,
            rodsWidth: this.rodsWidth
          });
        }
      };

      // Prevent mouse events from propagating to canvas
      slider.onmousedown = (e) => {
        e.stopPropagation();
      };

      slider.onmousemove = (e) => {
        e.stopPropagation();
      };

      slider.onmouseup = (e) => {
        e.stopPropagation();
      };

      // Prevent touch events from propagating to canvas
      slider.ontouchstart = (e) => {
        e.stopPropagation();
      };

      slider.ontouchmove = (e) => {
        e.stopPropagation();
      };

      slider.ontouchend = (e) => {
        e.stopPropagation();
      };
    });

    // Click overlay to close
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };

    // Prevent all mouse/touch events on the picker from reaching the canvas
    this.picker.onmousedown = (e) => {
      e.stopPropagation();
    };

    this.picker.onmousemove = (e) => {
      e.stopPropagation();
    };

    this.picker.onmouseup = (e) => {
      e.stopPropagation();
    };

    this.picker.ontouchstart = (e) => {
      e.stopPropagation();
    };

    this.picker.ontouchmove = (e) => {
      e.stopPropagation();
    };

    this.picker.ontouchend = (e) => {
      e.stopPropagation();
    };
  }

  updateUI() {
    // Convert current RGB to HSV
    this.currentHSV = this.rgbToHSV(this.currentColor.r, this.currentColor.g, this.currentColor.b);

    // Update sliders and preview
    Object.entries(this.sliders).forEach(([name, { slider, valueText, suffix }]) => {
      slider.value = this.currentHSV[name];
      valueText.textContent = this.currentHSV[name] + suffix;
    });

    this.updateSliderGradients();
    this.updatePreview();
  }

  updateSliderGradients() {
    // Update saturation and brightness gradients based on current hue
    Object.entries(this.sliders).forEach(([name, config]) => {
      if (config.getGradient) {
        config.slider.style.background = config.getGradient(this.currentHSV);
      }
    });
  }

  updatePreview() {
    this.colorPreview.style.background =
      `rgb(${this.currentColor.r}, ${this.currentColor.g}, ${this.currentColor.b})`;
  }

  open() {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
  }

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  apply() {
    if (this.onDesignChange) {
      this.onDesignChange({
        color: this.currentColor,
        traceWidth: this.traceWidth,
        rodsWidth: this.rodsWidth
      });
    }
    this.close();
  }

  setColor(color) {
    this.currentColor = { ...color };
    this.updateUI();
  }

  setDesign(design) {
    if (design.color) {
      this.currentColor = { ...design.color };
      this.updateUI();
    }
    if (design.traceWidth !== undefined) {
      this.traceWidth = design.traceWidth;
      this.updateWidthSlider('traceWidth', design.traceWidth);
    }
    if (design.rodsWidth !== undefined) {
      this.rodsWidth = design.rodsWidth;
      this.updateWidthSlider('rodsWidth', design.rodsWidth);
    }
  }

  updateWidthSlider(propertyName, value) {
    // Find and update the width slider element
    const allInputs = this.picker.querySelectorAll('input[type="range"]');
    allInputs.forEach(slider => {
      // Check if this is the right slider by checking its parent structure
      const parent = slider.parentElement;
      const labelDiv = parent.querySelector('div');
      if (labelDiv) {
        const labelText = labelDiv.querySelector('span:first-child');
        const valueText = labelDiv.querySelector('span:last-child');
        const expectedLabel = propertyName === 'traceWidth' ? 'Trace Width' : 'Rods Width';

        if (labelText && labelText.textContent === expectedLabel) {
          slider.value = value;
          if (valueText) {
            valueText.textContent = value + 'px';
          }
        }
      }
    });
  }

  getColor() {
    return { ...this.currentColor };
  }

  getDesign() {
    return {
      color: { ...this.currentColor },
      traceWidth: this.traceWidth,
      rodsWidth: this.rodsWidth
    };
  }
}
