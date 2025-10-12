import './style.css';
import { app } from './linkage/LinkageApp.js';

// Menu toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Linkage Simulator initialized');

  // Set initial menu icon color and body background based on inverse mode
  app.renderer.updateMenuIconColor();
  app.renderer.updateBodyBackground();

  const menuToggle = document.getElementById('menuToggle');
  const menuPanel = document.getElementById('menuPanel');
  const menuIconSvg = document.getElementById('menuIconSvg');
  let isMenuOpen = false;

  let firstMenuOpen = true;

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      menuPanel.classList.remove('-translate-y-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      menuIconSvg.style.transform = 'rotate(-90deg)';

      // Force slider repaint on first menu open (fixes visibility issue)
      if (firstMenuOpen) {
        firstMenuOpen = false;
        setTimeout(() => {
          // Trigger a style recalculation by reading offsetHeight
          const sliders = document.querySelectorAll('#hsvSlidersContainer input[type="range"], #widthSlidersContainer input[type="range"]');
          sliders.forEach(slider => {
            slider.offsetHeight; // Force reflow
            const bg = slider.style.background;
            slider.style.background = '';
            slider.offsetHeight; // Force reflow
            slider.style.background = bg;
          });
        }, 50);
      }
    } else {
      menuPanel.classList.add('-translate-y-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      menuIconSvg.style.transform = 'rotate(0deg)';
    }
  };

  menuToggle.addEventListener('click', toggleMenu);
  menuToggle.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  // Prevent menu interactions from affecting canvas
  const preventCanvasInteraction = (e) => {
    e.stopPropagation();
  };

  ['mousedown', 'mouseup', 'mousemove', 'click', 'touchstart', 'touchmove', 'touchend', 'wheel'].forEach(eventType => {
    menuPanel.addEventListener(eventType, preventCanvasInteraction);
  });

  // Close menu when clicking or tapping outside
  const closeMenuIfOutside = (e) => {
    if (isMenuOpen && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) {
      menuToggle.click();
    }
  };

  document.addEventListener('click', closeMenuIfOutside);
  document.addEventListener('touchstart', closeMenuIfOutside);
});