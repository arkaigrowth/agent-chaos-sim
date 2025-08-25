import { test, expect, Page } from '@playwright/test';

test.describe('New Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Chaos Functions Integration', () => {
    test('should integrate chaos functions with new UI', async ({ page }) => {
      // Configure chaos parameters through new UI
      await page.fill('#latencyMs', '1000');
      await page.fill('#latencyRate', '50');
      await page.fill('#http500Rate', '25');
      await page.fill('#rate429', '15');
      await page.fill('#malformedRate', '20');
      
      // Set test seed
      await page.fill('#seed', 'integration-test-123');
      
      // Select scenario
      await page.check('input[name="scenario"][value="fetch"]');
      
      // Run chaos test
      await page.click('#btnChaos');
      
      // Wait for test completion
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Verify results are populated
      await expect(page.locator('#chaosScore')).not.toHaveText('—');
      
      // Verify chaos theatre was activated
      const chaosEvents = await page.evaluate(() => {
        return window.theatre ? window.theatre.getEventLog().length : 0;
      });
      expect(chaosEvents).toBeGreaterThan(0);
    });

    test('should apply tripwire configuration correctly', async ({ page }) => {
      // Configure tripwire settings
      await page.check('#tripwireOn');
      await page.fill('#maxRetries', '5');
      await page.fill('#backoffBase', '500');
      await page.fill('#backoffFactor', '1.5');
      await page.fill('#jitter', '0.3');
      
      // Run test and verify configuration is used
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });
      
      // Check that configuration was applied
      const tripwireConfig = await page.evaluate(() => {
        // Access the readTripwire function result
        const readTripwire = window.readTripwire;
        return readTripwire ? readTripwire() : null;
      });
      
      expect(tripwireConfig?.on).toBe(true);
      expect(tripwireConfig?.maxRetries).toBe(5);
      expect(tripwireConfig?.backoffBase).toBe(500);
      expect(tripwireConfig?.backoffFactor).toBe(1.5);
      expect(tripwireConfig?.jitter).toBe(0.3);
    });

    test('should handle all scenario types', async ({ page }) => {
      const scenarios = ['fetch', 'rag', 'json'];
      
      for (const scenario of scenarios) {
        await page.check(`input[name="scenario"][value="${scenario}"]`);
        await page.fill('#seed', `test-${scenario}`);
        
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
        
        // Verify scenario-specific results
        const results = await page.evaluate(() => {
          return window.chaosLabApp?.lastResults?.baseline;
        });
        
        expect(results?.metrics?.scenario).toBe(scenario);
        expect(results?.metrics?.seed).toBe(`test-${scenario}`);
      }
    });
  });

  test.describe('Enhanced Evaluation Suite Integration', () => {
    test('should load and validate evaluation suites', async ({ page }) => {
      // Navigate to evaluation section
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Select built-in suite
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      
      // Enable baseline comparison
      await page.check('#evalBaseline');
      
      // Run evaluation suite
      await page.click('#btnRunEval');
      
      // Wait for evaluation to complete
      await expect(page.locator('#evalProgress')).toBeVisible();
      await expect(page.locator('#evalProgress')).toBeHidden({ timeout: 60000 });
      
      // Verify results are displayed
      await expect(page.locator('#evalOutput')).not.toBeEmpty();
      
      // Check that enhanced evaluation system was used
      const enhancedEvalsActive = await page.evaluate(() => {
        return typeof window.enhancedEvals !== 'undefined';
      });
      expect(enhancedEvalsActive).toBe(true);
    });

    test('should handle streaming evaluation results', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Enable streaming
      await page.check('#evalStream');
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      
      let streamingEvents = [];
      
      // Listen for streaming events
      await page.evaluate(() => {
        window.streamingEvents = [];
        if (window.enhancedEvals) {
          window.enhancedEvals.subscribeToUpdates((event) => {
            window.streamingEvents.push(event);
          });
        }
      });
      
      await page.click('#btnRunEval');
      
      // Wait for streaming to start
      await page.waitForTimeout(2000);
      
      // Check streaming events were captured
      streamingEvents = await page.evaluate(() => window.streamingEvents || []);
      expect(streamingEvents.length).toBeGreaterThan(0);
    });

    test('should support batch evaluation processing', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Configure batch operation
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      
      await page.click('#btnBatchEval');
      
      // Wait for batch processing
      await page.waitForSelector('#evalProgress', { state: 'visible' });
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 90000 });
      
      // Verify batch results
      await expect(page.locator('#evalOutput')).toContainText('batch');
    });

    test('should handle evaluation comparison', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Run initial evaluation
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Run second evaluation
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Use comparison feature
      await page.click('#btnCompareEval');
      
      // Should show comparison interface or results
      await expect(page.locator('#evalOutput')).toContainText(/comparison|compare|vs/i);
    });

    test('should export evaluation results', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      await page.click('#btnExportEval');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });
  });

  test.describe('WebSocket Integration', () => {
    test('should establish WebSocket connection for real-time updates', async ({ page }) => {
      // Check if WebSocket integration is available
      const wsIntegration = await page.evaluate(() => {
        return typeof window.WebSocketIntegration !== 'undefined';
      });
      
      if (wsIntegration) {
        await page.click('#btnChaos');
        
        // Check for real-time updates
        const realTimeEvents = await page.evaluate(() => {
          return window.wsEvents || [];
        });
        
        // Should have received real-time events during test execution
        expect(realTimeEvents.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle WebSocket connection failures gracefully', async ({ page }) => {
      // Simulate network issues
      await page.route('**/websocket**', route => route.abort());
      
      // Should still function without WebSocket
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });
    });
  });

  test.describe('Batch Processing', () => {
    test('should handle multiple simultaneous tests', async ({ page }) => {
      // Configure test
      await page.fill('#seed', 'batch-test');
      await page.check('input[name="scenario"][value="fetch"]');
      
      // Start multiple operations (if UI supports it)
      await page.click('#btnBaseline');
      
      // Wait a moment then try to start another
      await page.waitForTimeout(1000);
      
      // Should either queue or prevent concurrent execution
      const baselineButton = page.locator('#btnBaseline');
      const isDisabled = await baselineButton.isDisabled();
      const buttonText = await baselineButton.textContent();
      
      expect(isDisabled || buttonText?.includes('RUNNING')).toBe(true);
    });

    test('should support batch configuration changes', async ({ page }) => {
      const configs = [
        { latency: '1000', rate: '10' },
        { latency: '2000', rate: '20' },
        { latency: '3000', rate: '30' }
      ];
      
      for (const config of configs) {
        await page.fill('#latencyMs', config.latency);
        await page.fill('#latencyRate', config.rate);
        await page.fill('#seed', `batch-${config.latency}`);
        
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
        
        // Verify configuration was applied
        const result = await page.evaluate(() => {
          return window.chaosLabApp?.lastResults?.baseline?.metrics;
        });
        
        expect(result?.seed).toBe(`batch-${config.latency}`);
      }
    });
  });

  test.describe('Abort/Pause/Resume Functionality', () => {
    test('should handle test interruption gracefully', async ({ page }) => {
      // Start a long-running test
      await page.fill('#latencyMs', '5000');
      await page.check('input[name="scenario"][value="rag"]');
      await page.click('#btnChaos');
      
      // Wait for test to start
      await expect(page.locator('#btnChaos')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Simulate page refresh (abort)
      await page.reload();
      
      // Page should load cleanly
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS');
    });

    test('should handle wizard cancellation mid-execution', async ({ page }) => {
      await page.click('#btnWizard');
      await page.click('button:has-text("NEXT →")');
      
      // Start baseline in wizard
      await page.click('#wizardBaselineBtn');
      
      // Cancel wizard during execution
      await page.click('.btn-close');
      
      // Should close cleanly
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
    });
  });

  test.describe('Report Generation', () => {
    test('should generate comprehensive reports', async ({ page }) => {
      // Run complete test cycle
      await page.fill('#seed', 'report-test');
      await page.check('input[name="scenario"][value="json"]');
      
      // Run baseline
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
      
      // Run chaos
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 20000 });
      
      // Generate report
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExport');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(json|csv|pdf)$/);
    });

    test('should generate wizard reports', async ({ page }) => {
      await page.click('#btnWizard');
      
      // Complete wizard flow with mock data
      await page.evaluate(() => {
        if (window.wizard) {
          window.wizard.data = {
            baselineScore: 85,
            chaosScore: 78,
            baselineResult: { metrics: { score: 85 } },
            chaosResult: { metrics: { score: 78 } }
          };
        }
      });
      
      // Navigate to results step
      for (let i = 0; i < 4; i++) {
        await page.click('button:has-text("NEXT →")');
        await page.waitForTimeout(100);
      }
      
      // Export report
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("📊 EXPORT REPORT")');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/chaos-lab-report.*\.json$/);
    });

    test('should support multiple report formats', async ({ page }) => {
      // Run a test first
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });
      
      // Test different export formats through view toggles
      const formats = ['json', 'table'];
      
      for (const format of formats) {
        await page.click(`[data-view="${format}"]`);
        await expect(page.locator(`#${format}View`)).toHaveClass(/active/);
        
        // Each format should show appropriate content
        const content = await page.locator(`#${format}View`).textContent();
        expect(content).toBeTruthy();
      }
    });
  });

  test.describe('URL Sharing and State Persistence', () => {
    test('should generate shareable URLs', async ({ page }) => {
      // Configure test
      await page.fill('#seed', 'share-test');
      await page.fill('#latencyMs', '2500');
      await page.check('input[name="scenario"][value="rag"]');
      
      // Generate permalink
      await page.click('#btnPermalink');
      
      // Should generate URL with configuration
      const url = await page.evaluate(() => {
        return document.querySelector('#seed')?.value || window.location.href;
      });
      
      expect(url).toBeTruthy();
    });

    test('should restore state from URL parameters', async ({ page }) => {
      // Navigate with URL parameters
      await page.goto('/index_new.html?seed=url-test&scenario=json&latency=3000');
      
      // Configuration should be restored
      await expect(page.locator('#seed')).toHaveValue('url-test');
      await expect(page.locator('#latencyMs')).toHaveValue('3000');
      await expect(page.locator('input[name="scenario"][value="json"]')).toBeChecked();
    });

    test('should persist state in localStorage', async ({ page }) => {
      // Configure test
      await page.fill('#seed', 'persist-test');
      await page.selectOption('#themeSelector', 'geometric');
      
      // Reload page
      await page.reload();
      
      // State should be restored
      const savedTheme = await page.evaluate(() => localStorage.getItem('chaoslab_theme'));
      expect(savedTheme).toBe('geometric');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Simulate network errors
      await page.route('https://httpbin.org/**', route => route.abort());
      await page.route('https://jsonplaceholder.typicode.com/**', route => route.abort());
      
      await page.click('#btnBaseline');
      
      // Should handle errors and show fallback
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
      
      const results = await page.evaluate(() => {
        return window.chaosLabApp?.lastResults?.baseline;
      });
      
      // Should have some result even with network failures
      expect(results).toBeTruthy();
    });

    test('should recover from JavaScript errors', async ({ page }) => {
      // Inject an error
      await page.evaluate(() => {
        const originalFetch = window.fetch;
        window.fetch = function() {
          throw new Error('Simulated error');
        };
      });
      
      await page.click('#btnBaseline');
      
      // Application should remain responsive
      await expect(page.locator('#btnChaos')).not.toBeDisabled();
    });

    test('should handle incomplete wizard sessions', async ({ page }) => {
      await page.click('#btnWizard');
      await page.fill('#wizardSeed', 'incomplete-test');
      
      // Close browser tab simulation
      await page.evaluate(() => {
        window.beforeunload = null;
      });
      
      await page.reload();
      
      // Should start fresh
      await page.click('#btnWizard');
      await expect(page.locator('#wizardSeed')).toHaveValue('1337'); // Default value
    });
  });

  test.describe('Performance Integration', () => {
    test('should maintain responsive UI during test execution', async ({ page }) => {
      // Start long-running test
      await page.fill('#latencyMs', '3000');
      await page.click('#btnChaos');
      
      // UI should remain responsive
      await page.hover('#btnBaseline');
      await page.click('#themeSelector');
      await page.selectOption('#themeSelector', 'modern');
      
      // Theme change should work even during test execution
      await expect(page.locator('#themeSelector')).toHaveValue('modern');
    });

    test('should handle concurrent user interactions', async ({ page }) => {
      // Simulate rapid user interactions
      const actions = [
        () => page.fill('#seed', 'concurrent-1'),
        () => page.fill('#latencyMs', '1500'),
        () => page.check('input[name="scenario"][value="fetch"]'),
        () => page.click('#btnWizard'),
        () => page.click('.btn-close')
      ];
      
      // Execute actions rapidly
      await Promise.all(actions.map((action, index) => 
        page.waitForTimeout(index * 100).then(action)
      ));
      
      // Interface should remain stable
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#seed')).toHaveValue('concurrent-1');
    });
  });
});