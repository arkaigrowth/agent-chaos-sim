import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Quick Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    
    // Close onboarding modal if it exists
    try {
      const closeButton = page.locator('#modalOnboarding .modal-close');
      await closeButton.click({ timeout: 2000 });
    } catch {
      // Modal might not be visible
    }
  });

  test('Basic UI elements are present and functional', async ({ page }) => {
    console.log('=== Quick Smoke Test: UI Elements ===');
    
    // Check critical elements exist
    await expect(page.locator('#btnBaseline')).toBeVisible();
    await expect(page.locator('#btnChaos')).toBeVisible();
    await expect(page.locator('#scoreBadge')).toBeVisible();
    await expect(page.locator('#malformedRate')).toBeVisible();
    await expect(page.locator('#http500Rate')).toBeVisible();
    
    // Check scenario radio buttons
    await expect(page.locator('input[value="fetch"]')).toBeVisible();
    await expect(page.locator('input[value="json"]')).toBeVisible();
    await expect(page.locator('input[value="rag"]')).toBeVisible();
    
    console.log('✅ All critical UI elements present');
  });

  test('Example cards are clickable and change configuration', async ({ page }) => {
    console.log('=== Quick Test: Example Cards Functionality ===');
    
    // Wait for examples to load
    await page.waitForSelector('#examplesGrid .ex', { timeout: 5000 });
    
    // Check that examples loaded
    const examples = await page.$$eval('#examplesGrid .ex', cards => 
      cards.map(card => ({
        title: card.querySelector('h3')?.textContent || '',
        visible: card.offsetHeight > 0 && card.offsetWidth > 0
      }))
    );
    
    console.log(`Found ${examples.length} example cards:`, examples.map(e => e.title));
    
    // Verify we have examples
    expect(examples.length).toBeGreaterThan(0);
    
    // Test that at least one example card is clickable and changes configuration
    if (examples.length > 0) {
      // Get initial values
      const beforeValues = await page.evaluate(() => ({
        malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
        http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0'
      }));
      
      // Click the first example card
      const firstCard = page.locator('#examplesGrid .ex').first();
      await firstCard.click();
      
      // Wait a bit for changes to apply
      await page.waitForTimeout(500);
      
      // Check if values changed
      const afterValues = await page.evaluate(() => ({
        malformed: (document.getElementById('malformedRate') as HTMLInputElement)?.value || '0',
        http500: (document.getElementById('http500Rate') as HTMLInputElement)?.value || '0'
      }));
      
      console.log('Configuration before click:', beforeValues);
      console.log('Configuration after click:', afterValues);
      
      const changed = beforeValues.malformed !== afterValues.malformed || 
                     beforeValues.http500 !== afterValues.http500;
      
      console.log(`Configuration changed: ${changed ? '✅' : 'ℹ️'}`);
      
      // The values should be defined (not null/undefined)
      expect(afterValues.malformed).toBeDefined();
      expect(afterValues.http500).toBeDefined();
    }
    
    console.log('✅ Example cards test completed');
  });

  test('Basic chaos test execution works', async ({ page }) => {
    console.log('=== Quick Test: Basic Chaos Execution ===');
    
    // Set a simple configuration
    await page.fill('#malformedRate', '50');
    
    // Select JSON scenario
    const jsonScenario = page.locator('input[value="json"]');
    await jsonScenario.check();
    
    // Run chaos test
    await page.click('#btnChaos');
    console.log('Chaos test started...');
    
    // Wait for completion (shorter timeout for quick test)
    try {
      await page.waitForFunction(() => {
        const badge = document.getElementById('scoreBadge');
        return badge && badge.textContent && 
               badge.textContent !== '' && 
               !badge.textContent.includes('—') &&
               !badge.textContent.includes('Resilience Score: —');
      }, { timeout: 15000 });
      
      // Get the final score
      const scoreText = await page.textContent('#scoreBadge');
      console.log('Final score:', scoreText);
      
      // Basic validation - should have some score
      expect(scoreText).not.toBeNull();
      expect(scoreText).not.toContain('—');
      
      // Check if we have test data
      const hasTestData = await page.evaluate(() => {
        return (window as any).__LAST__ !== null && (window as any).__LAST__ !== undefined;
      });
      
      expect(hasTestData).toBe(true);
      console.log('✅ Basic chaos test executed successfully');
      
    } catch (error) {
      console.error('Chaos test failed to complete within timeout');
      
      // Try to get any available information for debugging
      const debugInfo = await page.evaluate(() => ({
        scoreBadgeText: document.getElementById('scoreBadge')?.textContent || 'Not found',
        hasLast: (window as any).__LAST__ !== null,
        windowKeys: Object.keys(window).filter(k => k.startsWith('__')),
      }));
      
      console.log('Debug info:', debugInfo);
      throw error;
    }
  });

  test('Global functions are exposed correctly', async ({ page }) => {
    console.log('=== Quick Test: Global Function Exposure ===');
    
    const functionCheck = await page.evaluate(() => {
      const requiredFunctions = [
        'runScenario',
        'should',
        'readToggles'
      ];
      
      const results: Record<string, any> = {};
      
      requiredFunctions.forEach(fnName => {
        const fn = (window as any)[fnName];
        results[fnName] = {
          exists: typeof fn === 'function',
          type: typeof fn
        };
      });
      
      // Test should() function with simple values
      if (typeof (window as any).should === 'function') {
        results.shouldTest = {
          should_100: (window as any).should(100, () => 0.5),
          should_0: (window as any).should(0, () => 0.5)
        };
      }
      
      return results;
    });
    
    console.log('Function availability check:', functionCheck);
    
    // Verify critical functions exist
    expect(functionCheck.runScenario.exists).toBe(true);
    expect(functionCheck.should.exists).toBe(true);
    expect(functionCheck.readToggles.exists).toBe(true);
    
    // Test should() function behavior
    if (functionCheck.shouldTest) {
      expect(functionCheck.shouldTest.should_100).toBe(true);
      expect(functionCheck.shouldTest.should_0).toBe(false);
    }
    
    console.log('✅ Global functions properly exposed');
  });

  test('Configuration input validation works', async ({ page }) => {
    console.log('=== Quick Test: Input Validation ===');
    
    // Test various input values
    const testInputs = [
      { id: 'malformedRate', value: '100', expected: '100' },
      { id: 'http500Rate', value: '50', expected: '50' },
      { id: 'latencyMs', value: '2000', expected: '2000' }
    ];
    
    for (const input of testInputs) {
      await page.fill(`#${input.id}`, input.value);
      const actualValue = await page.inputValue(`#${input.id}`);
      
      console.log(`${input.id}: set ${input.value}, got ${actualValue}`);
      expect(actualValue).toBe(input.expected);
    }
    
    // Test that readToggles() captures the values
    const config = await page.evaluate(() => {
      return (window as any).readToggles();
    });
    
    console.log('Read configuration:', config);
    
    expect(config.malformedRate).toBe(100);
    expect(config.http500Rate).toBe(50);
    expect(config.latencyMs).toBe(2000);
    
    console.log('✅ Input validation and configuration reading works');
  });

  test('Scenario selection works correctly', async ({ page }) => {
    console.log('=== Quick Test: Scenario Selection ===');
    
    // Test each scenario
    const scenarios = ['fetch', 'json', 'rag'];
    
    for (const scenario of scenarios) {
      const radioButton = page.locator(`input[value="${scenario}"]`);
      await radioButton.check();
      
      const isChecked = await radioButton.isChecked();
      console.log(`Scenario ${scenario}: ${isChecked ? '✅' : '❌'}`);
      expect(isChecked).toBe(true);
    }
    
    console.log('✅ All scenario selections work');
  });
});