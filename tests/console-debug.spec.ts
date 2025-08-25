import { test, expect } from '@playwright/test';

test('Debug console output', async ({ page }) => {
  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  await page.goto('/');
  
  // Close modal
  try {
    await page.click('#modalOnboarding .modal-close', { timeout: 2000 });
  } catch {}
  
  // Set 100% malformed
  await page.fill('#malformedRate', '100');
  const malformedValue = await page.inputValue('#malformedRate');
  console.log('Malformed rate input value:', malformedValue);
  
  // Check readToggles
  const config = await page.evaluate(() => {
    return window.readToggles();
  });
  console.log('Config from readToggles:', config);
  
  // Select JSON scenario
  await page.locator('label').filter({ hasText: 'JSON' }).first().click();
  
  // Run chaos
  await page.click('#btnChaos');
  
  // Wait for completion
  await page.waitForTimeout(3000);
  
  // Print all console logs
  console.log('\n=== Console Logs ===');
  consoleLogs.forEach(log => console.log(log));
  
  // Get trace
  const trace = await page.evaluate(() => window.__LAST__);
  console.log('\n=== Trace ===');
  console.log('Rows with faults:', trace?.rows?.filter((r: any) => r.fault));
});