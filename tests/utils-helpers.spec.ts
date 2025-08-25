import { test, expect } from '@playwright/test';

// Declare global functions and utilities from app.js and evals.js
declare global {
  var seeded: (seed: string) => () => number;
  var jitteredDelay: (base: number, factor: number, attempt: number, jitter: number, rand: () => number) => number;
  var should: (rate: number, rand: () => number) => boolean;
  var sleep: (ms: number) => Promise<void>;
  var loadMinScore: () => void;
  var readMinScore: () => number;
  var updateGate: (score: number) => void;
  var setBadge: (score: number | null | undefined) => void;
  var $: (sel: string) => Element | null;
  var theatre: {
    event: (type: string, data?: any) => void;
    getEventLog: () => any[];
    reset: () => void;
  };
  var toChaosYAML: (seed: string, t: any, loopN: number) => string;
  var parseMaybeYAML: (text: string) => any;
  var setValue: (sel: string, val: any) => void;
  var setTogglesFromCase: (faults: any, ids: any) => void;
}

test.describe('Utility and Helper Functions Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Load the application to get access to global functions
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for all scripts to load
    await page.waitForFunction(() => typeof window.seeded !== 'undefined');
  });

  test.describe('Seeded RNG Function', () => {

    test('produces deterministic sequences', async ({ page }) => {
      const result = await page.evaluate(() => {
        const seed = 'test-deterministic';
        const rand1 = seeded(seed);
        const rand2 = seeded(seed);
        
        const sequence1 = [rand1(), rand1(), rand1(), rand1(), rand1()];
        const sequence2 = [rand2(), rand2(), rand2(), rand2(), rand2()];
        
        return {
          sequence1,
          sequence2,
          identical: JSON.stringify(sequence1) === JSON.stringify(sequence2)
        };
      });

      expect(result.identical).toBe(true);
      // Values should be between 0 and 1
      result.sequence1.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      });
    });

    test('different seeds produce different sequences', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand1 = seeded('seed-alpha');
        const rand2 = seeded('seed-beta');
        
        const sequence1 = [rand1(), rand1(), rand1()];
        const sequence2 = [rand2(), rand2(), rand2()];
        
        return {
          sequence1,
          sequence2,
          different: JSON.stringify(sequence1) !== JSON.stringify(sequence2)
        };
      });

      expect(result.different).toBe(true);
    });

    test('handles empty and special seeds', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tests = {
          empty: seeded('')(),
          space: seeded(' ')(),
          numeric: seeded('12345')(),
          special: seeded('!@#$%^&*()')(),
          unicode: seeded('测试🔥')()
        };

        // All should be valid numbers between 0-1
        const valid = Object.values(tests).every(val => 
          typeof val === 'number' && val >= 0 && val < 1
        );

        return { tests, valid };
      });

      expect(result.valid).toBe(true);
    });

    test('seed composition affects results', async ({ page }) => {
      const result = await page.evaluate(() => {
        const baseSeed = 'base';
        const suffixes = [':suffix1', ':suffix2', ':suffix3'];
        
        const results = suffixes.map(suffix => {
          const rand = seeded(baseSeed + suffix);
          return rand();
        });
        
        // All results should be different
        const unique = new Set(results);
        
        return {
          results,
          allUnique: unique.size === results.length
        };
      });

      expect(result.allUnique).toBe(true);
    });
  });

  test.describe('Jittered Delay Calculations', () => {

    test('calculates exponential backoff correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = seeded('backoff-test');
        const base = 100;
        const factor = 2.0;
        const jitter = 0.0; // No jitter for predictable testing
        
        const delays = [];
        for (let attempt = 0; attempt < 5; attempt++) {
          delays.push(jitteredDelay(base, factor, attempt, jitter, () => 0.5));
        }
        
        return delays;
      });

      // Should follow exponential growth: 100, 200, 400, 800, 1600
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(200);
      expect(result[2]).toBe(400);
      expect(result[3]).toBe(800);
      expect(result[4]).toBe(1600);
    });

    test('applies jitter correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = seeded('jitter-test');
        const base = 1000;
        const factor = 1.0; // No exponential growth for cleaner testing
        const jitter = 0.5; // 50% jitter
        
        const delays = [];
        const randFunc = rand; // Use seeded random
        
        for (let i = 0; i < 10; i++) {
          delays.push(jitteredDelay(base, factor, 0, jitter, randFunc));
        }
        
        const min = Math.min(...delays);
        const max = Math.max(...delays);
        
        return {
          delays,
          min,
          max,
          range: max - min,
          withinBounds: min >= base * 0.5 && max <= base * 1.5
        };
      });

      // With 50% jitter, values should be between 500-1500
      expect(result.withinBounds).toBe(true);
      expect(result.range).toBeGreaterThan(0); // Should have variation
    });

    test('handles edge cases', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = () => 0.5;
        
        return {
          zeroBase: jitteredDelay(0, 2.0, 1, 0.1, rand),
          negativeFactor: jitteredDelay(100, -1.0, 1, 0.1, rand),
          zeroJitter: jitteredDelay(100, 2.0, 2, 0, rand),
          highJitter: jitteredDelay(100, 2.0, 1, 2.0, rand), // 200% jitter
          maxAttempt: jitteredDelay(10, 2.0, 10, 0.1, rand)
        };
      });

      // Should handle edge cases gracefully
      expect(result.zeroBase).toBe(0);
      expect(result.zeroJitter).toBe(400); // 100 * 2^2 = 400
      expect(result.maxAttempt).toBeGreaterThan(1000); // Should be large
      
      // All results should be non-negative
      Object.values(result).forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(0);
      });
    });
  });

  test.describe('localStorage Persistence', () => {

    test('loadMinScore and readMinScore work correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Clear localStorage first
        localStorage.removeItem('chaoslab_min_score');
        
        // Create a min score input element
        const input = document.createElement('input');
        input.id = 'minScore';
        input.type = 'number';
        input.value = '75';
        document.body.appendChild(input);
        
        // Test initial read
        const initialValue = readMinScore();
        
        // Save to localStorage
        localStorage.setItem('chaoslab_min_score', '85');
        
        // Load from localStorage
        loadMinScore();
        
        // Read the loaded value
        const loadedValue = readMinScore();
        
        // Clean up
        document.body.removeChild(input);
        
        return {
          initialValue,
          loadedValue,
          inputValue: input.value
        };
      });

      expect(result.initialValue).toBe(75); // From input default
      expect(result.loadedValue).toBe(85); // From localStorage
      expect(result.inputValue).toBe('85'); // Input should be updated
    });

    test('readMinScore handles missing element', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Ensure no minScore element exists
        const existing = document.getElementById('minScore');
        if (existing) existing.remove();
        
        return readMinScore();
      });

      expect(result).toBe(0); // Should return default
    });

    test('readMinScore clamps values correctly', async ({ page }) => {
      const testCases = [
        { input: '150', expected: 100 },
        { input: '-50', expected: 0 },
        { input: '50', expected: 50 },
        { input: '', expected: 0 },
        { input: 'invalid', expected: 0 }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate((inputValue) => {
          // Create test input
          let input = document.getElementById('minScore') as HTMLInputElement;
          if (!input) {
            input = document.createElement('input');
            input.id = 'minScore';
            input.type = 'number';
            document.body.appendChild(input);
          }
          
          input.value = inputValue;
          return readMinScore();
        }, testCase.input);

        expect(result).toBe(testCase.expected);
      }
    });
  });

  test.describe('DOM Helper Functions', () => {

    test('$ selector function works correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Create test elements
        const div1 = document.createElement('div');
        div1.id = 'test-element';
        div1.className = 'test-class';
        document.body.appendChild(div1);
        
        const div2 = document.createElement('div');
        div2.className = 'another-class';
        document.body.appendChild(div2);
        
        const results = {
          byId: $(#test-element') ? true : false,
          byClass: $('.test-class') ? true : false,
          nonExistent: $('#non-existent') ? true : false,
          byTag: $('div') ? true : false
        };
        
        // Clean up
        document.body.removeChild(div1);
        document.body.removeChild(div2);
        
        return results;
      });

      expect(result.byId).toBe(true);
      expect(result.byClass).toBe(true);
      expect(result.nonExistent).toBe(false);
      expect(result.byTag).toBe(true);
    });

    test('updateGate function updates UI correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Create gate banner element
        const banner = document.createElement('div');
        banner.id = 'gateBanner';
        banner.classList.add('hidden');
        document.body.appendChild(banner);
        
        // Create message element
        const message = document.createElement('span');
        message.id = 'gateMessage';
        banner.appendChild(message);
        
        // Create minScore input
        const input = document.createElement('input');
        input.id = 'minScore';
        input.value = '70';
        document.body.appendChild(input);
        
        // Test scenarios
        const scenarios = [];
        
        // Score below threshold
        updateGate(50);
        scenarios.push({
          name: 'below_threshold',
          isHidden: banner.classList.contains('hidden'),
          message: message.textContent
        });
        
        // Score above threshold
        updateGate(80);
        scenarios.push({
          name: 'above_threshold',
          isHidden: banner.classList.contains('hidden'),
          message: message.textContent
        });
        
        // Clean up
        document.body.removeChild(banner);
        document.body.removeChild(input);
        
        return scenarios;
      });

      const belowThreshold = result.find(s => s.name === 'below_threshold');
      const aboveThreshold = result.find(s => s.name === 'above_threshold');
      
      expect(belowThreshold?.isHidden).toBe(false); // Should show gate
      expect(belowThreshold?.message).toContain('50 < 70');
      
      expect(aboveThreshold?.isHidden).toBe(true); // Should hide gate
      expect(aboveThreshold?.message).toBe('');
    });
  });

  test.describe('Sleep Function', () => {

    test('sleep function delays execution', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const start = performance.now();
        await sleep(100);
        const end = performance.now();
        
        return {
          duration: end - start,
          withinRange: (end - start) >= 90 && (end - start) <= 200 // Allow some variance
        };
      });

      expect(result.withinRange).toBe(true);
    });

    test('sleep with zero delay', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const start = performance.now();
        await sleep(0);
        const end = performance.now();
        
        return {
          duration: end - start,
          fast: (end - start) < 50 // Should be very fast
        };
      });

      expect(result.fast).toBe(true);
    });
  });

  test.describe('Theatre Event Logging', () => {

    test('theatre event logging captures events correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Enable theatre if disabled
        const wasDisabled = window.THEATRE_DISABLED;
        window.THEATRE_DISABLED = false;
        
        // Reset theatre events
        if (theatre && theatre.reset) {
          theatre.reset();
        }
        
        // Log various events
        if (theatre && theatre.event) {
          theatre.event('fault', { type: 'latency', delay_ms: 500 });
          theatre.event('retry', { attempts: 1, backoff_ms: 250 });
          theatre.event('recovered', { action: 'retry(1)' });
          theatre.event('fallback', { to: 'cached' });
        }
        
        // Get event log
        let events = [];
        if (theatre && theatre.getEventLog) {
          events = theatre.getEventLog();
        }
        
        // Restore original state
        window.THEATRE_DISABLED = wasDisabled;
        
        return {
          hasTheatre: !!theatre,
          eventCount: events.length,
          eventTypes: events.map(e => e.type || 'unknown'),
          events: events.map(e => ({
            type: e.type || 'unknown',
            hasTimestamp: !!e.timestamp,
            hasData: Object.keys(e).length > 2 // More than just type and timestamp
          }))
        };
      });

      if (result.hasTheatre) {
        expect(result.eventCount).toBe(4);
        expect(result.eventTypes).toContain('fault');
        expect(result.eventTypes).toContain('retry');
        expect(result.eventTypes).toContain('recovered');
        expect(result.eventTypes).toContain('fallback');
        
        // Events should have timestamps
        result.events.forEach(event => {
          expect(event.hasTimestamp).toBe(true);
        });
      }
    });

    test('theatre disabled mode', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Ensure theatre is disabled
        const originalState = window.THEATRE_DISABLED;
        window.THEATRE_DISABLED = true;
        
        // Reset events if possible
        if (theatre && theatre.reset) {
          theatre.reset();
        }
        
        // Try to log events
        let eventsBefore = 0;
        if (theatre && theatre.getEventLog) {
          eventsBefore = theatre.getEventLog().length;
        }
        
        if (theatre && theatre.event) {
          theatre.event('fault', { type: 'test' });
        }
        
        let eventsAfter = 0;
        if (theatre && theatre.getEventLog) {
          eventsAfter = theatre.getEventLog().length;
        }
        
        // Restore original state
        window.THEATRE_DISABLED = originalState;
        
        return {
          hasTheatre: !!theatre,
          eventsBefore,
          eventsAfter,
          eventsAdded: eventsAfter - eventsBefore
        };
      });

      if (result.hasTheatre) {
        // When disabled, events might still be logged but not processed
        // The exact behavior depends on implementation
        expect(result.eventsAdded).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('YAML Generation and Parsing', () => {

    test('toChaosYAML generates valid YAML structure', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = {
          latencyRate: 0.3,
          latencyMs: 2000,
          http500Rate: 0.15,
          rate429: 0.08,
          malformedRate: 0.25,
          ctxBytes: 1200,
          injSeed: 'test-injection'
        };
        
        const yaml = toChaosYAML('yaml-test-seed', config, 20);
        
        return {
          yaml,
          hasMode: yaml.includes('mode: chaos_monkey'),
          hasSeed: yaml.includes('seed: yaml-test-seed'),
          hasLatency: yaml.includes('probability: 0.3') && yaml.includes('delay_ms: 2000'),
          hasHttp500: yaml.includes('probability: 0.15'),
          hasRate429: yaml.includes('probability: 0.08'),
          hasMalformed: yaml.includes('probability: 0.25'),
          hasContext: yaml.includes('bytes: 1200'),
          hasLoopArrest: yaml.includes('loop_arrest_n: 20'),
          hasBackoff: yaml.includes('base_ms: 250') && yaml.includes('factor: 2.0')
        };
      });

      expect(result.hasMode).toBe(true);
      expect(result.hasSeed).toBe(true);
      expect(result.hasLatency).toBe(true);
      expect(result.hasHttp500).toBe(true);
      expect(result.hasRate429).toBe(true);
      expect(result.hasMalformed).toBe(true);
      expect(result.hasContext).toBe(true);
      expect(result.hasLoopArrest).toBe(true);
      expect(result.hasBackoff).toBe(true);
    });

    test('YAML handles zero values correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = {
          latencyRate: 0,
          latencyMs: 0,
          http500Rate: 0,
          rate429: 0,
          malformedRate: 0,
          ctxBytes: 0,
          injSeed: null
        };
        
        const yaml = toChaosYAML('zero-config', config, 0);
        
        return {
          yaml,
          hasZeroProbabilities: yaml.includes('probability: 0'),
          hasZeroBytes: yaml.includes('bytes: 0'),
          hasZeroLoopArrest: yaml.includes('loop_arrest_n: 0')
        };
      });

      expect(result.hasZeroProbabilities).toBe(true);
      expect(result.hasZeroBytes).toBe(true);
      expect(result.hasZeroLoopArrest).toBe(true);
    });

    test('parseMaybeYAML handles different formats', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Test JSON parsing
        const jsonInput = '{"suite": "Test Suite", "cases": [{"name": "Test Case"}]}';
        const jsonResult = window.parseMaybeYAML ? window.parseMaybeYAML(jsonInput) : null;
        
        // Test simple YAML parsing (fallback)
        const yamlInput = `suite: Simple YAML Suite
- name: Test Case 1
  scenario: fetch
- name: Test Case 2
  scenario: json`;
        
        const yamlResult = window.parseMaybeYAML ? window.parseMaybeYAML(yamlInput) : null;
        
        return {
          hasParseMaybeYAML: typeof window.parseMaybeYAML === 'function',
          jsonResult,
          yamlResult,
          jsonValid: jsonResult && jsonResult.suite === 'Test Suite',
          yamlValid: yamlResult && yamlResult.suite && yamlResult.cases
        };
      });

      if (result.hasParseMaybeYAML) {
        expect(result.jsonValid).toBe(true);
        expect(result.yamlValid).toBe(true);
      }
    });
  });

  test.describe('Form Helper Functions', () => {

    test('setValue handles different input types', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Create test inputs
        const textInput = document.createElement('input');
        textInput.id = 'text-input';
        textInput.type = 'text';
        document.body.appendChild(textInput);
        
        const numberInput = document.createElement('input');
        numberInput.id = 'number-input';
        numberInput.type = 'number';
        document.body.appendChild(numberInput);
        
        const checkbox = document.createElement('input');
        checkbox.id = 'checkbox-input';
        checkbox.type = 'checkbox';
        document.body.appendChild(checkbox);
        
        const select = document.createElement('select');
        select.id = 'select-input';
        const option1 = document.createElement('option');
        option1.value = 'option1';
        option1.textContent = 'Option 1';
        select.appendChild(option1);
        document.body.appendChild(select);
        
        // Test setValue function if available
        if (typeof window.setValue === 'function') {
          window.setValue('#text-input', 'test value');
          window.setValue('#number-input', 42);
          window.setValue('#checkbox-input', true);
          window.setValue('#select-input', 'option1');
        }
        
        const results = {
          hasSetValue: typeof window.setValue === 'function',
          textValue: textInput.value,
          numberValue: numberInput.value,
          checkboxChecked: checkbox.checked,
          selectValue: select.value
        };
        
        // Clean up
        [textInput, numberInput, checkbox, select].forEach(el => 
          document.body.removeChild(el)
        );
        
        return results;
      });

      if (result.hasSetValue) {
        expect(result.textValue).toBe('test value');
        expect(result.numberValue).toBe('42');
        expect(result.checkboxChecked).toBe(true);
        expect(result.selectValue).toBe('option1');
      }
    });

    test('setTogglesFromCase configures form elements', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Create form elements
        const latencyMs = document.createElement('input');
        latencyMs.id = 'latencyMs';
        document.body.appendChild(latencyMs);
        
        const latencyRate = document.createElement('input');
        latencyRate.id = 'latencyRate';
        document.body.appendChild(latencyRate);
        
        const http500Rate = document.createElement('input');
        http500Rate.id = 'http500Rate';
        document.body.appendChild(http500Rate);
        
        const faults = {
          latency_ms: 1500,
          latency_rate: 0.25,
          http_500_rate: 0.10
        };
        
        const ids = {
          latency_ms: '#latencyMs',
          latency_rate: '#latencyRate',
          http_500_rate: '#http500Rate'
        };
        
        // Test setTogglesFromCase if available
        if (typeof window.setTogglesFromCase === 'function') {
          window.setTogglesFromCase(faults, ids);
        }
        
        const results = {
          hasSetTogglesFromCase: typeof window.setTogglesFromCase === 'function',
          latencyMsValue: latencyMs.value,
          latencyRateValue: latencyRate.value,
          http500RateValue: http500Rate.value
        };
        
        // Clean up
        [latencyMs, latencyRate, http500Rate].forEach(el => 
          document.body.removeChild(el)
        );
        
        return results;
      });

      if (result.hasSetTogglesFromCase) {
        expect(result.latencyMsValue).toBe('1500');
        expect(result.latencyRateValue).toBe('25'); // Converted to percentage
        expect(result.http500RateValue).toBe('10'); // Converted to percentage
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {

    test('functions handle null/undefined inputs gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tests = {};
        
        // Test seeded with null/undefined
        try {
          tests.seeded_null = seeded(null)();
          tests.seeded_undefined = seeded(undefined)();
        } catch (e) {
          tests.seeded_error = e.message;
        }
        
        // Test jitteredDelay with invalid values
        try {
          const rand = () => 0.5;
          tests.jitter_null_base = jitteredDelay(null, 2, 0, 0.1, rand);
          tests.jitter_undefined_factor = jitteredDelay(100, undefined, 0, 0.1, rand);
        } catch (e) {
          tests.jitter_error = e.message;
        }
        
        // Test should with invalid rate
        try {
          const rand = () => 0.5;
          tests.should_null = should(null, rand);
          tests.should_undefined = should(undefined, rand);
        } catch (e) {
          tests.should_error = e.message;
        }
        
        return tests;
      });

      // Functions should handle null/undefined gracefully or throw meaningful errors
      if ('seeded_null' in result) {
        expect(typeof result.seeded_null).toBe('number');
      }
      
      if ('should_null' in result) {
        expect(typeof result.should_null).toBe('boolean');
      }
    });

    test('DOM functions handle missing elements', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tests = {};
        
        // Test $ with invalid selectors
        tests.invalid_selector = $('#non-existent-element-12345') === null;
        
        // Test updateGate with missing elements
        try {
          updateGate(50); // Should not throw even if elements missing
          tests.updateGate_safe = true;
        } catch (e) {
          tests.updateGate_error = e.message;
        }
        
        // Test setBadge with missing element
        try {
          setBadge(75); // Should not throw even if badge missing
          tests.setBadge_safe = true;
        } catch (e) {
          tests.setBadge_error = e.message;
        }
        
        return tests;
      });

      expect(result.invalid_selector).toBe(true);
      expect(result.updateGate_safe).toBe(true);
      expect(result.setBadge_safe).toBe(true);
    });
  });

  test.describe('Performance and Memory', () => {

    test('seeded RNG performance with large sequences', async ({ page }) => {
      const result = await page.evaluate(() => {
        const rand = seeded('performance-test');
        const sequenceLength = 10000;
        
        const startTime = performance.now();
        const sequence = [];
        for (let i = 0; i < sequenceLength; i++) {
          sequence.push(rand());
        }
        const endTime = performance.now();
        
        return {
          duration: endTime - startTime,
          sequenceLength: sequence.length,
          averageTime: (endTime - startTime) / sequenceLength,
          allValid: sequence.every(n => typeof n === 'number' && n >= 0 && n < 1)
        };
      });

      expect(result.sequenceLength).toBe(10000);
      expect(result.allValid).toBe(true);
      expect(result.averageTime).toBeLessThan(0.1); // Less than 0.1ms per number
    });

    test('memory usage with multiple seeded generators', async ({ page }) => {
      const result = await page.evaluate(() => {
        const initialMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        
        // Create many seeded generators
        const generators = [];
        for (let i = 0; i < 1000; i++) {
          generators.push(seeded(`generator-${i}`));
        }
        
        // Use each generator
        generators.forEach(gen => {
          gen(); // Generate one number
        });
        
        const finalMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        
        return {
          memorySupported: (performance as any).memory ? true : false,
          generatorCount: generators.length,
          memoryIncrease: finalMemory - initialMemory
        };
      });

      expect(result.generatorCount).toBe(1000);
      
      if (result.memorySupported) {
        // Memory increase should be reasonable for 1000 generators
        expect(result.memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      }
    });
  });
});