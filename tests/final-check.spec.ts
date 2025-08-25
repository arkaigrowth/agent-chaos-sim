import { test } from '@playwright/test';

test('find correct Driver.js path', async ({ page }) => {
  await page.goto('http://localhost:8080/docs/claude_prototype_enhanced.html');
  await page.waitForTimeout(2000);
  
  const check = await page.evaluate(() => {
    const result = {
      windowDriver: typeof window.driver,
      windowDriverJs: typeof window.driver?.js,
      windowDriverJsDriver: typeof window.driver?.js?.driver,
    };
    
    // Try to access the actual constructor
    if (window.driver?.js?.driver) {
      try {
        const instance = window.driver.js.driver({
          showProgress: true,
          steps: [{
            element: 'body',
            popover: {
              title: 'Test',
              description: 'Testing'
            }
          }]
        });
        
        result.instanceCreated = true;
        result.instanceMethods = Object.keys(instance).filter(k => typeof instance[k] === 'function');
        
        // Try to start it
        if (instance.drive) {
          instance.drive();
          result.started = 'with drive()';
        }
        
      } catch (e) {
        result.error = e.message;
      }
    }
    
    return result;
  });
  
  console.log('Driver.js location:', JSON.stringify(check, null, 2));
  
  await page.waitForTimeout(1000);
  const popoverVisible = await page.locator('.driver-popover').isVisible().catch(() => false);
  console.log('Popover visible:', popoverVisible);
  
  await page.screenshot({ path: 'final-check.png' });
});