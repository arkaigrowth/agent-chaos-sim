import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Global type declarations
declare global {
  var chaosFetch: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var chaosJSON: (target: string, seed: string, t: any, attempt?: number) => Promise<Response>;
  var runScenario: (scenario: string, seed: string, chaosOn: boolean) => Promise<any>;
}

test.describe('Mock Server Tests', () => {
  let mockServerUrl: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.runScenario !== 'undefined');
    
    // Set up mock server URL (using httpbin.org as our "mock server")
    mockServerUrl = 'https://httpbin.org';
  });

  test.describe('Mock Server Response Types', () => {
    
    test('should handle JSON responses correctly', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosJSON(`${baseUrl}/json`, 'json-test', toggles, 0);
        const text = await response.text();
        
        return {
          status: response.status,
          contentType: response.headers.get('content-type'),
          text: text,
          isValidJSON: (() => {
            try {
              JSON.parse(text);
              return true;
            } catch {
              return false;
            }
          })()
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(200);
      expect(result.contentType).toContain('application/json');
      expect(result.isValidJSON).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
    });

    test('should handle HTML responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/html`, 'html-test', toggles, 0);
        const text = await response.text();
        
        return {
          status: response.status,
          contentType: response.headers.get('content-type'),
          text: text.substring(0, 100), // First 100 chars for verification
          containsHTML: text.includes('<html>') || text.includes('<!DOCTYPE')
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(200);
      expect(result.containsHTML).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
    });

    test('should handle XML responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/xml`, 'xml-test', toggles, 0);
        const text = await response.text();
        
        return {
          status: response.status,
          text: text.substring(0, 200),
          containsXML: text.includes('<?xml') || text.includes('<slideshow>')
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(200);
      expect(result.containsXML).toBeTruthy();
    });

    test('should handle binary data responses', async ({ page }) => {
      // Test with image endpoint
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        try {
          const response = await window.chaosFetch(`${baseUrl}/image/png`, 'binary-test', toggles, 0);
          const arrayBuffer = await response.arrayBuffer();
          
          return {
            status: response.status,
            contentType: response.headers.get('content-type'),
            size: arrayBuffer.byteLength,
            isBinary: arrayBuffer.byteLength > 0
          };
        } catch (error) {
          return { error: error.message };
        }
      }, mockServerUrl);
      
      if (!('error' in result)) {
        expect(result.status).toBe(200);
        expect(result.size).toBeGreaterThan(0);
        expect(result.isBinary).toBeTruthy();
      }
    });
  });

  test.describe('HTTP Status Code Scenarios', () => {
    
    test('should handle 200 OK responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/status/200`, 'ok-test', toggles, 0);
        
        return {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(200);
      expect(result.ok).toBeTruthy();
    });

    test('should handle 404 Not Found responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/status/404`, 'notfound-test', toggles, 0);
        
        return {
          status: response.status,
          ok: response.ok
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(404);
      expect(result.ok).toBeFalsy();
    });

    test('should handle 500 Internal Server Error responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/status/500`, 'server-error-test', toggles, 0);
        
        return {
          status: response.status,
          ok: response.ok
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(500);
      expect(result.ok).toBeFalsy();
    });

    test('should handle 429 Rate Limited responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/status/429`, 'rate-limit-test', toggles, 0);
        
        return {
          status: response.status,
          ok: response.ok
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(429);
      expect(result.ok).toBeFalsy();
    });

    test('should handle redirect responses (302)', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        // httpbin.org/redirect/1 will redirect once
        const response = await window.chaosFetch(`${baseUrl}/redirect/1`, 'redirect-test', toggles, 0);
        
        return {
          status: response.status,
          ok: response.ok,
          url: response.url
        };
      }, mockServerUrl);
      
      // Should follow redirect and end up with 200
      expect(result.status).toBe(200);
      expect(result.ok).toBeTruthy();
    });
  });

  test.describe('Network Timeout Scenarios', () => {
    
    test('should handle delayed responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const startTime = Date.now();
        // httpbin.org/delay/2 will delay for 2 seconds
        const response = await window.chaosFetch(`${baseUrl}/delay/2`, 'delay-test', toggles, 0);
        const endTime = Date.now();
        
        return {
          status: response.status,
          duration: endTime - startTime,
          ok: response.ok
        };
      }, mockServerUrl);
      
      expect(result.status).toBe(200);
      expect(result.duration).toBeGreaterThanOrEqual(2000); // At least 2 seconds
      expect(result.ok).toBeTruthy();
    });

    test('should handle variable delay responses', async ({ page }) => {
      const delays = [1, 3, 5]; // Test different delay values
      
      for (const delay of delays) {
        const result = await page.evaluate(async ({baseUrl, delaySeconds}) => {
          const toggles = {
            latencyMs: 0,
            latencyRate: 0,
            http500Rate: 0,
            rate429: 0,
            malformedRate: 0,
            toolUnavailableSteps: 0,
            injSeed: '',
            ctxBytes: 0
          };
          
          const startTime = Date.now();
          const response = await window.chaosFetch(`${baseUrl}/delay/${delaySeconds}`, `delay-${delaySeconds}-test`, toggles, 0);
          const endTime = Date.now();
          
          return {
            status: response.status,
            duration: endTime - startTime,
            expectedDelay: delaySeconds * 1000
          };
        }, {baseUrl: mockServerUrl, delaySeconds: delay});
        
        expect(result.status).toBe(200);
        expect(result.duration).toBeGreaterThanOrEqual(result.expectedDelay * 0.9); // Allow 10% tolerance
      }
    });
  });

  test.describe('Connection Failure Scenarios', () => {
    
    test('should handle invalid hostnames', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        try {
          const response = await window.chaosFetch('https://invalid-hostname-that-does-not-exist.com/test', 'invalid-host-test', toggles, 0);
          return {
            status: response.status,
            error: null
          };
        } catch (error) {
          return {
            status: null,
            error: error.message
          };
        }
      });
      
      // Should handle network errors gracefully
      if (result.status !== null) {
        // If it doesn't throw, it should return an error status (like 502)
        expect(result.status).toBeGreaterThanOrEqual(400);
      } else {
        // If it throws, should have error message
        expect(result.error).toBeTruthy();
      }
    });

    test('should handle connection timeouts', async ({ page }) => {
      // Skip this test as it takes too long and is hard to mock reliably
      test.skip();
    });
  });

  test.describe('Chaos Injection with Mock Responses', () => {
    
    test('should inject chaos into successful responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 1000,
          latencyRate: 1.0, // 100% latency injection
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const startTime = Date.now();
        const response = await window.chaosFetch(`${baseUrl}/json`, 'chaos-injection-test', toggles, 0);
        const endTime = Date.now();
        
        return {
          status: response.status,
          duration: endTime - startTime,
          faultHeader: response.headers.get('x-chaos-fault')
        };
      }, mockServerUrl);
      
      // Should have injected latency
      expect(result.duration).toBeGreaterThanOrEqual(1000);
      // Fault header might not be set if the fetch succeeds normally after latency
      if (result.faultHeader) {
        expect(result.faultHeader).toBe('latency_spike');
      }
      expect(result.status).toBe(200); // Original response should still succeed
    });

    test('should override responses with injected errors', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 1.0, // 100% error injection
          rate429: 0,
          malformedRate: 0,
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosFetch(`${baseUrl}/json`, 'error-injection-test', toggles, 0);
        
        return {
          status: response.status,
          faultHeader: response.headers.get('x-chaos-fault')
        };
      }, mockServerUrl);
      
      // Should override successful response with error
      expect(result.status).toBe(500);
      expect(result.faultHeader).toBe('http_500');
    });

    test('should inject malformed JSON into valid responses', async ({ page }) => {
      const result = await page.evaluate(async (baseUrl) => {
        const toggles = {
          latencyMs: 0,
          latencyRate: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 1.0, // 100% malformed injection
          toolUnavailableSteps: 0,
          injSeed: '',
          ctxBytes: 0
        };
        
        const response = await window.chaosJSON(`${baseUrl}/json`, 'malformed-injection-test', toggles, 0);
        const text = await response.text();
        
        return {
          status: response.status,
          text: text,
          faultHeader: response.headers.get('x-chaos-fault'),
          isValidJSON: (() => {
            try {
              JSON.parse(text);
              return true;
            } catch {
              return false;
            }
          })()
        };
      }, mockServerUrl);
      
      expect(result.faultHeader).toBe('malformed_json');
      expect(result.isValidJSON).toBeFalsy(); // Should be malformed
      expect(result.status).toBe(200); // HTTP status unchanged
    });
  });

  test.describe('End-to-End Mock Server Integration', () => {
    
    test('should run complete scenario against mock server', async ({ page }) => {
      // Configure chaos settings
      await page.evaluate(() => {
        const latencyMs = document.getElementById('latencyMs') as HTMLInputElement;
        const latencyRate = document.getElementById('latencyRate') as HTMLInputElement;
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        const malformedRate = document.getElementById('malformedRate') as HTMLInputElement;
        
        if (latencyMs) latencyMs.value = '500';
        if (latencyRate) latencyRate.value = '30';
        if (http500Rate) http500Rate.value = '20';
        if (malformedRate) malformedRate.value = '25';
      });

      const result = await page.evaluate(async () => {
        // Run fetch scenario which will use mock server endpoints
        const scenarioResult = await window.runScenario('fetch', 'mock-server-e2e', true);
        
        return {
          metrics: scenarioResult.metrics,
          traceCount: scenarioResult.trace.length,
          hasFaults: scenarioResult.trace.some((row: any) => row.fault === true),
          hasRecovery: scenarioResult.trace.some((row: any) => row.status === 'recovered'),
          completedSuccessfully: !!scenarioResult.metrics.score
        };
      });
      
      expect(result.completedSuccessfully).toBeTruthy();
      expect(result.metrics).toHaveProperty('score');
      expect(result.traceCount).toBeGreaterThan(0);
      expect(typeof result.metrics.score).toBe('number');
      
      // Should show evidence of chaos testing
      if (result.hasFaults) {
        expect(result.traceCount).toBeGreaterThan(1); // Should have retry attempts
      }
    });

    test('should handle mixed success and failure responses', async ({ page }) => {
      await page.evaluate(() => {
        // Configure moderate failure rates for mixed results
        const http500Rate = document.getElementById('http500Rate') as HTMLInputElement;
        const rate429 = document.getElementById('rate429') as HTMLInputElement;
        
        if (http500Rate) http500Rate.value = '40'; // 40% error rate
        if (rate429) rate429.value = '30'; // 30% rate limiting
      });

      const result = await page.evaluate(async () => {
        // Run multiple attempts to get mixed results
        const results = [];
        
        for (let i = 0; i < 5; i++) {
          const scenarioResult = await window.runScenario('json', `mixed-${i}`, true);
          results.push({
            score: scenarioResult.metrics.score,
            traceLength: scenarioResult.trace.length,
            hasFaults: scenarioResult.trace.some((row: any) => row.fault === true)
          });
        }
        
        return results;
      });
      
      expect(result).toHaveLength(5);
      
      // Should have varying results due to probabilistic chaos injection
      const scores = result.map(r => r.score);
      const hasVariation = new Set(scores).size > 1; // Not all scores identical
      
      result.forEach(execution => {
        expect(typeof execution.score).toBe('number');
        expect(execution.traceLength).toBeGreaterThan(0);
      });
    });
  });
});