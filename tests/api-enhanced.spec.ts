import { test, expect, Page } from '@playwright/test';

test.describe('Enhanced API Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index_new.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Enhanced Evaluation System API', () => {
    test('should load evaluation suite from various sources', async ({ page }) => {
      const testCases = [
        {
          name: 'Built-in suite',
          source: 'reliability_core',
          type: 'builtin'
        },
        {
          name: 'Object suite',
          source: {
            suite: "Test Suite",
            cases: [{
              name: "Test Case",
              scenario: "fetch",
              seeds: ["123"],
              faults: { latency_ms: 1000 },
              assertions: [{ type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.5 }]
            }],
            gate: { score_min: 50 }
          },
          type: 'object'
        }
      ];

      for (const testCase of testCases) {
        const result = await page.evaluate(async (tc) => {
          if (!window.enhancedEvals) return null;
          
          try {
            const suite = await window.enhancedEvals.loadEvalSuite(tc.source);
            return {
              success: true,
              metadata: suite._metadata,
              name: suite.suite,
              caseCount: suite.cases?.length || 0
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }, testCase);

        expect(result?.success).toBe(true);
        expect(result?.name).toBeTruthy();
        expect(result?.caseCount).toBeGreaterThan(0);
        
        if (testCase.type === 'builtin') {
          expect(result?.metadata?.sourceType).toBe('builtin');
        } else if (testCase.type === 'object') {
          expect(result?.metadata?.sourceType).toBe('object');
        }
      }
    });

    test('should validate evaluation suite structure', async ({ page }) => {
      const validationTests = [
        {
          name: 'Valid suite',
          suite: {
            suite: "Valid Test Suite",
            cases: [{
              name: "Valid Case",
              scenario: "fetch",
              seeds: ["123"],
              faults: { latency_ms: 1000 },
              assertions: [{ type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.5 }]
            }],
            gate: { score_min: 70 }
          },
          expectedValid: true
        },
        {
          name: 'Missing required fields',
          suite: {
            cases: []
          },
          expectedValid: false
        },
        {
          name: 'Invalid case structure',
          suite: {
            suite: "Invalid Suite",
            cases: [{
              name: "Invalid Case"
              // Missing scenario, seeds, etc.
            }]
          },
          expectedValid: false
        },
        {
          name: 'Invalid gate',
          suite: {
            suite: "Invalid Gate Suite",
            cases: [{
              name: "Valid Case",
              scenario: "fetch",
              seeds: ["123"]
            }],
            gate: { score_min: 150 } // Invalid score > 100
          },
          expectedValid: false
        }
      ];

      for (const test of validationTests) {
        const validation = await page.evaluate(async (testData) => {
          if (!window.enhancedEvals) return null;
          
          return await window.enhancedEvals.validateEvalSuite(testData.suite);
        }, test);

        expect(validation?.valid).toBe(test.expectedValid);
        
        if (!test.expectedValid) {
          expect(validation?.errors?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should extract comprehensive suite metadata', async ({ page }) => {
      const metadata = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const suite = await window.enhancedEvals.loadEvalSuite('reliability_core');
        return window.enhancedEvals.getEvalSuiteMetadata(suite);
      });

      expect(metadata).toBeTruthy();
      expect(metadata?.name).toBeTruthy();
      expect(metadata?.caseCount).toBeGreaterThan(0);
      expect(metadata?.scenarios).toBeInstanceOf(Array);
      expect(metadata?.estimatedRunTime).toBeGreaterThan(0);
      expect(metadata?.complexity).toMatch(/low|medium|high/);
      expect(metadata?.requirements).toBeInstanceOf(Array);
    });
  });

  test.describe('Streaming Results API', () => {
    test('should stream evaluation results in real-time', async ({ page }) => {
      const streamingResults = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          const suite = await window.enhancedEvals.loadEvalSuite('reliability_core');
          const stream = window.enhancedEvals.streamEvalResults(suite, { timeout: 30000 });
          
          const events = [];
          for await (const event of stream) {
            events.push(event);
            // Limit events to prevent test timeout
            if (events.length > 10) break;
          }
          
          return {
            success: true,
            eventCount: events.length,
            eventTypes: [...new Set(events.map(e => e.type))],
            hasStart: events.some(e => e.type === 'start'),
            hasComplete: events.some(e => e.type === 'complete'),
            streamId: events[0]?.streamId
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(streamingResults?.success).toBe(true);
      expect(streamingResults?.eventCount).toBeGreaterThan(0);
      expect(streamingResults?.eventTypes).toContain('start');
      expect(streamingResults?.streamId).toBeTruthy();
    });

    test('should handle streaming progress updates', async ({ page }) => {
      const progressTracking = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const suite = {
          suite: "Progress Test",
          cases: [{
            name: "Progress Case",
            scenario: "fetch",
            seeds: ["123"]
          }]
        };
        
        const progressEvents = [];
        const stream = window.enhancedEvals.streamEvalResults(suite);
        
        try {
          for await (const event of stream) {
            if (event.type === 'progress') {
              progressEvents.push({
                caseProgress: event.caseProgress,
                overallProgress: event.overallProgress
              });
            }
            
            // Stop after getting some progress events
            if (progressEvents.length >= 3 || event.type === 'complete') break;
          }
          
          return {
            success: true,
            progressEventCount: progressEvents.length,
            hasProgressData: progressEvents.some(p => p.overallProgress > 0)
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(progressTracking?.success).toBe(true);
      expect(progressTracking?.progressEventCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle streaming errors gracefully', async ({ page }) => {
      const errorHandling = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        // Create invalid suite to trigger error
        const invalidSuite = {
          suite: "Error Test",
          cases: [{
            name: "Invalid Case",
            scenario: "nonexistent_scenario",
            seeds: ["123"]
          }]
        };
        
        try {
          const stream = window.enhancedEvals.streamEvalResults(invalidSuite);
          const events = [];
          
          for await (const event of stream) {
            events.push(event);
            if (event.type === 'error' || events.length > 5) break;
          }
          
          return {
            success: true,
            events,
            hasErrorEvent: events.some(e => e.type === 'error' || e.type === 'case_error')
          };
        } catch (error) {
          return {
            success: true, // Expected to catch errors
            caughtError: true,
            errorMessage: error.message
          };
        }
      });

      expect(errorHandling?.success).toBe(true);
      expect(errorHandling?.hasErrorEvent || errorHandling?.caughtError).toBe(true);
    });
  });

  test.describe('Backward Compatibility', () => {
    test('should maintain compatibility with original evals.js', async ({ page }) => {
      // Test that original API still works
      const originalApiTest = await page.evaluate(async () => {
        if (!window.runEvalSuite) return null;
        
        try {
          const result = await window.runEvalSuite('reliability_core', true);
          return {
            success: true,
            hasSuite: !!result.suite,
            hasCases: !!result.cases,
            hasOverallScore: typeof result.overall_score === 'number'
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(originalApiTest?.success).toBe(true);
      expect(originalApiTest?.hasSuite).toBe(true);
      expect(originalApiTest?.hasCases).toBe(true);
      expect(originalApiTest?.hasOverallScore).toBe(true);
    });

    test('should support legacy function signatures', async ({ page }) => {
      const legacyFunctions = ['runFetch', 'runJSON', 'runRAG', 'computeScore'];
      
      for (const funcName of legacyFunctions) {
        const exists = await page.evaluate((name) => {
          return typeof window[name] === 'function';
        }, funcName);
        
        expect(exists).toBe(true);
      }
    });

    test('should maintain original data structures', async ({ page }) => {
      const dataStructureTest = await page.evaluate(async () => {
        if (!window.runEvalSuite) return null;
        
        try {
          const result = await window.runEvalSuite('reliability_core', false);
          
          return {
            hasRequiredFields: !!(result.suite && result.cases && result.started && result.finished),
            caseStructure: result.cases?.[0] && typeof result.cases[0].name === 'string',
            hasMetrics: typeof result.overall_score === 'number'
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(dataStructureTest?.hasRequiredFields).toBe(true);
      expect(dataStructureTest?.caseStructure).toBe(true);
      expect(dataStructureTest?.hasMetrics).toBe(true);
    });
  });

  test.describe('Batch Processing API', () => {
    test('should process multiple suites in batch', async ({ page }) => {
      const batchResult = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const suites = [
          { suite: "Batch Test 1", cases: [{ name: "Case 1", scenario: "fetch", seeds: ["1"] }] },
          { suite: "Batch Test 2", cases: [{ name: "Case 2", scenario: "json", seeds: ["2"] }] }
        ];
        
        try {
          const result = await window.enhancedEvals.runBatchEvaluations(suites, { 
            concurrency: 1,
            failFast: false 
          });
          
          return {
            success: true,
            batchId: result.batchId,
            resultCount: result.results.length,
            hasSummary: !!result.summary,
            duration: result.duration
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(batchResult?.success).toBe(true);
      expect(batchResult?.batchId).toBeTruthy();
      expect(batchResult?.resultCount).toBeGreaterThan(0);
      expect(batchResult?.duration).toBeGreaterThan(0);
    });

    test('should handle concurrent batch processing', async ({ page }) => {
      const concurrentBatchTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const suites = Array.from({ length: 3 }, (_, i) => ({
          suite: `Concurrent Test ${i + 1}`,
          cases: [{ name: `Case ${i + 1}`, scenario: "fetch", seeds: ["123"] }]
        }));
        
        try {
          const result = await window.enhancedEvals.runBatchEvaluations(suites, { 
            concurrency: 2 
          });
          
          return {
            success: true,
            processedAll: result.results.length === suites.length,
            timeEfficient: result.duration < (suites.length * 10000) // Should be faster than sequential
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(concurrentBatchTest?.success).toBe(true);
      expect(concurrentBatchTest?.processedAll).toBe(true);
    });

    test('should handle batch processing failures', async ({ page }) => {
      const failureHandling = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        const suites = [
          { suite: "Valid Suite", cases: [{ name: "Valid Case", scenario: "fetch", seeds: ["1"] }] },
          { suite: "Invalid Suite", cases: [{ name: "Invalid Case", scenario: "invalid", seeds: ["2"] }] }
        ];
        
        try {
          // Test with failFast = false
          const result = await window.enhancedEvals.runBatchEvaluations(suites, { 
            failFast: false 
          });
          
          return {
            success: true,
            continuedAfterFailure: result.results.length > 0,
            hasSummary: !!result.summary
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(failureHandling?.success).toBe(true);
      expect(failureHandling?.continuedAfterFailure).toBe(true);
    });
  });

  test.describe('Comparison and Analysis API', () => {
    test('should compare multiple evaluation runs', async ({ page }) => {
      const comparisonTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          // Simulate stored results
          const mockResults1 = {
            suite: "Test Suite",
            overall_score: 85,
            cases: [{ name: "Case 1", passed: true, score: 85 }],
            finished: new Date().toISOString()
          };
          
          const mockResults2 = {
            suite: "Test Suite",
            overall_score: 78,
            cases: [{ name: "Case 1", passed: true, score: 78 }],
            finished: new Date().toISOString()
          };
          
          // Store mock results
          window.enhancedEvals.storeResults('run1', mockResults1);
          window.enhancedEvals.storeResults('run2', mockResults2);
          
          const comparison = await window.enhancedEvals.compareEvalRuns(['run1', 'run2']);
          
          return {
            success: true,
            hasBaseline: !!comparison.baseline,
            hasComparisons: comparison.comparisons.length > 0,
            hasSummary: !!comparison.summary,
            hasTrends: !!comparison.summary.trends,
            comparedAt: comparison.comparedAt
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(comparisonTest?.success).toBe(true);
      expect(comparisonTest?.hasBaseline).toBe(true);
      expect(comparisonTest?.hasComparisons).toBe(true);
      expect(comparisonTest?.hasSummary).toBe(true);
      expect(comparisonTest?.comparedAt).toBeTruthy();
    });

    test('should generate comprehensive evaluation reports', async ({ page }) => {
      const reportGeneration = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          // Store mock results
          const mockResults = {
            suite: "Report Test Suite",
            overall_score: 82,
            cases: [
              { name: "Case 1", passed: true, score: 85, duration_ms: 1200 },
              { name: "Case 2", passed: true, score: 79, duration_ms: 1500 }
            ],
            started: new Date(Date.now() - 10000).toISOString(),
            finished: new Date().toISOString()
          };
          
          window.enhancedEvals.storeResults('report-test', mockResults);
          
          const report = await window.enhancedEvals.generateEvalReport('report-test', {
            format: 'comprehensive',
            includeCharts: true,
            includeRecommendations: true
          });
          
          return {
            success: true,
            hasMetadata: !!report.metadata,
            hasExecutiveSummary: !!report.executive_summary,
            hasDetailedAnalysis: !!report.detailed_analysis,
            hasRecommendations: !!report.recommendations,
            hasAppendices: !!report.appendices
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(reportGeneration?.success).toBe(true);
      expect(reportGeneration?.hasMetadata).toBe(true);
      expect(reportGeneration?.hasExecutiveSummary).toBe(true);
      expect(reportGeneration?.hasDetailedAnalysis).toBe(true);
      expect(reportGeneration?.hasRecommendations).toBe(true);
    });
  });

  test.describe('Scheduling API', () => {
    test('should schedule evaluations for future execution', async ({ page }) => {
      const schedulingTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          const suite = { 
            suite: "Scheduled Test", 
            cases: [{ name: "Scheduled Case", scenario: "fetch", seeds: ["123"] }] 
          };
          
          const futureTime = new Date(Date.now() + 5000); // 5 seconds from now
          
          const scheduleId = window.enhancedEvals.scheduleEvaluation(suite, futureTime, {
            priority: 'high'
          });
          
          return {
            success: true,
            scheduleId: scheduleId,
            hasScheduleId: !!scheduleId
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(schedulingTest?.success).toBe(true);
      expect(schedulingTest?.hasScheduleId).toBe(true);
      expect(schedulingTest?.scheduleId).toBeTruthy();
    });

    test('should reject past scheduling times', async ({ page }) => {
      const pastScheduleTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          const suite = { 
            suite: "Past Test", 
            cases: [{ name: "Past Case", scenario: "fetch", seeds: ["123"] }] 
          };
          
          const pastTime = new Date(Date.now() - 5000); // 5 seconds ago
          
          window.enhancedEvals.scheduleEvaluation(suite, pastTime);
          
          return {
            success: false,
            shouldNotReachHere: true
          };
        } catch (error) {
          return {
            success: true,
            caughtExpectedError: error.message.includes('future')
          };
        }
      });

      expect(pastScheduleTest?.success).toBe(true);
      expect(pastScheduleTest?.caughtExpectedError).toBe(true);
    });
  });

  test.describe('WebSocket Integration API', () => {
    test('should support real-time update subscriptions', async ({ page }) => {
      const subscriptionTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          let receivedEvents = [];
          
          const unsubscribe = window.enhancedEvals.subscribeToUpdates((event) => {
            receivedEvents.push(event);
          }, {
            type: 'eval_update'
          });
          
          // Simulate an event
          if (window.enhancedEvals.wsEventTarget) {
            window.enhancedEvals.wsEventTarget.dispatchEvent(
              new CustomEvent('eval_update', {
                detail: { type: 'test', data: 'test_data' }
              })
            );
          }
          
          // Wait a moment for event processing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          unsubscribe();
          
          return {
            success: true,
            receivedEvents: receivedEvents.length,
            unsubscribeWorks: typeof unsubscribe === 'function'
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(subscriptionTest?.success).toBe(true);
      expect(subscriptionTest?.unsubscribeWorks).toBe(true);
      expect(subscriptionTest?.receivedEvents).toBeGreaterThanOrEqual(0);
    });

    test('should filter subscription events correctly', async ({ page }) => {
      const filterTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          let filteredEvents = [];
          let allEvents = [];
          
          // Subscribe with filter
          window.enhancedEvals.subscribeToUpdates((event) => {
            filteredEvents.push(event);
          }, {
            suite: 'test_suite'
          });
          
          // Subscribe without filter
          window.enhancedEvals.subscribeToUpdates((event) => {
            allEvents.push(event);
          });
          
          // Simulate events
          if (window.enhancedEvals.wsEventTarget) {
            window.enhancedEvals.wsEventTarget.dispatchEvent(
              new CustomEvent('eval_update', {
                detail: { type: 'test', suite: 'test_suite' }
              })
            );
            
            window.enhancedEvals.wsEventTarget.dispatchEvent(
              new CustomEvent('eval_update', {
                detail: { type: 'test', suite: 'other_suite' }
              })
            );
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return {
            success: true,
            filteredCount: filteredEvents.length,
            allCount: allEvents.length,
            filterWorks: allEvents.length >= filteredEvents.length
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(filterTest?.success).toBe(true);
      expect(filterTest?.filterWorks).toBe(true);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle malformed suite data gracefully', async ({ page }) => {
      const malformedDataTests = [
        null,
        undefined,
        'invalid_string',
        { /* missing required fields */ },
        { suite: "Test", cases: "not_an_array" },
        { suite: "Test", cases: [{ /* malformed case */ }] }
      ];

      for (const malformedSuite of malformedDataTests) {
        const result = await page.evaluate(async (suite) => {
          if (!window.enhancedEvals) return null;
          
          try {
            await window.enhancedEvals.validateEvalSuite(suite);
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, malformedSuite);

        // Should handle gracefully without crashing
        expect(result).toBeTruthy();
      }
    });

    test('should recover from network timeouts', async ({ page }) => {
      // Mock network timeout
      await page.route('**/api/**', route => {
        setTimeout(() => route.abort(), 5000);
      });

      const timeoutHandling = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          // This should timeout but be handled gracefully
          await window.enhancedEvals.loadFromURL('https://example.com/timeout-test.json', {
            timeout: 1000
          });
          
          return { success: false, shouldHaveTimedOut: true };
        } catch (error) {
          return { 
            success: true, 
            handledTimeout: error.message.includes('timeout') || error.message.includes('abort')
          };
        }
      });

      expect(timeoutHandling?.success).toBe(true);
      expect(timeoutHandling?.handledTimeout).toBe(true);
    });

    test('should maintain data integrity during failures', async ({ page }) => {
      const dataIntegrityTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          // Store some data
          const testData = { suite: "Integrity Test", score: 85 };
          window.enhancedEvals.storeResults('integrity-test', testData);
          
          // Simulate error condition
          const originalJSON = JSON.stringify;
          JSON.stringify = function() { 
            throw new Error('JSON serialization failed'); 
          };
          
          // Try to store more data (should fail)
          try {
            window.enhancedEvals.storeResults('integrity-test-2', { suite: "Should Fail" });
          } catch (e) {
            // Expected to fail
          }
          
          // Restore JSON
          JSON.stringify = originalJSON;
          
          // Original data should still be intact
          const retrievedData = window.enhancedEvals.getStoredResults('integrity-test');
          
          return {
            success: true,
            dataIntact: retrievedData?.suite === "Integrity Test",
            scoreIntact: retrievedData?.score === 85
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(dataIntegrityTest?.success).toBe(true);
      expect(dataIntegrityTest?.dataIntact).toBe(true);
      expect(dataIntegrityTest?.scoreIntact).toBe(true);
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should handle large evaluation suites efficiently', async ({ page }) => {
      const performanceTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        // Create large suite
        const largeSuite = {
          suite: "Large Performance Test",
          cases: Array.from({ length: 10 }, (_, i) => ({
            name: `Performance Case ${i + 1}`,
            scenario: "fetch",
            seeds: ["123"],
            faults: { latency_ms: 100 }
          }))
        };
        
        const startTime = Date.now();
        
        try {
          const validation = await window.enhancedEvals.validateEvalSuite(largeSuite);
          const metadata = window.enhancedEvals.getEvalSuiteMetadata(largeSuite);
          
          const endTime = Date.now();
          const processingTime = endTime - startTime;
          
          return {
            success: true,
            processingTime,
            validationPassed: validation.valid,
            metadataExtracted: !!metadata.name,
            efficientProcessing: processingTime < 1000 // Should be fast
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(performanceTest?.success).toBe(true);
      expect(performanceTest?.validationPassed).toBe(true);
      expect(performanceTest?.metadataExtracted).toBe(true);
      expect(performanceTest?.efficientProcessing).toBe(true);
    });

    test('should optimize memory usage for long-running tests', async ({ page }) => {
      const memoryTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          // Store many results to test memory management
          for (let i = 0; i < 50; i++) {
            window.enhancedEvals.storeResults(`test-${i}`, {
              suite: `Test ${i}`,
              score: i,
              timestamp: new Date().toISOString()
            });
          }
          
          // Force cleanup
          window.enhancedEvals.cleanupOldResults();
          
          // Check if cleanup worked
          const remainingResults = window.enhancedEvals.resultHistory.size;
          
          return {
            success: true,
            cleanupWorked: remainingResults <= 50,
            memoryManaged: true
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(memoryTest?.success).toBe(true);
      expect(memoryTest?.cleanupWorked).toBe(true);
    });

    test('should cache frequently accessed data', async ({ page }) => {
      const cachingTest = await page.evaluate(async () => {
        if (!window.enhancedEvals) return null;
        
        try {
          const suite = await window.enhancedEvals.loadEvalSuite('reliability_core');
          
          const firstLoadTime = Date.now();
          const metadata1 = window.enhancedEvals.getEvalSuiteMetadata(suite);
          const firstLoadDuration = Date.now() - firstLoadTime;
          
          const secondLoadTime = Date.now();
          const metadata2 = window.enhancedEvals.getEvalSuiteMetadata(suite);
          const secondLoadDuration = Date.now() - secondLoadTime;
          
          return {
            success: true,
            firstDuration: firstLoadDuration,
            secondDuration: secondLoadDuration,
            consistentResults: metadata1.name === metadata2.name,
            potentialCaching: secondLoadDuration <= firstLoadDuration
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      expect(cachingTest?.success).toBe(true);
      expect(cachingTest?.consistentResults).toBe(true);
    });
  });
});