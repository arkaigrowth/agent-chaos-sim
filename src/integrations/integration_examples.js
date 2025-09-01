/* Integration Examples
 * Comprehensive examples showing how to integrate chaos testing system
 * with various environments, CI/CD systems, and monitoring tools
 */

// === CI/CD INTEGRATION EXAMPLES ===

class ChaosTestingCICD {
  
  /**
   * GitHub Actions integration example
   */
  static getGitHubActionsWorkflow() {
    return `
name: Chaos Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run chaos tests daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        suite: [reliability_core, rag_injection, rate_limit_backoff]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start application
      run: npm start &
      
    - name: Wait for application
      run: |
        timeout 60 bash -c 'until curl -f http://localhost:3000/health; do sleep 1; done'
    
    - name: Run chaos tests
      run: |
        node -e "
          const { runChaosTestSuite } = require('./chaos-ci-runner.js');
          
          async function runTests() {
            const results = await runChaosTestSuite('${{ matrix.suite }}', {
              includeBaseline: true,
              timeout: 300,
              failFast: process.env.GITHUB_REF === 'refs/heads/main'
            });
            
            console.log(\`Suite: \${results.suite}\`);
            console.log(\`Score: \${results.overall_score}\`);
            console.log(\`Passed: \${results.passed_gate}\`);
            
            if (!results.passed_gate) {
              console.error('Chaos tests failed!');
              process.exit(1);
            }
            
            // Save results for artifacts
            require('fs').writeFileSync(
              'chaos-results-${{ matrix.suite }}.json', 
              JSON.stringify(results, null, 2)
            );
          }
          
          runTests().catch(console.error);
        "
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: chaos-test-results-${{ matrix.suite }}
        path: chaos-results-*.json
    
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('chaos-results-${{ matrix.suite }}.json'));
          
          const comment = \`
          ## Chaos Testing Results - ${{ matrix.suite }}
          
          **Overall Score:** \${results.overall_score}/100
          **Gate Status:** \${results.passed_gate ? '✅ PASSED' : '❌ FAILED'}
          
          ### Test Cases
          \${results.cases.map(c => 
            \`- **\${c.name}**: \${c.pass ? '✅' : '❌'} (Score: \${c.scoreAvg})\`
          ).join('\\n')}
          
          <details>
          <summary>Detailed Results</summary>
          
          \\\`\\\`\\\`json
          \${JSON.stringify(results, null, 2)}
          \\\`\\\`\\\`
          </details>
          \`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
`;
  }

