# Chaos Testing API Documentation

## Overview

The Chaos Testing API provides comprehensive functionality for running, managing, and analyzing chaos engineering experiments on AI agents. The system includes both core evaluation capabilities and enhanced features for real-time monitoring, batch processing, and detailed reporting.

## Table of Contents

1. [Core Evaluation API](#core-evaluation-api)
2. [Enhanced Evaluation API](#enhanced-evaluation-api)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)

---

## Core Evaluation API

### `runEvalSuite(suiteKeyOrObj, includeBaseline)`

Runs a single evaluation suite with chaos testing.

**Parameters:**
- `suiteKeyOrObj` (string|Object): Either a built-in suite key or a suite definition object
- `includeBaseline` (boolean, optional): Whether to run baseline tests before chaos tests

**Returns:** `Promise<Object>` - Evaluation results

**Built-in Suite Keys:**
- `'reliability_core'` - Essential reliability tests
- `'rag_injection'` - RAG injection defense tests  
- `'rate_limit_backoff'` - Rate limiting behavior tests

**Example:**
```javascript
// Run built-in suite
const results = await runEvalSuite('reliability_core', true);

// Run custom suite
const customSuite = {
  suite: "My Custom Tests",
  cases: [/* test cases */],
  gate: { score_min: 70 }
};
const results = await runEvalSuite(customSuite, false);
```

---

## Enhanced Evaluation API

### `loadEvalSuite(source, options)`

Load and validate evaluation suites from various sources.

**Parameters:**
- `source` (string|Object|URL): Suite source
  - Built-in suite name (e.g., `'reliability_core'`)
  - Suite definition object
  - URL to remote suite file
  - File path (Node.js environments)
- `options` (Object, optional): Loading options
  - `timeout` (number): Request timeout in ms (default: 10000)
  - `headers` (Object): Additional HTTP headers for URL requests
  - `validate` (boolean): Whether to validate suite (default: true)

**Returns:** `Promise<Object>` - Loaded and validated suite with metadata

**Example:**
```javascript
// Load from URL
const suite = await enhancedEvals.loadEvalSuite(
  'https://api.example.com/suites/reliability.json',
  { timeout: 15000 }
);

// Load built-in suite
const suite = await enhancedEvals.loadEvalSuite('reliability_core');
```

### `validateEvalSuite(suite)`

Validate evaluation suite structure and content.

**Parameters:**
- `suite` (Object): Suite to validate

**Returns:** `Promise<Object>` - Validation result
- `valid` (boolean): Whether suite is valid
- `errors` (Array): Validation errors
- `warnings` (Array): Validation warnings  
- `details` (Object): Additional validation details

**Example:**
```javascript
const validation = await enhancedEvals.validateEvalSuite(suite);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### `getEvalSuiteMetadata(suite)`

Get comprehensive metadata about a suite without running it.

**Parameters:**
- `suite` (Object): Evaluation suite

**Returns:** `Object` - Suite metadata
- `name` (string): Suite name
- `description` (string): Suite description
- `caseCount` (number): Number of test cases
- `scenarios` (Array): List of scenarios used
- `estimatedRunTime` (number): Estimated run time in ms
- `complexity` (string): Complexity level (low/medium/high)
- `requirements` (Array): System requirements

**Example:**
```javascript
const metadata = enhancedEvals.getEvalSuiteMetadata(suite);
console.log(`Suite "${metadata.name}" has ${metadata.caseCount} cases`);
console.log(`Estimated run time: ${metadata.estimatedRunTime / 1000}s`);
```

### `streamEvalResults(suite, options)`

Stream evaluation results in real-time.

**Parameters:**
- `suite` (Object): Evaluation suite to run
- `options` (Object, optional): Streaming options
  - `includeBaseline` (boolean): Include baseline runs
  - `concurrency` (number): Concurrent test execution limit

**Returns:** `AsyncGenerator` - Stream of result events

**Event Types:**
- `start` - Evaluation started
- `case_start` - Test case started
- `progress` - Progress update
- `case_complete` - Test case completed
- `case_error` - Test case error
- `complete` - Evaluation completed
- `error` - Evaluation error

**Example:**
```javascript
for await (const event of enhancedEvals.streamEvalResults(suite)) {
  switch (event.type) {
    case 'progress':
      updateProgressBar(event.overallProgress);
      break;
    case 'complete':
      displayResults(event.results);
      break;
    case 'error':
      handleError(event.error);
      break;
  }
}
```

### `compareEvalRuns(runIds, options)`

Compare multiple evaluation runs for analysis.

**Parameters:**
- `runIds` (Array): Array of run IDs to compare
- `options` (Object, optional): Comparison options
  - `baseline` (string): ID of run to use as baseline
  - `metrics` (Array): Specific metrics to compare

**Returns:** `Promise<Object>` - Comparison analysis
- `runIds` (Array): Compared run IDs
- `baseline` (Object): Baseline run data
- `comparisons` (Array): Comparison results
- `summary` (Object): Analysis summary with trends and recommendations

**Example:**
```javascript
const comparison = await enhancedEvals.compareEvalRuns([
  'run_1234567890', 
  'run_1234567891'
]);
console.log('Trends:', comparison.summary.trends);
console.log('Improvements:', comparison.summary.improvements);
```

### `generateEvalReport(runId, options)`

Generate comprehensive evaluation reports.

**Parameters:**
- `runId` (string): Run ID to generate report for
- `options` (Object, optional): Report options
  - `format` (string): Output format ('json', 'markdown', 'html')
  - `includeCharts` (boolean): Include visualization charts
  - `includeRecommendations` (boolean): Include improvement recommendations
  - `includeRawData` (boolean): Include raw test data

**Returns:** `Promise<Object|string>` - Generated report in requested format

**Example:**
```javascript
// Generate comprehensive JSON report
const report = await enhancedEvals.generateEvalReport('run_1234567890', {
  format: 'json',
  includeCharts: true,
  includeRecommendations: true
});

// Generate markdown report
const markdown = await enhancedEvals.generateEvalReport('run_1234567890', {
  format: 'markdown'
});
```

### `runBatchEvaluations(suites, options)`

Run multiple evaluation suites in batch.

**Parameters:**
- `suites` (Array): Array of suite definitions
- `options` (Object, optional): Batch options
  - `concurrency` (number): Maximum concurrent suite runs
  - `failFast` (boolean): Stop on first failure
  - `includeBaseline` (boolean): Run baseline tests

**Returns:** `Promise<Object>` - Batch results
- `batchId` (string): Unique batch identifier
- `results` (Array): Individual suite results
- `summary` (Object): Batch summary statistics
- `duration` (number): Total execution time

**Example:**
```javascript
const batchResults = await enhancedEvals.runBatchEvaluations([
  await enhancedEvals.loadEvalSuite('reliability_core'),
  await enhancedEvals.loadEvalSuite('rag_injection')
], {
  concurrency: 2,
  failFast: false
});
```

### `scheduleEvaluation(suite, scheduledTime, options)`

Schedule an evaluation to run at a future time.

**Parameters:**
- `suite` (Object): Evaluation suite to run
- `scheduledTime` (Date|string): When to run the evaluation
- `options` (Object, optional): Scheduling options
  - `includeBaseline` (boolean): Run baseline tests
  - `notifications` (Array): Notification endpoints
  - `retryPolicy` (Object): Retry configuration

**Returns:** `string` - Schedule ID for tracking

**Example:**
```javascript
const scheduleId = enhancedEvals.scheduleEvaluation(
  suite,
  '2024-12-25T10:00:00Z',
  { includeBaseline: true }
);
```

### `subscribeToUpdates(callback, filters)`

Subscribe to real-time evaluation updates via WebSocket-style events.

**Parameters:**
- `callback` (Function): Function to call with updates
- `filters` (Object, optional): Event filters
  - `streamIds` (Array): Specific stream IDs to monitor
  - `eventTypes` (Array): Event types to include
  - `suites` (Array): Suite names to monitor

**Returns:** `Function` - Unsubscribe function

**Example:**
```javascript
const unsubscribe = enhancedEvals.subscribeToUpdates(
  (update) => {
    console.log('Evaluation update:', update);
  },
  { eventTypes: ['complete', 'error'] }
);

// Later...
unsubscribe();
```

---

## Data Models

### Suite Definition

```javascript
{
  suite: "Suite Name",                    // Required: Suite name
  description: "Suite description",       // Optional: Description
  version: "1.0.0",                      // Optional: Version
  author: "Author Name",                 // Optional: Author
  tags: ["reliability", "performance"],  // Optional: Tags
  cases: [                               // Required: Test cases
    {
      name: "Test Case Name",            // Required: Case name
      scenario: "fetch|rag|json",        // Required: Scenario type
      seeds: ["1337", "2024"],           // Required: Test seeds
      faults: {                          // Required: Fault configuration
        latency_ms: 2000,               // Network latency
        latency_rate: 0.2,              // Latency injection rate
        http_500_rate: 0.1,             // HTTP 500 error rate
        rate_429: 0.1,                  // Rate limiting rate
        malformed_rate: 0.15,           // Malformed response rate
        inj_seed: "benign-01",          // RAG injection seed
        ctx_bytes: 800                  // Context truncation size
      },
      assertions: [                      // Required: Test assertions
        {
          type: "metric_threshold",      // Assertion type
          metric: "success_after_fault", // Metric to check
          op: ">=",                      // Comparison operator
          value: 0.7                     // Expected value
        }
      ]
    }
  ],
  gate: {                                // Optional: Pass/fail criteria
    score_min: 70,                       // Minimum score required
    pass_rate: 0.8                      // Required pass rate
  }
}
```

### Evaluation Results

```javascript
{
  suite: "Suite Name",
  started: "2024-01-01T12:00:00Z",
  finished: "2024-01-01T12:05:30Z",
  overall_score: 85,
  passed_gate: true,
  cases: [
    {
      name: "Test Case Name",
      scenario: "fetch",
      runs: [
        {
          seed: "1337",
          metrics: {
            score: 88,
            mttr: 2.5,
            success_after_fault: 0.85
          },
          baseline: {
            score: 95,
            mttr: 0.1
          },
          assertions: [
            {
              kind: "metric",
              metric: "success_after_fault",
              op: ">=",
              target: 0.7,
              got: 0.85,
              pass: true
            }
          ],
          pass: true
        }
      ],
      scoreAvg: 88,
      pass: true
    }
  ]
}
```

### Progress Event

```javascript
{
  type: "progress",
  streamId: "stream_1234567890_abc123",
  caseIndex: 0,
  caseProgress: 65.5,
  overallProgress: 32.75,
  timestamp: "2024-01-01T12:02:30Z"
}
```

### Comparison Result

```javascript
{
  runIds: ["run_123", "run_124"],
  comparedAt: "2024-01-01T12:00:00Z",
  baseline: { /* baseline run data */ },
  comparisons: [
    {
      runId: "run_124",
      delta: {
        scoreChange: +5.2,
        mttrChange: -0.3,
        passRateChange: +0.1
      },
      verdict: "improvement"
    }
  ],
  summary: {
    trends: {
      score: "improving",
      mttr: "stable",
      reliability: "improving"
    },
    improvements: ["Faster recovery time", "Better error handling"],
    regressions: [],
    stability: {
      coefficient: 0.92,
      assessment: "stable"
    }
  }
}
```

---

## Error Handling

### Error Response Format

```javascript
{
  error: true,
  code: "VALIDATION_ERROR",
  message: "Suite validation failed",
  details: {
    field: "cases[0].scenario",
    expected: "string",
    got: "undefined"
  },
  timestamp: "2024-01-01T12:00:00Z"
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `VALIDATION_ERROR` | Suite validation failed | Check suite format against schema |
| `SUITE_NOT_FOUND` | Suite not found | Verify suite key or URL |
| `NETWORK_ERROR` | Network request failed | Check connectivity and URL |
| `TIMEOUT_ERROR` | Operation timed out | Increase timeout or reduce complexity |
| `EXECUTION_ERROR` | Test execution failed | Check test configuration |
| `STORAGE_ERROR` | Storage operation failed | Check storage permissions |

---

## Usage Examples

### Basic Evaluation

```javascript
// Run a simple evaluation
const results = await runEvalSuite('reliability_core', true);
console.log(`Score: ${results.overall_score}, Passed: ${results.passed_gate}`);
```

### Real-time Monitoring

```javascript
// Set up real-time monitoring
const suite = await enhancedEvals.loadEvalSuite('reliability_core');

for await (const event of enhancedEvals.streamEvalResults(suite)) {
  if (event.type === 'progress') {
    updateProgressUI(event.overallProgress);
  } else if (event.type === 'complete') {
    showResults(event.results);
    break;
  }
}
```

### Batch Processing

```javascript
// Load multiple suites
const suites = await Promise.all([
  enhancedEvals.loadEvalSuite('reliability_core'),
  enhancedEvals.loadEvalSuite('rag_injection'),
  enhancedEvals.loadEvalSuite('rate_limit_backoff')
]);

// Run in batch
const batchResults = await enhancedEvals.runBatchEvaluations(suites, {
  concurrency: 2
});

// Generate combined report
for (const result of batchResults.results) {
  const report = await enhancedEvals.generateEvalReport(result.id, {
    format: 'markdown'
  });
  await saveReport(report, `${result.suite}.md`);
}
```

### Custom Suite Creation

```javascript
// Create a custom suite
const customSuite = {
  suite: "API Resilience Tests",
  description: "Tests for API endpoint resilience",
  cases: [
    {
      name: "High Load Response",
      scenario: "fetch",
      seeds: ["load_test_1", "load_test_2"],
      faults: {
        latency_ms: 5000,
        latency_rate: 0.5,
        http_500_rate: 0.2
      },
      assertions: [
        {
          type: "metric_threshold",
          metric: "success_after_fault",
          op: ">=",
          value: 0.6
        },
        {
          type: "metric_threshold", 
          metric: "mttr",
          op: "<=",
          value: 10.0
        }
      ]
    }
  ],
  gate: {
    score_min: 60,
    pass_rate: 0.75
  }
};

// Validate and run
const validation = await enhancedEvals.validateEvalSuite(customSuite);
if (validation.valid) {
  const results = await runEvalSuite(customSuite, true);
}
```

---

## Integration Guide

### Node.js Integration

```javascript
const { enhancedEvals } = require('./evals_enhanced.js');

// Schedule regular evaluations
setInterval(async () => {
  const suite = await enhancedEvals.loadEvalSuite('reliability_core');
  const results = await runEvalSuite(suite);
  
  if (!results.passed_gate) {
    await sendAlert('Reliability tests failed', results);
  }
}, 30 * 60 * 1000); // Every 30 minutes
```

### CI/CD Integration

```javascript
// In your test pipeline
async function runChaosTests() {
  const suites = ['reliability_core', 'rag_injection'];
  
  for (const suiteKey of suites) {
    const suite = await enhancedEvals.loadEvalSuite(suiteKey);
    const results = await runEvalSuite(suite, false);
    
    if (!results.passed_gate) {
      console.error(`❌ ${suite.suite} failed with score ${results.overall_score}`);
      process.exit(1);
    }
    
    console.log(`✅ ${suite.suite} passed with score ${results.overall_score}`);
  }
}
```

### Web Dashboard Integration

```javascript
// Dashboard component
class ChaosTestingDashboard {
  async initialize() {
    // Subscribe to real-time updates
    this.unsubscribe = enhancedEvals.subscribeToUpdates(
      (event) => this.handleUpdate(event),
      { eventTypes: ['progress', 'complete', 'error'] }
    );
    
    // Load historical data
    this.loadHistoricalData();
  }
  
  async runTest(suiteKey) {
    const suite = await enhancedEvals.loadEvalSuite(suiteKey);
    
    for await (const event of enhancedEvals.streamEvalResults(suite)) {
      this.updateUI(event);
      
      if (event.type === 'complete') {
        this.showResults(event.results);
        break;
      }
    }
  }
}