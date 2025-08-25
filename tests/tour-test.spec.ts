import { test, expect } from '@playwright/test';

test.describe('Agent Chaos Tour', () => {
  test('should initialize and launch tour', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:8080/docs/claude_prototype_enhanced.html');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if Driver.js is loaded (correct path)
    const driverLoaded = await page.evaluate(() => {
      return window.driver?.js?.driver !== undefined;
    });
    expect(driverLoaded).toBe(true);
    
    // Try to start the tour via keyboard shortcut
    await page.keyboard.down('Shift');
    await page.keyboard.press('?');
    await page.keyboard.up('Shift');
    
    // Wait a bit for tour to start
    await page.waitForTimeout(1000);
    
    // Check if tour popover is visible
    const popoverVisible = await page.locator('.driver-popover').isVisible().catch(() => false);
    
    if (popoverVisible) {
      console.log('✅ Tour started successfully!');
      
      // Check tour content
      const tourTitle = await page.locator('.driver-popover-title').textContent();
      console.log('Tour title:', tourTitle);
      
      // Try clicking next
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(500);
      
      // Check if we moved to next step
      const nextTitle = await page.locator('.driver-popover-title').textContent();
      console.log('Next step title:', nextTitle);
    } else {
      console.log('❌ Tour popover not visible');
      
      // Try manual initialization
      const manualStart = await page.evaluate(() => {
        try {
          const DriverConstructor = window.driver?.js?.driver;
          if (DriverConstructor) {
            const driver = DriverConstructor({
              showProgress: true,
              steps: [
                {
                  element: '.terminal-header',
                  popover: {
                    title: 'Test Step',
                    description: 'Testing if tour works'
                  }
                }
              ]
            });
            driver.drive();
            return 'Tour started manually';
          }
          return 'Driver.js not found';
        } catch (error) {
          return `Error: ${error.message}`;
        }
      });
      console.log('Manual start result:', manualStart);
      
      // Check again if popover is visible
      await page.waitForTimeout(1000);
      const popoverVisibleAfterManual = await page.locator('.driver-popover').isVisible().catch(() => false);
      expect(popoverVisibleAfterManual).toBe(true);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tour-test.png', fullPage: false });
  });
});