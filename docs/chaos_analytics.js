/**
 * Agent Chaos Monkey - Analytics & Visualization Engine
 * Terminal-compatible ASCII visualizations and intelligent resilience scoring
 */

class ChaosAnalytics {
  constructor(dataCollector) {
    this.dataCollector = dataCollector;
    this.colors = {
      green: '#00ff41',
      yellow: '#ffff00',
      orange: '#ffaa00',
      red: '#ff4444',
      gray: '#888888'
    };
    
    // ASCII chart characters
    this.chars = {
      block: '█',
      shade: '▓',
      medium: '▒',
      light: '░',
      empty: '·',
      hLine: '─',
      vLine: '│',
      corner: '└',
      tee: '├',
      cross: '┼'
    };
    
    // Performance thresholds
    this.thresholds = {
      recovery: { excellent: 500, good: 1000, poor: 2000 },
      successRate: { excellent: 95, good: 80, poor: 60 },
      adaptation: { excellent: 20, good: 10, poor: 5 },
      robustness: { excellent: 90, good: 75, poor: 50 }
    };
  }

  /**
   * Generate comprehensive resilience analysis
   */
  analyzeResilience() {
    const traces = this.dataCollector.traces;
    const analysis = {
      overall_score: 0,
      components: {
        recovery_time: 0,
        success_rate: 0,
        adaptation: 0,
        robustness: 0
      },
      metrics: {},
      weaknesses: [],
      recommendations: [],
      patterns: {}
    };

    // Calculate metrics
    analysis.metrics = this.calculateMetrics(traces);
    
    // Score components
    analysis.components.recovery_time = this.scoreRecoveryTime(analysis.metrics);
    analysis.components.success_rate = this.scoreSuccessRate(analysis.metrics);
    analysis.components.adaptation = this.scoreAdaptation(analysis.metrics);
    analysis.components.robustness = this.scoreRobustness(analysis.metrics);
    
    // Calculate overall score
    analysis.overall_score = Math.round(
      analysis.components.recovery_time * 0.4 +
      analysis.components.success_rate * 0.3 +
      analysis.components.adaptation * 0.2 +
      analysis.components.robustness * 0.1
    );
    
    // Identify weaknesses
    analysis.weaknesses = this.identifyWeaknesses(analysis.metrics, analysis.components);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis.weaknesses, analysis.metrics);
    
    // Pattern detection
    analysis.patterns = this.detectPatterns(traces);
    
