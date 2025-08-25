import { test, expect } from '@playwright/test';

// Declare global functions from app.js
declare global {
  var seeded: (seed: string) => () => number;
  var chaosFetch: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var chaosJSON: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var chaosRAGDoc: (doc: string, seed: string, t: any) => string;
  var jitteredDelay: (base: number, factor: number, attempt: number, jitter: number, rand: () => number) => number;
  var should: (rate: number, rand: () => number) => boolean;
  var computeScore: (rows: any[], opts: { mttrTarget?: number }) => any;
  var withTripwire: (stepKey: string, exec: () => Promise<any>, cfg: any, onRetry: Function, onArrest: Function, seed: string) => Promise<any>;
  var setBadge: (score: number | null | undefined) => void;
  var toChaosYAML: (seed: string, t: any, loopN: number) => string;
}

test.describe('Unit Tests: Core Chaos Functions', () => {
  
  test.beforeEach(async ({ page }) => {
    // Load the application to get access to global functions
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app.js to be loaded and functions to be available
    await page.waitForFunction(() => typeof window.seeded !== 'undefined');
  });

  test.describe('RNG and Helper Functions', () => {
    
    test('seeded RNG produces consistent results', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand1 = seeded('test-seed');
        const rand2 = seeded('test-seed');
        const rand3 = seeded('different-seed');
        
        return {
          same_seed_1: rand1(),
          same_seed_2: rand2(),
          different_seed: rand3()
        };
      });
      
      // Same seed should produce same results
      expect(result.same_seed_1).toBe(result.same_seed_2);
      // Different seed should produce different results
      expect(result.same_seed_1).not.toBe(result.different_seed);
    });
    
    test('jitteredDelay calculates backoff correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = seeded('delay-test');
        const base = 100;
        const factor = 2.0;
        const jitter = 0.2;
        
        const delays = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          delays.push(jitteredDelay(base, factor, attempt, jitter, rand));
        }
        return delays;
      });
      
      // Should have increasing delays (approximately)
      expect(result[1]).toBeGreaterThan(result[0] * 1.5);
      expect(result[2]).toBeGreaterThan(result[1] * 1.5);
      
      // Should not be negative
      result.forEach(delay => expect(delay).toBeGreaterThanOrEqual(0));
    });
    
    test('should function works with rate parameter', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = seeded('should-test');
        const tests = {
          never: should(0, rand),
          always: should(1, rand),
          sometimes: []
        };
        
        // Test probabilistic behavior
        const rand2 = seeded('should-test-prob');
        for (let i = 0; i < 100; i++) {
          tests.sometimes.push(should(0.5, rand2));
        }
        
        const trueCount = tests.sometimes.filter(x => x).length;
        
        return {
          never: tests.never,
          always: tests.always,
          sometimes_rate: trueCount / 100
        };
      });
      
      expect(result.never).toBe(false);
      expect(result.always).toBe(true);
      // With rate 0.5, should be roughly 50% true (allowing for variance)
      expect(result.sometimes_rate).toBeGreaterThan(0.3);
      expect(result.sometimes_rate).toBeLessThan(0.7);
    });
  });

  test.describe('chaosFetch Function', () => {
    
    test('chaosFetch injects latency fault', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const start = performance.now();
        const response = await chaosFetch('https://httpbin.org/json', 'latency-test', {
          latencyMs: 1000,
          latencyRate: 1.0, // Always inject
          http500Rate: 0,
          rate429: 0
        });
        const duration = performance.now() - start;
        
        return {
          status: response.status,
          duration: duration,
          fault: response.headers.get('x-chaos-fault')
        };
      });
      
      // Should have injected latency
      expect(result.duration).toBeGreaterThan(900); // Allow some variance
      expect(result.fault).toBe('latency_spike');
    });
    
    test('chaosFetch injects HTTP 500 fault', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const response = await chaosFetch('https://httpbin.org/json', 'http500-test', {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 1.0, // Always inject
          rate429: 0
        });
        
        return {
          status: response.status,
          fault: response.headers.get('x-chaos-fault')
        };
      });
      
      expect(result.status).toBe(500);
      expect(result.fault).toBe('http_500');
    });
    
    test('chaosFetch injects HTTP 429 fault', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const response = await chaosFetch('https://httpbin.org/json', 'rate429-test', {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 1.0 // Always inject
        });
        
        return {
          status: response.status,
          fault: response.headers.get('x-chaos-fault')
        };
      });
      
      expect(result.status).toBe(429);
      expect(result.fault).toBe('rate_limit_429');
    });
    
    test('chaosFetch handles network errors', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          const response = await chaosFetch('https://nonexistent-domain-12345.com', 'network-error-test', {
            latencyMs: 0,
            latencyRate: 0,
            http500Rate: 0,
            rate429: 0
          });
          
          return {
            status: response.status,
            text: await response.text()
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });
      
      // Should return 502 for network errors
      if (result.status !== undefined) {
        expect(result.status).toBe(502);
      }
    });
    
    test('chaosFetch with no faults behaves normally', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const response = await chaosFetch('https://httpbin.org/json', 'no-fault-test', {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0
        });
        
        return {
          status: response.status,
          fault: response.headers.get('x-chaos-fault'),
          hasBody: (await response.text()).length > 0
        };
      });
      
      expect(result.status).toBe(200);
      expect(result.fault).toBeNull();
      expect(result.hasBody).toBe(true);
    });
  });

  test.describe('chaosJSON Function', () => {
    
    test('chaosJSON injects malformed JSON', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const response = await chaosJSON('https://jsonplaceholder.typicode.com/users/1', 'malformed-test', {
          malformedRate: 1.0, // Always inject
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0
        });
        
        const text = await response.text();
        
        return {
          status: response.status,
          fault: response.headers.get('x-chaos-fault'),
          text: text,
          isMalformed: !text.endsWith('}')
        };
      });
      
      expect(result.fault).toBe('malformed_json');
      expect(result.isMalformed).toBe(true);
    });
    
    test('chaosJSON preserves valid JSON when no fault', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const response = await chaosJSON('https://jsonplaceholder.typicode.com/users/1', 'no-malform-test', {
          malformedRate: 0, // Never inject
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0
        });
        
        const text = await response.text();
        let parsedSuccessfully = false;
        try {
          JSON.parse(text);
          parsedSuccessfully = true;
        } catch (e) {
          // Parse failed
        }
        
        return {
          status: response.status,
          fault: response.headers.get('x-chaos-fault'),
          parsedSuccessfully: parsedSuccessfully
        };
      });
      
      expect(result.status).toBe(200);
      expect(result.fault).toBeFalsy();
      expect(result.parsedSuccessfully).toBe(true);
    });
  });

  test.describe('chaosRAGDoc Function', () => {
    
    test('chaosRAGDoc truncates context', async ({ page }) => {
      const result = await page.evaluate(() => {
        const originalDoc = "This is a very long document that should be truncated when the chaos function is applied with context bytes limit.";
        const truncatedDoc = chaosRAGDoc(originalDoc, 'truncate-test', {
          ctxBytes: 50,
          injSeed: null
        });
        
        return {
          originalLength: originalDoc.length,
          truncatedLength: truncatedDoc.length,
          originalDoc,
          truncatedDoc
        };
      });
      
      expect(result.truncatedLength).toBe(50);
      expect(result.truncatedDoc).toBe(result.originalDoc.slice(0, 50));
    });
    
    test('chaosRAGDoc injects benign content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const originalDoc = "Original document content.";
        const injectedDoc = chaosRAGDoc(originalDoc, 'inject-test', {
          ctxBytes: 0,
          injSeed: 'benign-01'
        });
        
        return {
          originalDoc,
          injectedDoc,
          hasInjection: injectedDoc.includes('benign-injection:benign-01')
        };
      });
      
      expect(result.hasInjection).toBe(true);
      expect(result.injectedDoc).toContain(result.originalDoc);
      expect(result.injectedDoc).toContain('Ignore untrusted context');
    });
    
    test('chaosRAGDoc handles both truncation and injection', async ({ page }) => {
      const result = await page.evaluate(() => {
        const originalDoc = "This is a long document that will be both truncated and have content injected.";
        const modifiedDoc = chaosRAGDoc(originalDoc, 'both-test', {
          ctxBytes: 30,
          injSeed: 'benign-02'
        });
        
        return {
          modifiedDoc,
          isTruncated: modifiedDoc.length > 30, // Should be longer due to injection
          hasInjection: modifiedDoc.includes('benign-injection:benign-02')
        };
      });
      
      expect(result.hasInjection).toBe(true);
      expect(result.isTruncated).toBe(true);
    });
  });

  test.describe('Score Calculation', () => {
    
    test('computeScore calculates basic score correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rows = [
          { fault: true, status: 'recovered', duration_ms: 1000 },
          { fault: true, status: 'ok', duration_ms: 500 },
          { action: 'retry(1)' },
          { tool: 'test', status: 'ok' }
        ];
        
        return computeScore(rows, { mttrTarget: 30 });
      });
      
      expect(result.success_after_fault).toBe(1.0); // All faults recovered
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.retries).toBe(1);
    });
    
    test('computeScore handles no faults scenario', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rows = [
          { tool: 'test', status: 'ok' },
          { tool: 'test2', status: 'ok' }
        ];
        
        return computeScore(rows, { mttrTarget: 30 });
      });
      
      expect(result.success_after_fault).toBe(1.0);
      expect(result.mttr_s).toBe(0);
      expect(result.score).toBe(100); // Perfect score when no faults
    });
    
    test('computeScore penalizes failed recoveries', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rows = [
          { fault: true, status: 'failed', duration_ms: 5000 },
          { fault: true, status: 'recovered', duration_ms: 1000 },
          { action: 'retry(2)' }
        ];
        
        return computeScore(rows, { mttrTarget: 30 });
      });
      
      expect(result.success_after_fault).toBe(0.5); // Only half recovered
      expect(result.score).toBeLessThan(80); // Should be penalized
    });
  });

  test.describe('Tripwire Mechanism', () => {
    
    test('withTripwire succeeds on first try', async ({ page }) => {
      const result = await page.evaluate(async () => {
        let attempts = 0;
        const result = await withTripwire(
          'test-step',
          async () => {
            attempts++;
            return 'success';
          },
          { on: true, maxRetries: 3, backoffBase: 100, backoffFactor: 2, jitter: 0.1 },
          () => {},
          () => {},
          'test-seed'
        );
        
        return {
          ...result,
          attempts
        };
      });
      
      expect(result.ok).toBe(true);
      expect(result.value).toBe('success');
      expect(result.retries).toBe(0);
      expect(result.attempts).toBe(1);
      expect(result.arrested).toBe(false);
    });
    
    test('withTripwire retries on failure', async ({ page }) => {
      const result = await page.evaluate(async () => {
        let attempts = 0;
        const result = await withTripwire(
          'test-step',
          async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error('Temporary failure');
            }
            return 'success-after-retries';
          },
          { on: true, maxRetries: 3, backoffBase: 10, backoffFactor: 2, jitter: 0.1 },
          () => {},
          () => {},
          'test-seed'
        );
        
        return {
          ...result,
          attempts
        };
      });
      
      expect(result.ok).toBe(true);
      expect(result.value).toBe('success-after-retries');
      expect(result.retries).toBe(2);
      expect(result.attempts).toBe(3);
    });
    
    test('withTripwire handles loop arrest', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const result = await withTripwire(
          'test-step',
          async () => {
            throw new Error('loop_arrest detected');
          },
          { on: true, maxRetries: 3, backoffBase: 10, backoffFactor: 2, jitter: 0.1 },
          () => {},
          () => {},
          'test-seed'
        );
        
        return result;
      });
      
      expect(result.ok).toBe(false);
      expect(result.arrested).toBe(true);
      expect(result.retries).toBe(0);
    });
    
    test('withTripwire disabled mode', async ({ page }) => {
      const result = await page.evaluate(async () => {
        let attempts = 0;
        const result = await withTripwire(
          'test-step',
          async () => {
            attempts++;
            if (attempts === 1) {
              throw new Error('First attempt fails');
            }
            return 'success';
          },
          { on: false }, // Disabled - should not retry
          () => {},
          () => {},
          'test-seed'
        );
        
        return {
          ...result,
          attempts
        };
      });
      
      expect(result.ok).toBe(false);
      expect(result.retries).toBe(0);
      expect(result.attempts).toBe(1);
    });
  });

  test.describe('UI Helper Functions', () => {
    
    test('setBadge handles valid scores', async ({ page }) => {
      // Add a score badge element for testing
      await page.evaluate(() => {
        const badge = document.createElement('div');
        badge.id = 'scoreBadge';
        badge.className = 'badge';
        document.body.appendChild(badge);
      });
      
      const tests = [
        { score: 95, expected: '95%', classes: ['badge', 'score-excellent'] },
        { score: 75, expected: '75%', classes: ['badge', 'score-good'] },
        { score: 55, expected: '55%', classes: ['badge', 'score-poor'] },
        { score: 25, expected: '25%', classes: ['badge', 'score-poor'] }
      ];
      
      for (const { score, expected, classes } of tests) {
        const result = await page.evaluate((s) => {
          setBadge(s);
          const badge = document.getElementById('scoreBadge');
          return {
            text: badge?.textContent,
            classes: Array.from(badge?.classList || [])
          };
        }, score);
        
        expect(result.text).toBe(expected);
        expect(result.classes).toEqual(expect.arrayContaining(classes));
      }
    });
    
    test('setBadge handles edge cases', async ({ page }) => {
      await page.evaluate(() => {
        const badge = document.createElement('div');
        badge.id = 'scoreBadge';
        document.body.appendChild(badge);
      });
      
      const edgeCases = [null, undefined, NaN, -10, 150];
      
      for (const score of edgeCases) {
        const result = await page.evaluate((s) => {
          setBadge(s);
          const badge = document.getElementById('scoreBadge');
          return badge?.textContent;
        }, score);
        
        if (score === null || score === undefined || isNaN(score)) {
          expect(result).toBe('—');
        } else if (score < 0) {
          expect(result).toBe('0%');
        } else if (score > 100) {
          expect(result).toBe('100%');
        }
      }
    });
  });

  test.describe('YAML Generation', () => {
    
    test('toChaosYAML generates valid YAML', async ({ page }) => {
      const result = await page.evaluate(() => {
        return toChaosYAML('test-seed-123', {
          latencyRate: 0.2,
          latencyMs: 1000,
          http500Rate: 0.1,
          rate429: 0.05,
          malformedRate: 0.15,
          ctxBytes: 500
        }, 10);
      });
      
      expect(result).toContain('mode: chaos_monkey');
      expect(result).toContain('seed: test-seed-123');
      expect(result).toContain('probability: 0.2');
      expect(result).toContain('delay_ms: 1000');
      expect(result).toContain('probability: 0.1');
      expect(result).toContain('probability: 0.05');
      expect(result).toContain('probability: 0.15');
      expect(result).toContain('bytes: 500');
      expect(result).toContain('loop_arrest_n: 10');
    });
  });

  test.describe('Deterministic Behavior', () => {
    
    test('same seed produces same chaos results', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const seed = 'deterministic-test';
        
        // Test seeded RNG consistency
        const rand1 = seeded(seed + ':test1');
        const rand2 = seeded(seed + ':test1');
        
        const values1 = [rand1(), rand1(), rand1()];
        const values2 = [rand2(), rand2(), rand2()];
        
        // Test chaos function consistency (mocked since we can't make actual network calls consistently)
        const chaosConfig = {
          latencyRate: 0.5,
          latencyMs: 1000,
          http500Rate: 0.1,
          rate429: 0.05,
          malformedRate: 0.2
        };
        
        const shouldResults1 = [
          should(chaosConfig.latencyRate, seeded(seed + ':chaos1')),
          should(chaosConfig.http500Rate, seeded(seed + ':chaos1')),
          should(chaosConfig.malformedRate, seeded(seed + ':chaos1'))
        ];
        
        const shouldResults2 = [
          should(chaosConfig.latencyRate, seeded(seed + ':chaos1')),
          should(chaosConfig.http500Rate, seeded(seed + ':chaos1')),
          should(chaosConfig.malformedRate, seeded(seed + ':chaos1'))
        ];
        
        return {
          rng_consistent: JSON.stringify(values1) === JSON.stringify(values2),
          chaos_consistent: JSON.stringify(shouldResults1) === JSON.stringify(shouldResults2)
        };
      });
      
      expect(result.rng_consistent).toBe(true);
      expect(result.chaos_consistent).toBe(true);
    });
  });
});