  /**
   * Jenkins pipeline integration
   */
  static getJenkinsPipeline() {
    return `
pipeline {
    agent any
    
    environment {
        CHAOS_API_URL = 'http://chaos-testing-api:8080'
        CHAOS_API_KEY = credentials('chaos-api-key')
    }
    
    stages {
        stage('Deploy to Testing') {
            steps {
                script {
                    // Deploy application to test environment
                    sh 'docker-compose up -d'
                    sh 'sleep 30' // Wait for services to start
                }
            }
        }
        
        stage('Chaos Testing') {
            parallel {
                stage('Reliability Tests') {
                    steps {
                        script {
                            def results = runChaosTest('reliability_core')
                            publishChaosResults(results, 'reliability')
                        }
                    }
                }
                
                stage('Security Tests') {
                    steps {
                        script {
                            def results = runChaosTest('rag_injection')
                            publishChaosResults(results, 'security')
                        }
                    }
                }
                
                stage('Performance Tests') {
                    steps {
                        script {
                            def results = runChaosTest('rate_limit_backoff')
                            publishChaosResults(results, 'performance')
                        }
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    // Aggregate results and check quality gate
                    def allResults = [
                        readJSON file: 'chaos-results-reliability.json',
                        readJSON file: 'chaos-results-security.json',
                        readJSON file: 'chaos-results-performance.json'
                    ]
                    
                    def overallScore = allResults.sum { it.overall_score } / allResults.size()
                    def allPassed = allResults.every { it.passed_gate }
                    
                    if (!allPassed || overallScore < 70) {
                        error("Chaos testing quality gate failed: Score=${overallScore}, AllPassed=${allPassed}")
                    }
                    
                    echo "Quality gate passed: Overall score = ${overallScore}"
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'chaos-results-*.json', fingerprint: true
            
            script {
                // Send notifications
                def results = readJSON file: 'chaos-results-reliability.json'
                sendSlackNotification(results)
            }
        }
        failure {
            emailext (
                subject: "Chaos Testing Failed - \${env.BUILD_TAG}",
                body: "Chaos testing failed for build \${env.BUILD_NUMBER}. Check console output for details.",
                to: "\${env.CHANGE_AUTHOR_EMAIL},devops@company.com"
            )
        }
    }
}

def runChaosTest(suiteName) {
    sh """
        curl -X POST "\${CHAOS_API_URL}/v1/runs" \\
            -H "Authorization: Bearer \${CHAOS_API_KEY}" \\
            -H "Content-Type: application/json" \\
            -d '{"suiteId": "${suiteName}", "includeBaseline": true}' \\
            -o run-response.json
    """
    
    def response = readJSON file: 'run-response.json'
    def runId = response.runId
    
    // Poll for completion
    timeout(time: 10, unit: 'MINUTES') {
        waitUntil {
            sh """
                curl -X GET "\${CHAOS_API_URL}/v1/runs/\${runId}" \\
                    -H "Authorization: Bearer \${CHAOS_API_KEY}" \\
                    -o results.json
            """
            def results = readJSON file: 'results.json'
            return results.finished != null
        }
    }
    
    return readJSON file: 'results.json'
}

def publishChaosResults(results, category) {
    writeJSON file: "chaos-results-\${category}.json", json: results
    
    publishHTML([
        allowMissing: false,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: '.',
        reportFiles: "chaos-results-\${category}.json",
        reportName: "Chaos Results - \${category}"
    ])
}

def sendSlackNotification(results) {
    def color = results.passed_gate ? 'good' : 'danger'
    def status = results.passed_gate ? 'PASSED' : 'FAILED'
    
    slackSend(
        channel: '#devops',
        color: color,
        message: """
*Chaos Testing Results*
Suite: \${results.suite}
Status: \${status}
Score: \${results.overall_score}/100
Build: <\${env.BUILD_URL}|#\${env.BUILD_NUMBER}>
        """.stripIndent()
    )
}
`;
  }

  /**
   * Docker Compose setup for testing
   */
  static getDockerCompose() {
    return `
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=testing
      - CHAOS_TESTING_MODE=enabled
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  chaos-testing-api:
    image: chaos-testing-api:latest
    ports:
      - "8080:8080"
    environment:
      - API_KEY=\${CHAOS_API_KEY}
      - TARGET_URL=http://app:3000
    volumes:
      - ./chaos-suites:/app/suites
      - ./chaos-results:/app/results

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
    ports:
      - "5432:5432"

  chaos-proxy:
    image: toxiproxy:latest
    ports:
      - "8474:8474"
      - "8001:8001" # Proxy for app
    command: -host=0.0.0.0
`;
  }
}

// === MONITORING INTEGRATION ===

class ChaosMonitoringIntegration {
  
  /**
   * Prometheus metrics integration
   */
  static setupPrometheusMetrics() {
    return `
// Prometheus metrics for chaos testing
const client = require('prom-client');

// Register default metrics
client.register.clear();
client.collectDefaultMetrics();

// Custom chaos testing metrics
const chaosTestCounter = new client.Counter({
  name: 'chaos_tests_total',
  help: 'Total number of chaos tests executed',
  labelNames: ['suite', 'status', 'environment']
});

const chaosTestDuration = new client.Histogram({
  name: 'chaos_test_duration_seconds',
  help: 'Duration of chaos tests',
  labelNames: ['suite', 'environment'],
  buckets: [1, 5, 10, 30, 60, 300, 600]
});

const chaosTestScore = new client.Gauge({
  name: 'chaos_test_score',
  help: 'Latest chaos test score',
  labelNames: ['suite', 'environment']
});

const chaosTestGateStatus = new client.Gauge({
  name: 'chaos_test_gate_passed',
  help: 'Whether the latest chaos test passed the quality gate (1 = passed, 0 = failed)',
  labelNames: ['suite', 'environment']
});

const chaosFailureInjections = new client.Counter({
  name: 'chaos_failure_injections_total',
  help: 'Total number of failure injections',
  labelNames: ['fault_type', 'scenario', 'environment']
});

class ChaosMetricsCollector {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  recordTestStart(suite) {
    this.testStartTime = Date.now();
  }

  recordTestComplete(suite, results) {
    const duration = (Date.now() - this.testStartTime) / 1000;
    const status = results.passed_gate ? 'passed' : 'failed';

    chaosTestCounter.inc({ 
      suite, 
      status, 
      environment: this.environment 
    });
    
    chaosTestDuration.observe(
      { suite, environment: this.environment }, 
      duration
    );
    
    chaosTestScore.set(
      { suite, environment: this.environment }, 
      results.overall_score
    );
    
    chaosTestGateStatus.set(
      { suite, environment: this.environment }, 
      results.passed_gate ? 1 : 0
    );

    // Record fault injections
    results.cases.forEach(testCase => {
      testCase.runs.forEach(run => {
        run.trace?.forEach(event => {
          if (event.fault_injected) {
            chaosFailureInjections.inc({
              fault_type: event.fault_injected,
              scenario: testCase.scenario,
              environment: this.environment
            });
          }
        });
      });
    });
  }

  getMetrics() {
    return client.register.metrics();
  }
}

module.exports = ChaosMetricsCollector;
`;
  }

