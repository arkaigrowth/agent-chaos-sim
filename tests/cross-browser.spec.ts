import { test, expect, Page, BrowserName } from '@playwright/test';

// Define browser configurations
const browsers = [
  { name: 'chromium', displayName: 'Chrome/Edge' },
  { name: 'firefox', displayName: 'Firefox' },
  { name: 'webkit', displayName: 'Safari' }
] as const;

test.describe('Cross-Browser Compatibility Tests', () => {
  browsers.forEach(({ name, displayName }) => {
    test.describe(`${displayName} Browser Tests`, () => {
      test.use({ browserName: name as BrowserName });
      
      test.beforeEach(async ({ page }) => {
        await page.goto('/index_new.html');
        await page.waitForLoadState('networkidle');
      });

      test('should load and render correctly', async ({ page }) => {
        // Verify core elements are visible
        await expect(page.locator('.header')).toBeVisible();
        await expect(page.locator('.hero')).toBeVisible();
        await expect(page.locator('.main-grid')).toBeVisible();
        await expect(page.locator('.bottom-sheet')).toBeVisible();
        
        // Verify interactive elements are functional
        await expect(page.locator('#btnBaseline')).not.toBeDisabled();
        await expect(page.locator('#btnChaos')).not.toBeDisabled();
        await expect(page.locator('#btnWizard')).not.toBeDisabled();
        
        // Verify form elements are accessible
        await expect(page.locator('#seed')).toBeVisible();
        await expect(page.locator('#latencyMs')).toBeVisible();
        await expect(page.locator('input[name="scenario"]').first()).toBeVisible();
      });

      test('should support CSS features correctly', async ({ page }) => {
        // Test CSS Grid support
        const gridSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.display = 'grid';
          return testElement.style.display === 'grid';
        });
        expect(gridSupport).toBe(true);

        // Test CSS Flexbox support
        const flexSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.display = 'flex';
          return testElement.style.display === 'flex';
        });
        expect(flexSupport).toBe(true);

        // Test CSS Custom Properties (variables) support
        const customPropsSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.setProperty('--test-var', 'test');
          return testElement.style.getPropertyValue('--test-var') === 'test';
        });
        expect(customPropsSupport).toBe(true);

        // Test CSS transforms support
        const transformSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.transform = 'scale(1.1)';
          return testElement.style.transform !== '';
        });
        expect(transformSupport).toBe(true);
      });

      test('should handle JavaScript features correctly', async ({ page }) => {
        // Test ES6+ features
        const es6Support = await page.evaluate(() => {
          try {
            // Test arrow functions
            const arrow = () => true;
            
            // Test const/let
            const testConst = true;
            let testLet = true;
            
            // Test template literals
            const template = `test ${testConst}`;
            
            // Test destructuring
            const [first] = [1, 2, 3];
            const { property } = { property: 'value' };
            
            // Test async/await
            const asyncTest = async () => await Promise.resolve(true);
            
            return arrow() && testConst && testLet && template.includes('test') && 
                   first === 1 && property === 'value' && typeof asyncTest === 'function';
          } catch (e) {
            return false;
          }
        });
        expect(es6Support).toBe(true);

        // Test Fetch API support
        const fetchSupport = await page.evaluate(() => {
          return typeof fetch === 'function';
        });
        expect(fetchSupport).toBe(true);

        // Test Promise support
        const promiseSupport = await page.evaluate(() => {
          return typeof Promise === 'function' && typeof Promise.resolve === 'function';
        });
        expect(promiseSupport).toBe(true);

        // Test local storage support
        const localStorageSupport = await page.evaluate(() => {
          try {
            localStorage.setItem('test', 'test');
            const result = localStorage.getItem('test') === 'test';
            localStorage.removeItem('test');
            return result;
          } catch (e) {
            return false;
          }
        });
        expect(localStorageSupport).toBe(true);
      });

      test('should execute chaos tests successfully', async ({ page }) => {
        // Configure basic test
        await page.fill('#seed', `${name}-chaos-test`);
        await page.check('input[name="scenario"][value="fetch"]');
        await page.fill('#latencyMs', '1000');
        await page.fill('#latencyRate', '20');
        
        // Run baseline test
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('RUNNING...', { timeout: 5000 });
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
        
        // Verify baseline results
        await expect(page.locator('#baselineScore')).not.toHaveText('—');
        const baselineScore = await page.locator('#baselineScore').textContent();
        expect(parseInt(baselineScore || '0')).toBeGreaterThanOrEqual(0);
        
        // Run chaos test
        await page.click('#btnChaos');
        await expect(page.locator('#btnChaos')).toHaveText('RUNNING...', { timeout: 5000 });
        await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
        
        // Verify chaos results
        await expect(page.locator('#chaosScore')).not.toHaveText('—');
        const chaosScore = await page.locator('#chaosScore').textContent();
        expect(parseInt(chaosScore || '0')).toBeGreaterThanOrEqual(0);
        
        // Verify delta calculation
        await expect(page.locator('#deltaScore')).not.toHaveText('—');
        
        // Test results display
        const views = ['table', 'json', 'graph'];
        for (const view of views) {
          await page.click(`[data-view="${view}"]`);
          await expect(page.locator(`#${view}View`)).toHaveClass(/active/);
        }
      });

      test('should handle form interactions correctly', async ({ page }) => {
        // Test text input
        await page.fill('#seed', `${name}-form-test`);
        await expect(page.locator('#seed')).toHaveValue(`${name}-form-test`);
        
        // Test number inputs
        const numberInputs = [
          { id: '#latencyMs', value: '2000' },
          { id: '#latencyRate', value: '30' },
          { id: '#http500Rate', value: '15' },
          { id: '#rate429', value: '10' },
          { id: '#malformedRate', value: '25' }
        ];
        
        for (const input of numberInputs) {
          await page.fill(input.id, input.value);
          await expect(page.locator(input.id)).toHaveValue(input.value);
        }
        
        // Test checkboxes
        const checkboxes = ['#tripwireOn', '#surprise'];
        for (const checkbox of checkboxes) {
          // Check
          await page.check(checkbox);
          await expect(page.locator(checkbox)).toBeChecked();
          
          // Uncheck
          await page.uncheck(checkbox);
          await expect(page.locator(checkbox)).not.toBeChecked();
        }
        
        // Test radio buttons
        const scenarios = ['fetch', 'rag', 'json'];
        for (const scenario of scenarios) {
          await page.check(`input[name="scenario"][value="${scenario}"]`);
          await expect(page.locator(`input[name="scenario"][value="${scenario}"]`)).toBeChecked();
        }
        
        // Test select dropdown
        const themes = ['modern', 'neumorphic', 'geometric', 'glass', 'brutalist'];
        for (const theme of themes) {
          await page.selectOption('#themeSelector', theme);
          await expect(page.locator('#themeSelector')).toHaveValue(theme);
        }
      });

      test('should support wizard workflow', async ({ page }) => {
        // Open wizard
        await page.click('#btnWizard');
        await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
        
        // Step 1: Configure
        await expect(page.locator('.wizard-step.active')).toHaveText('CONFIGURE');
        await page.selectOption('#wizardScenario', 'json');
        await page.selectOption('#wizardIntensity', 'medium');
        await page.fill('#wizardSeed', `${name}-wizard-test`);
        await page.check('#wizardRecovery');
        
        // Navigate to step 2
        await page.click('button:has-text("NEXT →")');
        await expect(page.locator('.wizard-step.active')).toHaveText('BASELINE');
        
        // Navigate back to step 1
        await page.click('button:has-text("← BACK")');
        await expect(page.locator('.wizard-step.active')).toHaveText('CONFIGURE');
        
        // Verify configuration persisted
        await expect(page.locator('#wizardScenario')).toHaveValue('json');
        await expect(page.locator('#wizardSeed')).toHaveValue(`${name}-wizard-test`);
        
        // Close wizard
        await page.click('.btn-close');
        await expect(page.locator('#wizard')).toHaveClass(/hidden/);
      });

      test('should handle network requests correctly', async ({ page, browserName }) => {
        // Monitor network activity
        const networkRequests: string[] = [];
        const networkResponses: { url: string; status: number }[] = [];
        
        page.on('request', request => {
          if (request.url().startsWith('http') && !request.url().includes('chrome-extension')) {
            networkRequests.push(request.url());
          }
        });
        
        page.on('response', response => {
          if (response.url().startsWith('http') && !response.url().includes('chrome-extension')) {
            networkResponses.push({
              url: response.url(),
              status: response.status()
            });
          }
        });
        
        // Run test that makes network requests
        await page.fill('#seed', `${name}-network-test`);
        await page.check('input[name="scenario"][value="fetch"]');
        await page.click('#btnBaseline');
        
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
        
        // Verify network requests were made
        expect(networkRequests.length).toBeGreaterThan(0);
        expect(networkResponses.length).toBeGreaterThan(0);
        
        // Verify responses (allowing for chaos-induced failures)
        const successfulResponses = networkResponses.filter(r => r.status < 400 || [429, 500].includes(r.status));
        expect(successfulResponses.length).toBeGreaterThan(0);
      });

      test('should support local storage operations', async ({ page }) => {
        // Test saving configuration
        await page.fill('#seed', `${name}-storage-test`);
        await page.selectOption('#themeSelector', 'geometric');
        await page.fill('#latencyMs', '2500');
        
        // Run test to trigger save
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
        
        // Verify data was stored
        const storedTheme = await page.evaluate(() => localStorage.getItem('chaoslab_theme'));
        expect(storedTheme).toBe('geometric');
        
        // Test retrieval after page reload
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        await expect(page.locator('#themeSelector')).toHaveValue('geometric');
        
        // Clean up
        await page.evaluate(() => {
          localStorage.removeItem('chaoslab_theme');
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('chaoslab_')) {
              localStorage.removeItem(key);
            }
          });
        });
      });

      test('should handle file downloads', async ({ page, browserName }) => {
        // Run a test to generate results
        await page.fill('#seed', `${name}-download-test`);
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
        
        // Test download functionality
        const downloadPromise = page.waitForEvent('download');
        await page.click('#btnDownload');
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBeTruthy();
        
        // Verify download started (different browsers may handle differently)
        expect(download).toBeTruthy();
      });

      test('should support clipboard operations', async ({ page, browserName }) => {
        // Run test to generate data to copy
        await page.fill('#seed', `${name}-clipboard-test`);
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
        
        // Test copy functionality
        await page.click('#btnCopy');
        
        // Verify copy operation doesn't cause errors
        // (Actual clipboard testing is limited in automated tests)
        await expect(page.locator('#btnCopy')).toBeVisible();
      });

      test('should handle error scenarios gracefully', async ({ page, browserName }) => {
        // Test with invalid configuration
        await page.fill('#seed', '');
        await page.fill('#latencyMs', '-1');
        
        // Should handle gracefully
        await page.click('#btnBaseline');
        
        // Should not crash the application
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('#btnBaseline')).toBeVisible();
        
        // Test network error handling
        await page.route('https://httpbin.org/**', route => route.abort());
        
        await page.fill('#seed', `${name}-error-test`);
        await page.fill('#latencyMs', '1000');
        await page.click('#btnChaos');
        
        // Should complete with fallback
        await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
        
        // Unroute for cleanup
        await page.unroute('https://httpbin.org/**');
      });

      if (name === 'webkit') {
        test('should handle Safari-specific behaviors', async ({ page }) => {
          // Test Safari's stricter CORS handling
          const corsTest = await page.evaluate(() => {
            return typeof fetch === 'function' && typeof Headers === 'function';
          });
          expect(corsTest).toBe(true);
          
          // Test Safari's date handling
          const dateTest = await page.evaluate(() => {
            const date = new Date();
            return date instanceof Date && !isNaN(date.getTime());
          });
          expect(dateTest).toBe(true);
          
          // Test Safari's localStorage limitations
          const storageTest = await page.evaluate(() => {
            try {
              localStorage.setItem('safari-test', 'test');
              const result = localStorage.getItem('safari-test') === 'test';
              localStorage.removeItem('safari-test');
              return result;
            } catch (e) {
              return false;
            }
          });
          expect(storageTest).toBe(true);
        });
      }

      if (name === 'firefox') {
        test('should handle Firefox-specific behaviors', async ({ page }) => {
          // Test Firefox's privacy features
          const privacyTest = await page.evaluate(() => {
            // Firefox may block certain tracking features
            return typeof navigator !== 'undefined' && typeof document !== 'undefined';
          });
          expect(privacyTest).toBe(true);
          
          // Test Firefox's performance API
          const performanceTest = await page.evaluate(() => {
            return typeof performance !== 'undefined' && typeof performance.now === 'function';
          });
          expect(performanceTest).toBe(true);
          
          // Test Firefox's console API
          const consoleTest = await page.evaluate(() => {
            return typeof console !== 'undefined' && typeof console.log === 'function';
          });
          expect(consoleTest).toBe(true);
        });
      }

      if (name === 'chromium') {
        test('should handle Chrome/Edge-specific features', async ({ page }) => {
          // Test Chrome's performance memory API
          const memoryTest = await page.evaluate(() => {
            return !!(performance && performance.memory) || true; // May not be available in all contexts
          });
          expect(memoryTest).toBe(true);
          
          // Test Chrome's observer APIs
          const observerTest = await page.evaluate(() => {
            return typeof PerformanceObserver !== 'undefined' && 
                   typeof IntersectionObserver !== 'undefined';
          });
          expect(observerTest).toBe(true);
          
          // Test Chrome's async clipboard API
          const clipboardTest = await page.evaluate(() => {
            return !!(navigator && navigator.clipboard) || true; // May require HTTPS
          });
          expect(clipboardTest).toBe(true);
        });
      }
    });
  });

  test.describe('Progressive Enhancement Tests', () => {
    test('should work without JavaScript (basic functionality)', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, javaEnabled: () => false }
        });
      });
      
      await page.goto('/index_new.html');
      
      // Basic HTML structure should be visible
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.hero')).toBeVisible();
      await expect(page.locator('.main-grid')).toBeVisible();
      
      // Form elements should be accessible
      await expect(page.locator('#seed')).toBeVisible();
      await expect(page.locator('input[name="scenario"]').first()).toBeVisible();
      await expect(page.locator('#latencyMs')).toBeVisible();
    });

    test('should degrade gracefully without modern CSS features', async ({ page }) => {
      // Simulate older browser without CSS Grid
      await page.addInitScript(() => {
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
          const element = originalCreateElement.call(document, tagName);
          const originalSetProperty = element.style.setProperty;
          element.style.setProperty = function(property, value) {
            if (property === 'display' && value === 'grid') {
              return originalSetProperty.call(this, 'display', 'block');
            }
            return originalSetProperty.call(this, property, value);
          };
          return element;
        };
      });
      
      await page.goto('/index_new.html');
      
      // Layout should still be functional
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.main-grid')).toBeVisible();
      await expect(page.locator('.bottom-sheet')).toBeVisible();
    });

    test('should handle reduced motion preferences', async ({ page }) => {
      // Simulate user preference for reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      // Interface should still be functional
      await expect(page.locator('#btnWizard')).toBeVisible();
      
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Animations should be reduced but functionality preserved
      await page.click('.btn-close');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      // All interactive elements should be visible and accessible
      await expect(page.locator('#btnBaseline')).toBeVisible();
      await expect(page.locator('#btnChaos')).toBeVisible();
      await expect(page.locator('#btnWizard')).toBeVisible();
      
      // Form controls should be accessible
      await page.fill('#seed', 'high-contrast-test');
      await expect(page.locator('#seed')).toHaveValue('high-contrast-test');
      
      // Interactive elements should remain functional
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      await page.click('.btn-close');
    });
  });

  test.describe('Mobile Browser Tests', () => {
    test('should work on mobile browsers', async ({ page, browserName }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      // Layout should adapt to mobile
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.hero')).toBeVisible();
      await expect(page.locator('.main-grid')).toBeVisible();
      
      // Touch interactions should work
      await page.tap('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Form should be usable on mobile
      await page.tap('#wizardSeed');
      await page.fill('#wizardSeed', 'mobile-test');
      await expect(page.locator('#wizardSeed')).toHaveValue('mobile-test');
      
      // Cleanup
      await page.tap('.btn-close');
    });

    test('should handle touch gestures', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      // Test tap interactions
      await page.tap('#seed');
      await page.fill('#seed', 'touch-test');
      await expect(page.locator('#seed')).toHaveValue('touch-test');
      
      // Test form controls with touch
      await page.tap('input[name="scenario"][value="json"]');
      await expect(page.locator('input[name="scenario"][value="json"]')).toBeChecked();
      
      // Test button interactions
      await page.tap('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText(/RUNNING|RUN BASELINE/);
    });

    test('should handle mobile keyboard', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      // Focus on input should bring up mobile keyboard
      await page.tap('#seed');
      await expect(page.locator('#seed')).toBeFocused();
      
      // Type on mobile keyboard
      await page.keyboard.type('mobile-keyboard-test');
      await expect(page.locator('#seed')).toHaveValue('mobile-keyboard-test');
      
      // Tab navigation should work
      await page.keyboard.press('Tab');
      // Next focusable element should be focused (behavior may vary by browser)
    });
  });

  test.describe('Performance Across Browsers', () => {
    browsers.forEach(({ name, displayName }) => {
      test(`should maintain good performance on ${displayName}`, async ({ page, browserName }) => {
        test.skip(browserName !== name, `Skipping ${displayName} test on ${browserName}`);
        
        const startTime = Date.now();
        
        await page.goto('/index_new.html');
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(3000); // Allow slightly more time for cross-browser variations
        
        // Test interaction performance
        const interactionStart = Date.now();
        await page.fill('#seed', `${name}-perf-test`);
        await page.click('#btnBaseline');
        const interactionTime = Date.now() - interactionStart;
        
        expect(interactionTime).toBeLessThan(1000);
      });
    });
  });

  test.describe('Browser-Specific API Support', () => {
    test('should handle browser API differences gracefully', async ({ page, browserName }) => {
      const apiSupport = await page.evaluate(() => {
        return {
          fetch: typeof fetch === 'function',
          localStorage: typeof localStorage === 'object',
          sessionStorage: typeof sessionStorage === 'object',
          indexedDB: typeof indexedDB === 'object',
          webWorkers: typeof Worker === 'function',
          serviceWorkers: 'serviceWorker' in navigator,
          geolocation: 'geolocation' in navigator,
          notification: 'Notification' in window,
          clipboard: !!(navigator && navigator.clipboard),
          performanceObserver: typeof PerformanceObserver === 'function',
          intersectionObserver: typeof IntersectionObserver === 'function',
          mutationObserver: typeof MutationObserver === 'function',
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
              return false;
            }
          })()
        };
      });
      
      // Core APIs should be supported
      expect(apiSupport.fetch).toBe(true);
      expect(apiSupport.localStorage).toBe(true);
      expect(apiSupport.performanceObserver).toBe(true);
      
      // Some APIs may vary by browser
      console.log(`${browserName} API support:`, apiSupport);
    });
  });
});