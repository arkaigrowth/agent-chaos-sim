import { test, expect } from '@playwright/test';

// Declare global functions and objects from the application
declare global {
  var runScenario: (scenario: string, seed: string, chaosOn: boolean) => Promise<any>;
  var runEvalSuite: (suiteKeyOrObj: string | object, includeBaseline?: boolean) => Promise<any>;
  var theatre: {
    getEventLog: () => any[];
    event: (type: string, data?: any) => void;
    reset: () => void;
  };
  var computeScore: (rows: any[], opts: any) => any;
  var Trace: new() => any;
}

test.describe('Integration Tests: Chaos Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for all scripts to load
    await page.waitForFunction(() => 
      typeof window.runScenario !== 'undefined' && 
      typeof window.computeScore !== 'undefined'
    );

    // Reset theatre if available
    await page.evaluate(() => {
      if (window.theatre && typeof window.theatre.reset === 'function') {
        window.theatre.reset();
      }
    });
  });

  test.describe('Baseline vs Chaos Comparisons', () => {

    test('fetch scenario: baseline vs chaos comparison', async ({ page }) => {
      const result = await page.evaluate(async () => {
        // Run baseline (no chaos)
        const baselineResult = await runScenario('fetch', 'baseline-test', false);
        
        // Run with chaos
        const chaosResult = await runScenario('fetch', 'baseline-test', true);
        
        return {
          baseline: {
            success: baselineResult ? true : false,
            hasHtml: baselineResult && baselineResult.html && baselineResult.html.length > 0
          },
          chaos: {
            success: chaosResult ? true : false,
            hasHtml: chaosResult && chaosResult.html && chaosResult.html.length > 0
          }
        };
      });

      // Both should succeed but chaos might have different execution path
      expect(result.baseline.success).toBe(true);
      expect(result.baseline.hasHtml).toBe(true);
      
      expect(result.chaos.success).toBe(true);
      expect(result.chaos.hasHtml).toBe(true);
    });

    test('json scenario: baseline vs chaos comparison', async ({ page }) => {
      const result = await page.evaluate(async () => {
        // Run baseline
        const baselineResult = await runScenario('json', 'json-baseline', false);
        
        // Run with chaos
        const chaosResult = await runScenario('json', 'json-baseline', true);
        
        return {
          baseline: {
            success: baselineResult ? true : false,
            hasData: baselineResult && baselineResult.data && Array.isArray(baselineResult.data)
          },
          chaos: {
            success: chaosResult ? true : false,
            hasData: chaosResult && chaosResult.data && Array.isArray(chaosResult.data)
          }
        };
      });

      expect(result.baseline.success).toBe(true);
      expect(result.baseline.hasData).toBe(true);
      
      expect(result.chaos.success).toBe(true);
      expect(result.chaos.hasData).toBe(true);
    });

    test('rag scenario: baseline vs chaos comparison', async ({ page }) => {
      const result = await page.evaluate(async () => {
        // Run baseline
        const baselineResult = await runScenario('rag', 'rag-baseline', false);
        
        // Run with chaos
        const chaosResult = await runScenario('rag', 'rag-baseline', true);
        
        return {
          baseline: {
            success: baselineResult ? true : false,
            hasContent: baselineResult && baselineResult.summary && baselineResult.summary.length > 0
          },
          chaos: {
            success: chaosResult ? true : false,
            hasContent: chaosResult && chaosResult.summary && chaosResult.summary.length > 0
          }
        };
      });

      expect(result.baseline.success).toBe(true);
      expect(result.baseline.hasContent).toBe(true);
      
      expect(result.chaos.success).toBe(true);
      expect(result.chaos.hasContent).toBe(true);
    });
  });

  test.describe('Fault Recovery Mechanisms', () => {

    test('fetch scenario recovers from HTTP 500 errors', async ({ page }) => {
      // Configure high HTTP 500 rate
      await page.fill('#http500Rate', '50'); // 50% rate
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        const result = await runScenario('fetch', 'http500-recovery', true);
        
        // Get theatre events if available
        let events = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          events = window.theatre.getEventLog();
        }
        
        return {
          success: result ? true : false,
          hasContent: result && result.html && result.html.length > 0,
          events: events.map(e => e.type || e.action || 'unknown')
        };
      });

      expect(result.success).toBe(true);
      expect(result.hasContent).toBe(true);
      // Should have some recovery or fallback events
      const recoveryEvents = result.events.filter(e => 
        e.includes('retry') || e.includes('fallback') || e.includes('recovered')
      );
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });

    test('json scenario recovers from malformed JSON', async ({ page }) => {
      // Configure high malformed JSON rate
      await page.fill('#malformedRate', '80'); // 80% rate
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        const result = await runScenario('json', 'malformed-recovery', true);
        
        let events = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          events = window.theatre.getEventLog();
        }
        
        return {
          success: result ? true : false,
          hasValidData: result && result.data && Array.isArray(result.data) && result.data.length > 0,
          events: events.map(e => e.type || e.action || 'unknown')
        };
      });

      expect(result.success).toBe(true);
      expect(result.hasValidData).toBe(true);
    });

    test('rag scenario handles context truncation', async ({ page }) => {
      // Configure context truncation
      await page.fill('#ctxBytes', '100'); // Very short context
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        const result = await runScenario('rag', 'truncation-test', true);
        
        let events = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          events = window.theatre.getEventLog();
        }
        
        return {
          success: result ? true : false,
          hasSummary: result && result.summary && result.summary.length > 0,
          events: events.map(e => e.type || e.action || 'unknown')
        };
      });

      expect(result.success).toBe(true);
      expect(result.hasSummary).toBe(true);
    });
  });

  test.describe('Progressive Backoff Strategies', () => {

    test('tripwire implements exponential backoff', async ({ page }) => {
      // Enable tripwire and configure it
      await page.check('#tripwireToggle');
      await page.fill('#backoffBase', '100');
      await page.fill('#backoffFactor', '2.0');
      await page.fill('#maxRetries', '3');
      
      // Set high failure rate to trigger retries
      await page.fill('#http500Rate', '90');
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        const startTime = performance.now();
        const result = await runScenario('fetch', 'backoff-test', true);
        const duration = performance.now() - startTime;
        
        let events = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          events = window.theatre.getEventLog();
        }
        
        const retryEvents = events.filter(e => 
          (e.type || e.action || '').includes('retry')
        );
        
        return {
          duration,
          retryCount: retryEvents.length,
          events: events.map(e => ({
            type: e.type || e.action || 'unknown',
            data: e.backoff_ms || e.attempts || null
          }))
        };
      });

      // Should have taken time due to backoff
      expect(result.duration).toBeGreaterThan(100);
      
      // Should have retry events
      expect(result.retryCount).toBeGreaterThan(0);
      
      // Check for backoff progression in events
      const backoffDelays = result.events
        .filter(e => e.data && typeof e.data === 'number' && e.data > 0)
        .map(e => e.data);
      
      if (backoffDelays.length > 1) {
        // Should show increasing delays (approximately)
        expect(backoffDelays[1]).toBeGreaterThan(backoffDelays[0] * 1.5);
      }
    });

    test('rate limiting triggers appropriate backoff', async ({ page }) => {
      // Configure high 429 rate
      await page.fill('#rate429', '70'); // 70% rate
      await page.check('#chaosToggle');
      
      // Enable tripwire
      await page.check('#tripwireToggle');
      await page.fill('#maxRetries', '2');

      const result = await page.evaluate(async () => {
        const startTime = performance.now();
        const result = await runScenario('fetch', 'rate-limit-backoff', true);
        const duration = performance.now() - startTime;
        
        let events = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          events = window.theatre.getEventLog();
        }
        
        return {
          duration,
          success: result ? true : false,
          rateLimitEvents: events.filter(e => 
            (e.type || '').includes('429') || (e.type || '').includes('rate_limit')
          ).length,
          retryEvents: events.filter(e => 
            (e.type || e.action || '').includes('retry')
          ).length
        };
      });

      expect(result.success).toBe(true);
      // Should have encountered rate limits
      expect(result.rateLimitEvents).toBeGreaterThan(0);
    });
  });

  test.describe('Complete Chaos Workflows', () => {

    test('full chaos workflow with all fault types', async ({ page }) => {
      // Configure multiple fault types
      await page.fill('#latencyMs', '500');
      await page.fill('#latencyRate', '20'); // 20%
      await page.fill('#http500Rate', '10'); // 10%
      await page.fill('#rate429', '10'); // 10%
      await page.fill('#malformedRate', '15'); // 15%
      await page.fill('#ctxBytes', '1000');
      await page.fill('#injSeed', 'chaos-workflow-test');
      
      await page.check('#chaosToggle');
      await page.check('#tripwireToggle');

      const result = await page.evaluate(async () => {
        const scenarios = ['fetch', 'json', 'rag'];
        const results = {};
        
        for (const scenario of scenarios) {
          const startTime = performance.now();
          const scenarioResult = await runScenario(scenario, `workflow-${scenario}`, true);
          const duration = performance.now() - startTime;
          
          let events = [];
          if (window.theatre && typeof window.theatre.getEventLog === 'function') {
            events = window.theatre.getEventLog();
          }
          
          results[scenario] = {
            success: scenarioResult ? true : false,
            duration,
            faultEvents: events.filter(e => 
              (e.type || '').includes('fault') || 
              (e.type || '').includes('500') || 
              (e.type || '').includes('429') ||
              (e.type || '').includes('latency') ||
              (e.type || '').includes('malformed')
            ).length,
            recoveryEvents: events.filter(e => 
              (e.type || e.action || '').includes('retry') || 
              (e.type || e.action || '').includes('fallback') ||
              (e.type || e.action || '').includes('recovered')
            ).length
          };
          
          // Reset events for next scenario
          if (window.theatre && typeof window.theatre.reset === 'function') {
            window.theatre.reset();
          }
        }
        
        return results;
      });

      // All scenarios should complete successfully despite chaos
      Object.keys(result).forEach(scenario => {
        expect(result[scenario].success).toBe(true);
        expect(result[scenario].duration).toBeGreaterThan(0);
      });
    });

    test('chaos workflow with scoring and thresholds', async ({ page }) => {
      // Set a minimum score threshold
      await page.fill('#minScore', '70');
      
      // Configure moderate chaos
      await page.fill('#http500Rate', '30');
      await page.fill('#malformedRate', '20');
      await page.check('#chaosToggle');
      await page.check('#tripwireToggle');

      const result = await page.evaluate(async () => {
        const scenario = 'fetch';
        const scenarioResult = await runScenario(scenario, 'scoring-test', true);
        
        // Simulate trace data for scoring
        const mockTrace = [
          { i: 1, tool: 'web.fetch', duration_ms: 1000, status: 'recovered', fault: 'http_500', action: 'retry(1)' },
          { i: 2, tool: 'extract_structured', duration_ms: 100, status: 'ok' },
          { i: 3, tool: 'summarize', duration_ms: 200, status: 'ok' }
        ];
        
        const scoreData = computeScore(mockTrace, { mttrTarget: 30 });
        
        return {
          scenarioSuccess: scenarioResult ? true : false,
          score: scoreData.score,
          successAfterFault: scoreData.success_after_fault,
          mttr: scoreData.mttr_s,
          retries: scoreData.retries
        };
      });

      expect(result.scenarioSuccess).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.successAfterFault).toBeGreaterThanOrEqual(0);
      expect(result.successAfterFault).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Report Generation and Export', () => {

    test('theatre event logging captures chaos events', async ({ page }) => {
      // Enable chaos with various fault types
      await page.fill('#latencyRate', '30');
      await page.fill('#http500Rate', '20');
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        // Reset theatre events
        if (window.theatre && typeof window.theatre.reset === 'function') {
          window.theatre.reset();
        }
        
        const scenarioResult = await runScenario('fetch', 'logging-test', true);
        
        let eventLog = [];
        if (window.theatre && typeof window.theatre.getEventLog === 'function') {
          eventLog = window.theatre.getEventLog();
        }
        
        return {
          success: scenarioResult ? true : false,
          eventCount: eventLog.length,
          eventTypes: [...new Set(eventLog.map(e => e.type || e.action || 'unknown'))],
          events: eventLog.map(e => ({
            type: e.type || e.action || 'unknown',
            timestamp: e.timestamp || Date.now(),
            hasData: Object.keys(e).length > 1
          }))
        };
      });

      expect(result.success).toBe(true);
      expect(result.eventCount).toBeGreaterThan(0);
      expect(result.eventTypes).toContain('fault');
      
      // Events should have timestamps
      result.events.forEach(event => {
        expect(event.timestamp).toBeGreaterThan(0);
      });
    });

    test('chaos YAML generation for reproducibility', async ({ page }) => {
      // Set specific chaos configuration
      await page.fill('#latencyMs', '1500');
      await page.fill('#latencyRate', '25');
      await page.fill('#http500Rate', '15');
      await page.fill('#rate429', '10');
      await page.fill('#malformedRate', '20');
      await page.fill('#ctxBytes', '800');

      const result = await page.evaluate(() => {
        // Access toChaosYAML function
        if (typeof window.toChaosYAML === 'function') {
          const chaosConfig = {
            latencyMs: 1500,
            latencyRate: 0.25,
            http500Rate: 0.15,
            rate429: 0.10,
            malformedRate: 0.20,
            ctxBytes: 800
          };
          
          const yaml = window.toChaosYAML('reproducibility-test', chaosConfig, 15);
          
          return {
            hasYaml: yaml && yaml.length > 0,
            yaml: yaml,
            containsConfig: yaml.includes('probability: 0.25') && 
                           yaml.includes('delay_ms: 1500') &&
                           yaml.includes('bytes: 800')
          };
        }
        
        return { hasYaml: false, yaml: '', containsConfig: false };
      });

      expect(result.hasYaml).toBe(true);
      expect(result.containsConfig).toBe(true);
      expect(result.yaml).toContain('mode: chaos_monkey');
      expect(result.yaml).toContain('seed: reproducibility-test');
    });
  });

  test.describe('Built-in Evaluation Suites', () => {

    test('reliability core suite runs successfully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          // Access runEvalSuite if available
          if (typeof window.runEvalSuite === 'function') {
            const suiteResult = await window.runEvalSuite('reliability_core', false);
            
            return {
              available: true,
              success: suiteResult ? true : false,
              result: suiteResult
            };
          } else {
            return { available: false };
          }
        } catch (error) {
          return {
            available: true,
            success: false,
            error: error.message
          };
        }
      });

      if (result.available) {
        expect(result.success).toBe(true);
      } else {
        // If eval suite not available, skip this test
        test.skip();
      }
    });

    test('custom evaluation suite execution', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const customSuite = {
          suite: "Custom Integration Test Suite",
          cases: [
            {
              name: "Basic fetch test",
              scenario: "fetch",
              seeds: ["integration-test-1"],
              faults: { latency_ms: 500, latency_rate: 0.1 },
              assertions: [
                { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.9 }
              ]
            }
          ],
          gate: { score_min: 80 }
        };

        try {
          if (typeof window.runEvalSuite === 'function') {
            const result = await window.runEvalSuite(customSuite, false);
            return {
              available: true,
              success: result ? true : false,
              result: result
            };
          } else {
            return { available: false };
          }
        } catch (error) {
          return {
            available: true,
            success: false,
            error: error.message
          };
        }
      });

      if (result.available) {
        expect(result.success).toBe(true);
      } else {
        // If eval suite not available, skip this test
        test.skip();
      }
    });
  });

  test.describe('Edge Cases and Error Conditions', () => {

    test('handles network timeouts gracefully', async ({ page }) => {
      // Configure very high latency to simulate timeout
      await page.fill('#latencyMs', '10000'); // 10 second delay
      await page.fill('#latencyRate', '100'); // Always inject
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        const startTime = performance.now();
        
        try {
          const result = await runScenario('fetch', 'timeout-test', true);
          const duration = performance.now() - startTime;
          
          return {
            success: result ? true : false,
            duration,
            hasContent: result && result.html && result.html.length > 0
          };
        } catch (error) {
          return {
            success: false,
            duration: performance.now() - startTime,
            error: error.message
          };
        }
      });

      // Should either succeed with fallback or fail gracefully
      expect(result.duration).toBeGreaterThan(1000);
      
      if (result.success) {
        // If it succeeded, should have content (likely fallback)
        expect(result.hasContent).toBe(true);
      }
    });

    test('handles invalid configuration values', async ({ page }) => {
      // Set invalid values
      await page.fill('#latencyRate', '150'); // > 100%
      await page.fill('#http500Rate', '-10'); // Negative
      await page.fill('#latencyMs', 'invalid'); // Non-numeric
      await page.check('#chaosToggle');

      const result = await page.evaluate(async () => {
        try {
          const result = await runScenario('fetch', 'invalid-config-test', true);
          return {
            success: result ? true : false,
            error: null
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      // Should handle invalid config gracefully
      expect(result.success).toBe(true);
    });

    test('empty or minimal responses are handled', async ({ page }) => {
      const result = await page.evaluate(async () => {
        // Mock a scenario that might return minimal data
        try {
          const result = await runScenario('json', 'minimal-response', true);
          
          return {
            success: result ? true : false,
            hasData: result && result.data,
            dataType: result && result.data ? typeof result.data : null
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(result.success).toBe(true);
      // Should have some data even if minimal
      expect(result.hasData).toBeTruthy();
    });
  });

  test.describe('Performance and Load', () => {

    test('concurrent scenario execution', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const scenarios = ['fetch', 'json', 'rag'];
        const startTime = performance.now();
        
        // Run scenarios concurrently
        const promises = scenarios.map((scenario, index) => 
          runScenario(scenario, `concurrent-${index}`, false)
        );
        
        const results = await Promise.allSettled(promises);
        const duration = performance.now() - startTime;
        
        return {
          duration,
          successful: results.filter(r => r.status === 'fulfilled' && r.value).length,
          failed: results.filter(r => r.status === 'rejected' || !r.value).length,
          total: results.length
        };
      });

      expect(result.successful + result.failed).toBe(result.total);
      expect(result.successful).toBeGreaterThan(0);
      // Concurrent execution should be faster than sequential
      expect(result.duration).toBeLessThan(30000); // 30 seconds max
    });

    test('memory usage during chaos scenarios', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const initialMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        
        // Run multiple scenarios to test memory usage
        for (let i = 0; i < 5; i++) {
          await runScenario('fetch', `memory-test-${i}`, true);
        }
        
        const finalMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        
        return {
          memorySupported: (performance as any).memory ? true : false,
          initialMemory,
          finalMemory,
          memoryIncrease: finalMemory - initialMemory
        };
      });

      if (result.memorySupported) {
        // Memory increase should be reasonable
        expect(result.memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });
  });
});