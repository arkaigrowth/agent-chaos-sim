import { test, expect } from '@playwright/test';

test('debug tour loading', async ({ page }) => {
  // Listen for console messages
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  // Navigate to the page
  await page.goto('http://localhost:8080/docs/claude_prototype_enhanced.html');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check what's in window
  const windowCheck = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k => k.includes('driver') || k.includes('Driver'));
    return {
      keys: keys,
      driverJs: typeof window['driver.js'],
      Driver: typeof window['Driver'],
      driver: typeof window['driver']
    };
  });
  
  console.log('Window check:', windowCheck);
  
  // Check if scripts loaded
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      loaded: s.complete !== false
    }));
  });
  
  console.log('Scripts:', scripts);
  
  // Try to load Driver.js manually
  const manualLoad = await page.evaluate(() => {
    return new Promise((resolve) => {
      if (window['driver.js']) {
        resolve('Driver.js already loaded');
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js';
      script.onload = () => resolve('Script loaded');
      script.onerror = () => resolve('Script failed to load');
      document.head.appendChild(script);
      
      setTimeout(() => resolve('Timeout'), 5000);
    });
  });
  
  console.log('Manual load result:', manualLoad);
  
  // Wait a bit more
  await page.waitForTimeout(2000);
  
  // Check again
  const finalCheck = await page.evaluate(() => {
    return {
      driverJs: typeof window['driver.js'],
      keys: Object.keys(window).filter(k => k.includes('driver') || k.includes('Driver'))
    };
  });
  
  console.log('Final check:', finalCheck);
  
  // Take screenshot
  await page.screenshot({ path: 'debug-tour.png' });
});