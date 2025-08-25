import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

test('Reliability Core passes gate', async ({ page }) => {
  await page.goto(BASE);
  const report = await page.evaluate(async () => {
    if (typeof window.runEvalSuite !== 'function') throw new Error('runEvalSuite not found');
    return await window.runEvalSuite('reliability_core', true);
  });
  for (const c of report.cases) expect(c.scoreAvg).toBeGreaterThanOrEqual(60);
  expect(report.overall_score).toBeGreaterThanOrEqual(60);
});