    return analysis;
  }

  /**
   * Calculate core metrics from trace data
   */
  calculateMetrics(traces) {
    const metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      recoveryTimes: [],
      errorTypes: {},
      responseTimesByType: {},
      adaptationRate: 0,
      consistencyScore: 0
    };

    let lastFailure = null;
    let errorWindow = [];
    const windowSize = 10;

    traces.forEach((trace, index) => {
      if (trace.action === 'effect_injection') {
        metrics.totalOperations++;
        
        // Track error types
        const effectType = trace.effect_type || 'unknown';
        if (!metrics.errorTypes[effectType]) {
          metrics.errorTypes[effectType] = { count: 0, recovered: 0, avgRecovery: 0 };
        }
        metrics.errorTypes[effectType].count++;
        
        // Mark as failure
        lastFailure = { index, time: trace.relative_time, type: effectType };
        metrics.failedOperations++;
      }
      
      if (trace.action === 'recovery_attempt' || trace.action === 'recovery_success') {
        if (lastFailure) {
          const recoveryTime = trace.relative_time - lastFailure.time;
          metrics.recoveryTimes.push(recoveryTime);
          
          if (metrics.errorTypes[lastFailure.type]) {
            metrics.errorTypes[lastFailure.type].recovered++;
            const recoveries = metrics.errorTypes[lastFailure.type].recoveryTimes || [];
            recoveries.push(recoveryTime);
            metrics.errorTypes[lastFailure.type].recoveryTimes = recoveries;
            metrics.errorTypes[lastFailure.type].avgRecovery = 
              recoveries.reduce((a, b) => a + b, 0) / recoveries.length;
          }
          
          if (trace.action === 'recovery_success') {
            metrics.successfulOperations++;
          }
          lastFailure = null;
        }
      }
      
      // Track adaptation rate
      if (trace.action === 'effect_injection' || trace.action === 'recovery_success') {
        errorWindow.push(trace.action === 'recovery_success' ? 1 : 0);
        if (errorWindow.length > windowSize) {
          errorWindow.shift();
        }
        
        if (errorWindow.length >= windowSize / 2) {
          const recentSuccess = errorWindow.slice(-5).reduce((a, b) => a + b, 0) / 5;
          const earlierSuccess = errorWindow.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
          metrics.adaptationRate = Math.max(0, (recentSuccess - earlierSuccess) * 100);
        }
      }
    });

    // Calculate consistency score
    if (Object.keys(metrics.errorTypes).length > 0) {
      const recoveryRates = Object.values(metrics.errorTypes).map(e => 
        e.count > 0 ? (e.recovered / e.count) * 100 : 0
      );
      const avgRate = recoveryRates.reduce((a, b) => a + b, 0) / recoveryRates.length;
      const variance = recoveryRates.reduce((sum, rate) => 
        sum + Math.pow(rate - avgRate, 2), 0
      ) / recoveryRates.length;
      metrics.consistencyScore = Math.max(0, 100 - Math.sqrt(variance));
    }

    return metrics;
  }

  /**
   * Score recovery time component
   */
  scoreRecoveryTime(metrics) {
    if (metrics.recoveryTimes.length === 0) return 50;
    
    const avgRecovery = metrics.recoveryTimes.reduce((a, b) => a + b, 0) / metrics.recoveryTimes.length;
    
    if (avgRecovery <= this.thresholds.recovery.excellent) return 100;
    if (avgRecovery <= this.thresholds.recovery.good) return 85;
    if (avgRecovery <= this.thresholds.recovery.poor) return 70;
    
    // Linear degradation after poor threshold
    return Math.max(0, 70 - (avgRecovery - this.thresholds.recovery.poor) / 100);
  }

  /**
   * Score success rate component
   */
  scoreSuccessRate(metrics) {
    if (metrics.totalOperations === 0) return 50;
    
    const successRate = (metrics.successfulOperations / metrics.totalOperations) * 100;
    
    if (successRate >= this.thresholds.successRate.excellent) return 100;
    if (successRate >= this.thresholds.successRate.good) return 85;
    if (successRate >= this.thresholds.successRate.poor) return 70;
    
    return Math.max(0, successRate * 0.7);
  }

  /**
   * Score adaptation component
   */
  scoreAdaptation(metrics) {
    const rate = metrics.adaptationRate;
    
    if (rate >= this.thresholds.adaptation.excellent) return 100;
    if (rate >= this.thresholds.adaptation.good) return 85;
    if (rate >= this.thresholds.adaptation.poor) return 70;
    
    return Math.max(0, 50 + rate * 2);
  }

  /**
   * Score robustness component
   */
  scoreRobustness(metrics) {
    return Math.min(100, metrics.consistencyScore);
  }

  /**
   * Identify system weaknesses
   */
  identifyWeaknesses(metrics, components) {
    const weaknesses = [];
    
    // Check recovery time
    if (components.recovery_time < 70) {
      const avgRecovery = metrics.recoveryTimes.length > 0 ?
        (metrics.recoveryTimes.reduce((a, b) => a + b, 0) / metrics.recoveryTimes.length).toFixed(1) : 'N/A';
      weaknesses.push(`Slow recovery time (${avgRecovery}ms avg)`);
    }
    
    // Check success rate
    if (components.success_rate < 70) {
      const rate = metrics.totalOperations > 0 ?
        ((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(1) : 0;
      weaknesses.push(`Low success rate (${rate}%)`);
    }
    
    // Check specific error types
    Object.entries(metrics.errorTypes).forEach(([type, data]) => {
      const recoveryRate = data.count > 0 ? (data.recovered / data.count) * 100 : 0;
      if (recoveryRate < 60) {
        weaknesses.push(`Poor ${type} recovery (${recoveryRate.toFixed(1)}%)`);
      }
    });
    
    // Check adaptation
    if (components.adaptation < 50) {
      weaknesses.push(`Limited learning/adaptation capability`);
    }
    
    // Check consistency
    if (components.robustness < 60) {
      weaknesses.push(`Inconsistent performance across failure types`);
    }
    
    return weaknesses;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(weaknesses, metrics) {
    const recommendations = [];
    const points = {};
    
    weaknesses.forEach(weakness => {
      if (weakness.includes('recovery time')) {
        recommendations.push('Implement exponential backoff strategy');
        points['exponential_backoff'] = 15;
        recommendations.push('Add circuit breaker pattern');
        points['circuit_breaker'] = 20;
      }
      
      if (weakness.includes('success rate')) {
        recommendations.push('Enhance error handling coverage');
        points['error_handling'] = 12;
        recommendations.push('Add retry mechanisms with jitter');
        points['retry_jitter'] = 10;
      }
      
      if (weakness.includes('JSON') || weakness.includes('parse')) {
        recommendations.push('Add JSON schema validation');
        points['json_validation'] = 10;
        recommendations.push('Implement graceful degradation for malformed data');
        points['graceful_degradation'] = 8;
      }
      
      if (weakness.includes('rate') || weakness.includes('429')) {
        recommendations.push('Implement rate limit detection and backoff');
        points['rate_limiting'] = 15;
        recommendations.push('Add request queuing and throttling');
        points['request_throttle'] = 12;
      }
      
      if (weakness.includes('learning') || weakness.includes('adaptation')) {
        recommendations.push('Add adaptive timeout adjustments');
        points['adaptive_timeouts'] = 10;
        recommendations.push('Implement failure pattern recognition');
        points['pattern_recognition'] = 15;
      }
      
      if (weakness.includes('Inconsistent')) {
        recommendations.push('Standardize error handling across all failure types');
        points['standardize_handling'] = 8;
        recommendations.push('Add comprehensive monitoring and alerting');
        points['monitoring'] = 10;
      }
    });
    
    // Sort and format recommendations with point improvements
    const uniqueRecs = [...new Set(recommendations)];
    return uniqueRecs.map(rec => {
      const key = rec.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      const improvement = points[key] || 5;
      return `${rec} (+${improvement} points)`;
    }).sort((a, b) => {
      const pointsA = parseInt(a.match(/\+(\d+)/)[1]);
      const pointsB = parseInt(b.match(/\+(\d+)/)[1]);
      return pointsB - pointsA;
    });
  }

  /**
   * Detect patterns in failure and recovery
   */
  detectPatterns(traces) {
    const patterns = {
      failureClusters: [],
      recoveryPatterns: [],
      timeBasedTrends: [],
      sequentialFailures: 0
    };
    
    let consecutiveFailures = 0;
    let maxConsecutive = 0;
    
    traces.forEach((trace, index) => {
      if (trace.action === 'effect_injection') {
        consecutiveFailures++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveFailures);
      } else if (trace.action === 'recovery_success') {
        if (consecutiveFailures > 2) {
          patterns.failureClusters.push({
            startIndex: index - consecutiveFailures,
            count: consecutiveFailures,
            timestamp: trace.relative_time
          });
        }
        consecutiveFailures = 0;
      }
    });
    
    patterns.sequentialFailures = maxConsecutive;
    
    return patterns;
  }

  /**
   * Generate ASCII timeline graph
   */
  generateTimelineGraph(width = 60, height = 10) {
    const traces = this.dataCollector.traces;
    const effectTraces = traces.filter(t => 
      t.action === 'effect_injection' || 
      t.action === 'recovery_success' ||
      t.action === 'recovery_attempt'
    );
    
    if (effectTraces.length === 0) {
      return 'No data to display';
    }
    
    const graph = [];
    const maxTime = Math.max(...effectTraces.map(t => t.relative_time || 0));
    const timeScale = width / maxTime;
    
    // Group by effect type
    const effectTypes = {};
    effectTraces.forEach(trace => {
      const type = trace.effect_type || trace.action;
      if (!effectTypes[type]) {
        effectTypes[type] = [];
      }
      effectTypes[type].push(trace);
    });
    
    // Generate header
    graph.push('EFFECT TIMELINE:');
    graph.push('═'.repeat(width));
    
    // Generate rows for each effect type
    Object.entries(effectTypes).slice(0, height).forEach(([type, events]) => {
      let row = '';
      let lastPos = 0;
      
      events.forEach(event => {
        const pos = Math.floor((event.relative_time || 0) * timeScale);
        
        // Fill gap
        row += this.chars.empty.repeat(Math.max(0, pos - lastPos));
        
        // Add marker based on action
        if (event.action === 'effect_injection') {
          row += this.chars.shade;
        } else if (event.action === 'recovery_success') {
          row += this.chars.block;
        } else {
          row += this.chars.medium;
        }
        
        lastPos = pos + 1;
      });
      
      // Pad to width
      row = row.substring(0, width).padEnd(width, this.chars.empty);
      
      // Format type label
      const label = type.substring(0, 12).padEnd(12);
      const count = events.filter(e => e.action === 'effect_injection').length;
      const recovered = events.filter(e => e.action === 'recovery_success').length;
      const rate = count > 0 ? Math.round((recovered / count) * 100) : 0;
      
      graph.push(`${label} ${row} ${rate}%`);
    });
    
    return graph.join('\n');
  }

  /**
   * Generate ASCII success rate graph
   */
  generateSuccessRateGraph(width = 40, height = 10) {
    const metrics = this.calculateMetrics(this.dataCollector.traces);
    const graph = [];
    
    graph.push('SUCCESS RATE BY ERROR TYPE:');
    graph.push('═'.repeat(width + 20));
    
    Object.entries(metrics.errorTypes).slice(0, height).forEach(([type, data]) => {
      const rate = data.count > 0 ? (data.recovered / data.count) * 100 : 0;
      const barLength = Math.floor((rate / 100) * width);
      
      const bar = this.chars.block.repeat(barLength) + 
                  this.chars.light.repeat(width - barLength);
      
      const label = type.substring(0, 12).padEnd(12);
      graph.push(`${label} ${bar} ${rate.toFixed(0)}%`);
    });
    
    return graph.join('\n');
  }

  /**
   * Generate ASCII performance graph
   */
  generatePerformanceGraph(width = 60, height = 8) {
    const traces = this.dataCollector.traces;
    const graph = [];
    
    // Get recovery times
    const recoveryEvents = [];
    let lastFailure = null;
    
    traces.forEach(trace => {
      if (trace.action === 'effect_injection') {
        lastFailure = trace;
      } else if ((trace.action === 'recovery_success' || trace.action === 'recovery_attempt') && lastFailure) {
        const recoveryTime = trace.relative_time - lastFailure.relative_time;
        recoveryEvents.push({
          time: trace.relative_time,
          duration: recoveryTime,
          type: lastFailure.effect_type || 'unknown'
        });
        if (trace.action === 'recovery_success') {
          lastFailure = null;
        }
      }
    });
    
    if (recoveryEvents.length === 0) {
      return 'No recovery data to display';
    }
    
    graph.push('RECOVERY PERFORMANCE:');
    graph.push('═'.repeat(width));
    
    // Find max recovery time for scaling
    const maxRecovery = Math.max(...recoveryEvents.map(e => e.duration));
    const scale = height / maxRecovery;
    
    // Create time buckets
    const buckets = new Array(width).fill(0);
    const maxTime = Math.max(...recoveryEvents.map(e => e.time));
    
    recoveryEvents.forEach(event => {
      const bucket = Math.floor((event.time / maxTime) * (width - 1));
      buckets[bucket] = Math.max(buckets[bucket], event.duration);
    });
    
    // Draw graph from top to bottom
    for (let y = height - 1; y >= 0; y--) {
      let row = '';
      for (let x = 0; x < width; x++) {
        const barHeight = Math.floor(buckets[x] * scale);
        if (barHeight > y) {
          row += this.chars.block;
        } else if (barHeight === y) {
          row += this.chars.shade;
        } else {
          row += this.chars.empty;
        }
      }
      
      // Add scale label
      const scaleValue = Math.round((y / height) * maxRecovery);
      const label = y === height - 1 ? `${scaleValue}ms` : 
                    y === 0 ? '0ms' : '';
      
      graph.push(row + ' ' + label);
    }
    
    graph.push('─'.repeat(width) + ' Time →');
    
    return graph.join('\n');
  }

  /**
   * Generate resilience meter
   */
  generateResilienceMeter(score, width = 40) {
    const filled = Math.floor((score / 100) * width);
    const meter = this.chars.block.repeat(filled) + 
                  this.chars.light.repeat(width - filled);
    
    let color = 'red';
    if (score >= 80) color = 'green';
    else if (score >= 60) color = 'yellow';
    else if (score >= 40) color = 'orange';
    
    return `RESILIENCE SCORE:\n[${meter}] ${score}/100`;
  }

  /**
   * Generate comprehensive analysis report
   */
  generateAnalysisReport() {
    const analysis = this.analyzeResilience();
    const report = [];
    
    // Header
    report.push('╔═══════════════════════════════════════════════════════╗');
    report.push('║           CHAOS RESILIENCE ANALYSIS REPORT            ║');
    report.push('╚═══════════════════════════════════════════════════════╝');
    report.push('');
    
    // Overall score with meter
    report.push(this.generateResilienceMeter(analysis.overall_score));
    report.push('');
    
    // Component scores
    report.push('COMPONENT BREAKDOWN:');
    report.push('━'.repeat(50));
    report.push(`Recovery Time    ${this.generateMiniBar(analysis.components.recovery_time)} ${analysis.components.recovery_time}%`);
    report.push(`Success Rate     ${this.generateMiniBar(analysis.components.success_rate)} ${analysis.components.success_rate}%`);
    report.push(`Adaptation       ${this.generateMiniBar(analysis.components.adaptation)} ${analysis.components.adaptation}%`);
    report.push(`Robustness       ${this.generateMiniBar(analysis.components.robustness)} ${analysis.components.robustness}%`);
    report.push('');
    
    // Weaknesses
    if (analysis.weaknesses.length > 0) {
      report.push('⚠️  CRITICAL ISSUES:');
      report.push('━'.repeat(50));
      analysis.weaknesses.forEach(weakness => {
        report.push(`▶ ${weakness}`);
      });
      report.push('');
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      report.push('🔧 RECOMMENDED FIXES:');
      report.push('━'.repeat(50));
      analysis.recommendations.slice(0, 5).forEach(rec => {
        report.push(`□ ${rec}`);
      });
      report.push('');
    }
    
    // Monitoring setup
    report.push('📊 MONITORING SETUP:');
    report.push('━'.repeat(50));
    report.push(`□ Track recovery time (target: <${this.thresholds.recovery.good}ms)`);
    report.push(`□ Alert on error rate >${100 - this.thresholds.successRate.good}%`);
    report.push('□ Monitor adaptation trends');
    report.push('□ Review robustness metrics weekly');
    
    return report.join('\n');
  }

  /**
   * Generate mini progress bar for component scores
   */
  generateMiniBar(score, width = 20) {
    const filled = Math.floor((score / 100) * width);
    return this.chars.block.repeat(filled) + this.chars.light.repeat(width - filled);
  }

  /**
   * Real-time graph update for live monitoring
   */
  generateLiveMonitor(width = 60, height = 5) {
    const traces = this.dataCollector.traces.slice(-50); // Last 50 events
    const monitor = [];
    
    // Header
    monitor.push('LIVE MONITORING:');
    monitor.push('═'.repeat(width));
    
    // Calculate current metrics
    const recentMetrics = this.calculateMetrics(traces);
    const successRate = recentMetrics.totalOperations > 0 ? 
      (recentMetrics.successfulOperations / recentMetrics.totalOperations) * 100 : 0;
    
    // Status line
    const status = successRate >= 80 ? 'HEALTHY' : 
                   successRate >= 60 ? 'DEGRADED' : 'CRITICAL';
    monitor.push(`Status: ${status} | Success: ${successRate.toFixed(1)}% | Ops: ${recentMetrics.totalOperations}`);
    
    // Activity sparkline
    const sparkline = this.generateSparkline(traces, width);
    monitor.push('Activity: ' + sparkline);
    
    // Recent events
    monitor.push('Recent: ' + traces.slice(-3).map(t => 
      t.action === 'effect_injection' ? '✗' : 
      t.action === 'recovery_success' ? '✓' : '•'
    ).join(' '));
    
    return monitor.join('\n');
  }

  /**
   * Generate sparkline for activity visualization
   */
  generateSparkline(traces, width) {
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const buckets = new Array(width).fill(0);
    
    if (traces.length === 0) return blocks[0].repeat(width);
    
    const maxTime = Math.max(...traces.map(t => t.relative_time || 0));
    
    traces.forEach(trace => {
      const bucket = Math.min(width - 1, Math.floor((trace.relative_time / maxTime) * width));
      buckets[bucket]++;
    });
    
    const maxCount = Math.max(...buckets);
    
    return buckets.map(count => {
      const level = maxCount > 0 ? Math.floor((count / maxCount) * (blocks.length - 1)) : 0;
      return blocks[level];
    }).join('');
  }

  /**
   * Export analytics data
   */
  exportAnalytics(format = 'json') {
    const analysis = this.analyzeResilience();
    
    switch (format) {
      case 'json':
        return JSON.stringify(analysis, null, 2);
        
      case 'csv':
        const csv = [];
        csv.push('Metric,Value');
        csv.push(`Overall Score,${analysis.overall_score}`);
        csv.push(`Recovery Time Score,${analysis.components.recovery_time}`);
        csv.push(`Success Rate Score,${analysis.components.success_rate}`);
        csv.push(`Adaptation Score,${analysis.components.adaptation}`);
        csv.push(`Robustness Score,${analysis.components.robustness}`);
        
        Object.entries(analysis.metrics.errorTypes).forEach(([type, data]) => {
          csv.push(`${type} Count,${data.count}`);
          csv.push(`${type} Recovery Rate,${(data.recovered / data.count * 100).toFixed(1)}%`);
        });
        
        return csv.join('\n');
        
      case 'report':
        return this.generateAnalysisReport();
        
      default:
        return analysis;
    }
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChaosAnalytics;
}