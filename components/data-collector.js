// Enhanced Data Collector - Unified data collection and analytics pipeline
// Integrates with evaluation system and provides real-time analytics

class DataCollector {
  constructor() {
    this.sessions = new Map();
    this.currentSession = null;
    this.analyticsEngine = new AnalyticsEngine();
    this.exportFormats = ['json', 'csv', 'yaml', 'xml', 'markdown'];
    this.realtimeSubscribers = new Set();
    
    // Performance tracking
    this.metricsBuffer = [];
    this.bufferSize = 1000;
    this.flushInterval = 5000; // 5 seconds
    
    this.init();
  }

  init() {
    this.startPerformanceMonitoring();
    this.setupErrorHandling();
    console.log('DataCollector initialized with analytics pipeline');
  }

  // === SESSION MANAGEMENT ===
  
  createSession(sessionId = null, metadata = {}) {
    const id = sessionId || this.generateSessionId();
    const session = {
      id,
      startTime: Date.now(),
      endTime: null,
      metadata: {
        ...metadata,
        version: '2.0.0',
        collector: 'enhanced-pipeline',
        environment: this.getEnvironmentInfo()
      },
      traces: [],
      evaluations: [],
      metrics: {},
      realTimeEvents: [],
      configuration: {},
      insights: []
    };
    
    this.sessions.set(id, session);
    this.currentSession = session;
    
    // Notify real-time subscribers
    this.broadcastEvent('session_created', { sessionId: id, metadata });
    
    return session;
  }

  endSession(sessionId = null) {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession;
    if (!session) return null;

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    // Generate final analytics
    session.insights = this.analyticsEngine.generateInsights(session);
    session.metrics = this.analyticsEngine.calculateMetrics(session);
    
    this.broadcastEvent('session_completed', { sessionId: session.id, insights: session.insights });
    
    if (this.currentSession?.id === session.id) {
      this.currentSession = null;
    }
    
    return session;
  }

  // === TRACE COLLECTION ===
  
  recordTrace(traceData) {
    if (!this.currentSession) {
      this.createSession();
    }

    const trace = {
      id: this.generateTraceId(),
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      ...traceData,
      analytics: this.analyticsEngine.analyzeTrace(traceData)
    };

    this.currentSession.traces.push(trace);
    this.currentSession.realTimeEvents.push({
      type: 'trace',
      timestamp: trace.timestamp,
      data: trace
    });

    // Real-time ASCII graph updates
    if (trace.metrics) {
      this.updateRealTimeGraphs(trace);
    }

    this.broadcastEvent('trace_recorded', trace);
    return trace;
  }

  // === EVALUATION INTEGRATION ===
  
  recordEvaluation(evaluationData) {
    if (!this.currentSession) {
      this.createSession();
    }

    const evaluation = {
      id: this.generateEvaluationId(),
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      ...evaluationData,
      analytics: this.analyticsEngine.analyzeEvaluation(evaluationData)
    };

    this.currentSession.evaluations.push(evaluation);
    
    // Generate evaluation-specific insights
    if (evaluation.results) {
      const insights = this.analyticsEngine.generateEvaluationInsights(evaluation);
      this.currentSession.insights.push(...insights);
    }

    this.broadcastEvent('evaluation_recorded', evaluation);
    return evaluation;
  }

  recordEvaluationProgress(progressData) {
    if (!this.currentSession) return;

    const progressEvent = {
      type: 'evaluation_progress',
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      ...progressData
    };

    this.currentSession.realTimeEvents.push(progressEvent);
    this.broadcastEvent('evaluation_progress', progressEvent);

    // Update real-time ASCII visualization
    if (progressData.metrics) {
      this.updateRealTimeEvaluationGraphs(progressData);
    }
  }

  // === REAL-TIME ANALYTICS ===
  
