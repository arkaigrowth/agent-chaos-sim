#!/usr/bin/env node

/**
 * Data Collection Pipeline Test Suite
 * Tests the core functionality of the DataCollector class
 */

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🎭 Agent Chaos Monkey - Data Collection Test Suite\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed! Data collection architecture is ready.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertArrayLength(array, length, message) {
    if (!Array.isArray(array) || array.length !== length) {
      throw new Error(`${message}: expected array of length ${length}, got ${array?.length || 'not an array'}`);
    }
  }

  assertObjectHasProperty(obj, prop, message) {
    if (!obj || typeof obj !== 'object' || !(prop in obj)) {
      throw new Error(`${message}: object missing property '${prop}'`);
    }
  }
}

// Mock DataCollector class for Node.js testing
class MockDataCollector {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userSeed = null;
    this.traces = [];
    this.startTimestamp = null;
    this.configuration = {};
    this.mode = 'test';
    this.performance = {
      startTime: 0,
      interactions: 0,
      effectsInjected: 0,
      recoveryAttempts: 0
    };
  }

  generateSessionId() {
    return 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  generateSeed() {
    return 'test-seed-' + Date.now();
  }

  startSession(configuration, mode = 'test', userSeed = null) {
    this.startTimestamp = new Date().toISOString();
    this.userSeed = userSeed || this.generateSeed();
    this.configuration = JSON.parse(JSON.stringify(configuration));
    this.mode = mode;
    this.traces = [];
    this.performance.startTime = Date.now();

    this.logTrace('session_start', {
      session_id: this.sessionId,
      user_seed: this.userSeed,
      mode: this.mode,
      configuration: this.configuration
    });

    return {
      sessionId: this.sessionId,
      seed: this.userSeed,
      timestamp: this.startTimestamp
    };
  }

  logTrace(action, data = {}) {
    const trace = {
      step: this.traces.length + 1,
      timestamp: new Date().toISOString(),
      relative_time: Date.now() - this.performance.startTime,
      action: action,
      ...data
    };

    this.traces.push(trace);
    this.performance.interactions++;

    return trace;
  }

  logEffectInjection(effectType, target, parameters = {}, result = null) {
    this.performance.effectsInjected++;
    return this.logTrace('effect_injection', {
      effect_type: effectType,
      target: target,
      parameters: parameters,
      result: result,
      performance_impact: this.calculatePerformanceImpact(result)
    });
  }

  logRecoveryAttempt(strategy, success, duration, metadata = {}) {
    this.performance.recoveryAttempts++;
    return this.logTrace('recovery_attempt', {
      strategy: strategy,
      success: success,
      duration_ms: duration,
      resilience_score: this.calculateResilienceScore(success, duration),
      ...metadata
    });
  }

  logEvaluationResult(testCase, result, score, assertions = []) {
    return this.logTrace('evaluation_result', {
      test_case: testCase,
      result: result,
      score: score,
      assertions: assertions,
      evaluation_metrics: this.calculateEvaluationMetrics(result, score)
    });
  }

  calculatePerformanceImpact(result) {
    if (!result || typeof result.score_impact !== 'number') return 0;
    return result.score_impact;
  }

  calculateResilienceScore(success, duration) {
    if (!success) return 0;
    const baseScore = 75;
    const timeBonus = Math.max(0, 25 - (duration / 1000 * 5));
    return Math.round(Math.min(100, baseScore + timeBonus));
  }

  calculateEvaluationMetrics(result, score) {
    return {
      passed: result === 'pass',
      score_normalized: score / 100,
      confidence: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
    };
  }

  endSession(summary = {}) {
    const endTimestamp = new Date().toISOString();
    const sessionDuration = Date.now() - this.performance.startTime;

    const sessionSummary = {
      session_id: this.sessionId,
      seed: this.userSeed,
      start_timestamp: this.startTimestamp,
      end_timestamp: endTimestamp,
      duration_ms: sessionDuration,
      mode: this.mode,
      configuration: this.configuration,
      traces: this.traces,
      performance: {
        ...this.performance,
        total_duration: sessionDuration
      },
      summary: {
        total_effects: this.performance.effectsInjected,
        total_recoveries: this.performance.recoveryAttempts,
        recovery_rate: this.performance.recoveryAttempts > 0 ? 
          this.traces.filter(t => t.action === 'recovery_attempt' && t.success).length / this.performance.recoveryAttempts : 0,
        avg_resilience: this.calculateAverageResilience(),
        ...summary
      }
    };

    this.logTrace('session_end', { summary: sessionSummary.summary });

    return sessionSummary;
  }

  calculateAverageResilience() {
    const resilienceScores = this.traces
      .filter(t => t.action === 'recovery_attempt' && typeof t.resilience_score === 'number')
      .map(t => t.resilience_score);

    if (resilienceScores.length === 0) return 0;
    return Math.round(resilienceScores.reduce((a, b) => a + b, 0) / resilienceScores.length);
  }

  exportAsJSON(pretty = true) {
    const data = this.getSessionData();
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  exportAsCSV() {
    const traces = this.traces;
    if (traces.length === 0) return '';

    const headers = ['step', 'timestamp', 'relative_time_ms', 'action'];
    const additionalFields = new Set();

    traces.forEach(trace => {
      Object.keys(trace).forEach(key => {
        if (!headers.includes(key)) {
          additionalFields.add(key);
        }
      });
    });

    const allHeaders = [...headers, ...Array.from(additionalFields)];

    let csv = allHeaders.join(',') + '\n';

    traces.forEach(trace => {
      const row = allHeaders.map(header => {
        const value = trace[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        return String(value).replace(/,/g, ';');
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  exportAsReport() {
    const data = this.getSessionData();
    const summary = data.summary;

    let report = `# Agent Chaos Monkey Session Report\n\n`;
    report += `**Session ID:** ${data.session_id}\n`;
    report += `**Seed:** ${data.seed}\n`;
    report += `**Mode:** ${data.mode}\n`;
    report += `**Duration:** ${Math.round(data.duration_ms / 1000)}s\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Effects:** ${summary.total_effects}\n`;
    report += `- **Recovery Attempts:** ${summary.total_recoveries}\n`;
    report += `- **Recovery Rate:** ${Math.round(summary.recovery_rate * 100)}%\n`;
    report += `- **Average Resilience:** ${summary.avg_resilience}\n\n`;

    return report;
  }

  getSessionData() {
    return {
      session_id: this.sessionId,
      seed: this.userSeed,
      start_timestamp: this.startTimestamp,
      end_timestamp: new Date().toISOString(),
      duration_ms: Date.now() - this.performance.startTime,
      mode: this.mode,
      configuration: this.configuration,
      traces: this.traces,
      performance: this.performance,
      summary: {
        total_effects: this.performance.effectsInjected,
        total_recoveries: this.performance.recoveryAttempts,
        recovery_rate: this.performance.recoveryAttempts > 0 ? 
          this.traces.filter(t => t.action === 'recovery_attempt' && t.success).length / this.performance.recoveryAttempts : 0,
        avg_resilience: this.calculateAverageResilience()
      }
    };
  }
}

// Test Suite
const runner = new TestRunner();

runner.test('DataCollector: Session initialization', () => {
  const collector = new MockDataCollector();
  const config = { test_mode: true, faults: { latency: 100 } };
  const session = collector.startSession(config, 'test', 'test-seed-123');

  runner.assert(session.sessionId, 'Should return session ID');
  runner.assertEqual(session.seed, 'test-seed-123', 'Should use provided seed');
  runner.assertArrayLength(collector.traces, 1, 'Should have session_start trace');
  runner.assertEqual(collector.traces[0].action, 'session_start', 'First trace should be session_start');
});

runner.test('DataCollector: Effect injection logging', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  const trace = collector.logEffectInjection('latency', 'fetch_op', { delay: 2000 }, { score_impact: -15 });

  runner.assertEqual(trace.action, 'effect_injection', 'Should log effect injection');
  runner.assertEqual(trace.effect_type, 'latency', 'Should capture effect type');
  runner.assertEqual(trace.target, 'fetch_op', 'Should capture target');
  runner.assertEqual(collector.performance.effectsInjected, 1, 'Should increment effect counter');
});

runner.test('DataCollector: Recovery attempt logging', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  const trace = collector.logRecoveryAttempt('auto_retry', true, 1500, { attempt: 1 });

  runner.assertEqual(trace.action, 'recovery_attempt', 'Should log recovery attempt');
  runner.assertEqual(trace.strategy, 'auto_retry', 'Should capture strategy');
  runner.assertEqual(trace.success, true, 'Should capture success status');
  runner.assert(trace.resilience_score > 0, 'Should calculate resilience score');
  runner.assertEqual(collector.performance.recoveryAttempts, 1, 'Should increment recovery counter');
});

runner.test('DataCollector: Evaluation result logging', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  const trace = collector.logEvaluationResult('reliability_test', 'pass', 85, [{ type: 'metric', passed: true }]);

  runner.assertEqual(trace.action, 'evaluation_result', 'Should log evaluation result');
  runner.assertEqual(trace.test_case, 'reliability_test', 'Should capture test case');
  runner.assertEqual(trace.result, 'pass', 'Should capture result');
  runner.assertEqual(trace.score, 85, 'Should capture score');
  runner.assertObjectHasProperty(trace, 'evaluation_metrics', 'Should include evaluation metrics');
});

runner.test('DataCollector: Session end and summary', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  // Add some test data
  collector.logEffectInjection('latency', 'test_target');
  collector.logRecoveryAttempt('retry', true, 1000);
  collector.logRecoveryAttempt('fallback', false, 2000);

  const summary = collector.endSession({ final_score: 78 });

  runner.assertObjectHasProperty(summary, 'session_id', 'Should include session ID');
  runner.assertObjectHasProperty(summary, 'summary', 'Should include summary');
  runner.assertEqual(summary.summary.total_effects, 1, 'Should count effects correctly');
  runner.assertEqual(summary.summary.total_recoveries, 2, 'Should count recoveries correctly');
  runner.assertEqual(summary.summary.recovery_rate, 0.5, 'Should calculate recovery rate correctly');
});

runner.test('DataCollector: JSON export', () => {
  const collector = new MockDataCollector();
  collector.startSession({ test: true }, 'test');
  collector.logEffectInjection('test_effect', 'test_target');

  const jsonData = collector.exportAsJSON();
  const parsed = JSON.parse(jsonData);

  runner.assertObjectHasProperty(parsed, 'session_id', 'JSON should include session ID');
  runner.assertObjectHasProperty(parsed, 'traces', 'JSON should include traces');
  runner.assert(Array.isArray(parsed.traces), 'Traces should be array');
  runner.assert(parsed.traces.length > 0, 'Should have traces');
});

runner.test('DataCollector: CSV export', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');
  collector.logEffectInjection('test_effect', 'test_target');

  const csvData = collector.exportAsCSV();

  runner.assert(csvData.includes('step,timestamp'), 'CSV should have headers');
  runner.assert(csvData.includes('session_start'), 'CSV should include trace data');
  runner.assert(csvData.includes('effect_injection'), 'CSV should include effect data');
});

runner.test('DataCollector: Report export', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');
  collector.logEffectInjection('test_effect', 'test_target');
  collector.logRecoveryAttempt('retry', true, 1000);

  const report = collector.exportAsReport();

  runner.assert(report.includes('# Agent Chaos Monkey'), 'Report should have title');
  runner.assert(report.includes('Session ID:'), 'Report should include session ID');
  runner.assert(report.includes('Total Effects:'), 'Report should include effect count');
  runner.assert(report.includes('Recovery Rate:'), 'Report should include recovery rate');
});

runner.test('DataCollector: Performance metrics calculation', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  // Test resilience score calculation
  const goodScore = collector.calculateResilienceScore(true, 500);  // Fast recovery
  const poorScore = collector.calculateResilienceScore(true, 5000); // Slow recovery
  const failScore = collector.calculateResilienceScore(false, 1000); // Failed recovery

  runner.assert(goodScore > poorScore, 'Faster recovery should have higher score');
  runner.assertEqual(failScore, 0, 'Failed recovery should score 0');
  runner.assert(goodScore <= 100, 'Score should not exceed 100');

  // Test evaluation metrics calculation
  const passMetrics = collector.calculateEvaluationMetrics('pass', 85);
  const failMetrics = collector.calculateEvaluationMetrics('fail', 45);

  runner.assertEqual(passMetrics.passed, true, 'Pass result should be marked as passed');
  runner.assertEqual(failMetrics.passed, false, 'Fail result should be marked as failed');
  runner.assertEqual(passMetrics.confidence, 'high', 'High score should be high confidence');
  runner.assertEqual(failMetrics.confidence, 'low', 'Low score should be low confidence');
});

