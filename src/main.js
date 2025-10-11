import './style.css';
import './linkage/LinkageApp.js';

// Menu toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('Linkage Simulator initialized');

  const menuToggle = document.getElementById('menuToggle');
  const menuPanel = document.getElementById('menuPanel');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');
  let isMenuOpen = false;

  menuToggle.addEventListener('click', () => {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      menuPanel.classList.remove('-translate-x-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
      menuIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
    } else {
      menuPanel.classList.add('-translate-x-[500px]', 'opacity-0', 'pointer-events-none');
      menuPanel.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
      menuIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
    }
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