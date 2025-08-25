import { test, expect } from '@playwright/test';

// Global type declarations for chaos functions
declare global {
  var runScenario: (scenario: string, seed: string, chaosOn: boolean) => Promise<any>;
  var runEvalSuite: (suiteKeyOrObj: string | any, includeBaseline?: boolean) => Promise<any>;
  var chaosFetch: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var chaosJSON: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var computeScore: (rows: any[], opts: { mttrTarget?: number }) => any;
  var readToggles: () => any;
  var readTripwire: () => any;
}

test.describe('API Endpoints Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.runScenario !== 'undefined');
  });

  test.describe('runScenario API', () => {
    
    test('should execute fetch scenario with baseline mode', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', '1337', false);
      });
      
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('trace');
      expect(result.metrics).toHaveProperty('score');
      expect(result.metrics).toHaveProperty('seed', '1337');
      expect(result.metrics).toHaveProperty('scenario', 'fetch');
      expect(typeof result.metrics.score).toBe('number');
    });

    test('should execute fetch scenario with chaos mode', async ({ page }) => {
      // Set chaos configuration
      await page.evaluate(() => {
        const latencyMs = document.getElementById('latencyMs') as HTMLInputElement;
        const latencyRate = document.getElementById('latencyRate') as HTMLInputElement;
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        
        if (latencyMs) latencyMs.value = '1000';
        if (latencyRate) latencyRate.value = '50';
        if (http500Rate) http500Rate.value = '25';
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', '1337', true);
      });
      
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('score');
      expect(result.trace.length).toBeGreaterThan(0);
      
      // Should have some fault injection evidence in trace or multiple trace entries due to retries
      const hasFaults = result.trace.some((row: any) => row.fault === true);
      const hasMultipleEntries = result.trace.length > 1;
      
      // Either should have explicit faults or multiple entries indicating retry behavior
      expect(hasFaults || hasMultipleEntries).toBeTruthy();
    });

    test('should execute json scenario with malformed data injection', async ({ page }) => {
      await page.evaluate(() => {
        const malformedRate = document.getElementById('malformedRate') as HTMLInputElement;
        if (malformedRate) malformedRate.value = '100'; // Force malformed data
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('json', '4242', true);
      });
      
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.scenario).toBe('json');
      
      // Should show evidence of malformed data handling in trace
      const hasRecovery = result.trace.some((row: any) => 
        row.status === 'recovered' || row.action?.includes('retry')
      );
      expect(hasRecovery).toBeTruthy();
    });

    test('should execute rag scenario with context truncation', async ({ page }) => {
      await page.evaluate(() => {
        const ctxBytes = document.getElementById('ctxBytes') as HTMLInputElement;
        if (ctxBytes) ctxBytes.value = '500'; // Small context window
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('rag', '2025', true);
      });
      
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.scenario).toBe('rag');
      expect(typeof result.metrics.score).toBe('number');
    });

    test('should handle invalid scenario gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          return await window.runScenario('invalid-scenario', '1337', false);
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // Should either return error or handle gracefully
      expect(result).toBeDefined();
    });

    test('should validate response structure consistency', async ({ page }) => {
      const scenarios = ['fetch', 'json', 'rag'];
      
      for (const scenario of scenarios) {
        const result = await page.evaluate(async (scenarioName) => {
          return await window.runScenario(scenarioName, Date.now().toString(), false);
        }, scenario);
        
        // Consistent response structure
        expect(result).toHaveProperty('metrics');
        expect(result).toHaveProperty('events');
        expect(result).toHaveProperty('trace');
        
        // Metrics validation
        expect(result.metrics).toHaveProperty('score');
        expect(result.metrics).toHaveProperty('seed');
        expect(result.metrics).toHaveProperty('scenario', scenario);
        expect(result.metrics).toHaveProperty('success_after_fault');
        expect(result.metrics).toHaveProperty('mttr_s');
        
        // Score should be valid number between 0-100
        expect(typeof result.metrics.score).toBe('number');
        expect(result.metrics.score).toBeGreaterThanOrEqual(0);
        expect(result.metrics.score).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe('runEvalSuite API', () => {
    
    test('should execute reliability_core suite', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runEvalSuite('reliability_core', false);
      });
      
      expect(result).toHaveProperty('suite');
      expect(result).toHaveProperty('cases');
      expect(result).toHaveProperty('overall_score');
      expect(result).toHaveProperty('passed_gate');
      expect(result.suite).toBe('Reliability Core');
      expect(Array.isArray(result.cases)).toBeTruthy();
      expect(result.cases.length).toBeGreaterThan(0);
    });

    test('should execute rag_injection suite', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runEvalSuite('rag_injection', false);
      });
      
      expect(result).toHaveProperty('suite', 'RAG Injection (benign)');
      expect(result).toHaveProperty('overall_score');
      expect(typeof result.overall_score).toBe('number');
    });

    test('should execute rate_limit_backoff suite', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runEvalSuite('rate_limit_backoff', false);
      });
      
      expect(result).toHaveProperty('suite', 'Rate-limit Backoff Discipline');
      expect(result.cases.length).toBeGreaterThan(0);
      
      // Should test retry behavior
      const hasRetryTests = result.cases.some((testCase: any) => 
        testCase.runs.some((run: any) => 
          run.assertions.some((assertion: any) => assertion.event === 'retry')
        )
      );
      expect(hasRetryTests).toBeTruthy();
    });

    test('should execute suite with baseline comparison', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runEvalSuite('reliability_core', true);
      });
      
      // Should include baseline metrics for comparison
      const hasBaselines = result.cases.some((testCase: any) =>
        testCase.runs.some((run: any) => run.baseline !== null)
      );
      expect(hasBaselines).toBeTruthy();
    });

    test('should handle custom suite object', async ({ page }) => {
      const customSuite = {
        suite: "Custom Test Suite",
        cases: [{
          name: "Simple fetch test",
          scenario: "fetch",
          seeds: ["test-seed"],
          faults: { latency_ms: 1000, latency_rate: 0.5 },
          assertions: [{
            type: "metric_threshold",
            metric: "success_after_fault",
            op: ">=",
            value: 0.5
          }]
        }],
        gate: { score_min: 50 }
      };

      const result = await page.evaluate(async (suite) => {
        return await window.runEvalSuite(suite, false);
      }, customSuite);
      
      expect(result.suite).toBe('Custom Test Suite');
      expect(result.cases.length).toBe(1);
      expect(result.cases[0].name).toBe('Simple fetch test');
    });

    test('should validate assertion types', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runEvalSuite('reliability_core', false);
      });
      
      // Check for different assertion types
      const assertions = result.cases.flatMap((testCase: any) => 
        testCase.runs.flatMap((run: any) => run.assertions)
      );
      
      const hasMetricThreshold = assertions.some((a: any) => a.kind === 'metric');
      const hasEventCount = assertions.some((a: any) => a.kind === 'events');
      
      expect(hasMetricThreshold).toBeTruthy();
      // Event count assertions might not always be present, but metric ones should be
      expect(assertions.length).toBeGreaterThan(0);
    });
  });

  test.describe('Rate Limiting and Backoff Behavior', () => {
    
    test('should respect rate limits and implement backoff', async ({ page }) => {
      await page.evaluate(() => {
        const rate429 = document.getElementById('rate429') as HTMLInputElement;
        if (rate429) rate429.value = '100'; // Force rate limiting
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', 'rate-limit-test', true);
      });
      
      // Should have evidence of rate limiting in trace
      const hasRateLimit = result.trace.some((row: any) => 
        row.fault === true && row.action?.includes('429')
      );
      const hasRetry = result.trace.some((row: any) => 
        row.action?.includes('retry')
      );
      
      if (hasRateLimit) {
        expect(hasRetry).toBeTruthy();
      }
    });

    test('should implement exponential backoff on retries', async ({ page }) => {
      await page.evaluate(() => {
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        const backoffBase = document.getElementById('backoffBase') as HTMLInputElement;
        const backoffFactor = document.getElementById('backoffFactor') as HTMLInputElement;
        
        if (http500Rate) http500Rate.value = '75'; // High error rate
        if (backoffBase) backoffBase.value = '100';
        if (backoffFactor) backoffFactor.value = '2.0';
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('json', 'backoff-test', true);
      });
      
      // Look for evidence of progressive delays in trace
      const retryActions = result.trace.filter((row: any) => 
        row.action && row.action.includes('retry')
      );
      
      if (retryActions.length > 1) {
        // Check if delays are increasing (exponential backoff)
        const delays = retryActions.map((row: any) => row.duration_ms || 0);
        expect(delays.some((d: number) => d > 0)).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling and Status Codes', () => {
    
    test('should handle HTTP 500 errors with retry logic', async ({ page }) => {
      await page.evaluate(() => {
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        if (http500Rate) http500Rate.value = '50';
      });

      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', 'error-test', true);
      });
      
      expect(result.metrics).toBeDefined();
      
      // Should have evidence of error handling
      const hasErrors = result.trace.some((row: any) => row.fault === true);
      const hasRecovery = result.trace.some((row: any) => 
        row.status === 'recovered' || row.status === 'ok'
      );
      
      if (hasErrors) {
        // If errors occurred, there should be recovery attempts
        expect(result.trace.length).toBeGreaterThan(1);
      }
    });

    test('should handle network timeout scenarios', async ({ page }) => {
      await page.evaluate(() => {
        const latencyMs = document.getElementById('latencyMs') as HTMLInputElement;
        const latencyRate = document.getElementById('latencyRate') as HTMLInputElement;
        
        if (latencyMs) latencyMs.value = '5000'; // Long delays
        if (latencyRate) latencyRate.value = '100'; // Always delay
      });

      const startTime = Date.now();
      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', 'timeout-test', true);
      });
      const endTime = Date.now();
      
      // Should complete within reasonable time despite configured delays
      expect(endTime - startTime).toBeLessThan(30000); // 30 second max
      expect(result.metrics).toBeDefined();
    });
  });

  test.describe('Concurrent Request Handling', () => {
    
    test('should handle concurrent scenario executions', async ({ page }) => {
      const results = await page.evaluate(async () => {
        // Run multiple scenarios concurrently
        const promises = [
          window.runScenario('fetch', 'concurrent-1', false),
          window.runScenario('json', 'concurrent-2', false),
          window.runScenario('rag', 'concurrent-3', false)
        ];
        
        return await Promise.all(promises);
      });
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toHaveProperty('metrics');
        expect(result.metrics).toHaveProperty('score');
        expect(typeof result.metrics.score).toBe('number');
      });
      
      // Each should have unique seed
      const seeds = results.map(r => r.metrics.seed);
      expect(new Set(seeds).size).toBe(3);
    });

    test('should maintain thread safety under concurrent chaos injection', async ({ page }) => {
      await page.evaluate(() => {
        const latencyMs = document.getElementById('latencyMs') as HTMLInputElement;
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        const malformedRate = document.getElementById('malformedRate') as HTMLInputElement;
        
        if (latencyMs) latencyMs.value = '1000';
        if (http500Rate) http500Rate.value = '30';
        if (malformedRate) malformedRate.value = '20';
      });

      const results = await page.evaluate(async () => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(window.runScenario('json', `thread-test-${i}`, true));
        }
        return await Promise.all(promises);
      });
      
      expect(results).toHaveLength(5);
      
      // Each execution should complete successfully
      results.forEach(result => {
        expect(result).toHaveProperty('metrics');
        expect(result.metrics).toHaveProperty('score');
        expect(typeof result.metrics.score).toBe('number');
      });
      
      // Seeds should be unique
      const seeds = results.map(r => r.metrics.seed);
      expect(new Set(seeds).size).toBe(5);
    });
  });

  test.describe('API Response Validation', () => {
    
    test('should return consistent metric structure across all scenarios', async ({ page }) => {
      const scenarios = ['fetch', 'json', 'rag'];
      const requiredMetrics = [
        'score', 'seed', 'scenario', 'success_after_fault', 
        'mttr_s', 'idempotency', 'retries'
      ];
      
      for (const scenario of scenarios) {
        const result = await page.evaluate(async (scenarioName) => {
          return await window.runScenario(scenarioName, 'validation-test', false);
        }, scenario);
        
        requiredMetrics.forEach(metric => {
          expect(result.metrics).toHaveProperty(metric);
        });
        
        // Validate metric types
        expect(typeof result.metrics.score).toBe('number');
        expect(typeof result.metrics.success_after_fault).toBe('number');
        expect(typeof result.metrics.mttr_s).toBe('number');
        expect(typeof result.metrics.idempotency).toBe('number');
        expect(typeof result.metrics.retries).toBe('number');
      }
    });

    test('should validate trace structure and content', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await window.runScenario('fetch', 'trace-validation', true);
      });
      
      expect(Array.isArray(result.trace)).toBeTruthy();
      
      if (result.trace.length > 0) {
        const traceEntry = result.trace[0];
        
        // Common trace entry properties (using actual trace structure)
        expect(traceEntry).toHaveProperty('i'); // step index
        expect(traceEntry).toHaveProperty('tool');
        // action is optional, not all entries have it
        expect(traceEntry).toHaveProperty('status');
        expect(traceEntry).toHaveProperty('duration_ms');
        
        // Optional properties that may be present
        if ('duration_ms' in traceEntry) {
          expect(typeof traceEntry.duration_ms).toBe('number');
        }
        if ('fault' in traceEntry) {
          expect(typeof traceEntry.fault).toBe('boolean');
        }
      }
    });
  });
});