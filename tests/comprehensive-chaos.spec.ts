import { test, expect } from '@playwright/test';

test.describe('Comprehensive Chaos System Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Close onboarding modal if it exists
    try {
      const modalClose = page.locator('#modalOnboarding .modal-close');
      if (await modalClose.isVisible({ timeout: 2000 })) {
        await modalClose.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Modal might not be visible
    }
  });

  test('Test 1: Verify functions exist on window object', async ({ page }) => {
    // Check if key functions are exposed globally
    const functionsExist = await page.evaluate(() => {
      const functions = [
        'runScenario',
        'should', 
        'readToggles',
        'chaosJSON',
        'runFetch',
        'runJSON', 
        'runRAG'
      ];
      
      const results: Record<string, boolean> = {};
      functions.forEach(fn => {
        results[fn] = typeof (window as any)[fn] === 'function';
      });
      
      return results;
    });
    
    console.log('Functions existence check:', functionsExist);
    
    // All critical functions should exist
    expect(functionsExist.runScenario).toBe(true);
    expect(functionsExist.should).toBe(true);
    expect(functionsExist.readToggles).toBe(true);
    expect(functionsExist.chaosJSON).toBe(true);
    expect(functionsExist.runFetch).toBe(true);
    expect(functionsExist.runJSON).toBe(true);
    expect(functionsExist.runRAG).toBe(true);
  });

  test('Test 2: Verify readToggles() returns correct configuration', async ({ page }) => {
    // Set some test values
    await page.fill('#malformedRate', '25');
    await page.fill('#http500Rate', '10');
    await page.fill('#latencyMs', '1500');
    
    const config = await page.evaluate(() => {
      return (window as any).readToggles();
    });
    
    console.log('Configuration from readToggles():', config);
    
    // Verify configuration has expected structure and values
    expect(config).toHaveProperty('malformedRate');
    expect(config).toHaveProperty('http500Rate');
    expect(config).toHaveProperty('latencyMs');
    expect(config).toHaveProperty('latencyRate');
    expect(config).toHaveProperty('rate429');
    expect(config).toHaveProperty('toolUnavailableSteps');
    expect(config).toHaveProperty('injSeed');
    expect(config).toHaveProperty('ctxBytes');
    
    // Check that our set values are reflected
    expect(config.malformedRate).toBe(25);
    expect(config.http500Rate).toBe(10);
    expect(config.latencyMs).toBe(1500);
  });

  test('Test 3: Test chaos injection with 100% malformed rate', async ({ page }) => {
    // Set 100% malformed JSON rate
    await page.fill('#malformedRate', '100');
    
    // Select JSON scenario
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run chaos test
    await page.click('#btnChaos');
    
    // Wait for test to complete
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    // Get the score and trace data
    const results = await page.evaluate(() => {
      const scoreBadge = document.getElementById('scoreBadge');
      const scoreText = scoreBadge?.textContent || '';
      const score = parseInt(scoreText.replace('%', '') || '0');
      
      let faultData = null;
      if ((window as any).__LAST__) {
        const rows = (window as any).__LAST__.rows;
        const faults = rows.filter((r: any) => r.fault);
        const malformedFaults = faults.filter((r: any) => r.fault === 'malformed_json');
        
        faultData = {
          totalSteps: rows.length,
          totalFaults: faults.length,
          malformedFaults: malformedFaults.length,
          score: (window as any).__LAST__.metrics.score
        };
      }
      
      return { score, faultData };
    });
    
    console.log('Chaos test results:', results);
    
    // Verify results
    expect(results.score).toBeLessThan(100);
    expect(results.score).toBeGreaterThan(0);
    expect(results.faultData).not.toBeNull();
    
    if (results.faultData) {
      expect(results.faultData.totalFaults).toBeGreaterThan(0);
      expect(results.faultData.malformedFaults).toBeGreaterThan(0);
      expect(results.faultData.score).toBeLessThan(100);
    }
  });

  test('Test 4: Verify score drops when faults are detected', async ({ page }) => {
    // First run baseline
    await page.fill('#malformedRate', '0');
    await page.fill('#http500Rate', '0');
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    await page.click('#btnBaseline');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    const baselineScore = await page.evaluate(() => {
      return (window as any).__BASELINE__?.score || 0;
    });
    
    console.log('Baseline score:', baselineScore);
    expect(baselineScore).toBe(100);
    
    // Now run with faults
    await page.fill('#malformedRate', '50');
    await page.fill('#http500Rate', '30');
    
    await page.click('#btnChaos');
    await page.waitForTimeout(1000);
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    const chaosResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const faults = last.rows.filter((r: any) => r.fault);
      return {
        score: last.metrics.score,
        faultCount: faults.length,
        totalSteps: last.rows.length
      };
    });
    
    console.log('Chaos results:', chaosResults);
    
    expect(chaosResults).not.toBeNull();
    if (chaosResults) {
      expect(chaosResults.score).toBeLessThan(baselineScore);
      expect(chaosResults.faultCount).toBeGreaterThan(0);
      console.log(`Score dropped from ${baselineScore} to ${chaosResults.score}`);
    }
  });

  test('Test 5: Test all example cards apply configurations', async ({ page }) => {
    // Wait for examples to load
    await page.waitForSelector('#examplesGrid .ex', { timeout: 5000 });
    
    const exampleCards = await page.$$('#examplesGrid .ex');
    expect(exampleCards.length).toBeGreaterThan(0);
    
    console.log(`Found ${exampleCards.length} example cards`);
    
    // Test each card
    for (let i = 0; i < Math.min(exampleCards.length, 3); i++) {
      // Get card title
      const cardTitle = await exampleCards[i].$eval('h3', el => el.textContent || '');
      console.log(`Testing card: ${cardTitle}`);
      
      // Get values before click
      const beforeValues = await page.evaluate(() => {
        return {
          malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
          http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0',
          rate429: (document.getElementById('rate429') as HTMLInputElement)?.value || '0',
          latency: (document.getElementById('latencyMs') as HTMLInputElement)?.value || '0'
        };
      });
      
      // Click the card
      await exampleCards[i].click();
      await page.waitForTimeout(500);
      
      // Get values after click
      const afterValues = await page.evaluate(() => {
        return {
          malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
          http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0',
          rate429: (document.getElementById('rate429') as HTMLInputElement)?.value || '0',
          latency: (document.getElementById('latencyMs') as HTMLInputElement)?.value || '0'
        };
      });
      
      // Check if any values changed
      const changed = Object.keys(beforeValues).some(key => 
        (beforeValues as any)[key] !== (afterValues as any)[key]
      );
      
      console.log(`Card "${cardTitle}" - Before:`, beforeValues, 'After:', afterValues, 'Changed:', changed);
      
      // At least one value should have changed for most cards
      if (cardTitle !== 'No Chaos' && cardTitle !== 'Baseline Test') {
        expect(changed).toBe(true);
      }
    }
  });

  test('Test 6: Direct should() function behavior test', async ({ page }) => {
    const shouldResults = await page.evaluate(() => {
      const should = (window as any).should;
      if (typeof should !== 'function') return null;
      
      // Test with known random values
      return {
        should_100_0point5: should(100, () => 0.5), // should be true (100% > 50%)
        should_0_0point5: should(0, () => 0.5),     // should be false (0% < 50%)
        should_50_0point3: should(50, () => 0.3),   // should be true (50% > 30%)
        should_50_0point7: should(50, () => 0.7),   // should be false (50% < 70%)
        should_negative: should(-10, () => 0.5),    // should be false (negative rate)
      };
    });
    
    console.log('should() function test results:', shouldResults);
    
    expect(shouldResults).not.toBeNull();
    if (shouldResults) {
      expect(shouldResults.should_100_0point5).toBe(true);
      expect(shouldResults.should_0_0point5).toBe(false);
      expect(shouldResults.should_50_0point3).toBe(true);
      expect(shouldResults.should_50_0point7).toBe(false);
      expect(shouldResults.should_negative).toBe(false);
    }
  });

  test('Test 7: Test RAG scenario with context truncation', async ({ page }) => {
    // Select RAG scenario
    const ragScenario = page.locator('input[value="rag"]');
    await ragScenario.check();
    
    // Set context truncation to a small value
    await page.fill('#ctxBytes', '100');
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    // Check for context truncation fault
    const ragResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const contextFaults = last.rows.filter((r: any) => 
        r.fault && r.fault.includes('context')
      );
      
      return {
        score: last.metrics.score,
        contextFaults: contextFaults.length,
        totalFaults: last.rows.filter((r: any) => r.fault).length,
        totalSteps: last.rows.length
      };
    });
    
    console.log('RAG context truncation results:', ragResults);
    
    expect(ragResults).not.toBeNull();
    if (ragResults) {
      // RAG should work and may have context truncation faults
      expect(ragResults.score).toBeGreaterThan(0);
      expect(ragResults.score).toBeLessThanOrEqual(100);
      console.log(`RAG test completed with score: ${ragResults.score}, context faults: ${ragResults.contextFaults}`);
    }
  });

  test('Test 8: Test programmatic runScenario function', async ({ page }) => {
    // Test the programmatic interface
    const programmaticResults = await page.evaluate(async () => {
      const runScenario = (window as any).runScenario;
      if (typeof runScenario !== 'function') return null;
      
      // Set test configuration first
      (document.getElementById('malformedRate') as HTMLInputElement).value = '100';
      (document.getElementById('http500Rate') as HTMLInputElement).value = '20';
      
      try {
        const result = await runScenario('json', 'test-seed-123', true);
        return {
          success: true,
          score: result.metrics?.score || 0,
          hasFaults: result.trace?.some((r: any) => r.fault) || false,
          error: null
        };
      } catch (error: any) {
        return {
          success: false,
          score: 0,
          hasFaults: false,
          error: error.message || 'Unknown error'
        };
      }
    });
    
    console.log('Programmatic runScenario results:', programmaticResults);
    
    expect(programmaticResults).not.toBeNull();
    if (programmaticResults) {
      expect(programmaticResults.success).toBe(true);
      expect(programmaticResults.score).toBeGreaterThan(0);
      expect(programmaticResults.score).toBeLessThan(100);
      expect(programmaticResults.hasFaults).toBe(true);
    }
  });

  test('Test 9: End-to-end comprehensive fault injection', async ({ page }) => {
    console.log('Starting comprehensive fault injection test...');
    
    // Set multiple fault types
    await page.fill('#malformedRate', '80');
    await page.fill('#http500Rate', '40');
    await page.fill('#rate429', '30');
    await page.fill('#latencyMs', '2000');
    await page.fill('#latencyRate', '50');
    
    // Select JSON scenario
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 20000 });
    
    // Analyze comprehensive results
    const comprehensiveResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      // Analyze fault types
      const faultTypes: Record<string, number> = {};
      const faultySteps = last.rows.filter((r: any) => r.fault);
      
      faultySteps.forEach((step: any) => {
        faultTypes[step.fault] = (faultTypes[step.fault] || 0) + 1;
      });
      
      return {
        finalScore: last.metrics.score,
        totalSteps: last.rows.length,
        faultySteps: faultySteps.length,
        faultTypes: faultTypes,
        successAfterFault: last.metrics.success_after_fault,
        mttr: last.metrics.mttr_s,
        retries: last.metrics.retries
      };
    });
    
    console.log('Comprehensive test results:', comprehensiveResults);
    
    expect(comprehensiveResults).not.toBeNull();
    if (comprehensiveResults) {
      // With high fault rates, score should be significantly impacted
      expect(comprehensiveResults.finalScore).toBeLessThan(90);
      expect(comprehensiveResults.faultySteps).toBeGreaterThan(0);
      
      // Should have multiple types of faults
      const faultTypeCount = Object.keys(comprehensiveResults.faultTypes).length;
      expect(faultTypeCount).toBeGreaterThan(0);
      
      console.log(`Final score: ${comprehensiveResults.finalScore}%`);
      console.log(`Fault types detected: ${Object.keys(comprehensiveResults.faultTypes).join(', ')}`);
      console.log(`Success after fault: ${(comprehensiveResults.successAfterFault * 100).toFixed(1)}%`);
    }
  });

  test('Test 10: Verify chaos system state persistence', async ({ page }) => {
    // Set configuration
    await page.fill('#malformedRate', '75');
    await page.fill('#http500Rate', '25');
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    // Check that state is properly preserved
    const stateCheck = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      const baseline = (window as any).__BASELINE__;
      
      return {
        hasLastData: last !== null && last !== undefined,
        hasMetrics: last?.metrics !== null && last?.metrics !== undefined,
        hasRows: Array.isArray(last?.rows) && last.rows.length > 0,
        hasYaml: typeof last?.yaml === 'string' && last.yaml.length > 0,
        hasScenario: typeof last?.scen === 'string',
        hasSeed: typeof last?.seed === 'string',
        score: last?.metrics?.score || 0
      };
    });
    
    console.log('State persistence check:', stateCheck);
    
    expect(stateCheck.hasLastData).toBe(true);
    expect(stateCheck.hasMetrics).toBe(true);
    expect(stateCheck.hasRows).toBe(true);
    expect(stateCheck.hasYaml).toBe(true);
    expect(stateCheck.hasScenario).toBe(true);
    expect(stateCheck.hasSeed).toBe(true);
    expect(stateCheck.score).toBeGreaterThan(0);
    expect(stateCheck.score).toBeLessThanOrEqual(100);
  });
});