  updateRealTimeGraphs(traceData) {
    if (!traceData.metrics) return;

    const ascii = this.analyticsEngine.generateRealTimeASCII(
      this.currentSession.traces,
      traceData.metrics
    );

    this.broadcastEvent('ascii_graph_update', {
      type: 'trace_graph',
      ascii,
      metrics: traceData.metrics
    });
  }

  updateRealTimeEvaluationGraphs(evaluationData) {
    const evaluationHistory = this.currentSession.evaluations;
    const ascii = this.analyticsEngine.generateEvaluationASCII(
      evaluationHistory,
      evaluationData
    );

    this.broadcastEvent('ascii_graph_update', {
      type: 'evaluation_graph', 
      ascii,
      progress: evaluationData
    });
  }

  // === RESILIENCE SCORING ===
  
  calculateResilienceScore(sessionId = null) {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession;
    if (!session) return null;

    return this.analyticsEngine.calculateResilienceScore(session);
  }

  generateResilienceInsights(sessionId = null) {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession;
    if (!session) return [];

    return this.analyticsEngine.generateResilienceInsights(session);
  }

  // === DATA EXPORT ===
  
  exportSession(sessionId, format = 'json', options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const exportData = this.prepareExportData(session, options);
    return this.formatExportData(exportData, format);
  }

  exportAllSessions(format = 'json', options = {}) {
    const allSessions = Array.from(this.sessions.values());
    const exportData = {
      metadata: {
        exportTimestamp: Date.now(),
        totalSessions: allSessions.length,
        collector: 'enhanced-pipeline',
        version: '2.0.0'
      },
      sessions: allSessions.map(session => this.prepareExportData(session, options))
    };

    return this.formatExportData(exportData, format);
  }

  prepareExportData(session, options = {}) {
    const {
      includeTraces = true,
      includeEvaluations = true,
      includeRealTimeEvents = false,
      includeAnalytics = true,
      includeInsights = true
    } = options;

    const exportData = {
      sessionInfo: {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        metadata: session.metadata
      },
      configuration: session.configuration
    };

    if (includeTraces) {
      exportData.traces = session.traces;
    }

    if (includeEvaluations) {
      exportData.evaluations = session.evaluations;
    }

    if (includeRealTimeEvents) {
      exportData.realTimeEvents = session.realTimeEvents;
    }

    if (includeAnalytics) {
      exportData.metrics = session.metrics;
      exportData.analytics = this.analyticsEngine.getSessionAnalytics(session);
    }

    if (includeInsights) {
      exportData.insights = session.insights;
      exportData.resilienceScore = this.analyticsEngine.calculateResilienceScore(session);
    }

    return exportData;
  }

  formatExportData(data, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.convertToCSV(data);
      
      case 'yaml':
        return this.convertToYAML(data);
      
      case 'xml':
        return this.convertToXML(data);
      
      case 'markdown':
        return this.convertToMarkdown(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // === REAL-TIME SUBSCRIPTIONS ===
  
  subscribe(callback) {
    this.realtimeSubscribers.add(callback);
    return () => this.realtimeSubscribers.delete(callback);
  }

  broadcastEvent(eventType, data) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data
    };

    this.realtimeSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  // === PERFORMANCE MONITORING ===
  
  startPerformanceMonitoring() {
    setInterval(() => {
      this.flushMetricsBuffer();
    }, this.flushInterval);

    // Memory usage monitoring
    setInterval(() => {
      const memoryUsage = this.getMemoryUsage();
      this.recordPerformanceMetric('memory_usage', memoryUsage);
    }, 10000);
  }

  recordPerformanceMetric(name, value) {
    this.metricsBuffer.push({
      name,
      value,
      timestamp: Date.now()
    });

    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetricsBuffer();
    }
  }

  flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;

    // Aggregate metrics and clear buffer
    const aggregatedMetrics = this.aggregateMetrics(this.metricsBuffer);
    this.metricsBuffer = [];

    if (this.currentSession) {
      this.currentSession.metrics.performance = {
        ...this.currentSession.metrics.performance,
        ...aggregatedMetrics
      };
    }