  /**
   * Grafana dashboard configuration
   */
  static getGrafanaDashboard() {
    return `
{
  "dashboard": {
    "id": null,
    "title": "Chaos Testing Dashboard",
    "tags": ["chaos", "testing", "reliability"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Test Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(chaos_tests_total{status=\"passed\"}[5m]) / rate(chaos_tests_total[5m]) * 100",
            "legendFormat": "Success Rate %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 70},
                {"color": "green", "value": 90}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Test Scores by Suite",
        "type": "timeseries",
        "targets": [
          {
            "expr": "chaos_test_score",
            "legendFormat": "{{suite}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "id": 3,
        "title": "Test Duration",
        "type": "timeseries",
        "targets": [
          {
            "expr": "chaos_test_duration_seconds",
            "legendFormat": "{{suite}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 4,
        "title": "Failure Injections by Type",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (fault_type) (increase(chaos_failure_injections_total[1h]))",
            "legendFormat": "{{fault_type}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "Test Execution Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(chaos_tests_total[5m])",
            "legendFormat": "Tests per second"
          }
        ]
      },
      {
        "id": 6,
        "title": "Quality Gate Status",
        "type": "table",
        "targets": [
          {
            "expr": "chaos_test_gate_passed",
            "legendFormat": "",
            "format": "table"
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {},
              "indexByName": {},
              "renameByName": {
                "suite": "Suite",
                "Value": "Gate Status",
                "environment": "Environment"
              }
            }
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  }
}
`;
  }

  /**
   * DataDog integration
   */
  static getDataDogIntegration() {
    return `
const StatsD = require('hot-shots');

class ChaosDataDogReporter {
  constructor() {
    this.dogstatsd = new StatsD({
      host: process.env.DATADOG_HOST || 'localhost',
      port: process.env.DATADOG_PORT || 8125,
      prefix: 'chaos_testing.',
      tags: {
        environment: process.env.NODE_ENV || 'development',
        service: 'chaos-testing-service'
      }
    });
  }

  reportTestStart(suite, metadata = {}) {
    this.dogstatsd.increment('tests.started', 1, {
      suite,
      ...metadata
    });
  }

  reportTestComplete(suite, results, metadata = {}) {
    const tags = { suite, ...metadata };
    
    // Test completion
    this.dogstatsd.increment('tests.completed', 1, {
      ...tags,
      status: results.passed_gate ? 'passed' : 'failed'
    });

    // Test score
    this.dogstatsd.histogram('tests.score', results.overall_score, tags);

    // Test duration
    const duration = new Date(results.finished) - new Date(results.started);
    this.dogstatsd.histogram('tests.duration', duration, tags);

    // Gate status
    this.dogstatsd.gauge('tests.gate_passed', results.passed_gate ? 1 : 0, tags);

    // Case-level metrics
    results.cases.forEach(testCase => {
      const caseScore = testCase.scoreAvg || 0;
      this.dogstatsd.histogram('cases.score', caseScore, {
        ...tags,
        case_name: testCase.name,
        scenario: testCase.scenario
      });

      // Fault injection metrics
      testCase.runs.forEach(run => {
        run.trace?.forEach(event => {
          if (event.fault_injected) {
            this.dogstatsd.increment('faults.injected', 1, {
              ...tags,
              fault_type: event.fault_injected,
              scenario: testCase.scenario
            });
          }
        });
      });
    });
  }

  reportAlert(severity, message, metadata = {}) {
    this.dogstatsd.event(
      'Chaos Testing Alert',
      message,
      {
        alert_type: severity,
        source_type_name: 'chaos_testing',
        tags: Object.entries(metadata).map(([k, v]) => \`\${k}:\${v}\`)
      }
    );
  }

  close() {
    this.dogstatsd.close();
  }
}

module.exports = ChaosDataDogReporter;
`;
  }
}

