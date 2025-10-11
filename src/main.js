import './style.css';
import { app } from './linkage/LinkageApp.js';

// Menu toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Linkage Simulator initialized');

  // Set initial menu icon color based on inverse mode
  app.renderer.updateMenuIconColor();

  const menuToggle = document.getElementById('menuToggle');
  const menuPanel = document.getElementById('menuPanel');
  const menuIconSvg = document.getElementById('menuIconSvg');
  let isMenuOpen = false;

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      menuPanel.classList.remove('-translate-y-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      menuIconSvg.style.transform = 'rotate(90deg)';
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

  // Close menu when clicking or tapping outside
  const closeMenuIfOutside = (e) => {
    if (isMenuOpen && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) {
      menuToggle.click();
    }
  };

  document.addEventListener('click', closeMenuIfOutside);
  document.addEventListener('touchstart', closeMenuIfOutside);
});