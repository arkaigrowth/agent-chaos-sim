import { test } from '@playwright/test';

test('check Driver.js API', async ({ page }) => {
  await page.goto('http://localhost:8080/docs/claude_prototype_enhanced.html');
  await page.waitForTimeout(2000);
  
  const api = await page.evaluate(() => {
    if (!window.driver) return 'No driver found';
    
    // Check what window.driver is
    const driverType = typeof window.driver;
    const driverKeys = Object.keys(window.driver);
    
    // Try to create an instance
    let instance = null;
    let instanceKeys = [];
    let error = null;
    
    try {
      // Try calling as function (no new)
      instance = window.driver({
        showProgress: true,
        steps: [{
          element: 'body',
          popover: {
            title: 'Test',
            description: 'Test step'
          }
        }]
      });
      
      if (instance) {
        instanceKeys = Object.keys(instance);
      }
    } catch (e) {
      error = e.message;
    }
    
    return {
      driverType,
      driverKeys,
      instanceKeys,
      error,
      hasDriver: !!window.driver,
      driverString: window.driver.toString().substring(0, 100)
    };
  });
  
  console.log('Driver.js API:', JSON.stringify(api, null, 2));
  
  // Now try to actually start the tour
  const tourResult = await page.evaluate(() => {
    try {
      const driver = window.driver({
        showProgress: true,
        steps: [{
          element: '.terminal-header',
          popover: {
            title: 'Welcome!',
            description: 'This is the terminal header'
          }
        }]
      });
      
      // Check what methods are available
      const methods = Object.keys(driver).filter(k => typeof driver[k] === 'function');
      
      // Try to start the tour
      if (driver.drive) {
        driver.drive();
        return { success: true, methods, message: 'Tour started with drive()' };
      } else if (driver.start) {
        driver.start();
        return { success: true, methods, message: 'Tour started with start()' };
      } else {
        return { success: false, methods, message: 'No start method found' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Tour result:', JSON.stringify(tourResult, null, 2));
  
  // Wait and check if popover is visible
  await page.waitForTimeout(1000);
  const popoverVisible = await page.locator('.driver-popover').isVisible().catch(() => false);
  console.log('Popover visible:', popoverVisible);
  
  if (popoverVisible) {
    const title = await page.locator('.driver-popover-title').textContent();
    console.log('Popover title:', title);
  }
  
  await page.screenshot({ path: 'api-check.png' });
});