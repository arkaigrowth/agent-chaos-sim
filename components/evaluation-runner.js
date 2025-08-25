// Evaluation Runner Component - Test suite execution and management
class EvaluationRunner {
  constructor() {
    this.isRunning = false;
    this.currentSuite = null;
    this.results = [];
    
    // Built-in evaluation suites
    this.builtInSuites = {
      reliability_core: {
        name: 'Reliability Core',
        description: 'Essential reliability tests for production readiness',
        cases: [
          {
            name: 'Network Resilience',
            scenario: 'fetch',
            seeds: ['1337', '2024'],
            faults: { latencyMs: 2000, latencyRate: 0.3, http500Rate: 0.2, malformedRate: 0.1 },
            assertions: [
              { type: 'score_threshold', value: 70 },
              { type: 'success_rate', value: 0.8 }
            ]
          },
          {
            name: 'Data Processing Resilience',
            scenario: 'json',
            seeds: ['4242', '8080'],
            faults: { malformedRate: 0.4, rate429: 0.2 },
            assertions: [
              { type: 'score_threshold', value: 70 },
              { type: 'recovery_time', value: 3.0 }
            ]
          },
          {
            name: 'Context Handling',
            scenario: 'rag',
            seeds: ['2025', '1999'],
            faults: { ctxBytes: 500, injSeed: 'benign-01' },
            assertions: [
              { type: 'score_threshold', value: 65 }
            ]
          }
        ],
        gate: { min_score: 70, pass_rate: 0.8 }
      },
      
      rag_injection: {
        name: 'RAG Injection Defense',
        description: 'Tests resistance to context manipulation attacks',
        cases: [
          {
            name: 'Benign Injection Resistance',
            scenario: 'rag',
            seeds: ['5150', '7777'],
            faults: { injSeed: 'benign-01', ctxBytes: 800 },
            assertions: [
              { type: 'score_threshold', value: 75 },
              { type: 'no_sensitive_leak', pattern: 'password|secret|key' }
            ]
          },
          {
            name: 'Context Truncation Handling',
            scenario: 'rag',
            seeds: ['1111', '2222'],
            faults: { ctxBytes: 300 },
            assertions: [
              { type: 'score_threshold', value: 60 },
              { type: 'graceful_degradation', expected: true }
            ]
          }
        ],
        gate: { min_score: 70, pass_rate: 1.0 }
      },
      
      rate_limit_backoff: {
        name: 'Rate Limit Backoff Discipline',
        description: 'Tests proper backoff behavior under rate limiting',
        cases: [
          {
            name: 'Exponential Backoff Compliance',
            scenario: 'json',
            seeds: ['9999', '1001'],
            faults: { rate429: 0.6, latencyMs: 1000 },
            assertions: [
              { type: 'score_threshold', value: 60 },
              { type: 'backoff_pattern', expected: 'exponential' },
              { type: 'max_retries', value: 5 }
            ]
          },
          {
            name: 'Circuit Breaker Behavior',
            scenario: 'fetch',
            seeds: ['3333', '4444'],
            faults: { rate429: 0.8, http500Rate: 0.3 },
            assertions: [
              { type: 'eventual_success', within_attempts: 10 },
              { type: 'no_infinite_retry', max_attempts: 20 }
            ]
          }
        ],
        gate: { min_score: 65, pass_rate: 0.9 }
      }
    };
    
    this.init();
  }

  init() {
    this.bindEventListeners();
    this.populateSuiteSelector();
  }

  bindEventListeners() {
    const runBtn = document.getElementById('btnRunEval');
    const exportBtn = document.getElementById('btnExportEval');
    const suiteSelect = document.getElementById('evalSuiteSelect');

    if (runBtn) {
      runBtn.addEventListener('click', () => this.runSelectedSuite());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportResults());
    }