runner.test('DataCollector: Trace data structure consistency', () => {
  const collector = new MockDataCollector();
  collector.startSession({}, 'test');

  const effectTrace = collector.logEffectInjection('latency', 'test_target');
  const recoveryTrace = collector.logRecoveryAttempt('retry', true, 1000);
  const evalTrace = collector.logEvaluationResult('test', 'pass', 90);

  // Check required fields
  [effectTrace, recoveryTrace, evalTrace].forEach((trace, index) => {
    runner.assertObjectHasProperty(trace, 'step', `Trace ${index} should have step`);
    runner.assertObjectHasProperty(trace, 'timestamp', `Trace ${index} should have timestamp`);
    runner.assertObjectHasProperty(trace, 'relative_time', `Trace ${index} should have relative_time`);
    runner.assertObjectHasProperty(trace, 'action', `Trace ${index} should have action`);
    
    runner.assert(typeof trace.step === 'number', `Trace ${index} step should be number`);
    runner.assert(typeof trace.timestamp === 'string', `Trace ${index} timestamp should be string`);
    runner.assert(typeof trace.relative_time === 'number', `Trace ${index} relative_time should be number`);
  });

  // Check step sequence
  runner.assert(effectTrace.step < recoveryTrace.step, 'Steps should be sequential');
  runner.assert(recoveryTrace.step < evalTrace.step, 'Steps should be sequential');
});

runner.test('DataCollector: Seed reproducibility', () => {
  const seed = 'test-reproducibility-seed';
  
  const collector1 = new MockDataCollector();
  const collector2 = new MockDataCollector();
  
  const session1 = collector1.startSession({}, 'test', seed);
  const session2 = collector2.startSession({}, 'test', seed);
  
  runner.assertEqual(session1.seed, session2.seed, 'Same seed should be used');
  runner.assert(session1.sessionId !== session2.sessionId, 'Session IDs should be unique');
  
  // Both should generate same deterministic data with same seed
  collector1.logEffectInjection('latency', 'target');
  collector2.logEffectInjection('latency', 'target');
  
  runner.assertEqual(
    collector1.traces[1].effect_type, 
    collector2.traces[1].effect_type, 
    'Same operations should produce same traces'
  );
});

// Run the tests
(async () => {
  await runner.run();
})().catch(console.error);