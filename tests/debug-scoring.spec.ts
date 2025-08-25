import { test, expect } from '@playwright/test';

test('Debug malformed JSON injection', async ({ page }) => {
  await page.goto('/');
  
  // Close modal if exists
  try {
    await page.click('#modalOnboarding .modal-close', { timeout: 2000 });
  } catch {}
  
  // Set 100% malformed rate
  await page.fill('#malformedRate', '100');
  
  // Select JSON scenario
  const jsonLabel = page.locator('label').filter({ hasText: 'JSON' }).first();
  await jsonLabel.click();
  
  // Add debugging to see what's happening
  await page.evaluate(() => {
    // Override chaosJSON to log when called
    const originalChaosJSON = window.chaosJSON;
    window.chaosJSON = async function(...args) {
      console.log('chaosJSON called with:', args);
      const result = await originalChaosJSON.apply(this, args);
      console.log('chaosJSON result headers:', result.headers.get('x-chaos-fault'));
      return result;
    };
    
    // Override should to log decisions
    const originalShould = window.should;
    window.should = function(rate, rand) {
      const result = originalShould(rate, rand);
      console.log(`should(${rate}) = ${result}`);
      return result;
    };
    
    // Log readToggles result
    const originalReadToggles = window.readToggles;
    window.readToggles = function() {
      const result = originalReadToggles();
      console.log('readToggles result:', result);
      return result;
    };
  });
  
  // Run chaos test
  await page.click('#btnChaos');
  
  // Wait for completion
  await page.waitForTimeout(3000);
  
  // Get console logs
  const logs = await page.evaluate(() => {
    return window.consoleLogs || [];
  });
  
  // Get the trace
  const trace = await page.evaluate(() => {
    if (window.__LAST__) {
      const faults = window.__LAST__.rows.filter(r => r.fault);
      return {
        totalRows: window.__LAST__.rows.length,
        faultRows: faults,
        score: window.__LAST__.score
      };
    }
    return null;
  });
  
  console.log('Trace analysis:', trace);
  
  // Get score
  const scoreText = await page.textContent('#scoreBadge');
  console.log('Final score:', scoreText);
});