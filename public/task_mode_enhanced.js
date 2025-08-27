/**
 * Task Mode Enhanced - Practical Chaos Testing for LLM Applications
 * Builds on Chad's foundation with real-world scenarios and actionable insights
 */

(function(global) {
  const TaskModeEnhanced = {};
  
  // Real-world failure scenarios that map to actual problems
  const REAL_WORLD_SCENARIOS = {
    "openai_outage": {
      name: "OpenAI Service Outage",
      description: "Simulates OpenAI API being completely down",
      icon: "🔥",
      chaos: {
        http_500_rate: 1.0,
        latency_ms: 0
      },
      expected_behavior: "Should fallback to alternative model or cached response",
      recommended_fixes: [
        "Implement circuit breaker pattern",
        "Add fallback to alternative LLM provider",
        "Cache previous successful responses"
      ]
    },
    "rate_limit_surge": {
      name: "Rate Limit Tuesday",
      description: "Heavy rate limiting during peak usage",
      icon: "🚦",
      chaos: {
        rate_429: 0.8,
        latency_ms: 2000,
        latency_rate: 0.5
      },
      expected_behavior: "Should implement exponential backoff with jitter",
      recommended_fixes: [
        "Add exponential backoff with jitter",
        "Implement request queuing",
        "Use multiple API keys for load distribution"
      ]
    },
    "degraded_model": {
      name: "Model Quality Degradation",
      description: "Model returns truncated or lower quality responses",
      icon: "📉",
      chaos: {
        ctx_bytes: 500,
        malformed_rate: 0.3,
        latency_ms: 500
      },
      expected_behavior: "Should detect quality issues and retry or alert",
      recommended_fixes: [
        "Add response validation",
        "Implement quality scoring",
        "Retry with different parameters"
      ]
    },
    "network_instability": {
      name: "Network Instability",
      description: "Spotty connection with timeouts and partial failures",
      icon: "📡",
      chaos: {
        latency_ms: 5000,
        latency_rate: 0.5,
        http_500_rate: 0.2
      },
      expected_behavior: "Should handle timeouts gracefully with retries",
      recommended_fixes: [
        "Set appropriate timeout values",
        "Implement retry with timeout backoff",
        "Add connection pooling"
      ]
    },
    "data_corruption": {
      name: "Response Data Corruption",
      description: "Malformed JSON and encoding issues",
      icon: "💾",
      chaos: {
        malformed_rate: 0.6,
        ctx_bytes: 1000
      },
      expected_behavior: "Should validate and sanitize responses",
      recommended_fixes: [
        "Add JSON schema validation",
        "Implement response sanitization",
        "Log and alert on corruption patterns"
      ]
    },
    "cascading_failure": {
      name: "Cascading System Failure",
      description: "Multiple systems failing in sequence",
      icon: "🎯",
      chaos: {
        http_500_rate: 0.4,
        rate_429: 0.3,
        latency_ms: 3000,
        tool_unavailable_steps: 2
      },
      expected_behavior: "Should prevent cascade and maintain partial functionality",
      recommended_fixes: [
        "Implement circuit breaker per service",
        "Add bulkhead pattern for isolation",
        "Create degraded service modes"
      ]
    }
  };

  // Pipeline stages for visualization
  const PIPELINE_STAGES = [
    { id: 'input', name: 'Input', icon: '📥' },
    { id: 'prompt', name: 'Prompt Build', icon: '📝' },
    { id: 'llm_call', name: 'LLM Call', icon: '🤖' },
    { id: 'parse', name: 'Parse Response', icon: '🔍' },
    { id: 'validate', name: 'Validate', icon: '✅' },
    { id: 'output', name: 'Output', icon: '📤' }
  ];

  // State management
  let state = {
    dataset: [],
    scenario: null,
    results: {
      baseline: null,
      chaos: null
    },
    currentRun: {
      stage: null,
      failures: [],
      retries: [],
      fallbacks: []
    }
  };

  // Helper functions
  const $ = (id) => document.getElementById(id);
  
  function readFileAsText(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result || ''));
      fr.onerror = rej;
      fr.readAsText(file);
    });
  }

  function parseJSONL(text) {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      try { 
        out.push(JSON.parse(s)); 
      } catch (e) {
        console.warn('Failed to parse JSONL line:', s);
      }
    }
    return out;
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const hdr = lines[0].split(',').map(s => s.trim());
    return lines.slice(1).map(l => {
      const cells = l.split(',');
      const row = {};
      hdr.forEach((h, i) => row[h] = (cells[i] || '').trim());
      return row;
    });
  }

  // Semantic similarity using cosine similarity (lightweight, no deps)
  function cosineSimilarity(str1, str2) {
    const tokenize = (str) => str.toLowerCase().split(/\W+/).filter(Boolean);
    const tokens1 = tokenize(str1);
    const tokens2 = tokenize(str2);
    const allTokens = [...new Set([...tokens1, ...tokens2])];
    
    const vector1 = allTokens.map(token => tokens1.filter(t => t === token).length);
    const vector2 = allTokens.map(token => tokens2.filter(t => t === token).length);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  // Calculate User Experience Score
  function calculateUXScore(result) {
    let score = 0;
    const weights = {
      got_response: 0.3,
      response_valid: 0.2,
      response_quality: 0.2,
      recovery_time: 0.15,
      retry_count: 0.15
    };
    
    // Did user get any response?
    if (result.output) score += weights.got_response;
    
    // Is response valid format?
    if (result.output && !result.parse_error) score += weights.response_valid;
    
    // Response quality (semantic similarity if expected provided)
    if (result.expected && result.output) {
      const similarity = cosineSimilarity(result.expected, result.output);
      score += weights.response_quality * similarity;
    } else if (result.output) {
      score += weights.response_quality * 0.5; // Partial credit if no expected
    }
    
    // Recovery time (faster is better)
    const maxAcceptableTime = 10000; // 10 seconds
    const recoveryScore = Math.max(0, 1 - (result.duration_ms / maxAcceptableTime));
    score += weights.recovery_time * recoveryScore;
    
    // Retry efficiency (fewer is better)
    const maxRetries = 5;
    const retryScore = Math.max(0, 1 - (result.retry_count / maxRetries));
    score += weights.retry_count * retryScore;
    
    return Math.round(score * 100);
  }

  // Pipeline visualization
  function updatePipelineVisualization(stage, status, details) {
    const viz = $('pipelineViz');
    if (!viz) return;
    
    let html = '<div class="pipeline-container">';
    
    PIPELINE_STAGES.forEach((s, i) => {
      const isActive = s.id === stage;
      const isPassed = state.currentRun.stage && 
                      PIPELINE_STAGES.findIndex(ps => ps.id === state.currentRun.stage) > i;
      
      let statusClass = '';
      if (isActive) {
        statusClass = status === 'success' ? 'success' : 
                     status === 'failure' ? 'failure' : 
                     'active';
      } else if (isPassed) {
        statusClass = 'passed';
      }
      
      html += `
        <div class="pipeline-stage ${statusClass}">
          <div class="stage-icon">${s.icon}</div>
          <div class="stage-name">${s.name}</div>
          ${isActive && details ? `<div class="stage-details">${details}</div>` : ''}
        </div>
      `;
      
      if (i < PIPELINE_STAGES.length - 1) {
        html += '<div class="pipeline-arrow">→</div>';
      }
    });
    
    html += '</div>';
    
    // Add retry/fallback indicators
    if (state.currentRun.retries.length > 0) {
      html += '<div class="pipeline-retries">Retries: ' + 
              state.currentRun.retries.map(r => `${r.attempt} (${r.result})`).join(', ') + 
              '</div>';
    }
    
    if (state.currentRun.fallbacks.length > 0) {
      html += '<div class="pipeline-fallbacks">Fallbacks: ' + 
              state.currentRun.fallbacks.join(', ') + 
              '</div>';
    }
    
    viz.innerHTML = html;
  }

  // Generate actionable insights
  function generateInsights(baseline, chaos) {
    const insights = {
      summary: '',
      successes: [],
      failures: [],
      recommendations: [],
      code_snippets: []
    };
    
    // Calculate degradation
    const baselineScore = baseline.avg_score || 0;
    const chaosScore = chaos.avg_score || 0;
    const degradation = baselineScore - chaosScore;
    
    insights.summary = `Performance degraded by ${degradation.toFixed(1)}% under chaos conditions`;
    
    // Analyze what worked
    if (chaos.recovery_count > 0) {
      insights.successes.push(`Retry logic triggered ${chaos.recovery_count} times`);
    }
    if (chaos.fallback_count > 0) {
      insights.successes.push(`Fallback strategies activated ${chaos.fallback_count} times`);
    }
    if (chaosScore > 50) {
      insights.successes.push(`System maintained ${chaosScore}% functionality despite failures`);
    }
    
    // Analyze failures
    if (chaos.timeout_count > 0) {
      insights.failures.push(`${chaos.timeout_count} requests timed out`);
      insights.recommendations.push('Implement adaptive timeout strategy');
    }
    if (chaos.error_count > 0) {
      insights.failures.push(`${chaos.error_count} unhandled errors occurred`);
      insights.recommendations.push('Add comprehensive error handling');
    }
    if (!chaos.circuit_breaker_detected) {
      insights.failures.push('No circuit breaker pattern detected');
      insights.recommendations.push('Implement circuit breaker to prevent cascading failures');
      
      // Add code snippet for circuit breaker
      insights.code_snippets.push({
        title: 'Circuit Breaker Implementation',
        language: 'javascript',
        code: `class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}`
      });
    }
    
    // Add scenario-specific recommendations
    if (state.scenario && REAL_WORLD_SCENARIOS[state.scenario]) {
      const scenario = REAL_WORLD_SCENARIOS[state.scenario];
      insights.recommendations.push(...scenario.recommended_fixes);
    }
    
    return insights;
  }

  // Run chaos test suite
  async function runChaosTest(options = {}) {
    const { useScenario, customChaos } = options;
    
    // Reset current run state
    state.currentRun = {
      stage: null,
      failures: [],
      retries: [],
      fallbacks: []
    };
    
    // Apply scenario or custom chaos
    let chaosConfig = {};
    if (useScenario && REAL_WORLD_SCENARIOS[useScenario]) {
      chaosConfig = REAL_WORLD_SCENARIOS[useScenario].chaos;
      state.scenario = useScenario;
    } else if (customChaos) {
      chaosConfig = customChaos;
    }
    
    // Update UI
    updatePipelineVisualization('input', 'active', 'Loading dataset...');
    
    // TODO: Implement actual test execution
    // This will integrate with Chad's adapter pattern
    
    // Simulate test run for now
    setTimeout(() => {
      updatePipelineVisualization('prompt', 'active', 'Building prompt...');
    }, 500);
    
    setTimeout(() => {
      updatePipelineVisualization('llm_call', 'failure', 'HTTP 500 Error');
      state.currentRun.failures.push({ stage: 'llm_call', error: 'HTTP 500' });
      state.currentRun.retries.push({ attempt: 1, result: 'failed' });
    }, 1000);
    
    setTimeout(() => {
      updatePipelineVisualization('llm_call', 'success', 'Retry succeeded');
      state.currentRun.retries.push({ attempt: 2, result: 'success' });
    }, 1500);
    
    setTimeout(() => {
      updatePipelineVisualization('output', 'success', 'Complete');
    }, 2000);
    
    // Generate mock results for demo
    const mockResults = {
      baseline: {
        avg_score: 95,
        total_tests: 10,
        passed: 9,
        failed: 1
      },
      chaos: {
        avg_score: 72,
        total_tests: 10,
        passed: 7,
        failed: 3,
        recovery_count: 5,
        fallback_count: 2,
        timeout_count: 1,
        error_count: 2,
        circuit_breaker_detected: false
      }
    };
    
    state.results = mockResults;
    
    // Generate and display insights
    const insights = generateInsights(mockResults.baseline, mockResults.chaos);
    displayInsights(insights);
  }

  // Display insights in UI
  function displayInsights(insights) {
    const container = $('insightsContainer');
    if (!container) return;
    
    let html = `
      <div class="insights-report">
        <h3>📊 Chaos Test Report</h3>
        <div class="insights-summary">${insights.summary}</div>
        
        ${insights.successes.length > 0 ? `
          <div class="insights-section successes">
            <h4>✅ What Worked</h4>
            <ul>${insights.successes.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
        ` : ''}
        
        ${insights.failures.length > 0 ? `
          <div class="insights-section failures">
            <h4>❌ What Failed</h4>
            <ul>${insights.failures.map(f => `<li>${f}</li>`).join('')}</ul>
          </div>
        ` : ''}
        
        ${insights.recommendations.length > 0 ? `
          <div class="insights-section recommendations">
            <h4>📝 Recommendations</h4>
            <ul>${insights.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        ` : ''}
        
        ${insights.code_snippets.length > 0 ? `
          <div class="insights-section code-snippets">
            <h4>💻 Code Suggestions</h4>
            ${insights.code_snippets.map(snippet => `
              <div class="code-snippet">
                <h5>${snippet.title}</h5>
                <pre><code class="language-${snippet.language}">${escapeHtml(snippet.code)}</code></pre>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    container.innerHTML = html;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Initialize UI
  function initializeUI() {
    // Create scenario selector
    const scenarioSelect = $('scenarioSelect');
    if (scenarioSelect) {
      let html = '<option value="">Custom Chaos</option>';
      for (const [key, scenario] of Object.entries(REAL_WORLD_SCENARIOS)) {
        html += `<option value="${key}">${scenario.icon} ${scenario.name}</option>`;
      }
      scenarioSelect.innerHTML = html;
      
      scenarioSelect.addEventListener('change', (e) => {
        const scenario = REAL_WORLD_SCENARIOS[e.target.value];
        if (scenario) {
          displayScenarioDetails(scenario);
          applyScenarioChaos(scenario.chaos);
        }
      });
    }
  }

  function displayScenarioDetails(scenario) {
    const details = $('scenarioDetails');
    if (!details) return;
    
    details.innerHTML = `
      <div class="scenario-card">
        <h4>${scenario.icon} ${scenario.name}</h4>
        <p>${scenario.description}</p>
        <div class="expected-behavior">
          <strong>Expected Behavior:</strong> ${scenario.expected_behavior}
        </div>
      </div>
    `;
  }

  function applyScenarioChaos(chaos) {
    // Apply chaos settings to existing controls
    for (const [key, value] of Object.entries(chaos)) {
      const control = $(key);
      if (control) {
        control.value = value;
      }
    }
  }

  // Public API
  TaskModeEnhanced.init = initializeUI;
  TaskModeEnhanced.runTest = runChaosTest;
  TaskModeEnhanced.scenarios = REAL_WORLD_SCENARIOS;
  TaskModeEnhanced.calculateUXScore = calculateUXScore;
  
  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
  } else {
    initializeUI();
  }
  
  global.TaskModeEnhanced = TaskModeEnhanced;
})(window);