// === APPLICATION INTEGRATION ===

class ChaosApplicationIntegration {
  
  /**
   * Express.js middleware integration
   */
  static getExpressMiddleware() {
    return `
const express = require('express');
const { enhancedEvals } = require('./evals_enhanced');

class ChaosTestingMiddleware {
  constructor(options = {}) {
    this.options = {
      enableAutoTesting: options.enableAutoTesting || false,
      testInterval: options.testInterval || 3600000, // 1 hour
      suites: options.suites || ['reliability_core'],
      webhookUrl: options.webhookUrl,
      ...options
    };
    
    if (this.options.enableAutoTesting) {
      this.startPeriodicTesting();
    }
  }

  // Middleware for chaos testing endpoints
  middleware() {
    const router = express.Router();

    // Health check with chaos testing status
    router.get('/health/chaos', async (req, res) => {
      try {
        const lastResults = await this.getLastTestResults();
        res.json({
          status: 'ok',
          chaosTestingEnabled: true,
          lastTestRun: lastResults?.finished || null,
          lastScore: lastResults?.overall_score || null,
          gateStatus: lastResults?.passed_gate || null
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Trigger chaos test
    router.post('/chaos/test/:suite', async (req, res) => {
      try {
        const suite = req.params.suite;
        const options = req.body.options || {};
        
        res.json({
          message: 'Chaos test started',
          suite,
          estimatedDuration: '5-10 minutes'
        });

        // Run test asynchronously
        this.runTestSuite(suite, options);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get test results
    router.get('/chaos/results', async (req, res) => {
      try {
        const results = await this.getAllTestResults();
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  async runTestSuite(suiteId, options = {}) {
    try {
      const suite = await enhancedEvals.loadEvalSuite(suiteId);
      const results = await runEvalSuite(suite, options.includeBaseline);
      
      // Store results
      this.storeTestResults(results);
      
      // Send notifications
      if (this.options.webhookUrl) {
        await this.sendWebhookNotification(results);
      }
      
      return results;
    } catch (error) {
      console.error('Chaos test failed:', error);
      throw error;
    }
  }

  startPeriodicTesting() {
    setInterval(async () => {
      for (const suite of this.options.suites) {
        try {
          await this.runTestSuite(suite, { includeBaseline: true });
        } catch (error) {
          console.error(\`Periodic chaos test failed for \${suite}:\`, error);
        }
      }
    }, this.options.testInterval);
  }

  async sendWebhookNotification(results) {
    const fetch = require('node-fetch');
    
    const payload = {
      suite: results.suite,
      score: results.overall_score,
      passed: results.passed_gate,
      timestamp: results.finished,
      details: {
        totalCases: results.cases.length,
        passedCases: results.cases.filter(c => c.pass).length,
        duration: new Date(results.finished) - new Date(results.started)
      }
    };

    await fetch(this.options.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  storeTestResults(results) {
    // Store in database, file system, or memory
    // Implementation depends on storage choice
  }

  async getLastTestResults() {
    // Retrieve last test results
    // Implementation depends on storage choice
  }

  async getAllTestResults() {
    // Retrieve all test results
    // Implementation depends on storage choice
  }
}

// Usage example
const app = express();
const chaosMiddleware = new ChaosTestingMiddleware({
  enableAutoTesting: process.env.NODE_ENV === 'production',
  testInterval: 30 * 60 * 1000, // 30 minutes
  suites: ['reliability_core', 'rag_injection'],
  webhookUrl: process.env.CHAOS_WEBHOOK_URL
});

app.use('/api/v1', chaosMiddleware.middleware());

module.exports = ChaosTestingMiddleware;
`;
  }

