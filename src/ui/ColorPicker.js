/**
 * Color picker component for selecting trace colors
 */
export class ColorPicker {
  constructor(onColorChange) {
    this.onColorChange = onColorChange;
    this.isOpen = false;
    this.currentColor = { r: 128, g: 0, b: 128 }; // Default purple
    this.createElements();
    this.setupEventListeners();
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

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Select Trace Color';
    title.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    `;

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

    // Create RGB sliders
    this.sliders = {};
    const colors = [
      { name: 'r', label: 'Red', color: '#ff4444' },
      { name: 'g', label: 'Green', color: '#44ff44' },
      { name: 'b', label: 'Blue', color: '#4444ff' }
    ];

    colors.forEach(({ name, label, color }) => {
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
      valueText.textContent = this.currentColor[name];
      valueText.style.cssText = `
        font-weight: 600;
        color: ${color};
      `;

      labelDiv.appendChild(labelText);
      labelDiv.appendChild(valueText);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '255';
      slider.value = this.currentColor[name];
      slider.style.cssText = `
        width: 100%;
        height: 8px;
        border-radius: 4px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right,
          ${name === 'r' ? 'black' : `rgb(0, 0, 0)`},
          ${name === 'r' ? 'red' : name === 'g' ? 'lime' : 'blue'}
        );
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
          border: 2px solid ${color};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid ${color};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `;
      document.head.appendChild(style);

      sliderGroup.appendChild(labelDiv);
      sliderGroup.appendChild(slider);
      slidersContainer.appendChild(sliderGroup);

      this.sliders[name] = { slider, valueText };
    });

    // Create preset colors
    const presetsLabel = document.createElement('div');
    presetsLabel.textContent = 'Presets';
    presetsLabel.style.cssText = `
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    `;

    const presetsContainer = document.createElement('div');
    presetsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    `;

    const presetColors = [
      { r: 128, g: 0, b: 128, name: 'Purple' },
      { r: 255, g: 0, b: 0, name: 'Red' },
      { r: 0, g: 128, b: 255, name: 'Blue' },
      { r: 0, g: 200, b: 0, name: 'Green' },
      { r: 255, g: 165, b: 0, name: 'Orange' },
      { r: 255, g: 192, b: 203, name: 'Pink' }
    ];

    presetColors.forEach(color => {
      const preset = document.createElement('button');
      preset.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 2px solid #ddd;
        background: rgb(${color.r}, ${color.g}, ${color.b});
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s;
      `;
      preset.title = color.name;
      preset.onclick = () => {
        this.currentColor = { r: color.r, g: color.g, b: color.b };
        this.updateUI();
      };
      preset.onmouseover = () => {
        preset.style.transform = 'scale(1.1)';
        preset.style.borderColor = '#007aff';
      };
      preset.onmouseout = () => {
        preset.style.transform = 'scale(1)';
        preset.style.borderColor = '#ddd';
      };
      presetsContainer.appendChild(preset);
    });

    // Create buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    `;
    cancelBtn.onclick = () => this.close();

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = `
      padding: 8px 16px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    `;
    applyBtn.onclick = () => this.apply();

    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(applyBtn);

    // Assemble picker
    this.picker.appendChild(title);
    this.picker.appendChild(this.colorPreview);
    this.picker.appendChild(slidersContainer);
    this.picker.appendChild(presetsLabel);
    this.picker.appendChild(presetsContainer);
    this.picker.appendChild(buttonsContainer);
    this.overlay.appendChild(this.picker);
    document.body.appendChild(this.overlay);
  }

  setupEventListeners() {
    // Slider input events
    Object.entries(this.sliders).forEach(([name, { slider, valueText }]) => {
      slider.oninput = (e) => {
        e.stopPropagation();
        this.currentColor[name] = parseInt(slider.value);
        valueText.textContent = slider.value;
        this.updatePreview();
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
    // Update sliders and preview
    Object.entries(this.sliders).forEach(([name, { slider, valueText }]) => {
      slider.value = this.currentColor[name];
      valueText.textContent = this.currentColor[name];
    });
    this.updatePreview();
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
    if (this.onColorChange) {
      this.onColorChange(this.currentColor);
    }
    this.close();
  }

  setColor(color) {
    this.currentColor = { ...color };
    this.updateUI();
  }

  getColor() {
    return { ...this.currentColor };
  }
}
