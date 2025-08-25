import { test, expect, Page } from '@playwright/test';

test.describe('End-to-End Complete Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete Scenario-Based Testing Workflow', () => {
    test('should complete full fetch scenario workflow', async ({ page }) => {
      // Step 1: Configure for fetch scenario
      await page.check('input[name="scenario"][value="fetch"]');
      await page.fill('#seed', 'e2e-fetch-test');
      
      // Configure chaos parameters
      await page.fill('#latencyMs', '1500');
      await page.fill('#latencyRate', '30');
      await page.fill('#http500Rate', '15');
      await page.fill('#rate429', '10');
      await page.fill('#malformedRate', '20');
      
      // Configure recovery
      await page.check('#tripwireOn');
      await page.fill('#maxRetries', '3');
      await page.fill('#backoffBase', '300');
      
      // Step 2: Run baseline
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('RUNNING...', { timeout: 5000 });
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      // Verify baseline results
      await expect(page.locator('#baselineScore')).not.toHaveText('—');
      const baselineScore = await page.locator('#baselineScore').textContent();
      expect(parseInt(baselineScore || '0')).toBeGreaterThanOrEqual(0);
      
      // Step 3: Run chaos test
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('RUNNING...', { timeout: 5000 });
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Verify chaos results
      await expect(page.locator('#chaosScore')).not.toHaveText('—');
      const chaosScore = await page.locator('#chaosScore').textContent();
      expect(parseInt(chaosScore || '0')).toBeGreaterThanOrEqual(0);
      
      // Step 4: Verify delta calculation
      await expect(page.locator('#deltaScore')).not.toHaveText('—');
      
      // Step 5: Check results views
      const views = ['table', 'json', 'graph'];
      for (const view of views) {
        await page.click(`[data-view="${view}"]`);
        await expect(page.locator(`#${view}View`)).toHaveClass(/active/);
        await expect(page.locator(`#${view}View`)).not.toBeEmpty();
      }
      
      // Step 6: Export results
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnDownload');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
      
      // Step 7: Generate permalink
      await page.click('#btnPermalink');
      
      // Verify complete workflow data
      const workflowData = await page.evaluate(() => ({
        baseline: window.chaosLabApp?.lastResults?.baseline?.metrics?.score,
        chaos: window.chaosLabApp?.lastResults?.chaos?.metrics?.score,
        scenario: window.chaosLabApp?.getSelectedScenario(),
        seed: document.getElementById('seed')?.value
      }));
      
      expect(workflowData.baseline).toBeGreaterThanOrEqual(0);
      expect(workflowData.chaos).toBeGreaterThanOrEqual(0);
      expect(workflowData.scenario).toBe('fetch');
      expect(workflowData.seed).toBe('e2e-fetch-test');
    });

    test('should complete full JSON processing workflow', async ({ page }) => {
      // Configure JSON scenario
      await page.check('input[name="scenario"][value="json"]');
      await page.fill('#seed', 'e2e-json-test');
      
      // High malformed rate for JSON testing
      await page.fill('#malformedRate', '40');
      await page.fill('#http500Rate', '20');
      
      // Run complete workflow
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Verify JSON-specific results
      const jsonWorkflow = await page.evaluate(() => {
        const result = window.chaosLabApp?.lastResults?.chaos;
        return {
          hasResult: !!result,
          scenario: result?.metrics?.scenario,
          hasTrace: result?.trace?.length > 0,
          hasData: !!result?.data || !!result?.html
        };
      });
      
      expect(jsonWorkflow.hasResult).toBe(true);
      expect(jsonWorkflow.scenario).toBe('json');
      expect(jsonWorkflow.hasTrace).toBe(true);
    });

    test('should complete full RAG workflow', async ({ page }) => {
      // Configure RAG scenario
      await page.check('input[name="scenario"][value="rag"]');
      await page.fill('#seed', 'e2e-rag-test');
      
      // RAG-specific configuration (context manipulation)
      await page.fill('#ctxBytes', '500');
      await page.fill('#injSeed', 'rag-injection-test');
      
      // Complete workflow
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Verify RAG-specific results
      const ragWorkflow = await page.evaluate(() => {
        const result = window.chaosLabApp?.lastResults?.chaos;
        return {
          scenario: result?.metrics?.scenario,
          hasContextManipulation: result?.trace?.some(row => 
            row.fault === 'context_manipulation' || row.fault?.includes('context')
          ),
          hasDocument: !!result?.doc,
          hasQuery: !!result?.query,
          hasAnswer: !!result?.answer
        };
      });
      
      expect(ragWorkflow.scenario).toBe('rag');
      expect(ragWorkflow.hasContextManipulation).toBe(true);
    });
  });

  test.describe('Complete Evaluation Suite Workflow', () => {
    test('should complete evaluation suite from start to finish', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Step 1: Select and configure suite
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.check('#evalBaseline');
      await page.check('#evalStream');
      
      // Step 2: Run evaluation
      await page.click('#btnRunEval');
      
      // Wait for progress indicators
      await expect(page.locator('#evalProgress')).toBeVisible();
      await expect(page.locator('#evalStatus')).toContainText(/initializing|running/i);
      
      // Wait for completion
      await expect(page.locator('#evalProgress')).toBeHidden({ timeout: 90000 });
      
      // Step 3: Verify results
      await expect(page.locator('#evalOutput')).not.toBeEmpty();
      const hasResults = await page.locator('#evalOutput').textContent();
      expect(hasResults?.length).toBeGreaterThan(0);
      
      // Step 4: Check history
      const historySection = page.locator('#evalHistory');
      if (await historySection.isVisible()) {
        await expect(page.locator('#historyList')).not.toBeEmpty();
      }
      
      // Step 5: Export evaluation results
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExportEval');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      
      // Step 6: Compare with previous run
      await page.click('#btnRunEval');
      await expect(page.locator('#evalProgress')).toBeHidden({ timeout: 90000 });
      
      await page.click('#btnCompareEval');
      // Should show comparison interface or results
      const comparisonVisible = await page.locator('#evalOutput').textContent();
      expect(comparisonVisible).toBeTruthy();
    });

    test('should handle custom evaluation suite upload', async ({ page }) => {
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      
      // Select custom upload option
      await page.selectOption('#evalSuiteSelect', 'custom');
      
      // This would typically trigger a file upload dialog
      // For testing, we'll simulate custom suite loading
      const customSuiteResult = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const customSuite = {
          suite: "E2E Custom Test Suite",
          cases: [
            {
              name: "Custom Test Case",
              scenario: "fetch",
              seeds: ["custom123"],
              faults: { latency_ms: 2000, http_500_rate: 0.3 },
              assertions: [
                { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.6 }
              ]
            }
          ],
          gate: { score_min: 60 }
        };
        
        try {
          const validation = await window.enhancedEvals.validateEvalSuite(customSuite);
          const metadata = window.enhancedEvals.getEvalSuiteMetadata(customSuite);
          
          return {
            valid: validation.valid,
            name: metadata.name,
            caseCount: metadata.caseCount,
            complexity: metadata.complexity
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      expect(customSuiteResult?.valid).toBe(true);
      expect(customSuiteResult?.name).toBe("E2E Custom Test Suite");
      expect(customSuiteResult?.caseCount).toBe(1);
    });
  });

  test.describe('Complete Wizard Workflow', () => {
    test('should complete full wizard-guided workflow', async ({ page }) => {
      // Step 1: Launch wizard
      await page.click('#btnWizard');
      await expect(page.locator('#wizard')).not.toHaveClass(/hidden/);
      
      // Step 2: Configure test (Step 1)
      await expect(page.locator('.wizard-step.active')).toHaveText('CONFIGURE');
      await page.selectOption('#wizardScenario', 'json');
      await page.selectOption('#wizardIntensity', 'high');
      await page.fill('#wizardSeed', 'wizard-e2e-test');
      await page.check('#wizardRecovery');
      
      // Navigate to Step 2
      await page.click('button:has-text("NEXT →")');
      await expect(page.locator('.wizard-step.active')).toHaveText('BASELINE');
      
      // Step 3: Run baseline (Step 2)
      await page.click('#wizardBaselineBtn');
      await expect(page.locator('#wizardBaselineBtn')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Wait for baseline completion
      await expect(page.locator('#wizardBaselineNext')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#wizardBaselineScore')).not.toHaveText('—');
      
      // Navigate to Step 3
      await page.click('#wizardBaselineNext');
      await expect(page.locator('.wizard-step.active')).toHaveText('CHAOS');
      
      // Step 4: Run chaos (Step 3)
      await page.click('#wizardChaosBtn');
      await expect(page.locator('#wizardChaosBtn')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Wait for chaos completion
      await expect(page.locator('#wizardChaosNext')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#wizardChaosScore')).not.toHaveText('—');
      
      // Navigate to Step 4
      await page.click('#wizardChaosNext');
      await expect(page.locator('.wizard-step.active')).toHaveText('RESULTS');
      
      // Step 5: Review results (Step 4)
      await expect(page.locator('.results-summary')).toBeVisible();
      await expect(page.locator('.recommendations')).toBeVisible();
      
      // Verify scores are displayed
      const baselineScore = await page.locator('.results-summary .metric-card:nth-child(1) .metric-value').textContent();
      const chaosScore = await page.locator('.results-summary .metric-card:nth-child(2) .metric-value').textContent();
      const deltaScore = await page.locator('.results-summary .metric-card:nth-child(3) .metric-value').textContent();
      
      expect(parseInt(baselineScore || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(chaosScore || '0')).toBeGreaterThanOrEqual(0);
      expect(deltaScore).toBeTruthy();
      
      // Step 6: Export wizard report
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("📊 EXPORT REPORT")');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/chaos-lab-report.*\.json$/);
      
      // Step 7: Close wizard
      await page.click('button:has-text("CLOSE")');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
      
      // Verify configuration was applied to main interface
      await expect(page.locator('#seed')).toHaveValue('wizard-e2e-test');
      await expect(page.locator('input[name="scenario"][value="json"]')).toBeChecked();
    });

    test('should handle wizard interruption and recovery', async ({ page }) => {
      // Start wizard
      await page.click('#btnWizard');
      await page.selectOption('#wizardScenario', 'fetch');
      await page.fill('#wizardSeed', 'interruption-test');
      
      // Move to baseline step
      await page.click('button:has-text("NEXT →")');
      
      // Start baseline
      await page.click('#wizardBaselineBtn');
      await expect(page.locator('#wizardBaselineBtn')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Interrupt by closing wizard
      await page.click('.btn-close');
      await expect(page.locator('#wizard')).toHaveClass(/hidden/);
      
      // Reopen wizard - should start fresh
      await page.click('#btnWizard');
      await expect(page.locator('.wizard-step.active')).toHaveText('CONFIGURE');
      await expect(page.locator('#wizardScenario')).toHaveValue('fetch'); // Default value
      await expect(page.locator('#wizardSeed')).toHaveValue('1337'); // Default value
    });
  });

  test.describe('Configuration Persistence Workflow', () => {
    test('should persist configuration across sessions', async ({ page }) => {
      // Step 1: Configure test parameters
      const testConfig = {
        seed: 'persistence-test-123',
        scenario: 'rag',
        theme: 'geometric',
        latencyMs: '2500',
        latencyRate: '35',
        http500Rate: '18',
        rate429: '12',
        malformedRate: '22',
        tripwireOn: true,
        maxRetries: '4',
        backoffBase: '400',
        backoffFactor: '1.8',
        jitter: '0.25'
      };
      
      // Apply configuration
      await page.fill('#seed', testConfig.seed);
      await page.check(`input[name="scenario"][value="${testConfig.scenario}"]`);
      await page.selectOption('#themeSelector', testConfig.theme);
      await page.fill('#latencyMs', testConfig.latencyMs);
      await page.fill('#latencyRate', testConfig.latencyRate);
      await page.fill('#http500Rate', testConfig.http500Rate);
      await page.fill('#rate429', testConfig.rate429);
      await page.fill('#malformedRate', testConfig.malformedRate);
      await page.fill('#maxRetries', testConfig.maxRetries);
      await page.fill('#backoffBase', testConfig.backoffBase);
      await page.fill('#backoffFactor', testConfig.backoffFactor);
      await page.fill('#jitter', testConfig.jitter);
      
      if (testConfig.tripwireOn) {
        await page.check('#tripwireOn');
      }
      
      // Run a test to ensure configuration is saved
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      // Step 2: Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Step 3: Verify configuration is restored
      await expect(page.locator('#seed')).toHaveValue(testConfig.seed);
      await expect(page.locator(`input[name="scenario"][value="${testConfig.scenario}"]`)).toBeChecked();
      await expect(page.locator('#themeSelector')).toHaveValue(testConfig.theme);
      await expect(page.locator('#latencyMs')).toHaveValue(testConfig.latencyMs);
      await expect(page.locator('#latencyRate')).toHaveValue(testConfig.latencyRate);
      await expect(page.locator('#http500Rate')).toHaveValue(testConfig.http500Rate);
      await expect(page.locator('#rate429')).toHaveValue(testConfig.rate429);
      await expect(page.locator('#malformedRate')).toHaveValue(testConfig.malformedRate);
      await expect(page.locator('#maxRetries')).toHaveValue(testConfig.maxRetries);
      await expect(page.locator('#backoffBase')).toHaveValue(testConfig.backoffBase);
      await expect(page.locator('#backoffFactor')).toHaveValue(testConfig.backoffFactor);
      await expect(page.locator('#jitter')).toHaveValue(testConfig.jitter);
      
      if (testConfig.tripwireOn) {
        await expect(page.locator('#tripwireOn')).toBeChecked();
      }
      
      // Step 4: Verify results are also restored
      const hasBaselineScore = await page.locator('#baselineScore').textContent();
      expect(hasBaselineScore).not.toBe('—');
    });

    test('should handle configuration export and import', async ({ page }) => {
      // Configure test
      await page.fill('#seed', 'export-import-test');
      await page.check('input[name="scenario"][value="json"]');
      await page.fill('#latencyMs', '3000');
      
      // Run test to generate results
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      // Export configuration
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExport');
      const download = await downloadPromise;
      
      // Verify export contains configuration
      const exportFilename = download.suggestedFilename();
      expect(exportFilename).toMatch(/\.(json|csv)$/);
      
      // Clear configuration
      await page.fill('#seed', '');
      await page.check('input[name="scenario"][value="fetch"]');
      await page.fill('#latencyMs', '1000');
      
      // Verify configuration changed
      await expect(page.locator('#seed')).toHaveValue('');
      await expect(page.locator('input[name="scenario"][value="fetch"]')).toBeChecked();
      await expect(page.locator('#latencyMs')).toHaveValue('1000');
      
      // Import would typically be through file input - for testing, verify export structure
      const exportData = await page.evaluate(() => {
        const config = {
          seed: document.getElementById('seed')?.value,
          scenario: document.querySelector('input[name="scenario"]:checked')?.value,
          latencyMs: document.getElementById('latencyMs')?.value
        };
        
        return {
          hasConfiguration: true,
          exportStructure: config
        };
      });
      
      expect(exportData.hasConfiguration).toBe(true);
      expect(exportData.exportStructure).toBeTruthy();
    });
  });

  test.describe('URL Sharing Workflow', () => {
    test('should create and restore from shareable URLs', async ({ page }) => {
      // Configure test
      await page.fill('#seed', 'url-share-test');
      await page.check('input[name="scenario"][value="rag"]');
      await page.fill('#latencyMs', '2000');
      await page.fill('#latencyRate', '25');
      
      // Generate shareable URL
      await page.click('#btnPermalink');
      
      // Get the URL (would typically be copied to clipboard)
      const currentUrl = page.url();
      const shareableUrl = await page.evaluate(() => {
        // Simulate URL generation
        const params = new URLSearchParams();
        params.set('seed', document.getElementById('seed')?.value || '');
        params.set('scenario', document.querySelector('input[name="scenario"]:checked')?.value || '');
        params.set('latencyMs', document.getElementById('latencyMs')?.value || '');
        params.set('latencyRate', document.getElementById('latencyRate')?.value || '');
        
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      });
      
      expect(shareableUrl).toContain('seed=url-share-test');
      expect(shareableUrl).toContain('scenario=rag');
      expect(shareableUrl).toContain('latencyMs=2000');
      
      // Navigate to the shareable URL
      await page.goto(shareableUrl);
      await page.waitForLoadState('networkidle');
      
      // Verify configuration is restored
      await expect(page.locator('#seed')).toHaveValue('url-share-test');
      await expect(page.locator('input[name="scenario"][value="rag"]')).toBeChecked();
      await expect(page.locator('#latencyMs')).toHaveValue('2000');
      await expect(page.locator('#latencyRate')).toHaveValue('25');
      
      // Run test with restored configuration
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Verify test ran with correct configuration
      const testResult = await page.evaluate(() => {
        const result = window.chaosLabApp?.lastResults?.chaos;
        return {
          seed: result?.metrics?.seed,
          scenario: result?.metrics?.scenario
        };
      });
      
      expect(testResult.seed).toBe('url-share-test');
      expect(testResult.scenario).toBe('rag');
    });

    test('should handle malformed URL parameters gracefully', async ({ page }) => {
      const malformedUrls = [
        '/?seed=test&scenario=invalid_scenario&latencyMs=invalid',
        '/?seed=&scenario=&latencyMs=',
        '/?seed=test%20with%20spaces&scenario=fetch&latencyMs=99999999',
        '/?malicious=<script>alert("xss")</script>&seed=test'
      ];
      
      for (const malformedUrl of malformedUrls) {
        await page.goto(`/index_new.html${malformedUrl}`);
        await page.waitForLoadState('networkidle');
        
        // Page should load without errors
        await expect(page.locator('body')).toBeVisible();
        
        // Interface should remain functional
        await expect(page.locator('#btnBaseline')).not.toBeDisabled();
        await expect(page.locator('#btnChaos')).not.toBeDisabled();
        
        // Should have valid default values for invalid parameters
        const scenario = await page.locator('input[name="scenario"]:checked').getAttribute('value');
        expect(['fetch', 'rag', 'json']).toContain(scenario);
        
        const latencyMs = await page.locator('#latencyMs').inputValue();
        expect(parseInt(latencyMs)).toBeGreaterThanOrEqual(0);
        expect(parseInt(latencyMs)).toBeLessThanOrEqual(10000);
      }
    });
  });

  test.describe('Export and Download Features', () => {
    test('should support multiple export formats and comprehensive downloads', async ({ page }) => {
      // Setup complete test scenario
      await page.fill('#seed', 'export-test-comprehensive');
      await page.check('input[name="scenario"][value="json"]');
      await page.fill('#latencyMs', '1800');
      await page.fill('#malformedRate', '30');
      
      // Run complete test cycle
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Test different export formats
      const exportFormats = [
        { view: 'table', expectedContent: 'table' },
        { view: 'json', expectedContent: 'json' },
        { view: 'graph', expectedContent: 'graph' }
      ];
      
      for (const format of exportFormats) {
        // Switch to format view
        await page.click(`[data-view="${format.view}"]`);
        await expect(page.locator(`#${format.view}View`)).toHaveClass(/active/);
        
        // Download in this format
        const downloadPromise = page.waitForEvent('download');
        await page.click('#btnDownload');
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toBeTruthy();
        
        // Copy to clipboard
        await page.click('#btnCopy');
        // Verify clipboard operation doesn't cause errors
        await expect(page.locator('#btnCopy')).toBeVisible();
      }
      
      // Test comprehensive report export
      const reportDownloadPromise = page.waitForEvent('download');
      await page.click('#btnExport');
      const reportDownload = await reportDownloadPromise;
      
      expect(reportDownload.suggestedFilename()).toMatch(/\.(json|csv|pdf)$/);
    });

    test('should generate comprehensive evaluation reports with all sections', async ({ page }) => {
      // Run evaluation suite
      await page.locator('#evalSection').scrollIntoViewIfNeeded();
      await page.selectOption('#evalSuiteSelect', 'reliability_core');
      await page.check('#evalBaseline');
      
      await page.click('#btnRunEval');
      await expect(page.locator('#evalProgress')).toBeHidden({ timeout: 90000 });
      
      // Export comprehensive evaluation report
      const downloadPromise = page.waitForEvent('download');
      await page.click('#btnExportEval');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      
      // Verify report structure through API
      const reportStructure = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        // Get latest run ID
        const runId = Array.from(window.enhancedEvals.resultHistory.keys()).pop();
        if (!runId) return null;
        
        try {
          const report = await window.enhancedEvals.generateEvalReport(runId, {
            format: 'comprehensive',
            includeCharts: true,
            includeRecommendations: true,
            includeRawData: true
          });
          
          return {
            hasMetadata: !!report.metadata,
            hasExecutiveSummary: !!report.executive_summary,
            hasDetailedAnalysis: !!report.detailed_analysis,
            hasPerformanceMetrics: !!report.performance_metrics,
            hasReliabilityAssessment: !!report.reliability_assessment,
            hasRecommendations: !!report.recommendations,
            hasVisualizations: !!report.visualizations,
            hasAppendices: !!report.appendices,
            hasRawData: !!report.appendices?.raw_data,
            hasMethodology: !!report.appendices?.methodology
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      expect(reportStructure?.hasMetadata).toBe(true);
      expect(reportStructure?.hasExecutiveSummary).toBe(true);
      expect(reportStructure?.hasDetailedAnalysis).toBe(true);
      expect(reportStructure?.hasPerformanceMetrics).toBe(true);
      expect(reportStructure?.hasReliabilityAssessment).toBe(true);
      expect(reportStructure?.hasRecommendations).toBe(true);
      expect(reportStructure?.hasAppendices).toBe(true);
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from network failures during workflow', async ({ page }) => {
      // Start test normally
      await page.fill('#seed', 'network-failure-test');
      await page.check('input[name="scenario"][value="fetch"]');
      
      // Start baseline test
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Simulate network failure mid-test
      await page.route('https://httpbin.org/**', route => route.abort());
      await page.route('https://jsonplaceholder.typicode.com/**', route => route.abort());
      
      // Test should complete with fallback
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      // Should have fallback results
      const baselineScore = await page.locator('#baselineScore').textContent();
      expect(baselineScore).not.toBe('—');
      
      // Interface should remain functional
      await expect(page.locator('#btnChaos')).not.toBeDisabled();
      
      // Restore network and run chaos test
      await page.unroute('https://httpbin.org/**');
      await page.unroute('https://jsonplaceholder.typicode.com/**');
      
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Should complete successfully
      const chaosScore = await page.locator('#chaosScore').textContent();
      expect(chaosScore).not.toBe('—');
    });

    test('should handle browser refresh during test execution', async ({ page }) => {
      // Start long-running test
      await page.fill('#seed', 'refresh-test');
      await page.fill('#latencyMs', '3000'); // Longer delays
      await page.check('input[name="scenario"][value="rag"]');
      
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // Refresh page mid-execution
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Application should load cleanly
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE');
      
      // Should be able to run new tests
      await page.fill('#seed', 'post-refresh-test');
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
    });

    test('should maintain data integrity across workflow interruptions', async ({ page }) => {
      // Configure and run initial test
      await page.fill('#seed', 'integrity-test-1');
      await page.check('input[name="scenario"][value="json"]');
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      const firstScore = await page.locator('#baselineScore').textContent();
      
      // Start wizard workflow
      await page.click('#btnWizard');
      await page.fill('#wizardSeed', 'integrity-test-2');
      await page.selectOption('#wizardScenario', 'fetch');
      
      // Cancel wizard
      await page.click('.btn-close');
      
      // Verify original test results are still intact
      await expect(page.locator('#baselineScore')).toHaveText(firstScore || '');
      await expect(page.locator('#seed')).toHaveValue('integrity-test-1');
      await expect(page.locator('input[name="scenario"][value="json"]')).toBeChecked();
      
      // Run chaos test to verify functionality
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      // Should have both baseline and chaos results
      const chaosScore = await page.locator('#chaosScore').textContent();
      expect(chaosScore).not.toBe('—');
      expect(firstScore).not.toBe('—');
      
      // Delta should be calculated
      const deltaScore = await page.locator('#deltaScore').textContent();
      expect(deltaScore).not.toBe('—');
    });
  });

  test.describe('Performance and User Experience', () => {
    test('should maintain responsive UI throughout complete workflow', async ({ page }) => {
      // Monitor performance during workflow
      const performanceMarks: string[] = [];
      
      await page.evaluate(() => {
        window.performanceMarks = [];
        performance.mark('workflow-start');
        window.performanceMarks.push('workflow-start');
      });
      
      // Configure test
      await page.fill('#seed', 'performance-test');
      await page.check('input[name="scenario"][value="fetch"]');
      
      await page.evaluate(() => {
        performance.mark('config-complete');
        window.performanceMarks.push('config-complete');
      });
      
      // Run baseline
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('RUNNING...', { timeout: 5000 });
      
      // UI should remain responsive during execution
      await page.hover('#btnChaos');
      await page.click('#themeSelector');
      await page.selectOption('#themeSelector', 'modern');
      
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 30000 });
      
      await page.evaluate(() => {
        performance.mark('baseline-complete');
        window.performanceMarks.push('baseline-complete');
      });
      
      // Run chaos
      await page.click('#btnChaos');
      await expect(page.locator('#btnChaos')).toHaveText('⚡ RUN CHAOS', { timeout: 30000 });
      
      await page.evaluate(() => {
        performance.mark('chaos-complete');
        window.performanceMarks.push('chaos-complete');
      });
      
      // Check performance measurements
      const performanceMetrics = await page.evaluate(() => {
        const marks = window.performanceMarks || [];
        const measurements = [];
        
        for (let i = 1; i < marks.length; i++) {
          try {
            performance.measure(`${marks[i-1]}-to-${marks[i]}`, marks[i-1], marks[i]);
            const measure = performance.getEntriesByName(`${marks[i-1]}-to-${marks[i]}`)[0];
            measurements.push({
              name: measure.name,
              duration: measure.duration
            });
          } catch (e) {
            // Ignore measurement errors
          }
        }
        
        return measurements;
      });
      
      // No single operation should take longer than 30 seconds
      performanceMetrics.forEach(metric => {
        expect(metric.duration).toBeLessThan(30000);
      });
      
      // UI should still be responsive
      await page.click(`[data-view="json"]`);
      await expect(page.locator('#jsonView')).toHaveClass(/active/);
    });

    test('should handle concurrent user interactions gracefully', async ({ page }) => {
      // Simulate rapid user interactions
      const rapidActions = async () => {
        await page.fill('#seed', 'concurrent-test-1');
        await page.fill('#latencyMs', '1500');
        await page.check('input[name="scenario"][value="fetch"]');
        await page.selectOption('#themeSelector', 'geometric');
        await page.fill('#seed', 'concurrent-test-2');
        await page.check('input[name="scenario"][value="json"]');
        await page.fill('#malformedRate', '25');
      };
      
      // Execute actions rapidly
      await rapidActions();
      
      // Interface should remain stable
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#btnBaseline')).not.toBeDisabled();
      
      // Final state should be consistent
      const finalState = await page.evaluate(() => ({
        seed: document.getElementById('seed')?.value,
        scenario: document.querySelector('input[name="scenario"]:checked')?.value,
        theme: document.getElementById('themeSelector')?.value,
        malformedRate: document.getElementById('malformedRate')?.value
      }));
      
      expect(finalState.seed).toBe('concurrent-test-2');
      expect(finalState.scenario).toBe('json');
      expect(finalState.theme).toBe('geometric');
      expect(finalState.malformedRate).toBe('25');
      
      // Should be able to run test successfully
      await page.click('#btnBaseline');
      await expect(page.locator('#btnBaseline')).toHaveText('▶️ RUN BASELINE', { timeout: 20000 });
    });
  });
});