  /**
   * React component integration
   */
  static getReactComponent() {
    return `
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const ChaosTestingDashboard = () => {
  const [testResults, setTestResults] = useState([]);
  const [activeTests, setActiveTests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTestResults();
    
    // Subscribe to real-time updates
    const ws = new WebSocket('ws://localhost:8080/v1/stream');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleRealtimeUpdate(data);
    };

    return () => ws.close();
  }, []);

  const loadTestResults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/chaos/results');
      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      console.error('Failed to load test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (suite) => {
    try {
      await fetch(\`/api/v1/chaos/test/\${suite}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { includeBaseline: true } })
      });
      
      // Refresh results
      loadTestResults();
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const handleRealtimeUpdate = (data) => {
    if (data.type === 'evaluation.progress') {
      setActiveTests(prev => ({
        ...prev,
        [data.runId]: data
      }));
    } else if (data.type === 'evaluation.complete') {
      setActiveTests(prev => {
        const updated = { ...prev };
        delete updated[data.runId];
        return updated;
      });
      loadTestResults(); // Refresh completed results
    }
  };

  const formatChartData = () => {
    return testResults.map(result => ({
      timestamp: new Date(result.finished).getTime(),
      score: result.overall_score,
      suite: result.suite,
      passed: result.passed_gate
    }));
  };

  return (
    <div className="chaos-dashboard">
      <header>
        <h1>Chaos Testing Dashboard</h1>
        <div className="controls">
          <button onClick={() => runTest('reliability_core')}>
            Run Reliability Tests
          </button>
          <button onClick={() => runTest('rag_injection')}>
            Run Security Tests
          </button>
          <button onClick={() => runTest('rate_limit_backoff')}>
            Run Performance Tests
          </button>
        </div>
      </header>

      {/* Active Tests */}
      {Object.keys(activeTests).length > 0 && (
        <section className="active-tests">
          <h2>Running Tests</h2>
          {Object.values(activeTests).map(test => (
            <div key={test.runId} className="active-test">
              <div className="test-info">
                <h3>{test.suite}</h3>
                <div className="progress">
                  <div 
                    className="progress-bar"
                    style={{ width: \`\${test.progress}%\` }}
                  />
                  <span>{Math.round(test.progress)}%</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Test Results Chart */}
      <section className="results-chart">
        <h2>Test Score Trends</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <LineChart width={800} height={300} data={formatChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleString()}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#8884d8" 
              strokeWidth={2}
            />
          </LineChart>
        )}
      </section>

      {/* Recent Results Table */}
      <section className="recent-results">
        <h2>Recent Test Results</h2>
        <table>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Score</th>
              <th>Gate Status</th>
              <th>Duration</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {testResults.slice(0, 10).map(result => (
              <tr key={result.runId}>
                <td>{result.suite}</td>
                <td>{result.overall_score}</td>
                <td>
                  <span className={result.passed_gate ? 'passed' : 'failed'}>
                    {result.passed_gate ? 'PASSED' : 'FAILED'}
                  </span>
                </td>
                <td>
                  {Math.round((
                    new Date(result.finished) - new Date(result.started)
                  ) / 1000)}s
                </td>
                <td>
                  {new Date(result.finished).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default ChaosTestingDashboard;
`;
  }

  /**
   * Kubernetes deployment
   */
  static getKubernetesDeployment() {
    return `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chaos-testing-service
  labels:
    app: chaos-testing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: chaos-testing
  template:
    metadata:
      labels:
        app: chaos-testing
    spec:
      containers:
      - name: chaos-testing-api
        image: chaos-testing-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: postgres-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: chaos-testing-service
spec:
  selector:
    app: chaos-testing
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-chaos-tests
spec:
  schedule: "0 2 * * *" # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos-test-runner
            image: chaos-testing-runner:latest
            command:
            - /bin/sh
            - -c
            - |
              # Run all standard test suites
              for suite in reliability_core rag_injection rate_limit_backoff; do
                echo "Running suite: $suite"
                curl -X POST "http://chaos-testing-service/api/v1/runs" \\
                  -H "Content-Type: application/json" \\
                  -d "{\"suiteId\": \"$suite\", \"includeBaseline\": true}"
                sleep 300 # Wait 5 minutes between suites
              done
            env:
            - name: CHAOS_API_URL
              value: "http://chaos-testing-service"
          restartPolicy: OnFailure
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chaos-testing-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - chaos-testing.company.com
    secretName: chaos-testing-tls
  rules:
  - host: chaos-testing.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chaos-testing-service
            port:
              number: 80
`;
  }
}

// Export all integration examples
if (typeof window !== 'undefined') {
  window.ChaosIntegrationExamples = {
    ChaosTestingCICD,
    ChaosMonitoringIntegration,
    ChaosApplicationIntegration
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ChaosTestingCICD,
    ChaosMonitoringIntegration,
    ChaosApplicationIntegration
  };
}