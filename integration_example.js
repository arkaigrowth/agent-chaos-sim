/**
 * Agent Chaos Monkey - Data Collection Integration Example
 * 
 * This example demonstrates how to integrate the DataCollector
 * with the existing ChaosSimulator for comprehensive analysis.
 */

// Example integration showing how to use the enhanced system
class AgentChaosMonkeyIntegration {
  constructor() {
    this.dataCollector = new DataCollector();
    this.currentSession = null;
    this.scenarios = [
      {
        name: 'API Meltdown',
        faults: { latencyMs: 2000, http500Rate: 30, rate429: 25 },
        expectedResilience: 75
      },
      {
        name: 'RAG Injection Attack',
        faults: { injSeed: 'malicious-prompt', ctxBytes: 512 },
        expectedResilience: 85
      }
    ];
  }

  /**
   * Run a comprehensive chaos scenario with full data collection
   */
  async runScenarioWithAnalysis(scenarioName, userSeed = null) {
    console.log(`🎭 Starting scenario: ${scenarioName}`);
    
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    // 1. Start data collection session
    this.currentSession = this.dataCollector.startSession({
      scenario: scenario.name,
      faults: scenario.faults,
      expectedResilience: scenario.expectedResilience
    }, 'scenario', userSeed);

    console.log(`📊 Session started: ${this.currentSession.sessionId}`);
    console.log(`🎲 Seed: ${this.currentSession.seed}`);

    // 2. Simulate scenario execution
    await this.simulateScenarioExecution(scenario);

    // 3. Generate comprehensive analysis
    const analysis = await this.generateAnalysis();

    // 4. Export results in multiple formats
    const exports = await this.exportSessionData();

    return {
      session: this.currentSession,
      analysis: analysis,
      exports: exports
    };
  }

  /**
   * Simulate the execution of a chaos scenario
   */
  async simulateScenarioExecution(scenario) {
    const effects = [
      'latency_injection',
      'http_500_error', 
      'rate_limit_429',
      'malformed_json',
      'tool_unavailable',
      'context_truncation'
    ];

    console.log(`⚡ Executing ${scenario.name}...`);

    // Simulate 10-15 effects over the scenario
    const effectCount = Math.floor(Math.random() * 6) + 10;
    
    for (let i = 0; i < effectCount; i++) {
      // Random delay between effects
      await this.delay(Math.random() * 500 + 200);

      // Inject random effect
      const effectType = effects[Math.floor(Math.random() * effects.length)];
      const target = `system_component_${i % 4}`;
      
      const result = this.simulateEffectInjection(effectType, target, scenario.faults);
      
      // 70% chance of attempting recovery
      if (Math.random() > 0.3) {
        await this.delay(Math.random() * 300 + 100);
        this.simulateRecoveryAttempt(effectType);
      }

      // Progress indicator
      if (i % 3 === 0) {
        console.log(`   Progress: ${Math.round((i / effectCount) * 100)}%`);
      }
    }

    console.log(`✅ Scenario execution complete`);
  }

  /**
   * Simulate effect injection with realistic parameters
   */
  simulateEffectInjection(effectType, target, scenarioFaults) {
    const baseImpact = this.calculateBaseImpact(effectType);
    const faultMultiplier = this.getFaultMultiplier(effectType, scenarioFaults);
    const finalImpact = Math.round(baseImpact * faultMultiplier);

    const result = {
      score_impact: -finalImpact,
      current_score: Math.max(0, 100 - Math.random() * 40),
      severity: finalImpact > 15 ? 'high' : finalImpact > 8 ? 'medium' : 'low'
    };

    // Log the effect injection
    this.dataCollector.logEffectInjection(effectType, target, {
      severity: result.severity,
      fault_multiplier: faultMultiplier,
      base_impact: baseImpact
    }, result);

    console.log(`   💥 ${effectType} → ${target} (impact: ${finalImpact})`);
    
    return result;
  }

