import { test, expect } from '@playwright/test';

test.describe('Complete Tour Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing tour state
    await page.goto('/docs/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('tourActive');
      localStorage.removeItem('tourStep');
      localStorage.removeItem('tourPage');
    });
    
    // Reload page
    await page.reload();
    await page.waitForSelector('.nav-header', { timeout: 5000 });
  });

  test('should start tour when button is clicked', async ({ page }) => {
    // Click start tour button
    await page.locator('#start-tour').click();
    
    // Wait for Driver.js to initialize
    await page.waitForTimeout(500);
    
    // Tour progress should be visible
    await expect(page.locator('#tour-progress')).toBeVisible();
    await expect(page.locator('#tour-progress')).toHaveClass(/active/);
    
    // Check progress bar shows correct step
    await expect(page.locator('#tour-step')).toContainText('Step 1 of 10');
    await expect(page.locator('#tour-title')).toContainText('Welcome to Agent Chaos Monkey');
    
    // Driver.js popover should be visible
    await expect(page.locator('.driver-popover')).toBeVisible();
    await expect(page.locator('.driver-popover-title')).toContainText('Welcome to Agent Chaos Monkey');
  });

  test('should navigate through all tour steps', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Step 1: Welcome
    await expect(page.locator('.driver-popover-title')).toContainText('Welcome to Agent Chaos Monkey');
    await expect(page.locator('#tour-step')).toContainText('Step 1 of 10');
    
    // Click Next
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    // Step 2: Navigation
    await expect(page.locator('.driver-popover-title')).toContainText('Navigation');
    await expect(page.locator('#tour-step')).toContainText('Step 2 of 10');
    
    // Click Next
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    // Step 3: Basic Testing Mode
    await expect(page.locator('.driver-popover-title')).toContainText('Basic Testing Mode');
    await expect(page.locator('#tour-step')).toContainText('Step 3 of 10');
    // Should automatically switch to Basic Testing
    await expect(page.locator('#basic-link')).toHaveClass(/active/);
    
    // Click Next
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    // Step 4: Basic Testing Features
    await expect(page.locator('#tour-step')).toContainText('Step 4 of 10');
    
    // Click Next
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    // Step 5: Task Mode
    await expect(page.locator('.driver-popover-title')).toContainText('Task Mode');
    await expect(page.locator('#tour-step')).toContainText('Step 5 of 10');
    // Should automatically switch to Task Mode
    await page.waitForTimeout(500);
    await expect(page.locator('#task-link')).toHaveClass(/active/);
    
    // Continue through remaining steps
    for (let step = 6; step <= 10; step++) {
      await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#tour-step')).toContainText(`Step ${step} of 10`);
    }
    
    // Final step should show completion
    await expect(page.locator('.driver-popover-title')).toContainText('Tour Complete');
  });

  test('should update progress bar during tour', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Check initial progress
    const progressBar = page.locator('#progress-fill');
    let progressWidth = await progressBar.evaluate(el => el.style.width);
    expect(progressWidth).toBe('10%'); // 1 of 10 steps
    
    // Move to step 5
    for (let i = 0; i < 4; i++) {
      await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
      await page.waitForTimeout(300);
    }
    
    // Check progress at step 5
    progressWidth = await progressBar.evaluate(el => el.style.width);
    expect(progressWidth).toBe('50%'); // 5 of 10 steps
    
    // Move to last step
    for (let i = 0; i < 5; i++) {
      await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
      await page.waitForTimeout(300);
    }
    
    // Check progress at final step
    progressWidth = await progressBar.evaluate(el => el.style.width);
    expect(progressWidth).toBe('100%'); // 10 of 10 steps
  });

  test('should handle tour navigation (previous/next)', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Move to step 3
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    await expect(page.locator('#tour-step')).toContainText('Step 3 of 10');
    
    // Click Previous
    await page.locator('.driver-popover-navigation-btns button:has-text("BACK")').click();
    await page.waitForTimeout(300);
    
    // Should be back at step 2
    await expect(page.locator('#tour-step')).toContainText('Step 2 of 10');
    
    // Click Previous again
    await page.locator('.driver-popover-navigation-btns button:has-text("BACK")').click();
    await page.waitForTimeout(300);
    
    // Should be back at step 1
    await expect(page.locator('#tour-step')).toContainText('Step 1 of 10');
  });

  test('should end tour when close button is clicked', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Tour should be active
    await expect(page.locator('#tour-progress')).toBeVisible();
    await expect(page.locator('.driver-popover')).toBeVisible();
    
    // Click close button in Driver.js popover
    await page.locator('.driver-popover-navigation-btns button:has-text("ESC")').click();
    await page.waitForTimeout(500);
    
    // Tour should be ended
    await expect(page.locator('.driver-popover')).not.toBeVisible();
    await expect(page.locator('#tour-progress')).not.toBeVisible();
  });

  test('should end tour when end tour button is clicked', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Tour should be active
    await expect(page.locator('#tour-progress')).toBeVisible();
    
    // Click end tour button in progress bar
    await page.locator('#end-tour').click();
    await page.waitForTimeout(500);
    
    // Tour should be ended
    await expect(page.locator('.driver-popover')).not.toBeVisible();
    await expect(page.locator('#tour-progress')).not.toBeVisible();
  });

  test('should save tour state to localStorage', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Check localStorage
    let tourState = await page.evaluate(() => ({
      active: localStorage.getItem('tourActive'),
      step: localStorage.getItem('tourStep')
    }));
    
    expect(tourState.active).toBe('true');
    expect(tourState.step).toBe('0');
    
    // Move to step 3
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    
    // Check localStorage updated
    tourState = await page.evaluate(() => ({
      active: localStorage.getItem('tourActive'),
      step: localStorage.getItem('tourStep')
    }));
    
    expect(tourState.active).toBe('true');
    expect(tourState.step).toBe('2');
    
    // End tour
    await page.locator('#end-tour').click();
    await page.waitForTimeout(500);
    
    // Check localStorage cleared
    tourState = await page.evaluate(() => ({
      active: localStorage.getItem('tourActive'),
      step: localStorage.getItem('tourStep')
    }));
    
    expect(tourState.active).toBeNull();
    expect(tourState.step).toBeNull();
  });

  test('should switch pages during tour', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Move to step 3 (Basic Testing)
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(500);
    
    // Should be on Basic Testing
    await expect(page.locator('#basic-link')).toHaveClass(/active/);
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /claude_prototype_enhanced\.html/);
    
    // Move to step 5 (Task Mode)
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(300);
    await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
    await page.waitForTimeout(500);
    
    // Should switch to Task Mode
    await expect(page.locator('#task-link')).toHaveClass(/active/);
    await expect(page.locator('#content-frame')).toHaveAttribute('src', /task_mode_standalone\.html/);
  });

  test('should handle tour restart', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Move to step 5
    for (let i = 0; i < 4; i++) {
      await page.locator('.driver-popover-navigation-btns button:has-text("NEXT")').click();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('#tour-step')).toContainText('Step 5 of 10');
    
    // End tour
    await page.locator('#end-tour').click();
    await page.waitForTimeout(500);
    
    // Start tour again
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Should restart from beginning
    await expect(page.locator('#tour-step')).toContainText('Step 1 of 10');
    await expect(page.locator('.driver-popover-title')).toContainText('Welcome to Agent Chaos Monkey');
  });

  test('should handle keyboard navigation in tour', async ({ page }) => {
    // Start tour
    await page.locator('#start-tour').click();
    await page.waitForTimeout(500);
    
    // Press right arrow to go next
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    await expect(page.locator('#tour-step')).toContainText('Step 2 of 10');
    
    // Press right arrow again
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    await expect(page.locator('#tour-step')).toContainText('Step 3 of 10');
    
    // Press left arrow to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    
    await expect(page.locator('#tour-step')).toContainText('Step 2 of 10');
    
    // Press Escape to end tour
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    await expect(page.locator('.driver-popover')).not.toBeVisible();
    await expect(page.locator('#tour-progress')).not.toBeVisible();
  });
});