    this.broadcastEvent('performance_metrics', aggregatedMetrics);
  }

  aggregateMetrics(metrics) {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {});

    const aggregated = {};
    Object.entries(grouped).forEach(([name, values]) => {
      aggregated[name] = {
        count: values.length,
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        last: values[values.length - 1]
      };
    });

    return aggregated;
  }

  // === UTILITY METHODS ===
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateEvaluationId() {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height
      },
      timestamp: Date.now()
    };
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.recordTrace({
        type: 'error',
        tool: 'browser',
        status: 'error',
        fault: 'javascript_error',
        note: event.message,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordTrace({
        type: 'error',
        tool: 'browser',
        status: 'error', 
        fault: 'unhandled_rejection',
        note: event.reason?.toString() || 'Unknown rejection',
        metadata: {
          reason: event.reason
        }
      });
    });
  }

  // === FORMAT CONVERTERS ===
  
  convertToCSV(data) {
    if (data.sessions && Array.isArray(data.sessions)) {
      // Multi-session CSV
      let csv = 'SessionID,StartTime,Duration,TracesCount,EvaluationsCount,ResilienceScore\n';
      data.sessions.forEach(session => {
        csv += `${session.sessionInfo.id},${new Date(session.sessionInfo.startTime).toISOString()},${session.sessionInfo.duration || 0},${session.traces?.length || 0},${session.evaluations?.length || 0},${session.resilienceScore?.score || 0}\n`;
      });
      return csv;
    }

    // Single session CSV
    let csv = 'Type,Timestamp,Tool,Status,Fault,Duration,Action\n';
    if (data.traces) {
      data.traces.forEach(trace => {
        csv += `trace,${new Date(trace.timestamp).toISOString()},${trace.tool || ''},${trace.status || ''},${trace.fault || ''},${trace.duration_ms || 0},${trace.action || ''}\n`;
      });
    }
    return csv;
  }

  convertToYAML(data) {
    // Simple YAML conversion
    return this.objectToYAML(data, 0);
  }

  objectToYAML(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    let yaml = '';
    
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- ${typeof item === 'object' ? '\n' + this.objectToYAML(item, indent + 2) : item}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.objectToYAML(value, indent + 2)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      });
    }
    
    return yaml;
  }

  convertToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<chaos_data>\n';
    xml += this.objectToXML(data, 1);
    xml += '</chaos_data>';
    return xml;
  }

  objectToXML(obj, indent = 0) {
    const spaces = ' '.repeat(indent * 2);
    let xml = '';
    
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        xml += `${spaces}<item>\n${this.objectToXML(item, indent + 1)}${spaces}</item>\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        if (typeof value === 'object' && value !== null) {
          xml += `${spaces}<${safeKey}>\n${this.objectToXML(value, indent + 1)}${spaces}</${safeKey}>\n`;
        } else {
          xml += `${spaces}<${safeKey}>${this.escapeXML(String(value))}</${safeKey}>\n`;
        }
      });
    }
    
    return xml;
  }

  escapeXML(str) {
    return str.replace(/[<>&"']/g, (char) => {
      const entityMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entityMap[char];
    });
  }

  convertToMarkdown(data) {
    let md = `# Chaos Engineering Data Export\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    if (data.sessions) {
      md += `## Sessions Overview\n\n`;
      md += `Total Sessions: ${data.sessions.length}\n\n`;
      
      data.sessions.forEach(session => {
        md += `### Session ${session.sessionInfo.id}\n\n`;
        md += `- **Duration:** ${session.sessionInfo.duration || 0}ms\n`;
        md += `- **Traces:** ${session.traces?.length || 0}\n`;
        md += `- **Evaluations:** ${session.evaluations?.length || 0}\n`;
        md += `- **Resilience Score:** ${session.resilienceScore?.score || 0}%\n\n`;
      });
    } else {
      md += `## Session ${data.sessionInfo?.id}\n\n`;
      md += `- **Duration:** ${data.sessionInfo?.duration || 0}ms\n`;
      md += `- **Traces:** ${data.traces?.length || 0}\n`;
      md += `- **Evaluations:** ${data.evaluations?.length || 0}\n`;
      
      if (data.insights?.length) {
        md += `\n## Insights\n\n`;
        data.insights.forEach(insight => {
          md += `- ${insight.message}\n`;
        });
      }
    }
    
    return md;
  }

  // === API METHODS FOR INTEGRATION ===
  
  getCurrentSession() {
    return this.currentSession;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getSessionById(sessionId) {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  clearAllSessions() {
    this.sessions.clear();
    this.currentSession = null;
  }
}

// Enhanced Analytics Engine for advanced data analysis
class AnalyticsEngine {
  constructor() {
    this.patterns = new Map();
    this.benchmarks = new Map();
    this.thresholds = {
      excellentScore: 90,
      goodScore: 70,
      moderateScore: 50,
      maxMTTR: 30,
      maxErrorRate: 0.1
    };
  }

  analyzeTrace(traceData) {
    return {
      performance: this.analyzePerformance(traceData),
      reliability: this.analyzeReliability(traceData),
      patterns: this.detectPatterns(traceData),
      anomalies: this.detectAnomalies(traceData)
    };
  }

  analyzeEvaluation(evaluationData) {
    return {
      coverage: this.calculateCoverage(evaluationData),
      reliability: this.evaluateReliability(evaluationData),
      trends: this.identifyTrends(evaluationData),
      recommendations: this.generateRecommendations(evaluationData)
    };
  }

  calculateResilienceScore(session) {
    if (!session.traces?.length && !session.evaluations?.length) {
      return { score: 0, components: {}, assessment: 'insufficient_data' };
    }

    const components = {
      availability: this.calculateAvailability(session),
      performance: this.calculatePerformanceScore(session),
      reliability: this.calculateReliabilityScore(session),
      recovery: this.calculateRecoveryScore(session)
    };

    // Weighted scoring
    const weights = { availability: 0.3, performance: 0.25, reliability: 0.25, recovery: 0.2 };
    const score = Object.entries(components)
      .reduce((total, [key, value]) => total + (value * weights[key]), 0);

    const assessment = this.assessResilienceLevel(score);

    return {
      score: Math.round(score),
      components,
      assessment,
      timestamp: Date.now()
    };
  }

  generateRealTimeASCII(traces, currentMetrics) {
    if (!traces.length) return 'NO DATA';

    const maxPoints = 50;
    const recentTraces = traces.slice(-maxPoints);
    
    let ascii = 'REAL-TIME PERFORMANCE\n';
    ascii += '━'.repeat(60) + '\n';

    // Performance timeline
    const performances = recentTraces.map(t => t.duration_ms || 0);
    const maxDuration = Math.max(...performances, 1);
    
    ascii += 'RESPONSE TIMES:\n';
    performances.forEach((duration, index) => {
      const bar = Math.round((duration / maxDuration) * 20);
      const bars = '█'.repeat(bar) + '░'.repeat(20 - bar);
      ascii += `${String(index + 1).padStart(2, '0')}: ${bars} ${duration}ms\n`;
    });

    // Current status
    ascii += `\nCURRENT: ${currentMetrics.status || 'unknown'} (${currentMetrics.duration_ms || 0}ms)\n`;
    
    return ascii;
  }

  generateEvaluationASCII(evaluationHistory, currentData) {
    let ascii = 'EVALUATION PROGRESS\n';
    ascii += '━'.repeat(60) + '\n';

    if (currentData.progress) {
      const progress = Math.round(currentData.progress * 100);
      const progressBar = Math.round(progress / 2); // Scale to 50 chars
      ascii += `PROGRESS: [${'█'.repeat(progressBar)}${'░'.repeat(50 - progressBar)}] ${progress}%\n\n`;
    }

    if (currentData.currentTest) {
      ascii += `CURRENT TEST: ${currentData.currentTest.toUpperCase()}\n`;
    }

    if (currentData.metrics) {
      ascii += `SCORE: ${currentData.metrics.score || 0}%\n`;
      ascii += `SUCCESS RATE: ${(currentData.metrics.success_rate * 100).toFixed(1)}%\n`;
    }

    return ascii;
  }

  // Component analysis methods
  calculateAvailability(session) {
    const traces = session.traces || [];
    if (!traces.length) return 100;

    const totalRequests = traces.length;
    const successfulRequests = traces.filter(t => 
      t.status === 'ok' || t.status === 'recovered'
    ).length;

    return (successfulRequests / totalRequests) * 100;
  }

  calculatePerformanceScore(session) {
    const traces = session.traces || [];
    if (!traces.length) return 100;

    const durations = traces.map(t => t.duration_ms || 0);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    // Performance score inversely related to duration (lower is better)
    const performanceScore = Math.max(0, 100 - (avgDuration / this.thresholds.maxMTTR));
    return Math.min(100, performanceScore);
  }

  calculateReliabilityScore(session) {
    const traces = session.traces || [];
    if (!traces.length) return 100;

    const faultedTraces = traces.filter(t => t.fault);
    const recoveredFaults = faultedTraces.filter(t => 
      t.status === 'recovered' || t.status === 'ok'
    );

    if (faultedTraces.length === 0) return 100;
    return (recoveredFaults.length / faultedTraces.length) * 100;
  }

  calculateRecoveryScore(session) {
    const traces = session.traces || [];
    const retryTraces = traces.filter(t => t.action?.includes('retry'));
    
    if (retryTraces.length === 0) return 100;

    // Score based on recovery success rate
    const successfulRetries = retryTraces.filter(t => t.status === 'recovered');
    return (successfulRetries.length / retryTraces.length) * 100;
  }

  assessResilienceLevel(score) {
    if (score >= this.thresholds.excellentScore) return 'excellent';
    if (score >= this.thresholds.goodScore) return 'good';
    if (score >= this.thresholds.moderateScore) return 'moderate';
    return 'poor';
  }

  generateInsights(session) {
    const insights = [];
    const score = this.calculateResilienceScore(session);
    const traces = session.traces || [];

    // Performance insights
    if (traces.length > 0) {
      const avgDuration = traces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / traces.length;
      if (avgDuration > 1000) {
        insights.push({
          type: 'performance',
          severity: 'warning',
          message: `Average response time (${avgDuration.toFixed(0)}ms) exceeds recommended threshold`,
          recommendation: 'Consider optimizing slow operations or implementing caching'
        });
      }
    }

    // Reliability insights  
    const faultedTraces = traces.filter(t => t.fault);
    if (faultedTraces.length > 0) {
      const recoveryRate = (faultedTraces.filter(t => t.status === 'recovered').length / faultedTraces.length) * 100;
      if (recoveryRate < 80) {
        insights.push({
          type: 'reliability',
          severity: 'error',
          message: `Low fault recovery rate (${recoveryRate.toFixed(1)}%)`,
          recommendation: 'Improve error handling and implement better fallback mechanisms'
        });
      }
    }

    // Resilience assessment
    insights.push({
      type: 'assessment',
      severity: score.assessment === 'excellent' ? 'success' : score.assessment === 'poor' ? 'error' : 'info',
      message: `Overall resilience assessment: ${score.assessment.toUpperCase()} (${score.score}%)`,
      recommendation: this.getResilienceRecommendation(score.assessment)
    });

    return insights;
  }

  getResilienceRecommendation(assessment) {
    const recommendations = {
      excellent: 'Maintain current practices and consider stress testing with higher fault rates',
      good: 'Consider implementing additional monitoring and alerting capabilities',
      moderate: 'Focus on improving error handling, retry logic, and fallback mechanisms',
      poor: 'Immediate attention needed: implement comprehensive error handling and monitoring'
    };
    return recommendations[assessment] || 'Continue monitoring system performance';
  }

  // Additional analysis methods
  analyzePerformance(traceData) {
    return {
      responseTime: traceData.duration_ms || 0,
      category: this.categorizePerformance(traceData.duration_ms),
      trend: this.calculateTrend(traceData)
    };
  }

  analyzeReliability(traceData) {
    return {
      hasFault: !!traceData.fault,
      faultType: traceData.fault,
      recovered: traceData.status === 'recovered',
      attempts: this.extractAttempts(traceData.action)
    };
  }

  detectPatterns(traceData) {
    // Pattern detection logic
    return {
      retryPattern: this.detectRetryPattern(traceData),
      faultPattern: this.detectFaultPattern(traceData)
    };
  }

  detectAnomalies(traceData) {
    // Anomaly detection logic
    return {
      durationAnomaly: this.detectDurationAnomaly(traceData),
      statusAnomaly: this.detectStatusAnomaly(traceData)
    };
  }

  categorizePerformance(duration) {
    if (!duration) return 'unknown';
    if (duration < 100) return 'excellent';
    if (duration < 500) return 'good';
    if (duration < 1000) return 'moderate';
    return 'poor';
  }

  calculateTrend(traceData) {
    // Simple trend calculation - would need historical data for real implementation
    return 'stable';
  }

  extractAttempts(action) {
    if (!action) return 0;
    const match = action.match(/retry\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  detectRetryPattern(traceData) {
    return traceData.action?.includes('retry') ? 'exponential_backoff' : 'none';
  }

  detectFaultPattern(traceData) {
    return traceData.fault ? 'transient' : 'none';
  }

  detectDurationAnomaly(traceData) {
    const duration = traceData.duration_ms || 0;
    return duration > 5000 ? 'high_latency' : 'normal';
  }

  detectStatusAnomaly(traceData) {
    return traceData.status === 'error' && !traceData.fault ? 'unexpected_error' : 'normal';
  }

  calculateCoverage(evaluationData) {
    // Implementation for coverage calculation
    return { scenario_coverage: 100, fault_coverage: 85 };
  }

  evaluateReliability(evaluationData) {
    // Implementation for reliability evaluation
    return { score: 85, confidence: 0.9 };
  }

  identifyTrends(evaluationData) {
    // Implementation for trend identification
    return { performance: 'stable', reliability: 'improving' };
  }

  generateRecommendations(evaluationData) {
    // Implementation for recommendation generation
    return ['Improve error handling', 'Add circuit breaker pattern'];
  }

  getSessionAnalytics(session) {
    return {
      sessionDuration: session.duration || 0,
      totalTraces: session.traces?.length || 0,
      totalEvaluations: session.evaluations?.length || 0,
      faultInjectionRate: this.calculateFaultInjectionRate(session),
      recoveryRate: this.calculateRecoveryRate(session),
      averageResponseTime: this.calculateAverageResponseTime(session)
    };
  }

  calculateFaultInjectionRate(session) {
    const traces = session.traces || [];
    if (!traces.length) return 0;
    return (traces.filter(t => t.fault).length / traces.length) * 100;
  }

  calculateRecoveryRate(session) {
    const traces = session.traces || [];
    const faultedTraces = traces.filter(t => t.fault);
    if (!faultedTraces.length) return 100;
    return (faultedTraces.filter(t => t.status === 'recovered').length / faultedTraces.length) * 100;
  }

  calculateAverageResponseTime(session) {
    const traces = session.traces || [];
    if (!traces.length) return 0;
    return traces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / traces.length;
  }
}

// Initialize DataCollector
if (typeof window !== 'undefined') {
  window.DataCollector = DataCollector;
  window.AnalyticsEngine = AnalyticsEngine;
  
  // Auto-initialize enhanced data collection
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.dataCollector) {
      window.dataCollector = new DataCollector();
      console.log('✅ Enhanced Data Collector initialized');
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataCollector, AnalyticsEngine };
}