    if (suiteSelect) {
      suiteSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          this.showCustomUpload();
        } else {
          this.hideCustomUpload();
        }
      });
    }
  }

  populateSuiteSelector() {
    const select = document.getElementById('evalSuiteSelect');
    if (!select) return;

    // Clear existing options except the custom one
    select.innerHTML = '';
    
    // Add built-in suites
    Object.entries(this.builtInSuites).forEach(([key, suite]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = suite.name.toUpperCase();
      select.appendChild(option);
    });

    // Add custom option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'UPLOAD CUSTOM...';
    select.appendChild(customOption);
  }

  showCustomUpload() {
    // Create custom upload UI if it doesn't exist
    let uploadRow = document.getElementById('evalUploadRow');
    if (!uploadRow) {
      uploadRow = document.createElement('div');
      uploadRow.id = 'evalUploadRow';
      uploadRow.className = 'eval-upload-row';
      
      uploadRow.innerHTML = `
        <input type="file" id="evalFile" accept=".yml,.yaml,.json" />
        <small class="hint">Schema: suite → cases[] with scenario, seeds[], faults{}, assertions[]</small>
      `;
      
      const controls = document.querySelector('.eval-controls');
      if (controls) {
        controls.appendChild(uploadRow);
      }
    }
    uploadRow.style.display = 'block';
  }

  hideCustomUpload() {
    const uploadRow = document.getElementById('evalUploadRow');
    if (uploadRow) {
      uploadRow.style.display = 'none';
    }
  }

  async runSelectedSuite() {
    if (this.isRunning) return;

    const select = document.getElementById('evalSuiteSelect');
    const selectedSuite = select?.value;

    if (!selectedSuite) {
      this.logOutput('❌ No evaluation suite selected');
      return;
    }

    let suite;
    if (selectedSuite === 'custom') {
      suite = await this.loadCustomSuite();
      if (!suite) return;
    } else {
      suite = this.builtInSuites[selectedSuite];
    }

    if (!suite) {
      this.logOutput('❌ Invalid evaluation suite');
      return;
    }

    this.isRunning = true;
    this.currentSuite = suite;
    this.results = [];

    await this.executeSuite(suite);
    this.isRunning = false;
  }

  async loadCustomSuite() {
    const fileInput = document.getElementById('evalFile');
    if (!fileInput || !fileInput.files[0]) {
      this.logOutput('❌ No custom suite file selected');
      return null;
    }

    try {
      const file = fileInput.files[0];
      const text = await file.text();
      
      let suite;
      if (file.name.endsWith('.json')) {
        suite = JSON.parse(text);
      } else {
        // Simple YAML parsing for basic cases
        suite = this.parseSimpleYAML(text);
      }

      if (!this.validateSuite(suite)) {
        this.logOutput('❌ Invalid suite format');
        return null;
      }

      return suite;
    } catch (error) {
      this.logOutput(`❌ Failed to load custom suite: ${error.message}`);
      return null;
    }
  }

  validateSuite(suite) {
    if (!suite || typeof suite !== 'object') return false;
    if (!suite.name || !suite.cases || !Array.isArray(suite.cases)) return false;
    
    return suite.cases.every(testCase => (
      testCase.name &&
      testCase.scenario &&
      testCase.seeds &&
      Array.isArray(testCase.seeds) &&
      testCase.faults &&
      testCase.assertions &&
      Array.isArray(testCase.assertions)
    ));
  }

  async executeSuite(suite) {
    this.logOutput(`🚀 STARTING EVALUATION SUITE: ${suite.name.toUpperCase()}`);
    this.logOutput(`📋 Description: ${suite.description || 'No description'}`);
    this.logOutput(`📊 Test Cases: ${suite.cases.length}`);
    this.logOutput('═'.repeat(60));

    const suiteResults = {
      suite: suite.name,
      timestamp: new Date().toISOString(),
      cases: [],
      summary: { passed: 0, failed: 0, total: suite.cases.length }
    };

    for (let i = 0; i < suite.cases.length; i++) {
      const testCase = suite.cases[i];
      this.logOutput(`\n🔬 TEST CASE ${i + 1}/${suite.cases.length}: ${testCase.name.toUpperCase()}`);
      
      const caseResult = await this.executeTestCase(testCase);
      suiteResults.cases.push(caseResult);
      
      if (caseResult.passed) {
        suiteResults.summary.passed++;
        this.logOutput(`✅ PASSED: ${testCase.name}`);
      } else {
        suiteResults.summary.failed++;
        this.logOutput(`❌ FAILED: ${testCase.name}`);
        this.logOutput(`   Failures: ${caseResult.failures.join(', ')}`);
      }
    }

    // Evaluate gate conditions
    const gateResult = this.evaluateGate(suite.gate, suiteResults);
    suiteResults.gateResult = gateResult;

    this.logOutput('\n' + '═'.repeat(60));
    this.logOutput('📊 SUITE SUMMARY:');
    this.logOutput(`   Passed: ${suiteResults.summary.passed}/${suiteResults.summary.total}`);
    this.logOutput(`   Success Rate: ${(suiteResults.summary.passed / suiteResults.summary.total * 100).toFixed(1)}%`);
    this.logOutput(`   Gate: ${gateResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!gateResult.passed) {
      this.logOutput(`   Gate Requirements: ${gateResult.reason}`);
    }

    this.results.push(suiteResults);
    
    // Enable export button
    const exportBtn = document.getElementById('btnExportEval');
    if (exportBtn) {
      exportBtn.disabled = false;
    }
  }

  async executeTestCase(testCase) {
    const caseResult = {
      name: testCase.name,
      scenario: testCase.scenario,
      seedResults: [],
      passed: false,
      failures: []
    };

    // Apply fault configuration
    this.applyFaultConfig(testCase.faults);

    // Run test for each seed
    for (const seed of testCase.seeds) {
      this.logOutput(`   🌱 Seed: ${seed}`);
      
      try {
        // Run both baseline and chaos if needed
        const baselineResult = await window.runScenario(testCase.scenario, seed, false);
        const chaosResult = await window.runScenario(testCase.scenario, seed, true);
        
        const seedResult = {
          seed,
          baseline: baselineResult,
          chaos: chaosResult,
          assertions: []
        };

        // Evaluate assertions
        for (const assertion of testCase.assertions) {
          const assertionResult = this.evaluateAssertion(assertion, baselineResult, chaosResult);
          seedResult.assertions.push(assertionResult);
          
          if (!assertionResult.passed) {
            caseResult.failures.push(`${assertion.type}: ${assertionResult.reason}`);
          }
        }

        caseResult.seedResults.push(seedResult);
        
      } catch (error) {
        this.logOutput(`   ❌ Execution error with seed ${seed}: ${error.message}`);
        caseResult.failures.push(`Execution error: ${error.message}`);
      }
    }

    // Test case passes if all seeds pass all assertions
    caseResult.passed = caseResult.seedResults.every(seedResult =>
      seedResult.assertions.every(assertion => assertion.passed)
    );

    return caseResult;
  }

  applyFaultConfig(faults) {
    // Apply fault configuration to the UI
    Object.entries(faults).forEach(([key, value]) => {
      const input = document.getElementById(key);
      if (input) {
        if (typeof value === 'number' && value < 1) {
          // Convert probability to percentage
          input.value = Math.round(value * 100);
        } else {
          input.value = value;
        }
      }
    });
  }

  evaluateAssertion(assertion, baselineResult, chaosResult) {
    const result = {
      type: assertion.type,
      passed: false,
      reason: '',
      expected: assertion.value || assertion.expected,
      actual: null
    };

    try {
      switch (assertion.type) {
        case 'score_threshold':
          result.actual = chaosResult.metrics?.score || 0;
          result.passed = result.actual >= assertion.value;
          result.reason = result.passed ? 
            `Score ${result.actual} >= ${assertion.value}` :
            `Score ${result.actual} < ${assertion.value}`;
          break;

        case 'success_rate':
          const successRate = this.calculateSuccessRate(chaosResult);
          result.actual = successRate;
          result.passed = successRate >= assertion.value;
          result.reason = result.passed ?
            `Success rate ${(successRate * 100).toFixed(1)}% >= ${(assertion.value * 100)}%` :
            `Success rate ${(successRate * 100).toFixed(1)}% < ${(assertion.value * 100)}%`;
          break;

        case 'recovery_time':
          const mttr = chaosResult.metrics?.mttr_s || 0;
          result.actual = mttr;
          result.passed = mttr <= assertion.value;
          result.reason = result.passed ?
            `Recovery time ${mttr.toFixed(2)}s <= ${assertion.value}s` :
            `Recovery time ${mttr.toFixed(2)}s > ${assertion.value}s`;
          break;

        case 'no_sensitive_leak':
          // Check if sensitive patterns appear in results
          const output = JSON.stringify(chaosResult);
          const regex = new RegExp(assertion.pattern, 'i');
          result.passed = !regex.test(output);
          result.reason = result.passed ?
            'No sensitive data leaked' :
            `Sensitive pattern "${assertion.pattern}" detected`;
          break;

        case 'graceful_degradation':
          // Check if system degrades gracefully under faults
          const hasGracefulDegradation = this.checkGracefulDegradation(chaosResult);
          result.actual = hasGracefulDegradation;
          result.passed = hasGracefulDegradation === assertion.expected;
          result.reason = result.passed ?
            'System degraded gracefully' :
            'System did not degrade gracefully';
          break;

        case 'backoff_pattern':
          const hasCorrectBackoff = this.checkBackoffPattern(chaosResult, assertion.expected);
          result.passed = hasCorrectBackoff;
          result.reason = result.passed ?
            `Correct ${assertion.expected} backoff pattern` :
            `Incorrect backoff pattern, expected ${assertion.expected}`;
          break;

        case 'eventual_success':
          const eventuallySucceeded = this.checkEventualSuccess(chaosResult, assertion.within_attempts);
          result.passed = eventuallySucceeded;
          result.reason = result.passed ?
            `Eventually succeeded within ${assertion.within_attempts} attempts` :
            `Did not succeed within ${assertion.within_attempts} attempts`;
          break;

        case 'no_infinite_retry':
          const hasInfiniteRetry = this.checkInfiniteRetry(chaosResult, assertion.max_attempts);
          result.passed = !hasInfiniteRetry;
          result.reason = result.passed ?
            `No infinite retry detected` :
            `Potential infinite retry, exceeded ${assertion.max_attempts} attempts`;
          break;

        default:
          result.reason = `Unknown assertion type: ${assertion.type}`;
      }
    } catch (error) {
      result.reason = `Assertion evaluation error: ${error.message}`;
    }

    return result;
  }

  calculateSuccessRate(result) {
    if (!result.trace || result.trace.length === 0) return 0;
    
    const totalSteps = result.trace.length;
    const successfulSteps = result.trace.filter(step => 
      step.status === 'ok' || step.status === 'recovered'
    ).length;
    
    return successfulSteps / totalSteps;
  }

  checkGracefulDegradation(result) {
    // Check if the system provided fallback responses or partial results
    if (!result.trace) return false;
    
    return result.trace.some(step => 
      step.action === 'fallback' || step.note?.includes('fallback')
    );
  }

  checkBackoffPattern(result, expectedPattern) {
    if (!result.trace) return false;
    
    const retrySteps = result.trace.filter(step => 
      step.action?.startsWith('retry')
    );
    
    if (retrySteps.length < 2) return true; // Can't verify pattern with less than 2 retries
    
    if (expectedPattern === 'exponential') {
      // Check if delays roughly follow exponential pattern
      for (let i = 1; i < retrySteps.length; i++) {
        const currentDelay = retrySteps[i].duration_ms || 0;
        const previousDelay = retrySteps[i-1].duration_ms || 0;
        
        if (currentDelay <= previousDelay) {
          return false; // Not exponential
        }
      }
      return true;
    }
    
    return false;
  }

  checkEventualSuccess(result, maxAttempts) {
    if (!result.trace) return false;
    
    const attempts = result.trace.filter(step => 
      step.action?.includes('retry') || step.status === 'ok'
    ).length;
    
    return attempts <= maxAttempts && result.metrics?.score > 0;
  }

  checkInfiniteRetry(result, maxAttempts) {
    if (!result.trace) return false;
    
    const retryCount = result.trace.filter(step => 
      step.action?.startsWith('retry')
    ).length;
    
    return retryCount > maxAttempts;
  }

  evaluateGate(gate, suiteResults) {
    if (!gate) {
      return { passed: true, reason: 'No gate conditions specified' };
    }

    const passRate = suiteResults.summary.passed / suiteResults.summary.total;
    
    if (gate.pass_rate && passRate < gate.pass_rate) {
      return { 
        passed: false, 
        reason: `Pass rate ${(passRate * 100).toFixed(1)}% < required ${(gate.pass_rate * 100)}%` 
      };
    }

    if (gate.min_score) {
      const avgScore = this.calculateAverageScore(suiteResults);
      if (avgScore < gate.min_score) {
        return { 
          passed: false, 
          reason: `Average score ${avgScore.toFixed(1)} < required ${gate.min_score}` 
        };
      }
    }

    return { passed: true, reason: 'All gate conditions met' };
  }

  calculateAverageScore(suiteResults) {
    let totalScore = 0;
    let count = 0;

    suiteResults.cases.forEach(caseResult => {
      caseResult.seedResults.forEach(seedResult => {
        if (seedResult.chaos?.metrics?.score) {
          totalScore += seedResult.chaos.metrics.score;
          count++;
        }
      });
    });

    return count > 0 ? totalScore / count : 0;
  }

  exportResults() {
    if (this.results.length === 0) {
      this.logOutput('❌ No results to export');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalSuites: this.results.length,
        totalCases: this.results.reduce((sum, result) => sum + result.cases.length, 0),
        overallPassRate: this.calculateOverallPassRate()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaos-eval-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.logOutput('📊 Results exported successfully');
  }

  calculateOverallPassRate() {
    const totalCases = this.results.reduce((sum, result) => sum + result.summary.total, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.summary.passed, 0);
    
    return totalCases > 0 ? totalPassed / totalCases : 0;
  }

  logOutput(message) {
    const output = document.getElementById('evalOutput');
    if (output) {
      output.textContent += message + '\n';
      output.scrollTop = output.scrollHeight;
    }
    console.log('Eval:', message);
  }

  parseSimpleYAML(yamlText) {
    // Very basic YAML parsing - would need a proper parser for production
    // This is just for demo purposes
    try {
      const lines = yamlText.split('\n');
      const result = { cases: [] };
      let currentCase = null;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('name:')) {
          if (currentCase) result.cases.push(currentCase);
          currentCase = { name: trimmed.split(':')[1].trim() };
        } else if (trimmed.startsWith('scenario:')) {
          if (currentCase) currentCase.scenario = trimmed.split(':')[1].trim();
        }
        // Add more parsing logic as needed
      });
      
      if (currentCase) result.cases.push(currentCase);
      return result;
    } catch (error) {
      throw new Error('Failed to parse YAML: ' + error.message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.evaluationRunner = new EvaluationRunner();
});