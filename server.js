/**
 * Express Server for Agent Chaos Monkey Enhanced
 * Serves static files and provides mock agent endpoints
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 8080;
const MOCK_AGENT_PORT = process.env.MOCK_AGENT_PORT || 9009;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));
app.use('/archive', express.static(path.join(__dirname, 'archive')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mock LLM endpoint for testing
app.post('/api/complete', (req, res) => {
  const { prompt, chaos = {} } = req.body;
  
  // Simulate chaos conditions
  if (Math.random() < (chaos.error_rate || 0)) {
    return res.status(500).json({ error: 'Service unavailable' });
  }
  
  if (Math.random() < (chaos.rate_limit || 0)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retry_after: 60
    });
  }
  
  // Add artificial latency
  const latency = chaos.latency_ms || 0;
  setTimeout(() => {
    res.json({
      completion: `Mock response to: ${prompt?.slice(0, 100)}...`,
      model: 'mock-gpt',
      tokens_used: 42,
      latency_ms: latency
    });
  }, latency);
});

// Sample datasets endpoint
app.get('/api/sample-datasets', (req, res) => {
  res.json({
    datasets: [
      {
        name: 'QA Dataset',
        description: 'Question-answering pairs for testing',
        url: '/datasets/qa_sample.jsonl',
        rows: 10
      },
      {
        name: 'Classification Dataset',
        description: 'Text classification examples',
        url: '/datasets/classify_sample.jsonl',
        rows: 20
      },
      {
        name: 'Extraction Dataset',
        description: 'Entity extraction examples',
        url: '/datasets/extract_sample.jsonl',
        rows: 15
      }
    ]
  });
});

// Scenarios endpoint
app.get('/api/scenarios', (req, res) => {
  res.json({
    scenarios: [
      {
        id: 'openai_outage',
        name: 'OpenAI Service Outage',
        description: 'Complete API unavailability',
        severity: 'critical',
        frequency: 'rare'
      },
      {
        id: 'rate_limit_surge',
        name: 'Rate Limit Tuesday',
        description: 'Heavy rate limiting during peak',
        severity: 'high',
        frequency: 'weekly'
      },
      {
        id: 'degraded_model',
        name: 'Model Quality Degradation',
        description: 'Lower quality responses',
        severity: 'medium',
        frequency: 'occasional'
      }
    ]
  });
});

// Metrics endpoint for monitoring
app.get('/api/metrics', (req, res) => {
  res.json({
    total_requests: 1234,
    success_rate: 0.92,
    average_latency_ms: 250,
    failures_by_type: {
      timeout: 15,
      rate_limit: 42,
      server_error: 8,
      malformed: 3
    },
    recovery_metrics: {
      average_retry_count: 1.8,
      fallback_success_rate: 0.85,
      circuit_breaker_trips: 5
    }
  });
});

// Start the enhanced mock agent in a subprocess
const { spawn } = require('child_process');
let mockAgent = null;

function startMockAgent() {
  console.log(`Starting mock agent on port ${MOCK_AGENT_PORT}...`);
  mockAgent = spawn('node', [
    path.join(__dirname, 'tests', 'mock-agent', 'enhanced-server.js')
  ], {
    env: { ...process.env, MOCK_AGENT_PORT },
    stdio: 'inherit'
  });
  
  mockAgent.on('error', (err) => {
    console.error('Failed to start mock agent:', err);
  });
  
  mockAgent.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Mock agent exited with code ${code}`);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (mockAgent) {
    mockAgent.kill('SIGINT');
  }
  process.exit(0);
});

// Start servers
app.listen(PORT, () => {
  console.log(`🚀 Agent Chaos Monkey server running at http://localhost:${PORT}`);
  console.log(`📂 Static files served from /public and /docs`);
  console.log(`🔧 API endpoints available at /api/*`);
  
  // Start mock agent
  startMockAgent();
});