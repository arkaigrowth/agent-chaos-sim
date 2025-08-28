import { test, expect } from '@playwright/test';

test.describe('Real LLM Integration Tests', () => {
  test.use({
    // Don't start a web server, use the one already running
    baseURL: 'http://localhost:8080'
  });
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the enhanced prototype
    await page.goto('/claude_prototype_enhanced.html');
  });

  test('should configure mock agent and run a real test', async ({ page }) => {
    // Expand the Real Agent Testing section
    await page.click('details:has-text("Real Agent Testing") summary');
    
    // Wait for the section to expand
    await page.waitForSelector('#llm-config', { state: 'visible' });
    
    // Configure the mock agent
    await page.selectOption('#adapter-select', 'http');
    await page.fill('#agent-endpoint', 'http://localhost:9009/run');
    
    // Test the connection
    await page.click('button:has-text("Test Connection")');
    
    // Wait for success message
    await page.waitForSelector('text=/Connection successful/i', { timeout: 5000 });
    
    // Find and click a Real Test button on one of the evaluation suites
    const realTestButton = page.locator('.suite-card button:has-text("Real Test")').first();
    await expect(realTestButton).toBeVisible();
    await realTestButton.click();
    
    // Wait for results to appear
    await page.waitForSelector('.real-test-results', { timeout: 10000 });
    
    // Verify the results contain baseline and chaos comparison
    const results = page.locator('.real-test-results');
    await expect(results).toContainText('Baseline Performance');
    await expect(results).toContainText('Chaos Performance');
    
    // Verify recommendations are shown
    await expect(results).toContainText('Recommendations');
  });

  test('should handle dataset upload', async ({ page }) => {
    // Expand the Real Agent Testing section
    await page.click('details:has-text("Real Agent Testing") summary');
    
    // Create a test JSONL file
    const jsonlContent = JSON.stringify({ input: "test question", expected: "test answer" }) + '\n' +
                        JSON.stringify({ input: "another question", expected: "another answer" });
    
    // Upload the file (we'll simulate this)
    await page.evaluate((content) => {
      const blob = new Blob([content], { type: 'application/jsonl' });
      const file = new File([blob], 'test.jsonl', { type: 'application/jsonl' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const input = document.querySelector('#dataset-upload') as HTMLInputElement;
      if (input) {
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, jsonlContent);
    
    // Verify dataset is loaded
    await page.waitForSelector('text=/2 rows loaded/i', { timeout: 5000 });
  });
});