import { test, expect } from '@playwright/test';

test.describe('Chaos Lab — Task Mode smoke', () => {
  test('loads, runs baseline/chaos, switches to HTTP agent', async ({ page }) => {
    // 1) Open home page
    await page.goto('/');

    // 2) Ensure Task Mode panel exists
    const panel = page.locator('#taskMode');
    await expect(panel).toBeVisible();

    // 3) Load sample dataset
    await page.getByRole('button', { name: /Load Sample/i }).click();
    const out = page.locator('#tmOut');
    await expect(out).toContainText(/Loaded \d+ rows/i);

    // 4) Run baseline
    await page.getByRole('button', { name: /Run Task Baseline/i }).click();
    await expect(page.locator('#tmTaskScore')).toHaveText(/Task: \d+/);
    await expect(page.locator('#tmJointScore')).toHaveText(/Joint: \d+/);

    // 5) Run chaos (with whichever chaos engine is wired)
    await page.getByRole('button', { name: /Run Task with Chaos/i }).click();
    await expect(page.locator('#tmResScore')).toHaveText(/Resilience: \d+/);

    // 6) Switch to HTTP Agent pointing at the mock agent
    await page.locator('input[name="tmAdapter"][value="http"]').check();
    await page.fill('#tmBaseUrl', 'http://localhost:9009');

    // 7) Run chaos again via HTTP Agent to verify end-to-end networking
    await page.getByRole('button', { name: /Run Task with Chaos/i }).click();
    await expect(page.locator('#tmResScore')).toHaveText(/Resilience: \d+/);
  });
});