  /**
   * Simulate recovery attempt with realistic success rates
   */
  simulateRecoveryAttempt(triggeredBy) {
    const strategies = ['exponential_backoff', 'circuit_breaker', 'fallback_cache', 'retry_with_jitter'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    
    // Success rate depends on strategy and fault type
    const baseSuccessRate = this.getStrategySuccessRate(strategy);
    const contextualRate = this.adjustSuccessRateForContext(baseSuccessRate, triggeredBy);
    
    const success = Math.random() < contextualRate;
    const duration = this.calculateRecoveryDuration(strategy, success);

    // Log the recovery attempt
    this.dataCollector.logRecoveryAttempt(strategy, success, duration, {
      triggered_by: triggeredBy,
      success_rate: contextualRate,
      strategy_effectiveness: baseSuccessRate
    });

    const status = success ? '🛡️ RECOVERED' : '❌ FAILED';
    console.log(`   ${status} ${strategy} (${duration}ms)`);
    
    return { success, duration, strategy };
  }

  /**
   * Generate comprehensive analysis of the session
   */
  async generateAnalysis() {
    const sessionData = this.dataCollector.getSessionData();
    const traces = sessionData.traces;

    // Calculate key metrics
    const effectTraces = traces.filter(t => t.action === 'effect_injection');
    const recoveryTraces = traces.filter(t => t.action === 'recovery_attempt');
    
    const totalEffects = effectTraces.length;
    const totalRecoveries = recoveryTraces.length;
    const successfulRecoveries = recoveryTraces.filter(t => t.success).length;
    
    const recoveryRate = totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0;
    const avgRecoveryTime = this.calculateAverageRecoveryTime(recoveryTraces);
    const overallResilience = this.calculateOverallResilience(sessionData);

    // Analyze patterns
    const faultPatterns = this.analyzeFaultPatterns(effectTraces);
    const recoveryPatterns = this.analyzeRecoveryPatterns(recoveryTraces);
    const temporalAnalysis = this.analyzeTemporalPatterns(traces);

    const analysis = {
      metrics: {
        total_effects: totalEffects,
        total_recoveries: totalRecoveries,
        recovery_rate: Math.round(recoveryRate * 100),
        avg_recovery_time_ms: Math.round(avgRecoveryTime),
        overall_resilience: Math.round(overallResilience),
        session_duration_s: Math.round(sessionData.duration_ms / 1000)
      },
      patterns: {
        fault_distribution: faultPatterns,
        recovery_strategies: recoveryPatterns,
        temporal_analysis: temporalAnalysis
      },
      insights: this.generateInsights(sessionData, {
        recoveryRate,
        avgRecoveryTime,
        overallResilience
      })
    };

    console.log(`📈 Analysis complete:`);
    console.log(`   Recovery Rate: ${analysis.metrics.recovery_rate}%`);
    console.log(`   Avg Recovery Time: ${analysis.metrics.avg_recovery_time_ms}ms`);
    console.log(`   Overall Resilience: ${analysis.metrics.overall_resilience}%`);

    return analysis;
  }

  /**
   * Export session data in multiple formats
   */
  async exportSessionData() {
    const exports = {
      json: this.dataCollector.exportAsJSON(),
      csv: this.dataCollector.exportAsCSV(),
      report: this.dataCollector.exportAsReport(),
      shareUrl: this.dataCollector.exportAsShareableURL()
    };

    console.log(`📤 Data exported:`);
    console.log(`   JSON: ${exports.json.length} characters`);
    console.log(`   CSV: ${exports.csv.split('\\n').length} rows`);
    console.log(`   Report: ${exports.report.split('\\n').length} lines`);
    console.log(`   Share URL: ${exports.shareUrl.length} characters`);

    return exports;
  }

  /**
   * End the current session with summary
   */
  endSession(additionalSummary = {}) {
    if (!this.currentSession) {
      console.log('⚠️  No active session to end');
      return null;
    }

    const finalSummary = this.dataCollector.endSession({
      completion_status: 'success',
      ...additionalSummary
    });

    console.log(`🏁 Session ended: ${this.currentSession.sessionId}`);
    this.currentSession = null;

    return finalSummary;
  }

  // Helper methods for realistic simulation
  calculateBaseImpact(effectType) {
    const impacts = {
      'latency_injection': 12,
      'http_500_error': 18,
      'rate_limit_429': 15,
      'malformed_json': 20,
      'tool_unavailable': 25,
      'context_truncation': 22
    };
    return impacts[effectType] || 10;
  }

  getFaultMultiplier(effectType, scenarioFaults) {
    // Adjust impact based on scenario configuration
    const faultKeys = {
      'latency_injection': 'latencyMs',
      'http_500_error': 'http500Rate',
      'rate_limit_429': 'rate429'
    };
    
    const faultKey = faultKeys[effectType];
    if (faultKey && scenarioFaults[faultKey]) {
      return 1 + (scenarioFaults[faultKey] / 100);
    }
    
    return 1.0;
  }

  getStrategySuccessRate(strategy) {
    const rates = {
      'exponential_backoff': 0.85,
      'circuit_breaker': 0.78,
      'fallback_cache': 0.92,
      'retry_with_jitter': 0.82
    };
    return rates[strategy] || 0.75;
  }

  adjustSuccessRateForContext(baseRate, triggeredBy) {
    // Certain faults are harder to recover from
    const adjustments = {
      'tool_unavailable': -0.2,
      'context_truncation': -0.15,
      'malformed_json': -0.1
    };
    
    const adjustment = adjustments[triggeredBy] || 0;
    return Math.max(0.1, Math.min(0.95, baseRate + adjustment));
  }

  calculateRecoveryDuration(strategy, success) {
    const baseDurations = {
      'exponential_backoff': success ? 800 : 2500,
      'circuit_breaker': success ? 300 : 1200,
      'fallback_cache': success ? 150 : 800,
      'retry_with_jitter': success ? 600 : 2000
    };
    
    const base = baseDurations[strategy] || 1000;
    return Math.round(base + (Math.random() * base * 0.5));
  }

  calculateAverageRecoveryTime(recoveryTraces) {
    if (recoveryTraces.length === 0) return 0;
    return recoveryTraces.reduce((sum, trace) => sum + trace.duration_ms, 0) / recoveryTraces.length;
  }

  calculateOverallResilience(sessionData) {
    const { recovery_rate, avg_resilience } = sessionData.summary;
    return (recovery_rate * 100 * 0.6) + (avg_resilience * 0.4);
  }

  analyzeFaultPatterns(effectTraces) {
    const distribution = {};
    effectTraces.forEach(trace => {
      distribution[trace.effect_type] = (distribution[trace.effect_type] || 0) + 1;
    });
    return distribution;
  }

  analyzeRecoveryPatterns(recoveryTraces) {
    const strategies = {};
    recoveryTraces.forEach(trace => {
      if (!strategies[trace.strategy]) {
        strategies[trace.strategy] = { total: 0, successful: 0 };
      }
      strategies[trace.strategy].total++;
      if (trace.success) strategies[trace.strategy].successful++;
    });
    
    // Calculate success rates
    Object.keys(strategies).forEach(strategy => {
      const data = strategies[strategy];
      data.success_rate = data.total > 0 ? data.successful / data.total : 0;
    });
    
    return strategies;
  }

  analyzeTemporalPatterns(traces) {
    const timeline = traces.map(trace => ({
      time: trace.relative_time,
      action: trace.action,
      type: trace.effect_type || trace.strategy || 'other'
    }));
    
    // Find clustering of events
    const clusters = [];
    let currentCluster = [];
    let lastTime = 0;
    
    timeline.forEach(event => {
      if (event.time - lastTime > 2000) { // 2s gap = new cluster
        if (currentCluster.length > 1) clusters.push(currentCluster);
        currentCluster = [event];
      } else {
        currentCluster.push(event);
      }
      lastTime = event.time;
    });
    
    if (currentCluster.length > 1) clusters.push(currentCluster);
    
    return {
      total_events: timeline.length,
      event_clusters: clusters.length,
      avg_cluster_size: clusters.length > 0 ? 
        clusters.reduce((sum, cluster) => sum + cluster.length, 0) / clusters.length : 0
    };
  }

  generateInsights(sessionData, metrics) {
    const insights = [];
    
    if (metrics.recoveryRate > 0.8) {
      insights.push('Excellent recovery performance - system shows high resilience');
    } else if (metrics.recoveryRate < 0.5) {
      insights.push('Poor recovery performance - investigate failure patterns');
    }
    
    if (metrics.avgRecoveryTime > 3000) {
      insights.push('Recovery times are high - consider optimizing strategies');
    } else if (metrics.avgRecoveryTime < 1000) {
      insights.push('Fast recovery times indicate efficient error handling');
    }
    
    if (metrics.overallResilience > 85) {
      insights.push('System demonstrates strong overall resilience');
    } else if (metrics.overallResilience < 60) {
      insights.push('System resilience needs improvement - multiple failure modes detected');
    }
    
    return insights;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage demonstration
async function demonstrateIntegration() {
  console.log('🎭 Agent Chaos Monkey - Integration Example\\n');
  
  const integration = new AgentChaosMonkeyIntegration();
  
  try {
    // Run API Meltdown scenario
    const result = await integration.runScenarioWithAnalysis('API Meltdown', 'demo-seed-2024');
    
    // Display key insights
    console.log('\\n🔍 Key Insights:');
    result.analysis.insights.forEach(insight => {
      console.log(`   • ${insight}`);
    });
    
    // End session
    const finalSummary = integration.endSession({
      demo_mode: true,
      final_resilience: result.analysis.metrics.overall_resilience
    });
    
    console.log('\\n📊 Final Session Summary:');
    console.log(`   Total Traces: ${finalSummary.traces.length}`);
    console.log(`   Effects Injected: ${finalSummary.summary.total_effects}`);
    console.log(`   Recovery Attempts: ${finalSummary.summary.total_recoveries}`);
    console.log(`   Recovery Rate: ${Math.round(finalSummary.summary.recovery_rate * 100)}%`);
    
    console.log('\\n✅ Integration example completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration example failed:', error.message);
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  // Mock DataCollector for demo
  global.DataCollector = require('./test_data_collection.js').MockDataCollector || class MockDataCollector {
    constructor() {
      this.traces = [];
      this.performance = { effectsInjected: 0, recoveryAttempts: 0 };
    }
    startSession() { return { sessionId: 'demo', seed: 'demo' }; }
    logTrace() { return {}; }
    logEffectInjection() { this.performance.effectsInjected++; return {}; }
    logRecoveryAttempt() { this.performance.recoveryAttempts++; return {}; }
    getSessionData() { return { traces: this.traces, summary: {} }; }
    endSession() { return { traces: [], summary: {} }; }
    exportAsJSON() { return '{}'; }
    exportAsCSV() { return 'header\\ndata'; }
    exportAsReport() { return '# Report'; }
    exportAsShareableURL() { return 'http://example.com?session=demo'; }
  };
  
  demonstrateIntegration().catch(console.error);
}

module.exports = { AgentChaosMonkeyIntegration };