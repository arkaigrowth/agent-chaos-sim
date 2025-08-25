// Enhanced Evaluation Runner - Integrated with Data Collection Pipeline
// Extends the existing evaluation runner with real-time analytics and data integration

class EnhancedEvaluationRunner extends EvaluationRunner {
  constructor() {
    super();
    this.dataCollector = null;
    this.currentEvaluationSession = null;
    this.realTimeUpdateInterval = null;
    this.streamingEnabled = false;
    this.batchMode = false;
    
    // Enhanced features
    this.parallelExecutionEnabled = false;
    this.maxParallelTests = 3;
    this.executionQueue = [];
    this.comparisonHistory = [];
    
    this.initializeEnhancedFeatures();
  }

  initializeEnhancedFeatures() {
    // Wait for DataCollector to be available
    if (typeof window !== 'undefined' && window.dataCollector) {
      this.dataCollector = window.dataCollector;
      this.setupDataCollectionIntegration();
    } else {
      // Retry initialization after a delay
      setTimeout(() => this.initializeEnhancedFeatures(), 1000);
    }

    this.bindEnhancedEventListeners();
    this.setupRealTimeUpdates();
  }

  setupDataCollectionIntegration() {
    if (!this.dataCollector) return;

    // Subscribe to real-time data updates
    this.unsubscribeDataCollector = this.dataCollector.subscribe((event) => {
      this.handleDataCollectorEvent(event);
    });

    console.log('✅ Enhanced Evaluation Runner integrated with DataCollector');
  }

