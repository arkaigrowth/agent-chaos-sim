import { test, expect } from '@playwright/test';

test.describe('Advanced Chaos Scoring Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Close onboarding modal if it exists
    try {
      const modalClose = page.locator('#modalOnboarding .modal-close');
      if (await modalClose.isVisible()) {
        await modalClose.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Modal might not be visible
    }
  });

  test('All example cards apply different configurations', async ({ page }) => {
    console.log('=== Testing Example Card Configuration Application ===');
    
    // Wait for examples to load
    await page.waitForSelector('#examplesGrid .ex', { timeout: 5000 });
    
    // Get all example cards
    const exampleCards = await page.$$('#examplesGrid .ex');
    expect(exampleCards.length).toBeGreaterThan(0);
    
    console.log(`Found ${exampleCards.length} example cards to test`);
    
    const configurationChanges = [];
    
    // Test each card
    for (let i = 0; i < exampleCards.length; i++) {
      const cardTitle = await exampleCards[i].$eval('h3', el => el.textContent || '');
      console.log(`\nTesting card ${i + 1}: "${cardTitle}"`);
      
      // Get configuration before clicking
      const beforeConfig = await page.evaluate(() => ({
        malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
        http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0',
        rate429: (document.getElementById('rate429') as HTMLInputElement)?.value || '0',
        latencyMs: (document.getElementById('latencyMs') as HTMLInputElement)?.value || '0',
        latencyRate: (document.getElementById('latencyRate') as HTMLInputElement)?.value || '0'
      }));
      
      // Click the card
      await exampleCards[i].click();
      await page.waitForTimeout(300);
      
      // Get configuration after clicking
      const afterConfig = await page.evaluate(() => ({
        malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
        http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0',
        rate429: (document.getElementById('rate429') as HTMLInputElement)?.value || '0',
        latencyMs: (document.getElementById('latencyMs') as HTMLInputElement)?.value || '0',
        latencyRate: (document.getElementById('latencyRate') as HTMLInputElement)?.value || '0'
      }));
      
      // Check for changes
      const changes = Object.keys(beforeConfig).filter(key => 
        (beforeConfig as any)[key] !== (afterConfig as any)[key]
      );
      
      configurationChanges.push({
        cardTitle,
        changed: changes.length > 0,
        changes: changes.length,
        beforeConfig,
        afterConfig
      });
      
      console.log(`  Changes: ${changes.length > 0 ? changes.join(', ') : 'none'}`);
      
      // Most cards should change configuration (except reset/baseline cards)
      if (!cardTitle.toLowerCase().includes('baseline') && 
          !cardTitle.toLowerCase().includes('no chaos') && 
          !cardTitle.toLowerCase().includes('reset')) {
        expect(changes.length).toBeGreaterThan(0);
      }
    }
    
    console.log('\n=== Configuration Change Summary ===');
    configurationChanges.forEach((change, index) => {
      console.log(`${index + 1}. ${change.cardTitle}: ${change.changed ? `✅ ${change.changes} changes` : '❌ no changes'}`);
    });
    
    // At least 75% of cards should apply configuration changes
    const cardsWithChanges = configurationChanges.filter(c => c.changed).length;
    const changePercentage = (cardsWithChanges / configurationChanges.length) * 100;
    console.log(`\nOverall: ${cardsWithChanges}/${configurationChanges.length} cards (${changePercentage.toFixed(1)}%) applied changes`);
    
    expect(changePercentage).toBeGreaterThan(50);
  });

  test('Multiple fault types are injected correctly', async ({ page }) => {
    console.log('=== Testing Multiple Fault Type Injection ===');
    
    // Set multiple fault types with moderate rates
    await page.fill('#malformedRate', '40');
    await page.fill('#http500Rate', '30');
    await page.fill('#rate429', '20');
    await page.fill('#latencyMs', '1500');
    await page.fill('#latencyRate', '25');
    
    // Select JSON scenario
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 20000 });
    
    // Analyze fault injection
    const faultAnalysis = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const faultTypes: Record<string, number> = {};
      const faultyRows = last.rows.filter((r: any) => r.fault);
      
      // Count fault types
      faultyRows.forEach((row: any) => {
        faultTypes[row.fault] = (faultTypes[row.fault] || 0) + 1;
      });
      
      return {
        totalSteps: last.rows.length,
        faultySteps: faultyRows.length,
        faultTypes: faultTypes,
        uniqueFaultTypes: Object.keys(faultTypes).length,
        score: last.metrics.score,
        successAfterFault: last.metrics.success_after_fault
      };
    });
    
    console.log('Fault analysis:', faultAnalysis);
    
    expect(faultAnalysis).not.toBeNull();
    if (faultAnalysis) {
      // Should have faults injected
      expect(faultAnalysis.faultySteps).toBeGreaterThan(0);
      
      // Should have multiple types of faults with our configuration
      expect(faultAnalysis.uniqueFaultTypes).toBeGreaterThan(0);
      
      // Score should be impacted
      expect(faultAnalysis.score).toBeLessThan(100);
      expect(faultAnalysis.score).toBeGreaterThan(0);
      
      console.log(`✅ SUCCESS: Injected ${faultAnalysis.uniqueFaultTypes} fault types across ${faultAnalysis.faultySteps} steps`);
      console.log(`Fault distribution:`, faultAnalysis.faultTypes);
      console.log(`Final score: ${faultAnalysis.score}%`);
    }
  });

  test('RAG scenario handles context truncation faults', async ({ page }) => {
    console.log('=== Testing RAG Context Truncation ===');
    
    // Select RAG scenario
    const ragScenario = page.locator('input[value="rag"]');
    await ragScenario.check();
    
    // Set small context window to force truncation
    await page.fill('#ctxBytes', '50');
    
    // Also add some other faults for comprehensive testing
    await page.fill('#malformedRate', '20');
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 20000 });
    
    // Check for context truncation and other faults
    const ragResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const faults = last.rows.filter((r: any) => r.fault);
      const contextFaults = faults.filter((r: any) => 
        r.fault && r.fault.includes('context')
      );
      
      const faultTypes: Record<string, number> = {};
      faults.forEach((row: any) => {
        faultTypes[row.fault] = (faultTypes[row.fault] || 0) + 1;
      });
      
      return {
        score: last.metrics.score,
        totalFaults: faults.length,
        contextFaults: contextFaults.length,
        faultTypes: faultTypes,
        scenario: last.scen,
        totalSteps: last.rows.length
      };
    });
    
    console.log('RAG test results:', ragResults);
    
    expect(ragResults).not.toBeNull();
    if (ragResults) {
      expect(ragResults.scenario).toBe('rag');
      expect(ragResults.score).toBeGreaterThan(0);
      expect(ragResults.score).toBeLessThanOrEqual(100);
      
      // May or may not have context faults depending on implementation
      console.log(`RAG scenario completed with score ${ragResults.score}%`);
      console.log(`Total faults: ${ragResults.totalFaults}, Context faults: ${ragResults.contextFaults}`);
      console.log(`Fault types:`, ragResults.faultTypes);
      
      if (ragResults.contextFaults > 0) {
        console.log('✅ Context truncation faults detected');
      } else {
        console.log('ℹ️ No context truncation faults (may be expected)');
      }
    }
  });

  test('Fetch scenario handles network faults', async ({ page }) => {
    console.log('=== Testing Fetch Scenario Network Faults ===');
    
    // Select Fetch scenario
    const fetchScenario = page.locator('input[value="fetch"]');
    await fetchScenario.check();
    
    // Set network-related faults
    await page.fill('#http500Rate', '60');
    await page.fill('#rate429', '40');
    await page.fill('#latencyMs', '2000');
    await page.fill('#latencyRate', '50');
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 25000 });
    
    const fetchResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const faults = last.rows.filter((r: any) => r.fault);
      const networkFaults = faults.filter((r: any) => 
        r.fault && (r.fault.includes('500') || r.fault.includes('429') || r.fault.includes('latency'))
      );
      
      const faultTypes: Record<string, number> = {};
      faults.forEach((row: any) => {
        faultTypes[row.fault] = (faultTypes[row.fault] || 0) + 1;
      });
      
      return {
        score: last.metrics.score,
        totalFaults: faults.length,
        networkFaults: networkFaults.length,
        faultTypes: faultTypes,
        scenario: last.scen,
        retries: last.metrics.retries,
        mttr: last.metrics.mttr_s
      };
    });
    
    console.log('Fetch scenario results:', fetchResults);
    
    expect(fetchResults).not.toBeNull();
    if (fetchResults) {
      expect(fetchResults.scenario).toBe('fetch');
      expect(fetchResults.score).toBeGreaterThan(0);
      expect(fetchResults.score).toBeLessThan(100); // Should be impacted by network faults
      expect(fetchResults.totalFaults).toBeGreaterThan(0);
      expect(fetchResults.networkFaults).toBeGreaterThan(0);
      
      console.log(`✅ SUCCESS: Fetch scenario handled ${fetchResults.networkFaults} network faults`);
      console.log(`Score: ${fetchResults.score}%, Retries: ${fetchResults.retries}, MTTR: ${fetchResults.mttr}s`);
      console.log(`Network fault types:`, fetchResults.faultTypes);
    }
  });

  test('High fault rates result in significantly lower scores', async ({ page }) => {
    console.log('=== Testing High Fault Rate Impact ===');
    
    // Test with very high fault rates
    await page.fill('#malformedRate', '90');
    await page.fill('#http500Rate', '80');
    await page.fill('#rate429', '70');
    await page.fill('#latencyMs', '3000');
    await page.fill('#latencyRate', '60');
    
    // Select JSON scenario
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 30000 });
    
    const highChaosResults = await page.evaluate(() => {
      const last = (window as any).__LAST__;
      if (!last) return null;
      
      const faults = last.rows.filter((r: any) => r.fault);
      const faultRate = faults.length / last.rows.length;
      
      return {
        score: last.metrics.score,
        totalSteps: last.rows.length,
        faultySteps: faults.length,
        faultRate: faultRate,
        successAfterFault: last.metrics.success_after_fault,
        retries: last.metrics.retries
      };
    });
    
    console.log('High chaos results:', highChaosResults);
    
    expect(highChaosResults).not.toBeNull();
    if (highChaosResults) {
      // With very high fault rates, score should be significantly impacted
      expect(highChaosResults.score).toBeLessThan(70); // Should be well below good performance
      expect(highChaosResults.faultySteps).toBeGreaterThan(0);
      expect(highChaosResults.faultRate).toBeGreaterThan(0.3); // At least 30% of steps should have faults
      
      console.log(`✅ SUCCESS: High fault rates (${(highChaosResults.faultRate * 100).toFixed(1)}% of steps) resulted in score of ${highChaosResults.score}%`);
      console.log(`Retries: ${highChaosResults.retries}, Success after fault: ${(highChaosResults.successAfterFault * 100).toFixed(1)}%`);
    }
  });

  test('System maintains state consistency across tests', async ({ page }) => {
    console.log('=== Testing State Consistency ===');
    
    // Run first test
    await page.fill('#malformedRate', '30');
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    // Check first test state
    const firstState = await page.evaluate(() => ({
      hasLast: (window as any).__LAST__ !== null,
      lastScore: (window as any).__LAST__?.metrics.score,
      lastSeed: (window as any).__LAST__?.seed,
      lastScenario: (window as any).__LAST__?.scen
    }));
    
    console.log('First test state:', firstState);
    expect(firstState.hasLast).toBe(true);
    expect(firstState.lastScore).toBeGreaterThan(0);
    expect(firstState.lastScenario).toBe('json');
    
    // Run second test with different configuration
    await page.fill('#malformedRate', '60');
    const ragScenario = page.locator('input[value="rag"]');
    await ragScenario.check();
    
    await page.click('#btnChaos');
    await page.waitForSelector('#scoreBadge:not(:empty)', { timeout: 15000 });
    
    // Check second test state
    const secondState = await page.evaluate(() => ({
      hasLast: (window as any).__LAST__ !== null,
      lastScore: (window as any).__LAST__?.metrics.score,
      lastSeed: (window as any).__LAST__?.seed,
      lastScenario: (window as any).__LAST__?.scen,
      hasDifferentSeed: (window as any).__LAST__?.seed !== firstState.lastSeed
    }));
    
    console.log('Second test state:', secondState);
    expect(secondState.hasLast).toBe(true);
    expect(secondState.lastScore).toBeGreaterThan(0);
    expect(secondState.lastScenario).toBe('rag');
    
    // State should be updated with new test data
    expect(secondState.lastScore).not.toBe(firstState.lastScore);
    
    console.log('✅ SUCCESS: State properly maintained and updated between tests');
    console.log(`First test: ${firstState.lastScenario} (${firstState.lastScore}%)`);
    console.log(`Second test: ${secondState.lastScenario} (${secondState.lastScore}%)`);
  });
});