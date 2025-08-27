/**
 * Enhanced Mock HTTP Agent for Real Agent Testing
 * Extends Chad's basic mock with resilience patterns and chaos simulation
 */

const http = require('http');
const port = process.env.MOCK_AGENT_PORT ? Number(process.env.MOCK_AGENT_PORT) : 9009;

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  threshold: 3,
  state: 'CLOSED',
  nextAttempt: Date.now(),
  timeout: 10000
};

// Cache for fallback responses
const responseCache = new Map();

// Metrics tracking
const metrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  retries: 0,
  fallbacks: 0,
  circuitBreaks: 0
};

// Simulate different response patterns based on chaos
function simulateResponse(prompt, chaosLevel = 0) {
  const responses = {
    normal: {
      output: `Processed: ${prompt?.slice(0, 100)}`,
      confidence: 0.95,
      model: 'mock-gpt-4'
    },
    degraded: {
      output: `Partial: ${prompt?.slice(0, 50)}...`,
      confidence: 0.6,
      model: 'mock-gpt-3.5'
    },
    fallback: {
      output: `Cached response for similar query`,
      confidence: 0.4,
      model: 'cache',
      fromCache: true
    }
  };
  
  // Determine which response to return based on chaos
  if (Math.random() < chaosLevel) {
    return responses.degraded;
  }
  return responses.normal;
}

const server = http.createServer(async (req, res) => {
  // CORS headers for browser testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check with metrics
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      circuit_breaker: circuitBreaker.state,
      metrics
    }));
    return;
  }
  
  // Reset endpoint for testing
  if (req.method === 'POST' && req.url === '/reset') {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'CLOSED';
    Object.keys(metrics).forEach(key => metrics[key] = 0);
    responseCache.clear();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'State reset' }));
    return;
  }
  
  // Main /run endpoint with resilience patterns
  if (req.method === 'POST' && req.url === '/run') {
    metrics.requests++;
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { prompt, inputs, meta = {} } = payload;
        
        // Check circuit breaker
        if (circuitBreaker.state === 'OPEN') {
          if (Date.now() < circuitBreaker.nextAttempt) {
            metrics.circuitBreaks++;
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Circuit breaker OPEN',
              retry_after: circuitBreaker.nextAttempt - Date.now()
            }));
            return;
          }
          // Try half-open
          circuitBreaker.state = 'HALF_OPEN';
        }
        
        // Simulate chaos based on meta flags
        const chaosLevel = meta.chaos_level || 0;
        const forceFailure = meta.force_failure || false;
        const simulateLatency = meta.latency_ms || 0;
        
        // Add artificial latency
        setTimeout(() => {
          // Force failure for testing
          if (forceFailure || Math.random() < chaosLevel * 0.3) {
            circuitBreaker.failures++;
            metrics.failures++;
            
            if (circuitBreaker.failures >= circuitBreaker.threshold) {
              circuitBreaker.state = 'OPEN';
              circuitBreaker.nextAttempt = Date.now() + circuitBreaker.timeout;
            }
            
            // Try fallback
            const cacheKey = prompt?.slice(0, 50);
            if (responseCache.has(cacheKey)) {
              metrics.fallbacks++;
              const cached = responseCache.get(cacheKey);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                ...cached,
                fromCache: true,
                trace: [{ 
                  tool: 'mock-agent', 
                  status: 'fallback',
                  reason: 'primary_failure',
                  duration_ms: simulateLatency 
                }]
              }));
              return;
            }
            
            // No fallback available
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Service temporarily unavailable',
              trace: [{ tool: 'mock-agent', status: 'error' }]
            }));
            return;
          }
          
          // Successful response
          const response = simulateResponse(prompt, chaosLevel);
          
          // Reset circuit breaker on success
          if (circuitBreaker.state === 'HALF_OPEN') {
            circuitBreaker.state = 'CLOSED';
            circuitBreaker.failures = 0;
          }
          
          // Cache successful responses
          const cacheKey = prompt?.slice(0, 50);
          responseCache.set(cacheKey, response);
          
          // Limit cache size
          if (responseCache.size > 100) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
          }
          
          metrics.successes++;
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ...response,
            trace: [{
              tool: 'mock-agent',
              status: 'ok',
              duration_ms: simulateLatency,
              circuit_state: circuitBreaker.state,
              cache_size: responseCache.size
            }]
          }));
          
        }, simulateLatency);
        
      } catch (e) {
        metrics.failures++;
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Invalid request', 
          details: e.message 
        }));
      }
    });
    return;
  }
  
  // Simulate different LLM endpoints
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    // OpenAI-compatible endpoint
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const message = payload.messages?.[0]?.content || '';
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'mock-' + Date.now(),
          choices: [{
            message: {
              role: 'assistant',
              content: `Mock response to: ${message.slice(0, 100)}`
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[mock-agent] Shutting down gracefully...');
  server.close(() => {
    console.log('[mock-agent] Server closed');
    process.exit(0);
  });
});

server.listen(port, () => {
  console.log(`[mock-agent] Enhanced server listening on http://localhost:${port}`);
  console.log(`[mock-agent] Endpoints:`);
  console.log(`  - GET  /healthz         : Health check with metrics`);
  console.log(`  - POST /reset           : Reset state and metrics`);
  console.log(`  - POST /run             : Main agent endpoint`);
  console.log(`  - POST /v1/chat/completions : OpenAI-compatible endpoint`);
});