  bindEnhancedEventListeners() {
    // Batch evaluation button
    const batchBtn = document.getElementById('btnBatchEval');
    if (batchBtn) {
      batchBtn.addEventListener('click', () => this.runBatchEvaluations());
    }

    // Compare evaluations button
    const compareBtn = document.getElementById('btnCompareEval');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => this.compareEvaluations());
    }

    // Real-time streaming toggle
    const streamToggle = document.getElementById('evalStream');
    if (streamToggle) {
      streamToggle.addEventListener('change', (e) => {
        this.streamingEnabled = e.target.checked;
        this.toggleRealTimeUpdates(this.streamingEnabled);
      });
    }

    // Enhanced export options
    const exportSelect = document.getElementById('evalExportFormat');
    if (exportSelect) {
      exportSelect.addEventListener('change', (e) => {
        this.exportFormat = e.target.value;
      });
    }
  }

  setupRealTimeUpdates() {
    // Initialize real-time ASCII visualization
    this.createRealTimeVisualization();
  }

  createRealTimeVisualization() {
    const evalOutput = document.getElementById('evalOutput');
    if (!evalOutput) return;

    // Create real-time ASCII display area
    const realtimeDiv = document.createElement('div');
    realtimeDiv.id = 'evalRealtimeASCII';
    realtimeDiv.className = 'eval-realtime-ascii';
    realtimeDiv.style.cssText = `
      font-family: 'JetBrains Mono', monospace;
      background: #000;
      color: #0f0;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      white-space: pre;
      overflow-x: auto;
      display: none;
    `;

    evalOutput.parentNode.insertBefore(realtimeDiv, evalOutput);
  }

  toggleRealTimeUpdates(enabled) {
    const realtimeDiv = document.getElementById('evalRealtimeASCII');
    if (!realtimeDiv) return;

    if (enabled) {
      realtimeDiv.style.display = 'block';
      this.startRealTimeUpdates();
    } else {
      realtimeDiv.style.display = 'none';
      this.stopRealTimeUpdates();
    }
  }

  startRealTimeUpdates() {
    if (this.realTimeUpdateInterval) return;

    this.realTimeUpdateInterval = setInterval(() => {
      this.updateRealTimeVisualization();
    }, 500); // Update every 500ms
  }

  stopRealTimeUpdates() {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = null;
    }
  }

  updateRealTimeVisualization() {
    if (!this.currentEvaluationSession || !this.dataCollector) return;

    const realtimeDiv = document.getElementById('evalRealtimeASCII');
    if (!realtimeDiv) return;

    const session = this.dataCollector.getSessionById(this.currentEvaluationSession);
    if (!session) return;

    const ascii = this.generateRealTimeEvaluationASCII(session);
    realtimeDiv.textContent = ascii;
  }

  generateRealTimeEvaluationASCII(session) {
    const evaluations = session.evaluations || [];
    const currentTime = Date.now();
    const sessionDuration = currentTime - session.startTime;

    let ascii = `EVALUATION SESSION: ${session.id}\n`;
    ascii += `DURATION: ${Math.round(sessionDuration / 1000)}s\n`;
    ascii += '━'.repeat(60) + '\n\n';

    // Progress visualization
    const totalEvaluations = this.currentSuite?.cases?.length || 1;
    const completedEvaluations = evaluations.length;
    const progress = Math.min(100, (completedEvaluations / totalEvaluations) * 100);
    const progressBar = Math.round(progress / 2); // Scale to 50 chars

    ascii += `PROGRESS: [${'█'.repeat(progressBar)}${'░'.repeat(50 - progressBar)}] ${progress.toFixed(1)}%\n\n`;

    // Current test status
    if (this.currentTestCase) {
      ascii += `CURRENT TEST: ${this.currentTestCase.name.toUpperCase()}\n`;
      ascii += `SCENARIO: ${this.currentTestCase.scenario.toUpperCase()}\n\n`;
    }

    // Live metrics
    if (evaluations.length > 0) {
      const latestEval = evaluations[evaluations.length - 1];
      const metrics = latestEval.analytics?.metrics || {};
      
      ascii += 'LIVE METRICS:\n';
      ascii += `┌─ SUCCESS RATE: ${(metrics.successRate || 0).toFixed(1)}%\n`;
      ascii += `├─ AVG SCORE: ${(metrics.averageScore || 0).toFixed(0)}%\n`;
      ascii += `├─ FAULT RECOVERY: ${(metrics.recoveryRate || 0).toFixed(1)}%\n`;
      ascii += `└─ MTTR: ${(metrics.mttr || 0).toFixed(2)}s\n\n`;
    }

    // Resilience scoring visualization
    const resilienceScore = this.dataCollector.calculateResilienceScore(session.id);
    if (resilienceScore) {
      ascii += 'RESILIENCE SCORE:\n';
      const scoreBar = Math.round(resilienceScore.score / 2);
      ascii += `[${'█'.repeat(scoreBar)}${'░'.repeat(50 - scoreBar)}] ${resilienceScore.score}%\n`;
      ascii += `ASSESSMENT: ${resilienceScore.assessment.toUpperCase()}\n\n`;
    }

    // Event timeline
    const recentEvents = session.realTimeEvents.slice(-5);
    if (recentEvents.length > 0) {
      ascii += 'RECENT EVENTS:\n';
      recentEvents.forEach(event => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        const symbol = this.getEventSymbol(event.type);
        ascii += `${time} ${symbol} ${event.type.replace('_', ' ').toUpperCase()}\n`;
      });
    }

    return ascii;
  }

  getEventSymbol(eventType) {
    const symbols = {
      'trace_recorded': '📝',
      'evaluation_recorded': '🔬',
      'evaluation_progress': '⏳',
      'session_created': '🚀',
      'session_completed': '🏁',
      'ascii_graph_update': '📊',
      'performance_metrics': '⚡'
    };
    return symbols[eventType] || '●';
  }

  // Override the original executeSuite method to integrate with data collection
  async executeSuite(suite) {
    if (!this.dataCollector) {
      console.warn('DataCollector not available, falling back to standard execution');
      return super.executeSuite(suite);
    }

    // Create new data collection session for this evaluation
    this.currentEvaluationSession = this.dataCollector.createSession(null, {
      type: 'evaluation_suite',
      suiteName: suite.name,
      description: suite.description,
      testCount: suite.cases.length
    }).id;

    this.logOutput(`🚀 STARTING ENHANCED EVALUATION SUITE: ${suite.name.toUpperCase()}`);
    this.logOutput(`📋 Description: ${suite.description || 'No description'}`);
    this.logOutput(`📊 Test Cases: ${suite.cases.length}`);
    this.logOutput(`🔗 Session ID: ${this.currentEvaluationSession}`);
    this.logOutput('═'.repeat(60));

    // Enable real-time updates if streaming is enabled
    if (this.streamingEnabled) {
      this.toggleRealTimeUpdates(true);
    }

    const suiteResults = {
      suite: suite.name,
      sessionId: this.currentEvaluationSession,
      timestamp: new Date().toISOString(),
      cases: [],
      summary: { passed: 0, failed: 0, total: suite.cases.length },
      analytics: {}
    };

    // Record initial evaluation data
    this.dataCollector.recordEvaluation({
      type: 'suite_start',
      suiteName: suite.name,
      testCount: suite.cases.length,
      configuration: this.getCurrentConfiguration()
    });

    for (let i = 0; i < suite.cases.length; i++) {
      const testCase = suite.cases[i];
      this.currentTestCase = testCase;
      
      this.logOutput(`\n🔬 TEST CASE ${i + 1}/${suite.cases.length}: ${testCase.name.toUpperCase()}`);
      
      // Record test case start
      this.dataCollector.recordEvaluationProgress({
        type: 'test_case_start',
        testCase: testCase.name,
        progress: i / suite.cases.length,
        currentTest: testCase.name
      });

      const caseResult = await this.executeEnhancedTestCase(testCase);
      suiteResults.cases.push(caseResult);
      
      // Record test case completion
      this.dataCollector.recordEvaluationProgress({
        type: 'test_case_complete',
        testCase: testCase.name,
        result: caseResult,
        progress: (i + 1) / suite.cases.length,
        metrics: {
          passed: caseResult.passed,
          score: caseResult.averageScore || 0,
          successRate: caseResult.successRate || 0
        }
      });

      if (caseResult.passed) {
        suiteResults.summary.passed++;
        this.logOutput(`✅ PASSED: ${testCase.name}`);
      } else {
        suiteResults.summary.failed++;
        this.logOutput(`❌ FAILED: ${testCase.name}`);
        this.logOutput(`   Failures: ${caseResult.failures.join(', ')}`);
      }

      // Brief pause to allow UI updates
      await this.sleep(100);
    }

    // Calculate final analytics
    suiteResults.analytics = this.calculateSuiteAnalytics(suiteResults);

    // Evaluate gate conditions
    const gateResult = this.evaluateGate(suite.gate, suiteResults);
    suiteResults.gateResult = gateResult;

    // Record final evaluation results
    this.dataCollector.recordEvaluation({
      type: 'suite_complete',
      suiteName: suite.name,
      results: suiteResults,
      analytics: suiteResults.analytics,
      gateResult
    });

    // Generate insights
    const insights = this.dataCollector.generateResilienceInsights(this.currentEvaluationSession);
    suiteResults.insights = insights;

    this.logOutput('\n' + '═'.repeat(60));
    this.logOutput('📊 SUITE SUMMARY:');
    this.logOutput(`   Passed: ${suiteResults.summary.passed}/${suiteResults.summary.total}`);
    this.logOutput(`   Success Rate: ${(suiteResults.summary.passed / suiteResults.summary.total * 100).toFixed(1)}%`);
    this.logOutput(`   Gate: ${gateResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!gateResult.passed) {
      this.logOutput(`   Gate Requirements: ${gateResult.reason}`);
    }

    // Display insights
    if (insights.length > 0) {
      this.logOutput('\n💡 INSIGHTS:');
      insights.forEach(insight => {
        const emoji = insight.severity === 'error' ? '❌' : insight.severity === 'warning' ? '⚠️' : 'ℹ️';
        this.logOutput(`   ${emoji} ${insight.message}`);
      });
    }

    this.results.push(suiteResults);
    this.comparisonHistory.push(suiteResults);

    // End data collection session
    this.dataCollector.endSession(this.currentEvaluationSession);
    this.currentEvaluationSession = null;
    this.currentTestCase = null;

    // Stop real-time updates
    this.stopRealTimeUpdates();

    // Enable export button
    const exportBtn = document.getElementById('btnExportEval');
    if (exportBtn) {
      exportBtn.disabled = false;
    }

    return suiteResults;
  }

  async executeEnhancedTestCase(testCase) {
    const caseResult = {
      name: testCase.name,
      scenario: testCase.scenario,
      seedResults: [],
      passed: false,
      failures: [],
      analytics: {},
      averageScore: 0,
      successRate: 0
    };

    // Apply fault configuration
    this.applyFaultConfig(testCase.faults);

    // Record configuration in data collector
    this.dataCollector.recordTrace({
      type: 'configuration_applied',
      tool: 'evaluation_runner',
      status: 'ok',
      metadata: {
        testCase: testCase.name,
        faults: testCase.faults
      }
    });

    // Run test for each seed
    const scores = [];
    for (const seed of testCase.seeds) {
      this.logOutput(`   🌱 Seed: ${seed}`);
      
      try {
        // Record test start
        this.dataCollector.recordTrace({
          type: 'test_execution_start',
          tool: 'scenario_runner',
          status: 'ok',
          metadata: {
            testCase: testCase.name,
            scenario: testCase.scenario,
            seed
          }
        });

        // Run both baseline and chaos if needed
        const baselineResult = await window.runScenario(testCase.scenario, seed, false);
        const chaosResult = await window.runScenario(testCase.scenario, seed, true);
        
        // Record execution results
        this.dataCollector.recordTrace({
          type: 'test_execution_complete',
          tool: 'scenario_runner',
          status: 'ok',
          duration_ms: (baselineResult.duration || 0) + (chaosResult.duration || 0),
          metadata: {
            testCase: testCase.name,
            seed,
            baselineScore: baselineResult.metrics?.score || 0,
            chaosScore: chaosResult.metrics?.score || 0
          }
        });

        const seedResult = {
          seed,
          baseline: baselineResult,
          chaos: chaosResult,
          assertions: []
        };

        // Evaluate assertions with enhanced analytics
        for (const assertion of testCase.assertions) {
          const assertionResult = this.evaluateAssertion(assertion, baselineResult, chaosResult);
          seedResult.assertions.push(assertionResult);
          
          if (!assertionResult.passed) {
            caseResult.failures.push(`${assertion.type}: ${assertionResult.reason}`);
          }

          // Record assertion results
          this.dataCollector.recordTrace({
            type: 'assertion_evaluation',
            tool: 'assertion_evaluator',
            status: assertionResult.passed ? 'ok' : 'error',
            fault: assertionResult.passed ? null : 'assertion_failed',
            metadata: {
              assertionType: assertion.type,
              expected: assertionResult.expected,
              actual: assertionResult.actual,
              reason: assertionResult.reason
            }
          });
        }

        caseResult.seedResults.push(seedResult);
        
        // Track scores for analytics
        if (chaosResult.metrics?.score) {
          scores.push(chaosResult.metrics.score);
        }
        
      } catch (error) {
        this.logOutput(`   ❌ Execution error with seed ${seed}: ${error.message}`);
        caseResult.failures.push(`Execution error: ${error.message}`);
        
        // Record error
        this.dataCollector.recordTrace({
          type: 'test_execution_error',
          tool: 'scenario_runner',
          status: 'error',
          fault: 'execution_error',
          note: error.message,
          metadata: {
            testCase: testCase.name,
            seed
          }
        });
      }
    }

    // Calculate analytics
    caseResult.averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    caseResult.successRate = caseResult.seedResults.length > 0 ? 
      caseResult.seedResults.filter(r => r.assertions.every(a => a.passed)).length / caseResult.seedResults.length : 0;

    // Test case passes if all seeds pass all assertions
    caseResult.passed = caseResult.seedResults.every(seedResult =>
      seedResult.assertions.every(assertion => assertion.passed)
    );

    caseResult.analytics = this.calculateTestCaseAnalytics(caseResult);

    return caseResult;
  }

  calculateSuiteAnalytics(suiteResults) {
    const cases = suiteResults.cases || [];
    const totalCases = cases.length;
    const passedCases = cases.filter(c => c.passed).length;
    
    const allScores = cases.flatMap(c => c.seedResults?.map(r => r.chaos?.metrics?.score || 0) || []);
    const averageScore = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
    
    const successRates = cases.map(c => c.successRate || 0);
    const averageSuccessRate = successRates.length > 0 ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length : 0;

    return {
      totalCases,
      passedCases,
      passRate: totalCases > 0 ? passedCases / totalCases : 0,
      averageScore,
      averageSuccessRate,
      reliability: averageSuccessRate,
      performance: this.categorizePerformance(averageScore)
    };
  }

  calculateTestCaseAnalytics(caseResult) {
    const seedResults = caseResult.seedResults || [];
    
    return {
      totalSeeds: seedResults.length,
      successfulSeeds: seedResults.filter(r => r.assertions.every(a => a.passed)).length,
      averageBaselineScore: this.calculateAverageMetric(seedResults, 'baseline', 'score'),
      averageChaosScore: this.calculateAverageMetric(seedResults, 'chaos', 'score'),
      averageMTTR: this.calculateAverageMetric(seedResults, 'chaos', 'mttr_s'),
      faultCount: seedResults.reduce((count, r) => {
        const faults = r.chaos?.trace?.filter(t => t.fault) || [];
        return count + faults.length;
      }, 0)
    };
  }

  calculateAverageMetric(seedResults, resultType, metricName) {
    const values = seedResults
      .map(r => r[resultType]?.metrics?.[metricName])
      .filter(v => v !== undefined && v !== null);
    
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  categorizePerformance(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'moderate';
    return 'poor';
  }

  // Enhanced export functionality
  exportResults() {
    if (this.results.length === 0) {
      this.logOutput('❌ No results to export');
      return;
    }

    const format = this.exportFormat || 'json';
    const timestamp = new Date().toISOString();

    // Get comprehensive data from DataCollector if available
    let exportData = {
      timestamp,
      results: this.results,
      summary: {
        totalSuites: this.results.length,
        totalCases: this.results.reduce((sum, result) => sum + result.cases.length, 0),
        overallPassRate: this.calculateOverallPassRate()
      }
    };

    if (this.dataCollector) {
      // Include full session data
      const sessions = this.dataCollector.getAllSessions();
      const evaluationSessions = sessions.filter(s => s.metadata.type === 'evaluation_suite');
      
      exportData.sessions = evaluationSessions.map(session => 
        this.dataCollector.prepareExportData(session, {
          includeTraces: true,
          includeEvaluations: true,
          includeAnalytics: true,
          includeInsights: true
        })
      );
      
      exportData.analytics = {
        totalSessions: evaluationSessions.length,
        aggregatedMetrics: this.calculateAggregatedMetrics(evaluationSessions),
        trends: this.calculateTrends(evaluationSessions)
      };
    }

    // Export in requested format
    let fileContent, fileName, mimeType;

    if (this.dataCollector) {
      fileContent = this.dataCollector.formatExportData(exportData, format);
      mimeType = this.getMimeType(format);
      fileName = `chaos-eval-enhanced-${timestamp.replace(/[:.]/g, '-')}.${format}`;
    } else {
      // Fallback to JSON
      fileContent = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      fileName = `chaos-eval-results-${Date.now()}.json`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    this.logOutput(`📊 Results exported successfully as ${format.toUpperCase()}`);
  }

  getMimeType(format) {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      yaml: 'application/x-yaml',
      xml: 'application/xml',
      markdown: 'text/markdown'
    };
    return mimeTypes[format] || 'application/json';
  }

  calculateAggregatedMetrics(sessions) {
    if (!sessions.length) return {};

    const allTraces = sessions.flatMap(s => s.traces || []);
    const allEvaluations = sessions.flatMap(s => s.evaluations || []);

    return {
      totalTraces: allTraces.length,
      totalEvaluations: allEvaluations.length,
      averageSessionDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length,
      faultInjectionRate: allTraces.length > 0 ? 
        (allTraces.filter(t => t.fault).length / allTraces.length) * 100 : 0,
      recoveryRate: this.calculateOverallRecoveryRate(allTraces),
      averageResilienceScore: this.calculateAverageResilienceScore(sessions)
    };
  }

  calculateOverallRecoveryRate(traces) {
    const faultedTraces = traces.filter(t => t.fault);
    if (!faultedTraces.length) return 100;
    
    const recoveredTraces = faultedTraces.filter(t => t.status === 'recovered');
    return (recoveredTraces.length / faultedTraces.length) * 100;
  }

  calculateAverageResilienceScore(sessions) {
    if (!this.dataCollector) return 0;
    
    const scores = sessions.map(s => {
      const score = this.dataCollector.calculateResilienceScore(s.id);
      return score ? score.score : 0;
    });
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  calculateTrends(sessions) {
    // Simple trend calculation - could be enhanced with more sophisticated analysis
    const chronological = sessions.sort((a, b) => a.startTime - b.startTime);
    
    if (chronological.length < 2) return { trend: 'insufficient_data' };

    const firstHalf = chronological.slice(0, Math.floor(chronological.length / 2));
    const secondHalf = chronological.slice(Math.floor(chronological.length / 2));

    const firstHalfAvgScore = this.calculateAverageResilienceScore(firstHalf);
    const secondHalfAvgScore = this.calculateAverageResilienceScore(secondHalf);

    const improvement = secondHalfAvgScore - firstHalfAvgScore;

    return {
      trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
      improvement,
      firstHalfAvg: firstHalfAvgScore,
      secondHalfAvg: secondHalfAvgScore
    };
  }

  // Batch evaluation functionality
  async runBatchEvaluations() {
    if (this.isRunning) return;

    this.batchMode = true;
    this.logOutput('🔄 STARTING BATCH EVALUATION MODE');

    const availableSuites = Object.keys(this.builtInSuites);
    let batchResults = [];

    for (const suiteKey of availableSuites) {
      const suite = this.builtInSuites[suiteKey];
      this.logOutput(`\n📦 Running batch suite: ${suite.name.toUpperCase()}`);
      
      try {
        const result = await this.executeSuite(suite);
        batchResults.push(result);
        
        // Brief pause between suites
        await this.sleep(2000);
        
      } catch (error) {
        this.logOutput(`❌ Batch suite failed: ${error.message}`);
        batchResults.push({
          suite: suite.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate batch summary
    const batchSummary = this.generateBatchSummary(batchResults);
    this.logOutput('\n' + '═'.repeat(60));
    this.logOutput('📊 BATCH EVALUATION SUMMARY:');
    this.logOutput(`   Total Suites: ${batchSummary.totalSuites}`);
    this.logOutput(`   Successful: ${batchSummary.successful}`);
    this.logOutput(`   Failed: ${batchSummary.failed}`);
    this.logOutput(`   Overall Pass Rate: ${(batchSummary.overallPassRate * 100).toFixed(1)}%`);
    this.logOutput(`   Average Resilience Score: ${batchSummary.averageScore.toFixed(1)}%`);

    this.batchMode = false;
    this.logOutput('\n🏁 BATCH EVALUATION COMPLETED');
  }

  generateBatchSummary(batchResults) {
    const successful = batchResults.filter(r => !r.error).length;
    const failed = batchResults.length - successful;
    
    const allCases = batchResults.flatMap(r => r.cases || []);
    const passedCases = allCases.filter(c => c.passed).length;
    const overallPassRate = allCases.length > 0 ? passedCases / allCases.length : 0;
    
    const allScores = allCases.flatMap(c => 
      c.seedResults?.map(r => r.chaos?.metrics?.score || 0) || []
    );
    const averageScore = allScores.length > 0 ? 
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;

    return {
      totalSuites: batchResults.length,
      successful,
      failed,
      overallPassRate,
      averageScore,
      timestamp: new Date().toISOString()
    };
  }

  // Comparison functionality
  compareEvaluations() {
    if (this.comparisonHistory.length < 2) {
      this.logOutput('❌ Need at least 2 evaluation results for comparison');
      return;
    }

    const latest = this.comparisonHistory[this.comparisonHistory.length - 1];
    const previous = this.comparisonHistory[this.comparisonHistory.length - 2];

    this.logOutput('\n🔍 EVALUATION COMPARISON');
    this.logOutput('═'.repeat(60));

    // Suite-level comparison
    this.logOutput(`PREVIOUS: ${previous.suite} (${new Date(previous.timestamp).toLocaleString()})`);
    this.logOutput(`CURRENT:  ${latest.suite} (${new Date(latest.timestamp).toLocaleString()})`);

    // Pass rate comparison
    const prevPassRate = previous.summary.passed / previous.summary.total;
    const currPassRate = latest.summary.passed / latest.summary.total;
    const passRateDelta = currPassRate - prevPassRate;
    
    this.logOutput(`\nPASS RATE: ${(currPassRate * 100).toFixed(1)}% (${passRateDelta >= 0 ? '+' : ''}${(passRateDelta * 100).toFixed(1)}%)`);

    // Score comparison if analytics are available
    if (previous.analytics && latest.analytics) {
      const scoreDelta = latest.analytics.averageScore - previous.analytics.averageScore;
      this.logOutput(`AVERAGE SCORE: ${latest.analytics.averageScore.toFixed(1)}% (${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)}%)`);

      // Performance trend
      const trend = scoreDelta > 5 ? '📈 IMPROVING' : scoreDelta < -5 ? '📉 DECLINING' : '📊 STABLE';
      this.logOutput(`TREND: ${trend}`);
    }

    // Detailed comparison
    this.generateDetailedComparison(previous, latest);
  }

  generateDetailedComparison(previous, current) {
    this.logOutput('\nDETAILED COMPARISON:');
    this.logOutput('─'.repeat(60));

    // Find common test cases for detailed comparison
    const prevCases = new Map(previous.cases.map(c => [c.name, c]));
    const currCases = new Map(current.cases.map(c => [c.name, c]));

    const commonCases = Array.from(prevCases.keys()).filter(name => currCases.has(name));

    commonCases.forEach(caseName => {
      const prevCase = prevCases.get(caseName);
      const currCase = currCases.get(caseName);

      const prevPassed = prevCase.passed ? '✅' : '❌';
      const currPassed = currCase.passed ? '✅' : '❌';
      
      let status = '═';
      if (prevCase.passed && currCase.passed) status = '✅';
      else if (!prevCase.passed && !currCase.passed) status = '❌';
      else if (prevCase.passed && !currCase.passed) status = '📉';
      else status = '📈';

      this.logOutput(`${status} ${caseName}: ${prevPassed} → ${currPassed}`);

      // Score comparison for this case
      if (prevCase.averageScore !== undefined && currCase.averageScore !== undefined) {
        const scoreDelta = currCase.averageScore - prevCase.averageScore;
        this.logOutput(`   Score: ${currCase.averageScore.toFixed(0)}% (${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(0)}%)`);
      }
    });
  }

  // Event handling for DataCollector integration
  handleDataCollectorEvent(event) {
    switch (event.type) {
      case 'ascii_graph_update':
        this.handleGraphUpdate(event.data);
        break;
      case 'session_completed':
        this.handleSessionCompleted(event.data);
        break;
      case 'evaluation_progress':
        this.handleEvaluationProgress(event.data);
        break;
    }
  }

  handleGraphUpdate(data) {
    if (data.type === 'evaluation_graph' && this.streamingEnabled) {
      // Update could trigger additional UI updates
      console.log('Graph update received:', data.type);
    }
  }

  handleSessionCompleted(data) {
    if (data.sessionId === this.currentEvaluationSession) {
      this.logOutput(`🏁 Session completed with insights: ${data.insights?.length || 0} generated`);
    }
  }

  handleEvaluationProgress(data) {
    // Could update progress bars or other UI elements
    if (data.progress !== undefined) {
      this.updateProgressIndicator(data.progress * 100);
    }
  }

  updateProgressIndicator(percentage) {
    const progressEl = document.getElementById('evalProgressFill');
    const progressText = document.getElementById('evalProgressText');
    
    if (progressEl) progressEl.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage.toFixed(1)}%`;
  }

  getCurrentConfiguration() {
    return {
      latencyMs: parseInt(document.getElementById('latencyMs')?.value || '0'),
      latencyRate: parseFloat(document.getElementById('latencyRate')?.value || '0') / 100,
      http500Rate: parseFloat(document.getElementById('http500Rate')?.value || '0') / 100,
      rate429: parseFloat(document.getElementById('rate429')?.value || '0') / 100,
      malformedRate: parseFloat(document.getElementById('malformedRate')?.value || '0') / 100,
      tripwireOn: document.getElementById('tripwireOn')?.checked || false,
      maxRetries: parseInt(document.getElementById('maxRetries')?.value || '3'),
      streamingEnabled: this.streamingEnabled,
      timestamp: new Date().toISOString()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method
  destroy() {
    this.stopRealTimeUpdates();
    
    if (this.unsubscribeDataCollector) {
      this.unsubscribeDataCollector();
    }

    if (this.currentEvaluationSession && this.dataCollector) {
      this.dataCollector.endSession(this.currentEvaluationSession);
    }
  }
}

// Replace the original EvaluationRunner with enhanced version
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to ensure original EvaluationRunner is initialized
  setTimeout(() => {
    if (window.evaluationRunner instanceof EvaluationRunner && 
        !(window.evaluationRunner instanceof EnhancedEvaluationRunner)) {
      
      // Preserve any existing results
      const existingResults = window.evaluationRunner.results || [];
      
      // Replace with enhanced version
      window.evaluationRunner = new EnhancedEvaluationRunner();
      window.evaluationRunner.results = existingResults;
      
      console.log('✅ Enhanced Evaluation Runner initialized');
    }
  }, 1500);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedEvaluationRunner };
}