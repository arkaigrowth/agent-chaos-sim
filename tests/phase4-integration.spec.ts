import { test, expect, Page } from '@playwright/test';

test.describe('Phase 4 Complete Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for enhanced components to initialize
    await page.waitForFunction(() => {
      return window.dataCollector && 
             window.evaluationRunner && 
             window.resultsDashboard &&
             window.chaosLabApp;
    }, { timeout: 10000 });
  });

  test.describe('Data Collection Pipeline Integration', () => {
    test('should create data collection sessions automatically', async ({ page }) => {
      // Run a baseline test to trigger session creation
      await page.fill('#seed', 'integration-session-test');
      await page.check('input[name="scenario"][value="fetch"]');
      await page.click('#btnBaseline');

      // Wait for completion
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });

      // Verify session was created
      const sessionCreated = await page.evaluate(() => {
        const currentSession = window.dataCollector?.getCurrentSession();
        return currentSession !== null;
      });
      
      expect(sessionCreated).toBe(true);

      // Check session has trace data
      const traceCount = await page.evaluate(() => {
        const session = window.dataCollector?.getCurrentSession();
        return session?.traces?.length || 0;
      });
      
      expect(traceCount).toBeGreaterThan(0);
    });

    test('should calculate real-time resilience scores', async ({ page }) => {
      // Configure chaos parameters
      await page.fill('#latencyMs', '1000');
      await page.fill('#latencyRate', '30');
      await page.fill('#http500Rate', '20');
      await page.fill('#seed', 'resilience-test');

      // Run chaos test
      await page.check('input[name="scenario"][value="json"]');
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 25000 });

      // Check resilience score calculation
      const resilienceScore = await page.evaluate(() => {
        return window.dataCollector?.calculateResilienceScore();
      });

      expect(resilienceScore).toBeTruthy();
      expect(resilienceScore.score).toBeGreaterThanOrEqual(0);
      expect(resilienceScore.score).toBeLessThanOrEqual(100);
      expect(resilienceScore.assessment).toBeTruthy();
      expect(resilienceScore.components).toBeTruthy();
    });

    test('should export data in multiple formats', async ({ page }) => {
      // Run a test to generate data
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });

      // Test different export formats
      const formats = ['json', 'csv', 'yaml', 'markdown'];
      
      for (const format of formats) {
        const exportData = await page.evaluate((fmt) => {
          const session = window.dataCollector?.getCurrentSession();
          if (!session) return null;
          
          return window.dataCollector?.exportSession(session.id, fmt, {
            includeTraces: true,
            includeAnalytics: true,
            includeInsights: true
          });
        }, format);

        expect(exportData).toBeTruthy();
        expect(typeof exportData).toBe('string');
        expect(exportData.length).toBeGreaterThan(50);
      }
    });

    test('should handle real-time event subscriptions', async ({ page }) => {
      let eventsReceived = [];

      // Subscribe to real-time events
      await page.evaluate(() => {
        window.testEvents = [];
        if (window.dataCollector) {
          window.testUnsubscribe = window.dataCollector.subscribe((event) => {
            window.testEvents.push(event);
          });
        }
      });

      // Run a test to generate events
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });

      // Check events were received
      eventsReceived = await page.evaluate(() => window.testEvents || []);
      
      expect(eventsReceived.length).toBeGreaterThan(0);
      
      // Verify event structure
      const firstEvent = eventsReceived[0];
      expect(firstEvent).toHaveProperty('type');
      expect(firstEvent).toHaveProperty('timestamp');
      expect(firstEvent).toHaveProperty('data');

      // Cleanup
      await page.evaluate(() => {
        if (window.testUnsubscribe) {
          window.testUnsubscribe();
        }
      });
    });
  });

  test.describe('Enhanced Evaluation Suite Integration', () => {
    test('should run evaluation suites with data collection integration', async ({ page }) => {
      // Navigate to evaluation section
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Enable streaming for real-time updates
      await page.check('#evalStream');
      
      // Select and run evaluation suite
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');

      // Wait for progress to appear
      await expect(page.locator('#evalProgress')).toBeVisible();
      
      // Check if real-time ASCII visualization appears
      const realtimeDiv = await page.locator('#evalRealtimeASCII').isVisible();
      if (realtimeDiv) {
        // Verify ASCII content updates
        const asciiContent = await page.locator('#evalRealtimeASCII').textContent();
        expect(asciiContent).toContain('EVALUATION SESSION');
        expect(asciiContent).toContain('PROGRESS:');
      }

      // Wait for completion
      await expect(page.locator('#evalProgress')).toBeHidden({ timeout: 90000 });

      // Verify comprehensive results
      const evalOutput = await page.locator('#evalOutput').textContent();
      expect(evalOutput).toContain('SUITE SUMMARY');
      expect(evalOutput).toContain('Session ID:');
      expect(evalOutput).toContain('INSIGHTS:');
    });

    test('should handle batch evaluation processing', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Start batch evaluation
      await page.click('#btnBatchEval');
      
      // Wait for batch processing to start
      await page.waitForSelector('#evalProgress', { state: 'visible' });
      
      // Batch should process multiple suites
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 180000 });
      
      // Verify batch results
      const evalOutput = await page.locator('#evalOutput').textContent();
      expect(evalOutput).toContain('BATCH EVALUATION');
      expect(evalOutput).toContain('Total Suites:');
      expect(evalOutput).toContain('Overall Pass Rate:');
      expect(evalOutput).toContain('Average Resilience Score:');
    });

    test('should export enhanced evaluation results', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Run a quick evaluation
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Test enhanced export
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExportEval');
      
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      
      // Should be enhanced export with timestamp
      expect(filename).toMatch(/chaos-eval-enhanced-.*\.(json|csv|yaml|markdown|xml)$/);
      
      // Verify file size indicates comprehensive data
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(1000); // Should contain substantial data
      }
    });

    test('should compare evaluation results', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Run first evaluation
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Run second evaluation with different settings
      await page.fill('#latencyMs', '3000');
      await page.fill('#http500Rate', '25');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });
      
      // Use comparison feature
      await page.click('#btnCompareEval');
      
      // Verify comparison output
      const evalOutput = await page.locator('#evalOutput').textContent();
      expect(evalOutput).toContain('EVALUATION COMPARISON');
      expect(evalOutput).toContain('PREVIOUS:');
      expect(evalOutput).toContain('CURRENT:');
      expect(evalOutput).toContain('PASS RATE:');
      expect(evalOutput).toContain('TREND:');
    });
  });

  test.describe('Real-Time ASCII Analytics', () => {
    test('should display real-time ASCII graphs during test execution', async ({ page }) => {
      // Enable chaos theatre for visual feedback
      await page.fill('#latencyMs', '2000');
      await page.fill('#http500Rate', '15');
      await page.fill('#seed', 'ascii-test');
      
      // Start chaos test
      await page.check('input[name="scenario"][value="fetch"]');
      await page.click('#btnChaos');
      
      // Check if chaos theatre appears
      await page.waitForSelector('#chaosTheatre', { state: 'visible', timeout: 5000 });
      
      // Verify ASCII content in theatre
      const theatreContent = await page.locator('#stage').textContent();
      expect(theatreContent).toContain('CHAOS INITIATED');
      
      // Wait for test completion
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 25000 });
      
      // Verify final ASCII visualization
      await page.click('[data-view="graph"]');
      await expect(page.locator('#graphView')).toHaveClass(/active/);
      
      const asciiGraph = await page.locator('#asciiGraph').textContent();
      expect(asciiGraph).toContain('RESILIENCE SCORE COMPARISON');
      expect(asciiGraph).toContain('BASELINE');
      expect(asciiGraph).toContain('CHAOS');
      expect(asciiGraph).toContain('DELTA');
    });

    test('should update ASCII graphs in real-time during evaluations', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Enable streaming
      await page.check('#evalStream');
      
      // Start evaluation
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      
      // Wait for real-time ASCII to appear
      await page.waitForSelector('#evalRealtimeASCII', { state: 'visible', timeout: 10000 });
      
      // Capture initial ASCII content
      let initialContent = await page.locator('#evalRealtimeASCII').textContent();
      expect(initialContent).toContain('EVALUATION SESSION');
      
      // Wait a bit and check for updates
      await page.waitForTimeout(5000);
      let updatedContent = await page.locator('#evalRealtimeASCII').textContent();
      
      // Content should have been updated (different timestamps or progress)
      expect(updatedContent).not.toBe(initialContent);
      expect(updatedContent).toContain('PROGRESS:');
      expect(updatedContent).toMatch(/\d+\.\d+%/); // Should contain percentage
      
      // Wait for completion
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 90000 });
    });
  });

  test.describe('End-to-End System Validation', () => {
    test('should execute complete chaos engineering workflow', async ({ page }) => {
      // Step 1: Configure chaos parameters
      await page.fill('#seed', 'e2e-workflow-test');
      await page.fill('#latencyMs', '1500');
      await page.fill('#latencyRate', '25');
      await page.fill('#http500Rate', '15');
      await page.fill('#malformedRate', '10');
      await page.check('#tripwireOn');
      await page.fill('#maxRetries', '4');

      // Step 2: Select scenario
      await page.check('input[name="scenario"][value="json"]');

      // Step 3: Run baseline
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });

      // Step 4: Run chaos test
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 25000 });

      // Step 5: Verify results are populated
      await expect(page.locator('#baselineScore')).not.toHaveText('—');
      await expect(page.locator('#chaosScore')).not.toHaveText('—');
      await expect(page.locator('#deltaScore')).not.toHaveText('—');

      // Step 6: Check all views work
      const views = ['table', 'json', 'graph'];
      for (const view of views) {
        await page.click(`[data-view="${view}"]`);
        await expect(page.locator(`#${view}View`)).toHaveClass(/active/);
        const content = await page.locator(`#${view}View`).textContent();
        expect(content).toBeTruthy();
      }

      // Step 7: Export comprehensive report
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExport');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(json|csv|md)$/);

      // Step 8: Run evaluation suite
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 90000 });

      // Step 9: Verify comprehensive analytics
      const resilienceData = await page.evaluate(() => {
        return window.dataCollector?.calculateResilienceScore();
      });
      
      expect(resilienceData).toBeTruthy();
      expect(resilienceData.score).toBeGreaterThanOrEqual(0);
      expect(resilienceData.components).toBeTruthy();
    });

    test('should handle edge cases and error conditions gracefully', async ({ page }) => {
      // Test with extreme configurations
      await page.fill('#latencyMs', '10000');
      await page.fill('#latencyRate', '90');
      await page.fill('#http500Rate', '80');
      await page.fill('#malformedRate', '70');
      await page.fill('#maxRetries', '10');

      await page.check('input[name="scenario"][value="rag"]');
      await page.click('#btnChaos');

      // Should complete even with extreme settings
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 60000 });

      // Results should still be generated
      const results = await page.evaluate(() => {
        return window.chaosLabApp?.lastResults?.chaos;
      });

      expect(results).toBeTruthy();
      expect(results.metrics).toBeTruthy();

      // Resilience score should reflect poor conditions
      const resilienceScore = await page.evaluate(() => {
        return window.dataCollector?.calculateResilienceScore();
      });

      expect(resilienceScore).toBeTruthy();
      // With extreme fault injection, score should be low
      expect(resilienceScore.score).toBeLessThan(70);
      expect(resilienceScore.assessment).toBe('poor');
    });

    test('should maintain performance under load', async ({ page }) => {
      const startTime = Date.now();

      // Run multiple operations in sequence
      const operations = [
        () => page.click('#btnBaseline'),
        () => page.click('#btnChaos'),
        () => page.click('#btnExport'),
      ];

      for (const operation of operations) {
        await operation();
        await page.waitForTimeout(1000); // Brief pause between operations
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (under 2 minutes for all operations)
      expect(totalTime).toBeLessThan(120000);

      // Verify UI remains responsive
      await page.hover('#btnWizard');
      await page.click('#themeSelector');
      await page.selectOption('#themeSelector', 'modern');
      
      // Theme change should work
      await expect(page.locator('#themeSelector')).toHaveValue('modern');

      // Memory usage should be reasonable
      const memoryUsage = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return { used: 0, total: 0, limit: 0 };
      });

      if (memoryUsage.limit > 0) {
        // Memory usage should be less than 50% of limit
        expect(memoryUsage.used).toBeLessThan(memoryUsage.limit * 0.5);
      }
    });
  });

  test.describe('Browser Compatibility and Cross-Platform', () => {
    test('should work consistently across different scenarios', async ({ page }) => {
      const scenarios = ['fetch', 'json', 'rag'];
      const results = {};

      for (const scenario of scenarios) {
        await page.check(`input[name="scenario"][value="${scenario}"]`);
        await page.fill('#seed', `cross-platform-${scenario}`);
        
        await page.click('#btnBaseline');
        await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });

        const result = await page.evaluate(() => {
          return window.chaosLabApp?.lastResults?.baseline?.metrics;
        });

        results[scenario] = result;
        expect(result).toBeTruthy();
        expect(result.scenario).toBe(scenario);
      }

      // All scenarios should produce valid results
      Object.values(results).forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    test('should handle concurrent user interactions', async ({ page }) => {
      // Simulate rapid configuration changes
      const rapidChanges = [
        () => page.fill('#latencyMs', '1000'),
        () => page.fill('#http500Rate', '20'),
        () => page.check('input[name="scenario"][value="fetch"]'),
        () => page.fill('#seed', 'concurrent-test'),
        () => page.selectOption('#themeSelector', 'geometric'),
      ];

      // Execute changes rapidly
      await Promise.all(rapidChanges.map(change => change()));

      // System should remain stable
      await expect(page.locator('body')).toBeVisible();
      
      // Configuration should be applied
      await expect(page.locator('#latencyMs')).toHaveValue('1000');
      await expect(page.locator('#seed')).toHaveValue('concurrent-test');
      await expect(page.locator('#themeSelector')).toHaveValue('geometric');
    });
  });

  test.describe('Data Persistence and Recovery', () => {
    test('should persist session data across page reloads', async ({ page }) => {
      // Run a test to generate data
      await page.fill('#seed', 'persistence-test');
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });

      // Get session data before reload
      const sessionDataBefore = await page.evaluate(() => {
        const session = window.dataCollector?.getCurrentSession();
        return session ? {
          id: session.id,
          traceCount: session.traces?.length || 0,
          startTime: session.startTime
        } : null;
      });

      expect(sessionDataBefore).toBeTruthy();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(() => window.dataCollector, { timeout: 10000 });

      // Check if data was restored from localStorage
      const savedResults = await page.evaluate(() => {
        return localStorage.getItem('chaoslab_last_baseline');
      });

      expect(savedResults).toBeTruthy();

      // Verify results dashboard shows previous results
      await expect(page.locator('#baselineScore')).not.toHaveText('—');
    });

    test('should handle storage quota exceeded gracefully', async ({ page }) => {
      // Simulate storage quota exceeded
      await page.evaluate(() => {
        const originalSetItem = localStorage.setItem;
        let callCount = 0;
        localStorage.setItem = function(key, value) {
          callCount++;
          if (callCount > 5) {
            throw new Error('QuotaExceededError: Storage quota exceeded');
          }
          return originalSetItem.call(this, key, value);
        };
      });

      // Run operations that would normally save data
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });

      // System should continue working despite storage errors
      const results = await page.evaluate(() => {
        return window.chaosLabApp?.lastResults?.baseline;
      });

      expect(results).toBeTruthy();
    });
  });

  test.describe('Production Readiness Validation', () => {
    test('should handle network interruptions gracefully', async ({ page }) => {
      // Simulate intermittent network issues
      let requestCount = 0;
      await page.route('**/*', (route) => {
        requestCount++;
        if (requestCount % 3 === 0) {
          // Fail every 3rd request
          route.abort();
        } else {
          route.continue();
        }
      });

      // System should still function with network issues
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });

      // Should have fallback results
      const results = await page.evaluate(() => {
        return window.chaosLabApp?.lastResults?.baseline;
      });

      expect(results).toBeTruthy();
    });

    test('should provide comprehensive error reporting', async ({ page }) => {
      // Capture console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Capture page errors
      const pageErrors = [];
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      // Run comprehensive test
      await page.fill('#seed', 'error-test');
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 25000 });

      // Run evaluation
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.click('#btnRunEval');
      await page.waitForSelector('#evalProgress', { state: 'hidden', timeout: 60000 });

      // Should have minimal errors (only expected/handled errors)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('404') && // Expected for some test scenarios
        !error.includes('Failed to fetch') && // Expected during chaos testing
        !error.includes('NetworkError') // Expected during network chaos
      );

      expect(criticalErrors.length).toBeLessThan(3); // Allow minimal expected errors
      expect(pageErrors.length).toBe(0); // No unhandled JavaScript errors
    });

    test('should meet performance benchmarks', async ({ page }) => {
      const performanceMetrics = await page.evaluate(() => {
        return {
          navigation: performance.getEntriesByType('navigation')[0],
          memory: 'memory' in performance ? performance.memory : null
        };
      });

      // Page should load quickly
      if (performanceMetrics.navigation) {
        expect(performanceMetrics.navigation.loadEventEnd).toBeLessThan(5000); // Under 5 seconds
      }

      // Memory usage should be reasonable
      if (performanceMetrics.memory) {
        const memoryUsageMB = performanceMetrics.memory.usedJSHeapSize / (1024 * 1024);
        expect(memoryUsageMB).toBeLessThan(100); // Under 100MB
      }

      // Test response times
      const startTime = performance.now();
      
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 15000 });
      
      const endTime = performance.now();
      const testDuration = endTime - startTime;
      
      // Baseline test should complete quickly
      expect(testDuration).toBeLessThan(15000); // Under 15 seconds
    });
  });
});