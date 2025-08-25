// Theme Switcher Module for Chaos Lab
// Add this to your index.html to enable dynamic theme switching

class ThemeSwitcher {
  constructor() {
    this.themes = [
      { id: 'default', name: 'Caution/Matrix', file: '/styles.css' },
      { id: 'modern-flat', name: 'Modern Flat', file: '/theme-1-modern-flat.css' },
      { id: 'neumorphic', name: 'Neumorphic', file: '/theme-2-neumorphic.css' },
      { id: 'geometric', name: 'Bold Geometric', file: '/theme-3-bold-geometric.css' },
      { id: 'glassmorphism', name: 'Glassmorphism', file: '/theme-4-glassmorphism.css' },
      { id: 'brutalist', name: 'Neo-Brutalist', file: '/theme-5-neo-brutalist.css' }
    ];
    
    this.currentTheme = localStorage.getItem('chaos-theme') || 'default';
    this.init();
  }
  
  init() {
    // Create theme switcher UI
    this.createSwitcher();
    
    // Apply saved theme on load
    this.applyTheme(this.currentTheme);
  }
  
  createSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'theme-switcher';
    switcher.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: rgba(0,0,0,0.8);
      border: 2px solid #fbbf24;
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
    `;
    
    const label = document.createElement('label');
    label.style.cssText = 'color: #fbbf24; margin-right: 10px;';
    label.textContent = 'Theme:';
    
    const select = document.createElement('select');
    select.style.cssText = `
      background: #1a1a1a;
      color: #fbbf24;
      border: 1px solid #fbbf24;
      padding: 5px;
      font-family: monospace;
    `;
    
    this.themes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      if (theme.id === this.currentTheme) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
    
    switcher.appendChild(label);
    switcher.appendChild(select);
    
    // Add to page when DOM is ready
    if (document.body) {
      document.body.appendChild(switcher);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(switcher);
      });
    }
  }
  
  applyTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;
    
    // Find or create the theme link element
    let themeLink = document.getElementById('theme-stylesheet');
    if (!themeLink) {
      // Find the existing stylesheet link
      themeLink = document.querySelector('link[rel="stylesheet"]');
      if (themeLink) {
        themeLink.id = 'theme-stylesheet';
      }
    }
    
    if (themeLink) {
      // Update the href
      themeLink.href = theme.file;
      
      // Save preference
      localStorage.setItem('chaos-theme', themeId);
      this.currentTheme = themeId;
      
      // Optional: Add transition effect
      document.body.style.opacity = '0.8';
      setTimeout(() => {
        document.body.style.opacity = '1';
      }, 100);
    }
  }
}

// Auto-initialize when script loads
const themeSwitcher = new ThemeSwitcher();

// Export for use in other scripts
window.ThemeSwitcher = ThemeSwitcher;
window.themeSwitcher = themeSwitcher;