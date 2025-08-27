import { test, expect } from '@playwright/test';

test.describe('Task Mode Enhanced - Real-World Chaos Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the enhanced prototype
    await page.goto('/docs/claude_prototype_enhanced.html');
    
    // Wait for page to fully load
    await page.waitForSelector('.logo', { timeout: 5000 });
  });
  
  test('should display real-world scenarios', async ({ page }) => {
    // Check that scenario selector exists
    const scenarioSelect = page.locator('#scenarioSelect');
    await expect(scenarioSelect).toBeVisible();
    
    // Verify scenarios are loaded
    const options = await scenarioSelect.locator('option').count();
    expect(options).toBeGreaterThan(5); // Should have at least 6 scenarios
    
    // Select OpenAI Outage scenario
    await scenarioSelect.selectOption('openai_outage');
    
    // Verify scenario details are displayed
    const details = page.locator('#scenarioDetails');
    await expect(details).toContainText('OpenAI Service Outage');
    await expect(details).toContainText('Should fallback to alternative model');
  });
  
  test('should show pipeline visualization during test', async ({ page }) => {
    // Start a test run
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Check pipeline stages appear
    const pipeline = page.locator('#pipelineViz');
    await expect(pipeline).toBeVisible();
    
    // Verify stages are shown
    await expect(pipeline).toContainText('Input');
    await expect(pipeline).toContainText('Prompt Build');
    await expect(pipeline).toContainText('LLM Call');
    await expect(pipeline).toContainText('Parse Response');
    await expect(pipeline).toContainText('Validate');
    await expect(pipeline).toContainText('Output');
    
    // Check for failure indicators
    await page.waitForSelector('.pipeline-stage.failure', { timeout: 5000 });
    
    // Check for retry indicators
    await expect(page.locator('.pipeline-retries')).toBeVisible();
  });
  
  test('should generate actionable insights after test', async ({ page }) => {
    // Run a chaos scenario
    await page.locator('#scenarioSelect').selectOption('rate_limit_surge');
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Wait for test to complete
    await page.waitForSelector('.insights-report', { timeout: 10000 });
    
    // Verify insights sections
    const insights = page.locator('.insights-report');
    
    // Check for success indicators
    await expect(insights.locator('.successes')).toContainText('What Worked');
    
    // Check for failure analysis
    await expect(insights.locator('.failures')).toContainText('What Failed');
    
    // Check for recommendations
    await expect(insights.locator('.recommendations')).toContainText('Recommendations');
    await expect(insights).toContainText('exponential backoff');
    
    // Check for code snippets
    const codeSnippets = page.locator('.code-snippet');
    await expect(codeSnippets.first()).toBeVisible();
    await expect(codeSnippets.first()).toContainText('CircuitBreaker');
  });
  
  test('should calculate UX score correctly', async ({ page }) => {
    // Run baseline test
    await page.click('button:has-text("RUN SCENARIO")');
    await page.waitForTimeout(3000);
    
    // Check for UX score display
    const scoreElement = page.locator('#uxScore');
    const scoreText = await scoreElement.textContent();
    const score = parseInt(scoreText || '0');
    
    // UX score should be between 0 and 100
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  
  test('should handle file upload for custom datasets', async ({ page }) => {
    // Create a test JSONL file
    const testData = [
      { id: '1', question: 'What is chaos engineering?', context: 'Chaos engineering tests resilience' },
      { id: '2', question: 'Why test failures?', context: 'To improve system reliability' }
    ];
    
    const jsonlContent = testData.map(d => JSON.stringify(d)).join('\n');
    
    // Upload file
    const fileInput = page.locator('#tmDatasetFile');
    await fileInput.setInputFiles({
      name: 'test-data.jsonl',
      mimeType: 'application/jsonl',
      buffer: Buffer.from(jsonlContent)
    });
    
    // Verify data loaded
    const output = page.locator('#tmOut');
    await expect(output).toContainText('Loaded 2 rows');
  });
  
  test('should integrate with mock HTTP agent', async ({ page }) => {
    // Start mock server first
    // This would be handled by playwright.config.ts webServer
    
    // Switch to HTTP adapter
    await page.locator('input[name="tmAdapter"][value="http"]').check();
    await page.fill('#tmBaseUrl', 'http://localhost:9009');
    
    // Run test against mock agent
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check that test completed
    const score = page.locator('#tmResScore');
    await expect(score).toHaveText(/Resilience: \d+/);
  });
  
  test('should simulate circuit breaker behavior', async ({ page }) => {
    // Configure for circuit breaker test
    await page.locator('#scenarioSelect').selectOption('cascading_failure');
    
    // Enable circuit breaker visualization
    await page.click('#showCircuitBreaker');
    
    // Run scenario
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Check for circuit breaker state changes
    await page.waitForSelector('.circuit-state-open', { timeout: 5000 });
    await expect(page.locator('.circuit-state')).toContainText('OPEN');
    
    // Wait for half-open state
    await page.waitForTimeout(3000);
    await expect(page.locator('.circuit-state')).toContainText('HALF_OPEN');
    
    // Eventually should return to closed
    await page.waitForSelector('.circuit-state-closed', { timeout: 10000 });
  });
  
  test('should export actionable report', async ({ page }) => {
    // Run a complete test
    await page.locator('#scenarioSelect').selectOption('network_instability');
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Wait for completion
    await page.waitForSelector('.insights-report', { timeout: 10000 });
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Report")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('chaos-report');
    expect(download.suggestedFilename()).toContain('.md');
    
    // Read the content
    const content = await download.path().then(path => {
      if (path) {
        return require('fs').readFileSync(path, 'utf8');
      }
      return '';
    });
    
    // Verify report contains key sections
    expect(content).toContain('Chaos Test Report');
    expect(content).toContain('What Worked');
    expect(content).toContain('Recommendations');
  });
  
  test('should compare baseline vs chaos performance', async ({ page }) => {
    // Run baseline
    await page.click('button:has-text("Run Baseline")');
    await page.waitForTimeout(2000);
    
    const baselineScore = await page.locator('#baselineScore').textContent();
    const baseline = parseInt(baselineScore || '0');
    
    // Apply chaos scenario
    await page.locator('#scenarioSelect').selectOption('degraded_model');
    
    // Run with chaos
    await page.click('button:has-text("Run with Chaos")');
    await page.waitForTimeout(2000);
    
    const chaosScore = await page.locator('#chaosScore').textContent();
    const chaos = parseInt(chaosScore || '0');
    
    // Chaos score should be lower than baseline
    expect(chaos).toBeLessThan(baseline);
    
    // Check degradation percentage
    const degradation = page.locator('#degradationPercent');
    await expect(degradation).toBeVisible();
    await expect(degradation).toContainText('%');
  });
  
  test('should provide real-time chaos injection feedback', async ({ page }) => {
    // Enable debug mode for real-time feedback
    await page.click('#debugBtn');
    
    // Start chaos scenario
    await page.locator('#scenarioSelect').selectOption('openai_outage');
    await page.click('button:has-text("RUN SCENARIO")');
    
    // Check for real-time chaos events in debug panel
    const debugPanel = page.locator('#debugPanel');
    await expect(debugPanel).toBeVisible();
    
    // Look for chaos injection logs
    await expect(debugPanel).toContainText('HTTP 500');
    await expect(debugPanel).toContainText('Retry attempt');
    await expect(debugPanel).toContainText('Fallback activated');
  });
});

