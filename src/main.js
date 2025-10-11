import './style.css';
import { app } from './linkage/LinkageApp.js';

// Menu toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Linkage Simulator initialized');

  // Set initial menu icon color based on inverse mode
  app.renderer.updateMenuIconColor();

  const menuToggle = document.getElementById('menuToggle');
  const menuPanel = document.getElementById('menuPanel');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');
  let isMenuOpen = false;

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      menuPanel.classList.remove('-translate-x-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
      menuIcon.style.display = 'none';
      closeIcon.style.display = 'block';
    } else {
      menuPanel.classList.add('-translate-x-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
      menuIcon.style.display = 'block';
      closeIcon.style.display = 'none';
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