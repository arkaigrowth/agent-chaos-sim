import { test, expect } from '@playwright/test';

test.describe('Navigation System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main navigation page
    await page.goto('/docs/index.html');
    
    // Wait for page to fully load
    await page.waitForSelector('.nav-header', { timeout: 5000 });
  });

  test('should display navigation header with correct elements', async ({ page }) => {
    // Check brand is visible
    const brand = page.locator('.nav-brand');
    await expect(brand).toBeVisible();
    await expect(brand).toContainText('AGENT CHAOS MONKEY');
    
    // Check navigation links
    const basicLink = page.locator('#basic-link');
    const taskLink = page.locator('#task-link');
    const tourButton = page.locator('#start-tour');
    
    await expect(basicLink).toBeVisible();
    await expect(basicLink).toHaveText('Basic Testing');
    await expect(basicLink).toHaveClass(/active/);
    
    await expect(taskLink).toBeVisible();
    await expect(taskLink).toHaveText('Task Mode');
    
    await expect(tourButton).toBeVisible();
    await expect(tourButton).toContainText('Start Tour');
  });

  test('should switch between Basic Testing and Task Mode', async ({ page }) => {
    // Initially should show Basic Testing page
    const iframe = page.frameLocator('#content-frame');
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /claude_prototype_enhanced\.html/);
    
    // Click Task Mode
    await page.locator('#task-link').click();
    
    // Wait for iframe to change
    await page.waitForTimeout(500);
    
    // Should now show Task Mode page
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /task_mode_standalone\.html/);
    
    // Task link should be active
    await expect(page.locator('#task-link')).toHaveClass(/active/);
    await expect(page.locator('#basic-link')).not.toHaveClass(/active/);
    
    // Switch back to Basic Testing
    await page.locator('#basic-link').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /claude_prototype_enhanced\.html/);
    await expect(page.locator('#basic-link')).toHaveClass(/active/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Focus on Basic Testing link
    await page.locator('#basic-link').focus();
    
    // Press Tab to move to Task Mode
    await page.keyboard.press('Tab');
    await expect(page.locator('#task-link')).toBeFocused();
    
    // Press Enter to activate Task Mode
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Task Mode should be active
    await expect(page.locator('#task-link')).toHaveClass(/active/);
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /task_mode_standalone\.html/);
  });

  test('should maintain active state visually', async ({ page }) => {
    // Check initial state - Basic Testing active
    const basicLink = page.locator('#basic-link');
    const taskLink = page.locator('#task-link');
    
    // Basic link should have active styling
    await expect(basicLink).toHaveCSS('color', 'rgb(0, 255, 65)'); // #00ff41
    await expect(basicLink).toHaveCSS('border-color', 'rgb(0, 255, 65)');
    
    // Task link should have inactive styling
    await expect(taskLink).toHaveCSS('color', 'rgb(102, 102, 102)'); // #666
    
    // Switch to Task Mode
    await taskLink.click();
    await page.waitForTimeout(500);
    
    // Now Task link should have active styling
    await expect(taskLink).toHaveCSS('color', 'rgb(0, 255, 65)');
    await expect(taskLink).toHaveCSS('border-color', 'rgb(0, 255, 65)');
    
    // Basic link should have inactive styling
    await expect(basicLink).toHaveCSS('color', 'rgb(102, 102, 102)');
  });

  test('should load iframe content correctly', async ({ page }) => {
    // Wait for iframe to load
    const iframe = page.frameLocator('#content-frame');
    
    // Check Basic Testing page loads
    await iframe.locator('.logo').waitFor({ timeout: 5000 });
    await expect(iframe.locator('.logo')).toContainText('AGENT CHAOS LAB');
    
    // Switch to Task Mode
    await page.locator('#task-link').click();
    await page.waitForTimeout(1000);
    
    // Check Task Mode page loads
    const taskFrame = page.frameLocator('#content-frame');
    await taskFrame.locator('h1').waitFor({ timeout: 5000 });
    await expect(taskFrame.locator('h1')).toContainText('Agent Chaos Lab');
  });

  test('should handle responsive navigation', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be visible
    await expect(page.locator('.nav-header')).toBeVisible();
    await expect(page.locator('.nav-brand')).toBeVisible();
    
    // Links should be visible but may have different styling
    await expect(page.locator('#basic-link')).toBeVisible();
    await expect(page.locator('#task-link')).toBeVisible();
    
    // Navigation should still work
    await page.locator('#task-link').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /task_mode_standalone\.html/);
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // Try to navigate to non-existent page by modifying iframe src directly
    await page.evaluate(() => {
      const iframe = document.querySelector('#content-frame') as HTMLIFrameElement;
      iframe.src = 'non-existent-page.html';
    });
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Navigation links should still work
    await page.locator('#basic-link').click();
    await page.waitForTimeout(500);
    
    // Should recover and show correct page
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /claude_prototype_enhanced\.html/);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check navigation has proper roles
    const nav = page.locator('.nav-links');
    await expect(nav).toHaveAttribute('role', 'navigation');
    
    // Check links have proper attributes
    const basicLink = page.locator('#basic-link');
    const taskLink = page.locator('#task-link');
    
    // Initially Basic Testing is active
    await expect(basicLink).toHaveAttribute('aria-current', 'page');
    
    // Switch to Task Mode
    await taskLink.click();
    await page.waitForTimeout(500);
    
    // Now Task Mode should be current
    await expect(taskLink).toHaveAttribute('aria-current', 'page');
    await expect(basicLink).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Navigation Performance', () => {
  
  test('should load navigation page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/docs/index.html');
    await page.waitForSelector('.nav-header');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load in less than 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should switch between pages quickly', async ({ page }) => {
    await page.goto('/docs/index.html');
    await page.waitForSelector('.nav-header');
    
    const startTime = Date.now();
    
    // Switch to Task Mode
    await page.locator('#task-link').click();
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#content-frame') as HTMLIFrameElement;
      return iframe.src.includes('task_mode_standalone.html');
    });
    
    const switchTime = Date.now() - startTime;
    
    // Switch should happen in less than 1 second
    expect(switchTime).toBeLessThan(1000);
  });
});