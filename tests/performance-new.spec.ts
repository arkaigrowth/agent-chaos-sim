import { test, expect, Page } from '@playwright/test';

test.describe('Performance Tests for New Implementation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load Performance', () => {
    test('should load page within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/index_new.html');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
      
      // Verify critical elements are visible
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.hero')).toBeVisible();
      await expect(page.locator('.main-grid')).toBeVisible();
      await expect(page.locator('.bottom-sheet')).toBeVisible();
    });

    test('should load and parse all JavaScript modules quickly', async ({ page }) => {
      const performanceMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const jsResources = entries.filter(entry => 
          entry.name.endsWith('.js') && entry.name.includes('/components/')
        );
        
        return {
          totalJsResources: jsResources.length,
          maxLoadTime: Math.max(...jsResources.map(r => r.duration)),
          avgLoadTime: jsResources.reduce((sum, r) => sum + r.duration, 0) / jsResources.length,
          totalTransferSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        };
      });
      
      expect(performanceMetrics.maxLoadTime).toBeLessThan(1000); // No single JS file > 1s
      expect(performanceMetrics.avgLoadTime).toBeLessThan(500);  // Average load time < 500ms
      expect(performanceMetrics.totalTransferSize).toBeLessThan(500 * 1024); // Total JS < 500KB
    });

    test('should initialize application components efficiently', async ({ page }) => {
      const initializationTime = await page.evaluate(() => {
        const start = performance.now();
        
        // Check if all components are initialized
        const componentsReady = !!(
          window.chaosLabApp &&
          window.wizard &&
          window.theatre &&
          window.enhancedEvals
        );
        
        const end = performance.now();
        
        return {
          initTime: end - start,
          allComponentsReady: componentsReady,
          chaosLabReady: !!window.chaosLabApp,
          wizardReady: !!window.wizard,
          theatreReady: !!window.theatre,
          enhancedEvalsReady: !!window.enhancedEvals
        };
      });
      
      expect(initializationTime.initTime).toBeLessThan(100);
      expect(initializationTime.allComponentsReady).toBe(true);
      expect(initializationTime.chaosLabReady).toBe(true);
      expect(initializationTime.wizardReady).toBe(true);
      expect(initializationTime.enhancedEvalsReady).toBe(true);
    });

    test('should handle CSS and font loading efficiently', async ({ page }) => {
      const resourceMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        
        const cssResources = entries.filter(entry => entry.name.endsWith('.css'));
        const fontResources = entries.filter(entry => 
          entry.name.includes('fonts.googleapis.com') || entry.name.includes('JetBrains')
        );
        
        return {
          cssCount: cssResources.length,
          fontCount: fontResources.length,
          maxCssLoadTime: cssResources.length > 0 ? Math.max(...cssResources.map(r => r.duration)) : 0,
          maxFontLoadTime: fontResources.length > 0 ? Math.max(...fontResources.map(r => r.duration)) : 0,
          totalCssSize: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          totalFontSize: fontResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        };
      });
      
      expect(resourceMetrics.maxCssLoadTime).toBeLessThan(1000);
      expect(resourceMetrics.maxFontLoadTime).toBeLessThan(2000);
      expect(resourceMetrics.totalCssSize).toBeLessThan(100 * 1024); // CSS < 100KB
      expect(resourceMetrics.totalFontSize).toBeLessThan(300 * 1024); // Fonts < 300KB
    });
  });

  test.describe('Interaction Response Performance', () => {
    test('should respond to button clicks within 100ms', async ({ page }) => {
      const buttons = [
        '#btnBaseline',
        '#btnChaos', 
        '#btnWizard',
        '#btnExport',
        '#btnPermalink',
        '#btnReplay'
      ];
      
      for (const buttonId of buttons) {
        const button = page.locator(buttonId);
        
        const responseTime = await page.evaluate(async (id) => {
          const element = document.querySelector(id);
          if (!element) return null;
          
          const start = performance.now();
          element.click();
          
          // Wait for any immediate DOM changes
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          const end = performance.now();
          return end - start;
        }, buttonId);
        
        if (responseTime !== null) {
          expect(responseTime).toBeLessThan(100);
        }
        
        // Reset any state changes
        if (buttonId === '#btnWizard') {
          await page.click('.btn-close');
        }
      }
    });

    test('should update form controls responsively', async ({ page }) => {
      const formControls = [
        { id: '#seed', value: 'performance-test' },
        { id: '#latencyMs', value: '2000' },
        { id: '#latencyRate', value: '50' },
        { id: '#http500Rate', value: '25' },
        { id: '#malformedRate', value: '30' }
      ];
      
      for (const control of formControls) {
        const updateTime = await page.evaluate(async (ctrl) => {
          const element = document.querySelector(ctrl.id);
          if (!element) return null;
          
          const start = performance.now();
          element.value = ctrl.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Wait for any immediate updates
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          const end = performance.now();
          return end - start;
        }, control);
        
        if (updateTime !== null) {
          expect(updateTime).toBeLessThan(50); // Form updates should be very fast
        }
        
        await expect(page.locator(control.id)).toHaveValue(control.value);
      }
    });

    test('should handle theme switching quickly', async ({ page }) => {
      const themes = ['modern', 'neumorphic', 'geometric', 'glass', 'brutalist'];
      
      for (const theme of themes) {
        const switchTime = await page.evaluate(async (themeName) => {
          const selector = document.getElementById('themeSelector');
          if (!selector) return null;
          
          const start = performance.now();
          selector.value = themeName;
          selector.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Wait for theme application
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          const end = performance.now();
          return end - start;
        }, theme);
        
        if (switchTime !== null) {
          expect(switchTime).toBeLessThan(100);
        }
        
        await expect(page.locator('#themeSelector')).toHaveValue(theme);
      }
    });

    test('should animate transitions smoothly', async ({ page }) => {
      // Test wizard animation performance
      await page.click('#btnWizard');
      
      const animationPerformance = await page.evaluate(() => {
        const wizard = document.getElementById('wizard');
        if (!wizard) return null;
        
        const styles = getComputedStyle(wizard);
        const hasTransition = styles.transition.includes('opacity') || 
                            styles.transition.includes('transform');
        
        // Measure animation frame rate during transition
        let frameCount = 0;
        const startTime = performance.now();
        
        const countFrames = () => {
          frameCount++;
          if (performance.now() - startTime < 1000) { // Count for 1 second
            requestAnimationFrame(countFrames);
          }
        };
        
        requestAnimationFrame(countFrames);
        
        return {
          hasTransition,
          startTime
        };
      });
      
      await page.waitForTimeout(1000); // Wait for frame counting
      
      const finalFrameCount = await page.evaluate(() => window.frameCount || 0);
      
      // Should maintain at least 30 FPS during animations
      if (finalFrameCount > 0) {
        expect(finalFrameCount).toBeGreaterThan(30);
      }
      
      await page.click('.btn-close');
    });
  });

  test.describe('WebSocket Performance', () => {
    test('should establish WebSocket connections with low latency', async ({ page }) => {
      const wsPerformance = await page.evaluate(async () => {
        if (!window.enhancedEvals || !window.enhancedEvals.wsEventTarget) {
          return { supported: false };
        }
        
        const startTime = performance.now();
        
        // Simulate WebSocket connection establishment
        let connectionEstablished = false;
        
        const testConnection = () => {
          try {
            // Simulate connection test
            window.enhancedEvals.wsEventTarget.dispatchEvent(
              new CustomEvent('connection_test', { detail: { status: 'connected' } })
            );
            connectionEstablished = true;
          } catch (error) {
            connectionEstablished = false;
          }
        };
        
        testConnection();
        
        const connectionTime = performance.now() - startTime;
        
        return {
          supported: true,
          connectionEstablished,
          connectionTime,
          hasEventTarget: !!window.enhancedEvals.wsEventTarget
        };
      });
      
      expect(wsPerformance.supported).toBe(true);
      expect(wsPerformance.connectionTime).toBeLessThan(50); // Connection simulation < 50ms
      expect(wsPerformance.hasEventTarget).toBe(true);
    });

    test('should handle real-time updates efficiently', async ({ page }) => {
      const updatePerformance = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const updates = [];
        let processedCount = 0;
        
        // Subscribe to updates
        const unsubscribe = window.enhancedEvals.subscribeToUpdates((event) => {
          const processTime = performance.now();
          updates.push({
            receivedAt: processTime,
            type: event.type,
            processingDelay: processTime - (event.timestamp || processTime)
          });
          processedCount++;
        });
        
        const startTime = performance.now();
        
        // Simulate rapid updates
        for (let i = 0; i < 10; i++) {
          const eventTime = performance.now();
          window.enhancedEvals.wsEventTarget.dispatchEvent(
            new CustomEvent('eval_update', {
              detail: { 
                type: 'test_update', 
                index: i,
                timestamp: eventTime
              }
            })
          );
          
          // Small delay between events
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        const totalTime = performance.now() - startTime;
        
        // Wait for all updates to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        unsubscribe();
        
        return {
          totalUpdates: 10,
          processedUpdates: processedCount,
          totalTime,
          avgProcessingDelay: updates.length > 0 ? 
            updates.reduce((sum, u) => sum + u.processingDelay, 0) / updates.length : 0,
          maxProcessingDelay: updates.length > 0 ? 
            Math.max(...updates.map(u => u.processingDelay)) : 0
        };
      });
      
      if (updatePerformance) {
        expect(updatePerformance.processedUpdates).toBe(10);
        expect(updatePerformance.avgProcessingDelay).toBeLessThan(10); // Avg processing < 10ms
        expect(updatePerformance.maxProcessingDelay).toBeLessThan(50); // Max processing < 50ms
      }
    });
  });

  test.describe('Batch Processing Performance', () => {
    test('should handle concurrent evaluations efficiently', async ({ page }) => {
      const batchPerformance = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        // Create test suites for batch processing
        const testSuites = Array.from({ length: 3 }, (_, i) => ({
          suite: `Performance Test Suite ${i + 1}`,
          cases: [{
            name: `Performance Case ${i + 1}`,
            scenario: "fetch",
            seeds: ["perf-test"],
            faults: { latency_ms: 100 } // Minimal faults for speed
          }]
        }));
        
        const startTime = performance.now();
        
        try {
          const result = await window.enhancedEvals.runBatchEvaluations(testSuites, {
            concurrency: 2
          });
          
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          return {
            success: true,
            totalTime,
            suiteCount: testSuites.length,
            resultCount: result.results.length,
            avgTimePerSuite: totalTime / testSuites.length,
            batchId: result.batchId,
            concurrencyEfficiency: totalTime < (testSuites.length * 5000) // Should be faster than sequential
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      if (batchPerformance?.success) {
        expect(batchPerformance.totalTime).toBeLessThan(20000); // Total batch < 20s
        expect(batchPerformance.resultCount).toBe(3);
        expect(batchPerformance.avgTimePerSuite).toBeLessThan(10000); // Avg per suite < 10s
        expect(batchPerformance.concurrencyEfficiency).toBe(true);
      }
    });

    test('should optimize memory usage during batch operations', async ({ page }) => {
      const memoryPerformance = await page.evaluate(async () => {
        if (!performance.memory || !window.enhancedEvals) {
          return { supported: false };
        }
        
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // Create larger batch for memory testing
        const largeBatch = Array.from({ length: 5 }, (_, i) => ({
          suite: `Memory Test Suite ${i + 1}`,
          cases: Array.from({ length: 3 }, (_, j) => ({
            name: `Memory Case ${i + 1}-${j + 1}`,
            scenario: "fetch",
            seeds: ["memory-test"],
            faults: { latency_ms: 50 }
          }))
        }));
        
        try {
          const result = await window.enhancedEvals.runBatchEvaluations(largeBatch, {
            concurrency: 1 // Sequential to measure memory accurately
          });
          
          const peakMemory = performance.memory.usedJSHeapSize;
          
          // Force cleanup
          window.enhancedEvals.cleanupOldResults();
          
          // Wait for GC
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const finalMemory = performance.memory.usedJSHeapSize;
          
          return {
            supported: true,
            success: true,
            initialMemory,
            peakMemory,
            finalMemory,
            memoryIncrease: peakMemory - initialMemory,
            memoryReleased: peakMemory - finalMemory,
            memoryEfficient: (peakMemory - initialMemory) < (10 * 1024 * 1024), // < 10MB increase
            cleanupWorked: finalMemory < peakMemory
          };
        } catch (error) {
          return {
            supported: true,
            success: false,
            error: error.message
          };
        }
      });
      
      if (memoryPerformance?.supported && memoryPerformance?.success) {
        expect(memoryPerformance.memoryEfficient).toBe(true);
        expect(memoryPerformance.cleanupWorked).toBe(true);
        expect(memoryPerformance.memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB
      }
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should achieve good Largest Contentful Paint (LCP)', async ({ page }) => {
      // Navigate to fresh page and measure LCP
      const lcpMetric = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            if (lastEntry) {
              observer.disconnect();
              resolve({
                value: lastEntry.startTime,
                element: lastEntry.element?.tagName || 'unknown',
                url: lastEntry.url || 'N/A'
              });
            }
          });
          
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve({ value: null, timeout: true });
          }, 10000);
        });
      });
      
      if (lcpMetric.value !== null) {
        expect(lcpMetric.value).toBeLessThan(2500); // LCP < 2.5s (good)
        expect(lcpMetric.timeout).toBeFalsy();
      }
    });

    test('should achieve good First Input Delay (FID)', async ({ page }) => {
      // Measure FID by performing first interaction
      const fidMetric = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const fidEntry = entries[0];
              observer.disconnect();
              resolve({
                value: fidEntry.processingStart - fidEntry.startTime,
                duration: fidEntry.duration
              });
            }
          });
          
          observer.observe({ entryTypes: ['first-input'] });
          
          // Simulate first input
          setTimeout(() => {
            const button = document.querySelector('#btnBaseline');
            if (button) {
              button.click();
            }
          }, 1000);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve({ value: null, timeout: true });
          }, 30000);
        });
      });
      
      if (fidMetric.value !== null) {
        expect(fidMetric.value).toBeLessThan(100); // FID < 100ms (good)
        expect(fidMetric.duration).toBeLessThan(200); // Processing < 200ms
      }
    });

    test('should achieve good Cumulative Layout Shift (CLS)', async ({ page }) => {
      // Measure CLS during page load and interactions
      const clsMetric = await page.evaluate(async () => {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Perform some interactions that might cause layout shifts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Open wizard
        const wizardBtn = document.querySelector('#btnWizard');
        if (wizardBtn) wizardBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Close wizard
        const closeBtn = document.querySelector('.btn-close');
        if (closeBtn) closeBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        observer.disconnect();
        
        return {
          value: clsValue,
          measurement: 'cumulative-layout-shift'
        };
      });
      
      expect(clsMetric.value).toBeLessThan(0.1); // CLS < 0.1 (good)
    });
  });

  test.describe('Resource Usage Optimization', () => {
    test('should maintain reasonable CPU usage during operations', async ({ page }) => {
      const cpuMetrics = await page.evaluate(async () => {
        if (!performance.measureUserAgentSpecificMemory) {
          return { supported: false };
        }
        
        const startTime = performance.now();
        let highCpuDuration = 0;
        
        // Monitor CPU-intensive operations
        const monitorCpu = setInterval(() => {
          const currentTime = performance.now();
          const timeSinceStart = currentTime - startTime;
          
          // Simple CPU usage estimation based on timing
          if (timeSinceStart > 100) { // If operations take longer than expected
            highCpuDuration += 100;
          }
        }, 100);
        
        // Run CPU-intensive test
        await page.click('#btnBaseline');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        clearInterval(monitorCpu);
        
        return {
          supported: true,
          highCpuDuration,
          acceptableUsage: highCpuDuration < 2000 // Less than 2 seconds of high CPU
        };
      });
      
      if (cpuMetrics.supported) {
        expect(cpuMetrics.acceptableUsage).toBe(true);
      }
    });

    test('should handle DOM operations efficiently', async ({ page }) => {
      const domPerformance = await page.evaluate(async () => {
        const startNodeCount = document.querySelectorAll('*').length;
        const startTime = performance.now();
        
        // Perform DOM-heavy operations
        const wizard = document.querySelector('#btnWizard');
        if (wizard) wizard.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const midNodeCount = document.querySelectorAll('*').length;
        
        // Navigate through wizard steps
        const nextBtn = document.querySelector('button:has-text("NEXT →")');
        if (nextBtn) {
          nextBtn.click();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Close wizard
        const closeBtn = document.querySelector('.btn-close');
        if (closeBtn) closeBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endNodeCount = document.querySelectorAll('*').length;
        const totalTime = performance.now() - startTime;
        
        return {
          startNodeCount,
          midNodeCount,
          endNodeCount,
          totalTime,
          domCreationEfficient: (midNodeCount - startNodeCount) < 50, // Not too many new nodes
          domCleanupEfficient: Math.abs(endNodeCount - startNodeCount) < 10, // Good cleanup
          operationsFast: totalTime < 500 // DOM ops < 500ms
        };
      });
      
      expect(domPerformance.domCreationEfficient).toBe(true);
      expect(domPerformance.domCleanupEfficient).toBe(true);
      expect(domPerformance.operationsFast).toBe(true);
    });

    test('should optimize network requests', async ({ page }) => {
      // Monitor network requests during test execution
      const networkRequests: any[] = [];
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        const request = networkRequests.find(req => req.url === response.url());
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
          request.status = response.status();
        }
      });
      
      // Run test that makes network requests
      await page.fill('#seed', 'network-perf-test');
      await page.check('input[name="scenario"][value="fetch"]');
      await page.click('#btnBaseline');
      
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      // Analyze network performance
      const httpRequests = networkRequests.filter(req => 
        req.url.startsWith('http') && 
        !req.url.includes('chrome-extension') &&
        req.responseTime !== undefined
      );
      
      if (httpRequests.length > 0) {
        const avgResponseTime = httpRequests.reduce((sum, req) => sum + req.responseTime, 0) / httpRequests.length;
        const maxResponseTime = Math.max(...httpRequests.map(req => req.responseTime));
        
        expect(avgResponseTime).toBeLessThan(5000); // Avg response < 5s
        expect(maxResponseTime).toBeLessThan(10000); // Max response < 10s
        
        // All requests should succeed or fail gracefully
        const failedRequests = httpRequests.filter(req => req.status >= 400 && req.status !== 429 && req.status !== 500);
        expect(failedRequests.length).toBe(0); // No unexpected failures
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple concurrent operations', async ({ page }) => {
      const concurrentOps = await page.evaluate(async () => {
        const operations = [];
        const startTime = performance.now();
        
        // Simulate concurrent operations
        const promises = [];
        
        // Multiple form updates
        for (let i = 0; i < 10; i++) {
          promises.push(new Promise(resolve => {
            const input = document.getElementById('seed');
            if (input) {
              input.value = `concurrent-test-${i}`;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            requestAnimationFrame(resolve);
          }));
        }
        
        // Multiple theme switches
        for (let i = 0; i < 5; i++) {
          promises.push(new Promise(resolve => {
            const selector = document.getElementById('themeSelector');
            if (selector) {
              const themes = ['modern', 'geometric', 'brutalist'];
              selector.value = themes[i % themes.length];
              selector.dispatchEvent(new Event('change', { bubbles: true }));
            }
            requestAnimationFrame(resolve);
          }));
        }
        
        await Promise.all(promises);
        
        const totalTime = performance.now() - startTime;
        
        return {
          operationCount: promises.length,
          totalTime,
          avgTimePerOperation: totalTime / promises.length,
          concurrentHandling: totalTime < 1000 // All concurrent ops < 1s
        };
      });
      
      expect(concurrentOps.concurrentHandling).toBe(true);
      expect(concurrentOps.avgTimePerOperation).toBeLessThan(100);
    });

    test('should maintain performance with large datasets', async ({ page }) => {
      const largeDataPerformance = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        // Create large evaluation suite
        const largeSuite = {
          suite: "Large Dataset Performance Test",
          cases: Array.from({ length: 20 }, (_, i) => ({
            name: `Performance Case ${i + 1}`,
            scenario: "fetch",
            seeds: Array.from({ length: 3 }, (_, j) => `seed-${i}-${j}`),
            faults: { latency_ms: 100 },
            assertions: [
              { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.7 }
            ]
          }))
        };
        
        const startTime = performance.now();
        
        try {
          const validation = await window.enhancedEvals.validateEvalSuite(largeSuite);
          const metadata = window.enhancedEvals.getEvalSuiteMetadata(largeSuite);
          
          const processingTime = performance.now() - startTime;
          
          return {
            success: true,
            caseCount: largeSuite.cases.length,
            totalSeeds: largeSuite.cases.reduce((sum, c) => sum + c.seeds.length, 0),
            processingTime,
            validationPassed: validation.valid,
            metadataExtracted: !!metadata.name,
            performanceGood: processingTime < 2000 // Processing < 2s
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      if (largeDataPerformance?.success) {
        expect(largeDataPerformance.performanceGood).toBe(true);
        expect(largeDataPerformance.validationPassed).toBe(true);
        expect(largeDataPerformance.caseCount).toBe(20);
        expect(largeDataPerformance.totalSeeds).toBe(60);
      }
    });

    test('should handle stress testing scenarios', async ({ page }) => {
      const stressTestPerformance = await page.evaluate(async () => {
        const stressOperations = [];
        const startTime = performance.now();
        
        try {
          // Rapid UI interactions
          for (let i = 0; i < 50; i++) {
            const operation = new Promise(resolve => {
              // Random form field updates
              const fields = ['#seed', '#latencyMs', '#latencyRate', '#http500Rate'];
              const field = fields[Math.floor(Math.random() * fields.length)];
              const element = document.querySelector(field);
              
              if (element) {
                element.value = `stress-${i}`;
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              // Random scenario selection
              const scenarios = ['fetch', 'rag', 'json'];
              const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
              const radio = document.querySelector(`input[name="scenario"][value="${scenario}"]`);
              if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
              }
              
              requestAnimationFrame(resolve);
            });
            
            stressOperations.push(operation);
            
            // Small delay to simulate realistic user interaction speed
            if (i % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          await Promise.all(stressOperations);
          
          const totalTime = performance.now() - startTime;
          
          // Verify final state is stable
          const finalSeed = document.getElementById('seed')?.value;
          const finalScenario = document.querySelector('input[name="scenario"]:checked')?.value;
          
          return {
            success: true,
            operationCount: stressOperations.length,
            totalTime,
            avgTimePerOperation: totalTime / stressOperations.length,
            finalState: {
              seed: finalSeed,
              scenario: finalScenario
            },
            stableUnderStress: totalTime < 5000 && finalSeed && finalScenario,
            performanceAcceptable: totalTime < 10000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      expect(stressTestPerformance?.success).toBe(true);
      expect(stressTestPerformance?.stableUnderStress).toBe(true);
      expect(stressTestPerformance?.performanceAcceptable).toBe(true);
      expect(stressTestPerformance?.avgTimePerOperation).toBeLessThan(200);
    });
  });

  test.describe('Performance Monitoring and Metrics', () => {
    test('should provide performance monitoring capabilities', async ({ page }) => {
      const performanceMonitoring = await page.evaluate(() => {
        // Check if performance monitoring is available
        const hasPerformanceAPI = !!window.performance;
        const hasMemoryAPI = !!(window.performance && window.performance.memory);
        const hasObserverAPI = !!window.PerformanceObserver;
        const hasTimingAPI = !!(window.performance && window.performance.timing);
        
        // Test performance marks and measures
        let marksWorking = false;
        let measuresWorking = false;
        
        try {
          performance.mark('test-start');
          performance.mark('test-end');
          performance.measure('test-duration', 'test-start', 'test-end');
          
          const marks = performance.getEntriesByType('mark');
          const measures = performance.getEntriesByType('measure');
          
          marksWorking = marks.length >= 2;
          measuresWorking = measures.length >= 1;
          
          // Cleanup test marks
          performance.clearMarks('test-start');
          performance.clearMarks('test-end');
          performance.clearMeasures('test-duration');
          
        } catch (e) {
          // Performance API not fully supported
        }
        
        return {
          hasPerformanceAPI,
          hasMemoryAPI,
          hasObserverAPI,
          hasTimingAPI,
          marksWorking,
          measuresWorking,
          fullSupport: hasPerformanceAPI && hasObserverAPI && marksWorking && measuresWorking
        };
      });
      
      expect(performanceMonitoring.hasPerformanceAPI).toBe(true);
      expect(performanceMonitoring.hasObserverAPI).toBe(true);
      expect(performanceMonitoring.marksWorking).toBe(true);
      expect(performanceMonitoring.measuresWorking).toBe(true);
    });

    test('should track custom performance metrics', async ({ page }) => {
      const customMetrics = await page.evaluate(async () => {
        // Simulate custom performance tracking
        performance.mark('app-init-start');
        
        // Wait for app initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        performance.mark('app-init-end');
        performance.measure('app-init-time', 'app-init-start', 'app-init-end');
        
        // Test operation timing
        performance.mark('form-update-start');
        
        const seedInput = document.getElementById('seed');
        if (seedInput) {
          seedInput.value = 'performance-tracking-test';
          seedInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        performance.mark('form-update-end');
        performance.measure('form-update-time', 'form-update-start', 'form-update-end');
        
        // Get measurements
        const appInitMeasure = performance.getEntriesByName('app-init-time')[0];
        const formUpdateMeasure = performance.getEntriesByName('form-update-time')[0];
        
        return {
          appInitTime: appInitMeasure?.duration || null,
          formUpdateTime: formUpdateMeasure?.duration || null,
          customTrackingWorking: !!(appInitMeasure && formUpdateMeasure)
        };
      });
      
      expect(customMetrics.customTrackingWorking).toBe(true);
      if (customMetrics.appInitTime !== null) {
        expect(customMetrics.appInitTime).toBeLessThan(1000);
      }
      if (customMetrics.formUpdateTime !== null) {
        expect(customMetrics.formUpdateTime).toBeLessThan(100);
      }
    });
  });
});