test.describe('Interactive Test Builder', () => {
  
  test('should allow drag-and-drop timeline building', async ({ page }) => {
    await page.goto('/docs/claude_prototype_enhanced.html');
    
    // Open test builder
    await page.click('button:has-text("Test Builder")');
    
    const builder = page.locator('#testBuilder');
    await expect(builder).toBeVisible();
    
    // Drag a failure pattern to timeline
    const failurePattern = page.locator('.failure-pattern:has-text("500 Error")');
    const timeline = page.locator('#testTimeline');
    
    await failurePattern.dragTo(timeline);
    
    // Verify pattern added to timeline
    await expect(timeline).toContainText('500 Error');
    
    // Add another pattern
    const rateLimit = page.locator('.failure-pattern:has-text("Rate Limit")');
    await rateLimit.dragTo(timeline);
    
    // Save test suite
    await page.fill('#testSuiteName', 'My Chaos Test');
    await page.click('button:has-text("Save Test Suite")');
    
    // Verify saved
    await expect(page.locator('.saved-notification')).toBeVisible();
  });
  
  test('should preview chaos effects before running', async ({ page }) => {
    await page.goto('/docs/claude_prototype_enhanced.html');
    
    // Select a scenario
    await page.locator('#scenarioSelect').selectOption('rate_limit_surge');
    
    // Click preview button
    await page.click('button:has-text("Preview Effects")');
    
    // Check preview modal
    const preview = page.locator('#chaosPreview');
    await expect(preview).toBeVisible();
    
    // Verify preview shows expected failures
    await expect(preview).toContainText('Expected: 80% rate limit errors');
    await expect(preview).toContainText('Latency: 2000ms added');
    await expect(preview).toContainText('Recovery: Exponential backoff required');
  });
});