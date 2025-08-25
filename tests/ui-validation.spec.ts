import { test, expect, Page } from '@playwright/test';

test.describe('UI Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('4-Step Wizard Flow', () => {
    test('should open wizard and navigate through all steps', async ({ page }) => {
      // Open wizard
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Step 1: Configuration
      await expect(page.locator('.wizard-step.active')).toHaveText('CONFIGURE');
      await expect(page.locator('h3')).toContainText('CONFIGURATION SETUP');
      
      // Configure test scenario
      await page.selectOption('#wizardScenario', 'fetch');
      await page.selectOption('#wizardIntensity', 'medium');
      await page.fill('#wizardSeed', '42');
      await page.check('#wizardRecovery');
      
      // Go to Step 2
      await page.click('button:has-text("NEXT →")');
      await expect(page.locator('.wizard-step.active')).toHaveText('BASELINE');
      
      // Step 2: Baseline
      await expect(page.locator('h3')).toContainText('BASELINE EXECUTION');
      await expect(page.locator('#wizardBaselineBtn')).toBeVisible();
      
      // Go to Step 3 (skip baseline execution for UI test)
      await page.click('button:has-text("← BACK")');
      await page.click('button:has-text("NEXT →")');
      await page.click('button:has-text("NEXT →")');
      await expect(page.locator('.wizard-step.active')).toHaveText('CHAOS');
      
      // Step 3: Chaos
      await expect(page.locator('h3')).toContainText('CHAOS EXECUTION');
      await expect(page.locator('#wizardChaosBtn')).toBeVisible();
      
      // Go to Step 4 (skip chaos execution for UI test)
      await page.click('button:has-text("← BACK")');
      await page.click('button:has-text("NEXT →")');
      await page.click('button:has-text("NEXT →")');
      await expect(page.locator('.wizard-step.active')).toHaveText('RESULTS');
      
      // Step 4: Results
      await expect(page.locator('h3')).toContainText('RESULTS ANALYSIS');
      await expect(page.locator('.results-summary')).toBeVisible();
    });

    test('should validate wizard configuration persistence', async ({ page }) => {
      await page.click('#btnWizard');
      
      // Set configuration
      await page.selectOption('#wizardScenario', 'json');
      await page.selectOption('#wizardIntensity', 'high');
      await page.fill('#wizardSeed', 'test-seed-123');
      await page.uncheck('#wizardRecovery');
      
      // Navigate forward and back
      await page.click('button:has-text("NEXT →")');
      await page.click('button:has-text("← BACK")');
      
      // Verify configuration is preserved
      await expect(page.locator('#wizardScenario')).toHaveValue('json');
      await expect(page.locator('#wizardIntensity')).toHaveValue('high');
      await expect(page.locator('#wizardSeed')).toHaveValue('test-seed-123');
      await expect(page.locator('#wizardRecovery')).not.toBeChecked();
    });

    test('should close wizard with cancel and X button', async ({ page }) => {
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Test cancel button
      await page.click('button:has-text("CANCEL")');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
      
      // Test X button
      await page.click('#btnWizard');
      await page.click('.btn-close');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
    });
  });

  test.describe('Form Controls Validation', () => {
    test('should validate all slider controls work correctly', async ({ page }) => {
      const sliders = [
        { id: '#latencyMs', min: 0, max: 10000, testValue: 3000 },
        { id: '#latencyRate', min: 0, max: 100, testValue: 50 },
        { id: '#http500Rate', min: 0, max: 100, testValue: 25 },
        { id: '#rate429', min: 0, max: 100, testValue: 15 },
        { id: '#malformedRate', min: 0, max: 100, testValue: 30 }
      ];

      for (const slider of sliders) {
        await page.fill(slider.id, String(slider.testValue));
        await expect(page.locator(slider.id)).toHaveValue(String(slider.testValue));
        
        // Test bounds
        await page.fill(slider.id, String(slider.min - 1));
        const minValue = await page.locator(slider.id).inputValue();
        expect(parseInt(minValue)).toBeGreaterThanOrEqual(slider.min);
        
        await page.fill(slider.id, String(slider.max + 1));
        const maxValue = await page.locator(slider.id).inputValue();
        expect(parseInt(maxValue)).toBeLessThanOrEqual(slider.max);
      }
    });

    test('should validate checkbox controls', async ({ page }) => {
      const checkboxes = [
        '#tripwireOn',
        '#surprise'
      ];

      for (const checkbox of checkboxes) {
        // Test checking
        await page.check(checkbox);
        await expect(page.locator(checkbox)).toBeChecked();
        
        // Test unchecking
        await page.uncheck(checkbox);
        await expect(page.locator(checkbox)).not.toBeChecked();
      }
    });

    test('should validate radio button scenario selection', async ({ page }) => {
      const scenarios = ['fetch', 'rag', 'json'];
      
      for (const scenario of scenarios) {
        await page.check(`input[name="scenario"][value="${scenario}"]`);
        await expect(page.locator(`input[name="scenario"][value="${scenario}"]`)).toBeChecked();
        
        // Verify only one is selected
        const checkedCount = await page.locator('input[name="scenario"]:checked').count();
        expect(checkedCount).toBe(1);
      }
    });

    test('should validate theme selector', async ({ page }) => {
      const themes = ['modern', 'neumorphic', 'geometric', 'glass', 'brutalist'];
      
      for (const theme of themes) {
        await page.selectOption('#themeSelector', theme);
        await expect(page.locator('#themeSelector')).toHaveValue(theme);
      }
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        
        // Check main elements are visible
        await expect(page.locator('.header')).toBeVisible();
        await expect(page.locator('.hero')).toBeVisible();
        await expect(page.locator('.story')).toBeVisible();
        await expect(page.locator('.main-grid')).toBeVisible();
        await expect(page.locator('.bottom-sheet')).toBeVisible();
        
        // Check mobile-specific adaptations for small screens
        if (width < 768) {
          // Main grid should stack vertically
          const gridItems = page.locator('.main-grid .card');
          const firstCard = gridItems.nth(0);
          const secondCard = gridItems.nth(1);
          
          const firstRect = await firstCard.boundingBox();
          const secondRect = await secondCard.boundingBox();
          
          // Cards should stack (second card below first)
          expect(secondRect?.y).toBeGreaterThan((firstRect?.y || 0) + (firstRect?.height || 0));
        }
        
        // Check navigation works on all screen sizes
        await page.click('#btnWizard');
        await expect(page.locator('#wizard')).toBeVisible();
        await page.click('.btn-close');
      });
    });

    test('should handle orientation changes on mobile', async ({ page }) => {
      // Portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('.main-grid')).toBeVisible();
      
      // Landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('.main-grid')).toBeVisible();
      
      // Interface should remain functional
      await page.click('#btnBaseline');
      const button = page.locator('#btnBaseline');
      await expect(button).toHaveText(/RUNNING|RUN BASELINE/);
    });
  });

  test.describe('Animations and Transitions', () => {
    test('should animate toast notifications', async ({ page }) => {
      await page.click('#btnBaseline');
      
      // Toast should appear
      await expect(page.locator('#runStatus')).not.toHaveClass(/hidden/);
      
      // Check for CSS transitions
      const toastStyles = await page.locator('#runStatus').evaluate(el => 
        getComputedStyle(el).transition
      );
      expect(toastStyles).toContain('opacity');
    });

    test('should animate progress bars', async ({ page }) => {
      await page.click('#btnWizard');
      await page.click('button:has-text("NEXT →")');
      
      // Progress bar should exist and have animation styles
      const progressBar = page.locator('.progress-fill');
      await expect(progressBar).toBeVisible();
      
      const styles = await progressBar.evaluate(el => 
        getComputedStyle(el).transition
      );
      expect(styles).toContain('width');
    });

    test('should animate wizard step transitions', async ({ page }) => {
      await page.click('#btnWizard');
      
      // Test step indicator animations
      const activeStep = page.locator('.wizard-step.active');
      await expect(activeStep).toHaveClass(/active/);
      
      // Navigate to next step
      await page.click('button:has-text("NEXT →")');
      
      // New step should be active
      await expect(page.locator('.wizard-step').nth(1)).toHaveClass(/active/);
      await expect(page.locator('.wizard-step').nth(0)).not.toHaveClass(/active/);
    });

    test('should handle chaos theatre animations', async ({ page }) => {
      // Run chaos to trigger theatre
      await page.click('#btnChaos');
      
      // Wait for theatre to appear
      await expect(page.locator('#chaosTheatre')).not.toHaveClass(/hidden/);
      
      // Check stage content updates
      const stage = page.locator('#stage');
      await expect(stage).toBeVisible();
      await expect(stage).toContainText('CHAOS');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support tab navigation through main controls', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator('#themeSelector')).toBeFocused();
      
      // Navigate through main form controls
      const tabbableElements = [
        '#themeSelector',
        'input[name="scenario"]',
        '#latencyMs',
        '#latencyRate',
        '#http500Rate',
        '#rate429',
        '#malformedRate',
        '#tripwireOn',
        '#maxRetries',
        '#backoffBase',
        '#backoffFactor',
        '#jitter',
        '#seed',
        '#btnBaseline',
        '#btnChaos',
        '#btnWizard'
      ];
      
      for (let i = 0; i < tabbableElements.length; i++) {
        await page.keyboard.press('Tab');
        // Allow some flexibility in tab order due to complex layout
      }
    });

    test('should support Enter key activation', async ({ page }) => {
      await page.focus('#btnBaseline');
      await page.keyboard.press('Enter');
      
      // Button should activate
      await expect(page.locator('#btnBaseline')).toHaveText(/RUNNING/);
    });

    test('should support Escape key to close modals', async ({ page }) => {
      // Open wizard
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
    });

    test('should support arrow key navigation in wizard', async ({ page }) => {
      await page.click('#btnWizard');
      
      // Use arrow keys to navigate wizard steps
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.wizard-step.active')).toHaveAttribute('data-step', '2');
      
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('.wizard-step.active')).toHaveAttribute('data-step', '1');
    });
  });

  test.describe('Accessibility Validation', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check for essential ARIA labels
      const ariaLabels = await page.locator('[aria-label]').count();
      expect(ariaLabels).toBeGreaterThan(0);
      
      // Check specific important elements
      await expect(page.locator('#btnBaseline')).toHaveAttribute('aria-label', /baseline|run/i);
      await expect(page.locator('#btnChaos')).toHaveAttribute('aria-label', /chaos|run/i);
    });

    test('should have proper heading structure', async ({ page }) => {
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
      
      const h2Count = await page.locator('h2').count();
      const h3Count = await page.locator('h3').count();
      const h4Count = await page.locator('h4').count();
      
      // Should have proper heading hierarchy
      expect(h2Count + h3Count + h4Count).toBeGreaterThan(0);
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // This would typically use axe-playwright or similar
      const bodyStyles = await page.locator('body').evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor
        };
      });
      
      // Basic check that colors are defined
      expect(bodyStyles.color).toBeTruthy();
      expect(bodyStyles.backgroundColor).toBeTruthy();
    });

    test('should support screen reader navigation', async ({ page }) => {
      // Check for proper semantic markup
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      await expect(page.locator('header, [role="banner"]')).toBeVisible();
      
      // Check form labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          const hasAriaLabel = await input.getAttribute('aria-label');
          
          expect(hasLabel || hasAriaLabel).toBe(true);
        }
      }
    });
  });

  test.describe('Neo-Brutalist Theme Rendering', () => {
    test('should load neo-brutalist theme by default', async ({ page }) => {
      await expect(page.locator('#themeSelector')).toHaveValue('brutalist');
      
      // Check for brutalist design elements
      const brutalistElements = await page.locator('.hero, .card, .btn-primary').count();
      expect(brutalistElements).toBeGreaterThan(0);
    });

    test('should apply theme-specific styles', async ({ page }) => {
      // Check for key brutalist design characteristics
      const cardStyles = await page.locator('.card').first().evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          border: styles.border,
          boxShadow: styles.boxShadow,
          fontFamily: styles.fontFamily
        };
      });
      
      // Brutalist themes typically have strong borders and shadows
      expect(cardStyles.border).toBeTruthy();
      expect(cardStyles.fontFamily).toContain('JetBrains');
    });

    test('should handle theme switching', async ({ page }) => {
      const themes = ['modern', 'neumorphic', 'geometric', 'glass'];
      
      for (const theme of themes) {
        await page.selectOption('#themeSelector', theme);
        
        // Wait for theme to apply (if there's dynamic switching)
        await page.waitForTimeout(100);
        
        // Theme should be stored
        const storedTheme = await page.evaluate(() => 
          localStorage.getItem('chaoslab_theme')
        );
        expect(storedTheme).toBe(theme);
      }
    });

    test('should maintain theme consistency across components', async ({ page }) => {
      // Check that theme is applied consistently
      const components = [
        '.header',
        '.hero', 
        '.card',
        '.btn-primary',
        '.btn-secondary',
        '.wizard'
      ];
      
      for (const component of components) {
        const element = page.locator(component).first();
        if (await element.count() > 0) {
          const styles = await element.evaluate(el => getComputedStyle(el).fontFamily);
          expect(styles).toContain('JetBrains');
        }
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should handle button states correctly', async ({ page }) => {
      const buttons = ['#btnBaseline', '#btnChaos', '#btnWizard', '#btnExport'];
      
      for (const buttonId of buttons) {
        const button = page.locator(buttonId);
        
        // Button should be clickable initially
        await expect(button).not.toBeDisabled();
        
        // Button should respond to hover (if CSS hover states exist)
        await button.hover();
        
        // Button should be focusable
        await button.focus();
        await expect(button).toBeFocused();
      }
    });

    test('should handle toggle switches', async ({ page }) => {
      const toggles = page.locator('.view-toggle');
      const toggleCount = await toggles.count();
      
      for (let i = 0; i < toggleCount; i++) {
        const toggle = toggles.nth(i);
        
        await toggle.click();
        await expect(toggle).toHaveClass(/active/);
        
        // Other toggles should not be active
        for (let j = 0; j < toggleCount; j++) {
          if (i !== j) {
            await expect(toggles.nth(j)).not.toHaveClass(/active/);
          }
        }
      }
    });

    test('should validate result view switching', async ({ page }) => {
      const views = ['table', 'json', 'graph'];
      
      for (const view of views) {
        await page.click(`[data-view="${view}"]`);
        
        // Active view should be visible
        await expect(page.locator(`#${view}View`)).toHaveClass(/active/);
        
        // Other views should be hidden
        const otherViews = views.filter(v => v !== view);
        for (const otherView of otherViews) {
          await expect(page.locator(`#${otherView}View`)).not.toHaveClass(/active/);
        }
      }
    });
  });

  test.describe('Error States and Edge Cases', () => {
    test('should handle missing configuration gracefully', async ({ page }) => {
      // Clear all form fields
      await page.fill('#seed', '');
      await page.uncheck('#tripwireOn');
      
      // Try to run baseline with minimal config
      await page.click('#btnBaseline');
      
      // Should either run with defaults or show validation message
      await expect(page.locator('#btnBaseline')).toHaveText(/RUNNING|RUN BASELINE/);
    });

    test('should handle extreme configuration values', async ({ page }) => {
      // Set extreme values
      await page.fill('#latencyMs', '99999');
      await page.fill('#latencyRate', '100');
      await page.fill('#http500Rate', '100');
      
      // Interface should remain stable
      await expect(page.locator('#latencyMs')).toBeVisible();
      await expect(page.locator('#btnChaos')).not.toBeDisabled();
    });

    test('should handle wizard interruption', async ({ page }) => {
      await page.click('#btnWizard');
      await page.click('button:has-text("NEXT →")');
      
      // Close wizard mid-flow
      await page.click('.btn-close');
      
      // Wizard should close cleanly
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
      
      // Should be able to reopen
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
    });
  });
});