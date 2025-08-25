import { test, expect } from '@playwright/test';

test.describe('Chaos Scoring System - Focused Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Close onboarding modal if visible
    try {
      await page.click('#modalOnboarding .modal-close', { timeout: 2000 });
    } catch {
      // Modal not visible
    }
  });

  test('Score drops with 100% malformed JSON rate', async ({ page }) => {
    console.log('=== Testing Score Drop with 100% Malformed Rate ===');
    
    // Set 100% malformed JSON rate
    await page.fill('#malformedRate', '100');
    const malformedValue = await page.inputValue('#malformedRate');
    console.log('Malformed rate set to:', malformedValue);
    expect(malformedValue).toBe('100');
    
    // Select JSON scenario by clicking the label
    const jsonLabel = page.locator('label').filter({ hasText: 'JSON' }).first();
    await jsonLabel.click();
    console.log('JSON scenario selected');
    
    // Verify scenario selection
    const jsonRadio = page.locator('input[value="json"]');
    expect(await jsonRadio.isChecked()).toBe(true);
    
    // Run with chaos
    await page.click('#btnChaos');
    console.log('Chaos test started');
    
    // Wait for score to appear with longer timeout
    await page.waitForFunction(() => {
      const badge = document.getElementById('scoreBadge');
      return badge && badge.textContent && badge.textContent !== '' && !badge.textContent.includes('—');
    }, { timeout: 20000 });
    
    // Get the score
    const scoreText = await page.textContent('#scoreBadge');
    console.log('Score badge shows:', scoreText);
    
    // Parse score - now it's just "XX%"
    const scoreMatch = scoreText?.match(/(\d+)%/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 100;
    console.log('Parsed score:', score);
    
    // Check trace in console and verify faults were injected
    const traceData = await page.evaluate(() => {
      if ((window as any).__LAST__) {
        const last = (window as any).__LAST__;
        const faults = last.rows.filter((r: any) => r.fault);
        const malformedFaults = faults.filter((r: any) => r.fault === 'malformed_json');
        return {
          hasFaults: faults.length > 0,
          faultCount: faults.length,
          malformedFaultCount: malformedFaults.length,
          score: last.metrics.score,
          totalSteps: last.rows.length
        };
      }
      return null;
    });
    
    console.log('Trace data:', traceData);
    
    // Assertions
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
    
    // Verify faults were actually injected
    expect(traceData).not.toBeNull();
    if (traceData) {
      expect(traceData.hasFaults).toBe(true);
      expect(traceData.faultCount).toBeGreaterThan(0);
      expect(traceData.malformedFaultCount).toBeGreaterThan(0);
      expect(traceData.score).toBeLessThan(100);
      
      console.log(`✅ SUCCESS: Score dropped to ${score}% with ${traceData.faultCount} faults (${traceData.malformedFaultCount} malformed)`);
    }
  });

  test('Baseline scores 100%, chaos scores less', async ({ page }) => {
    console.log('=== Testing Baseline vs Chaos Score Difference ===');
    
    // Select JSON scenario
    const jsonLabel = page.locator('label').filter({ hasText: 'JSON' }).first();
    await jsonLabel.click();
    
    // Ensure no chaos settings for baseline
    await page.fill('#malformedRate', '0');
    await page.fill('#http500Rate', '0');
    await page.fill('#rate429', '0');
    
    // Run baseline first
    await page.click('#btnBaseline');
    await page.waitForFunction(() => {
      const badge = document.getElementById('scoreBadge');
      return badge && badge.textContent && badge.textContent !== '' && !badge.textContent.includes('—');
    }, { timeout: 15000 });
    
    const baselineScore = await page.evaluate(() => {
      return (window as any).__BASELINE__?.score || 0;
    });
    
    console.log('Baseline score:', baselineScore);
    expect(baselineScore).toBe(100);
    
    // Apply chaos settings
    await page.fill('#malformedRate', '50');
    await page.fill('#http500Rate', '30');
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => {
      const badge = document.getElementById('scoreBadge');
      return badge && badge.textContent && badge.textContent !== '' && !badge.textContent.includes('—');
    }, { timeout: 15000 });
    
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
      
      const scoreDrop = baselineScore - chaosResults.score;
      console.log(`✅ SUCCESS: Score dropped ${scoreDrop} points (${baselineScore} → ${chaosResults.score}) with ${chaosResults.faultCount} faults`);
      
      expect(scoreDrop).toBeGreaterThan(0);
    }
  });

  test('Verify chaos functions are called when enabled', async ({ page }) => {
    console.log('=== Testing Chaos Function Invocation ===');
    
    // Install a console listener to capture chaos function calls
    await page.evaluate(() => {
      (window as any).__chaosCallLog = [];
      
      // Wrap chaosJSON to track calls
      const originalChaosJSON = (window as any).chaosJSON;
      if (originalChaosJSON) {
        (window as any).chaosJSON = function(...args: any[]) {
          (window as any).__chaosCallLog.push({
            function: 'chaosJSON',
            args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg),
            timestamp: Date.now()
          });
          return originalChaosJSON.apply(this, args);
        };
      }
    });
    
    // Set chaos parameters
    await page.fill('#malformedRate', '100');
    await page.fill('#http500Rate', '50');
    
    // Select JSON scenario
    const jsonLabel = page.locator('label').filter({ hasText: 'JSON' }).first();
    await jsonLabel.click();
    
    // Run chaos test
    await page.click('#btnChaos');
    await page.waitForFunction(() => {
      const badge = document.getElementById('scoreBadge');
      return badge && badge.textContent && badge.textContent !== '' && !badge.textContent.includes('—');
    }, { timeout: 15000 });
    
    // Check if chaos functions were called
    const chaosCallData = await page.evaluate(() => {
      return {
        callLog: (window as any).__chaosCallLog || [],
        lastData: (window as any).__LAST__ ? {
          faultCount: (window as any).__LAST__.rows.filter((r: any) => r.fault).length,
          score: (window as any).__LAST__.metrics.score
        } : null
      };
    });
    
    console.log('Chaos function call log:', chaosCallData.callLog);
    console.log('Final test data:', chaosCallData.lastData);
    
    // Verify chaos functions were called
    expect(chaosCallData.callLog.length).toBeGreaterThan(0);
    
    // Verify chaos effects
    expect(chaosCallData.lastData).not.toBeNull();
    if (chaosCallData.lastData) {
      expect(chaosCallData.lastData.faultCount).toBeGreaterThan(0);
      expect(chaosCallData.lastData.score).toBeLessThan(100);
      
      console.log(`✅ SUCCESS: Chaos functions called ${chaosCallData.callLog.length} times, resulting in ${chaosCallData.lastData.faultCount} faults`);
    }
  });
});