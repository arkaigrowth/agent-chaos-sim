/* Enhanced Evaluation System (evals_enhanced.js)
 * Extends original evals.js with advanced API methods for:
 * - Suite loading and validation
 * - Real-time result streaming 
 * - Comparison and reporting
 * - WebSocket integration
 * - Batch operations
 */

(function() {
  'use strict';

  // Import original functionality
  const originalEvals = window.runEvalSuite;
  
  // Enhanced evaluation system class
  class EnhancedEvaluationSystem {
    constructor() {
      this.activeStreams = new Map();
      this.resultHistory = new Map();
      this.wsConnections = new Map();
      this.batchOperations = new Map();
      this.scheduledTests = new Map();
      this.validationSchemas = this.initSchemas();
      this.progressCallbacks = new Map();
      
      // Performance metrics collection
      this.metrics = {
        totalRuns: 0,
        averageRunTime: 0,
        successRate: 0,
        errorCount: 0
      };

      this.init();
    }

    init() {
      // Initialize WebSocket server for real-time updates
      this.setupWebSocketServer();
      
      // Setup periodic cleanup of old results
      setInterval(() => this.cleanupOldResults(), 300000); // 5 minutes
      
      // Initialize storage
      this.loadStoredResults();
      
      console.log('Enhanced Evaluation System initialized');
    }

    // === SUITE LOADING AND VALIDATION ===

    /**
     * Load evaluation suite from various sources
     * @param {string|Object|URL} source - Suite source (file path, URL, or object)
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loaded and validated suite
     */
    async loadEvalSuite(source, options = {}) {
      const startTime = Date.now();
      
      try {
        let suite;
        const sourceType = this.detectSourceType(source);
        
        switch (sourceType) {
          case 'url':
            suite = await this.loadFromURL(source, options);
            break;
          case 'file':
            suite = await this.loadFromFile(source, options);
            break;
          case 'object':
            suite = source;
            break;
          case 'builtin':
            suite = this.getBuiltInSuite(source);
            break;
          default:
            throw new Error(`Unsupported source type: ${sourceType}`);
        }

        // Validate loaded suite
        const validation = await this.validateEvalSuite(suite);
        if (!validation.valid) {
          throw new Error(`Suite validation failed: ${validation.errors.join(', ')}`);
        }

        // Enhance suite with metadata
        suite._metadata = {
          loadTime: Date.now() - startTime,
          source: source,
          sourceType: sourceType,
          loadedAt: new Date().toISOString(),
          version: '1.0.0'
        };

        return suite;
      } catch (error) {
        console.error('Failed to load evaluation suite:', error);
        throw error;
      }
    }

    /**
     * Validate evaluation suite structure and content
     * @param {Object} suite - Suite to validate
     * @returns {Object} Validation result with details
     */
    async validateEvalSuite(suite) {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        details: {}
      };

      try {
        // Basic structure validation
        if (!suite || typeof suite !== 'object') {
          result.errors.push('Suite must be a valid object');
          result.valid = false;
          return result;
        }

        // Required fields
        const requiredFields = ['suite', 'cases'];
        for (const field of requiredFields) {
          if (!suite[field]) {
            result.errors.push(`Missing required field: ${field}`);
            result.valid = false;
          }
        }

        // Cases validation
        if (Array.isArray(suite.cases)) {
          for (let i = 0; i < suite.cases.length; i++) {
            const caseValidation = this.validateTestCase(suite.cases[i], i);
            if (!caseValidation.valid) {
              result.errors.push(...caseValidation.errors);
              result.valid = false;
            }
            result.warnings.push(...caseValidation.warnings);
          }
        } else if (suite.cases) {
          result.errors.push('Cases must be an array');
          result.valid = false;
        }

        // Gate validation
        if (suite.gate) {
          const gateValidation = this.validateGate(suite.gate);
          if (!gateValidation.valid) {
            result.errors.push(...gateValidation.errors);
            result.valid = false;
          }
        }

        // Schema validation
        const schemaValidation = this.validateAgainstSchema(suite);
        if (!schemaValidation.valid) {
          result.errors.push(...schemaValidation.errors);
          result.valid = false;
        }

        result.details = {
          caseCount: suite.cases?.length || 0,
          hasGate: !!suite.gate,
          estimatedRunTime: this.estimateRunTime(suite)
        };

      } catch (error) {
        result.errors.push(`Validation error: ${error.message}`);
        result.valid = false;
      }

      return result;
    }

    /**
     * Get metadata about a suite without running it
     * @param {Object} suite - Evaluation suite
     * @returns {Object} Suite metadata
     */
    getEvalSuiteMetadata(suite) {
      return {
        name: suite.suite || 'Unnamed Suite',
        description: suite.description || 'No description provided',
        version: suite.version || '1.0.0',
        author: suite.author || 'Unknown',
        caseCount: suite.cases?.length || 0,
        scenarios: [...new Set(suite.cases?.map(c => c.scenario) || [])],
        estimatedRunTime: this.estimateRunTime(suite),
        complexity: this.calculateComplexity(suite),
        requirements: this.extractRequirements(suite),
        tags: suite.tags || [],
        gate: suite.gate,
        createdAt: suite._metadata?.loadedAt || new Date().toISOString(),
        source: suite._metadata?.source || 'unknown'
      };
    }

    // === REAL-TIME STREAMING ===

    /**
     * Stream evaluation results in real-time
     * @param {Object} suite - Evaluation suite
     * @param {Object} options - Streaming options
     * @returns {AsyncGenerator} Stream of results
     */
    async* streamEvalResults(suite, options = {}) {
      const streamId = this.generateStreamId();
      const startTime = Date.now();
      
      try {
        this.activeStreams.set(streamId, {
          startTime,
          suite: suite.suite,
          status: 'running',
          progress: 0
        });

        // Yield initial status
        yield {
          type: 'start',
          streamId,
          suite: suite.suite,
          totalCases: suite.cases.length,
          timestamp: new Date().toISOString()
        };

        const results = {
          suite: suite.suite,
          started: new Date().toISOString(),
          cases: [],
          streamId
        };

        // Process each case
        for (let i = 0; i < suite.cases.length; i++) {
          const testCase = suite.cases[i];
          
          // Yield case start event
          yield {
            type: 'case_start',
            streamId,
            caseIndex: i,
            caseName: testCase.name,
            progress: (i / suite.cases.length) * 100,
            timestamp: new Date().toISOString()
          };

          try {
            const caseResult = await this.runTestCaseWithProgress(
              testCase, 
              options, 
              (progress) => {
                // Yield progress updates
                return {
                  type: 'progress',
                  streamId,
                  caseIndex: i,
                  caseProgress: progress,
                  overallProgress: ((i + progress / 100) / suite.cases.length) * 100,
                  timestamp: new Date().toISOString()
                };
              }
            );

            results.cases.push(caseResult);

            // Yield case completion
            yield {
              type: 'case_complete',
              streamId,
              caseIndex: i,
              caseResult,
              timestamp: new Date().toISOString()
            };

          } catch (error) {
            // Yield case error
            yield {
              type: 'case_error',
              streamId,
              caseIndex: i,
              error: error.message,
              timestamp: new Date().toISOString()
            };
            
            results.cases.push({
              name: testCase.name,
              error: error.message,
              passed: false
            });
          }
        }

        // Calculate final results
        results.finished = new Date().toISOString();
        results.overall_score = this.calculateOverallScore(results);
        results.passed_gate = this.evaluateGate(suite.gate, results);
        
        // Store results
        this.storeResults(streamId, results);
        
        // Yield completion
        yield {
          type: 'complete',
          streamId,
          results,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        yield {
          type: 'error',
          streamId,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      } finally {
        this.activeStreams.delete(streamId);
      }
    }

    // === COMPARISON AND ANALYSIS ===

    /**
     * Compare multiple evaluation runs
     * @param {Array} runIds - Array of run IDs to compare
     * @param {Object} options - Comparison options
     * @returns {Object} Comparison analysis
     */
    async compareEvalRuns(runIds, options = {}) {
      const runs = runIds.map(id => this.getStoredResults(id)).filter(Boolean);
      
      if (runs.length < 2) {
        throw new Error('At least 2 runs required for comparison');
      }

      const comparison = {
        runIds,
        comparedAt: new Date().toISOString(),
        baseline: runs[0], // First run as baseline
        comparisons: [],
        summary: {
          trends: {},
          improvements: [],
          regressions: [],
          stability: {}
        }
      };

      // Compare each run against baseline
      for (let i = 1; i < runs.length; i++) {
        const run = runs[i];
        const delta = this.calculateRunDelta(comparison.baseline, run);
        
        comparison.comparisons.push({
          runId: runIds[i],
          delta,
          verdict: this.assessComparison(delta)
        });
      }

      // Analyze trends
      comparison.summary.trends = this.analyzeTrends(runs);
      
      // Identify improvements and regressions
      const { improvements, regressions } = this.identifyChanges(runs);
      comparison.summary.improvements = improvements;
      comparison.summary.regressions = regressions;
      
      // Calculate stability metrics
      comparison.summary.stability = this.calculateStability(runs);

      return comparison;
    }

    /**
     * Generate comprehensive evaluation report
     * @param {string} runId - Run ID to generate report for
     * @param {Object} options - Report options
     * @returns {Object} Generated report
     */
    async generateEvalReport(runId, options = {}) {
      const format = options.format || 'comprehensive';
      const includeCharts = options.includeCharts !== false;
      const includeRecommendations = options.includeRecommendations !== false;
      
      const results = this.getStoredResults(runId);
      if (!results) {
        throw new Error(`No results found for run ID: ${runId}`);
      }

      const report = {
        metadata: {
          runId,
          generatedAt: new Date().toISOString(),
          format,
          version: '1.0.0'
        },
        executive_summary: this.generateExecutiveSummary(results),
        detailed_analysis: this.generateDetailedAnalysis(results),
        performance_metrics: this.calculatePerformanceMetrics(results),
        reliability_assessment: this.assessReliability(results),
        recommendations: includeRecommendations ? this.generateRecommendations(results) : null,
        appendices: {
          raw_data: options.includeRawData ? results : null,
          test_configuration: this.extractTestConfiguration(results),
          methodology: this.getMethodologyNotes()
        }
      };

      if (includeCharts) {
        report.visualizations = this.generateVisualizations(results);
      }

      // Export in requested format
      switch (format) {
        case 'markdown':
          return this.formatAsMarkdown(report);
        case 'json':
          return report;
        case 'html':
          return this.formatAsHTML(report);
        default:
          return report;
      }
    }

    // === WEBSOCKET INTEGRATION ===

    setupWebSocketServer() {
      // Note: In a real implementation, this would set up a proper WebSocket server
      // For browser environment, we'll simulate with EventTarget
      this.wsEventTarget = new EventTarget();
    }

    /**
     * Subscribe to real-time evaluation updates
     * @param {Function} callback - Callback for updates
     * @param {Object} filters - Event filters
     * @returns {Function} Unsubscribe function
     */
    subscribeToUpdates(callback, filters = {}) {
      const handler = (event) => {
        if (this.matchesFilters(event.detail, filters)) {
          callback(event.detail);
        }
      };

      this.wsEventTarget.addEventListener('eval_update', handler);
      
      return () => {
        this.wsEventTarget.removeEventListener('eval_update', handler);
      };
    }

    // === BATCH OPERATIONS ===

    /**
     * Run multiple evaluation suites in batch
     * @param {Array} suites - Array of suite definitions
     * @param {Object} options - Batch options
     * @returns {Promise<Array>} Array of results
     */
    async runBatchEvaluations(suites, options = {}) {
      const batchId = this.generateBatchId();
      const concurrency = options.concurrency || 1;
      const failFast = options.failFast || false;
      
      const batch = {
        id: batchId,
        startTime: Date.now(),
        suites: suites.map((suite, index) => ({
          id: `${batchId}_${index}`,
          suite,
          status: 'pending'
        })),
        results: [],
        options
      };

      this.batchOperations.set(batchId, batch);

      try {
        if (concurrency === 1) {
          // Sequential execution
          for (const item of batch.suites) {
            try {
              item.status = 'running';
              const result = await originalEvals(item.suite, options.includeBaseline);
              item.result = result;
              item.status = 'completed';
              batch.results.push(result);
            } catch (error) {
              item.error = error.message;
              item.status = 'failed';
              
              if (failFast) {
                throw error;
              }
            }
          }
        } else {
          // Parallel execution with concurrency limit
          const results = await this.runWithConcurrencyLimit(
            batch.suites.map(item => () => this.runSuiteItem(item, options)),
            concurrency
          );
          batch.results = results.filter(Boolean);
        }

        batch.endTime = Date.now();
        batch.duration = batch.endTime - batch.startTime;
        
        return {
          batchId,
          results: batch.results,
          summary: this.summarizeBatchResults(batch),
          duration: batch.duration
        };

      } catch (error) {
        batch.error = error.message;
        batch.status = 'failed';
        throw error;
      } finally {
        this.batchOperations.delete(batchId);
      }
    }

    // === SCHEDULING ===

    /**
     * Schedule evaluation to run at specified time
     * @param {Object} suite - Evaluation suite
     * @param {Date|string} scheduledTime - When to run
     * @param {Object} options - Scheduling options
     * @returns {string} Schedule ID
     */
    scheduleEvaluation(suite, scheduledTime, options = {}) {
      const scheduleId = this.generateScheduleId();
      const runTime = new Date(scheduledTime);
      
      if (runTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const schedule = {
        id: scheduleId,
        suite,
        scheduledTime: runTime,
        options,
        status: 'scheduled',
        createdAt: new Date()
      };

      this.scheduledTests.set(scheduleId, schedule);

      // Set timeout for execution
      const delay = runTime.getTime() - Date.now();
      setTimeout(() => {
        this.executeScheduledTest(scheduleId);
      }, delay);

      return scheduleId;
    }

    // === UTILITY METHODS ===

    detectSourceType(source) {
      if (typeof source === 'object') return 'object';
      if (typeof source === 'string') {
        if (source.startsWith('http')) return 'url';
        if (source.includes('/') || source.includes('\\')) return 'file';
        return 'builtin';
      }
      return 'unknown';
    }

    async loadFromURL(url, options) {
      const response = await fetch(url, {
        timeout: options.timeout || 10000,
        headers: options.headers || {}
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load from URL: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return this.parseYAML(text);
      }
    }

    async loadFromFile(filePath, options) {
      // In browser environment, this would use FileReader or similar
      throw new Error('File loading not implemented in browser environment');
    }

    getBuiltInSuite(name) {
      const builtIns = {
        'reliability_core': {
          suite: "Reliability Core",
          cases: [
            { 
              name: "Fetch: latency+500+mangle", 
              scenario: "fetch",
              seeds: ["1337"],
              faults: { 
                latency_ms: 2000, 
                latency_rate: 0.2, 
                http_500_rate: 0.1, 
                malformed_rate: 0.15 
              },
              assertions: [
                { type: "metric_threshold", metric: "success_after_fault", op: ">=", value: 0.7 },
                { type: "metric_threshold", metric: "mttr", op: "<=", value: 5.0 }
              ]
            }
          ],
          gate: { score_min: 70 }
        }
      };
      
      return builtIns[name];
    }

    validateTestCase(testCase, index) {
      const result = { valid: true, errors: [], warnings: [] };
      
      if (!testCase.name) {
        result.warnings.push(`Case ${index}: Missing name`);
      }
      
      if (!testCase.scenario) {
        result.errors.push(`Case ${index}: Missing scenario`);
        result.valid = false;
      }
      
      if (!testCase.seeds || !Array.isArray(testCase.seeds)) {
        result.errors.push(`Case ${index}: Seeds must be an array`);
        result.valid = false;
      }
      
      return result;
    }

    validateGate(gate) {
      const result = { valid: true, errors: [] };
      
      if (gate.score_min && (typeof gate.score_min !== 'number' || gate.score_min < 0 || gate.score_min > 100)) {
        result.errors.push('Gate score_min must be a number between 0 and 100');
        result.valid = false;
      }
      
      return result;
    }

    validateAgainstSchema(suite) {
      // Implement JSON Schema validation here
      return { valid: true, errors: [] };
    }

    estimateRunTime(suite) {
      if (!suite.cases) return 0;
      
      const baseTimePerCase = 5000; // 5 seconds
      const timePerSeed = 2000; // 2 seconds
      
      return suite.cases.reduce((total, testCase) => {
        const seedCount = testCase.seeds?.length || 1;
        return total + baseTimePerCase + (seedCount * timePerSeed);
      }, 0);
    }

    calculateComplexity(suite) {
      if (!suite.cases) return 'low';
      
      let complexity = 0;
      
      suite.cases.forEach(testCase => {
        complexity += testCase.seeds?.length || 1;
        complexity += Object.keys(testCase.faults || {}).length;
        complexity += testCase.assertions?.length || 0;
      });
      
      if (complexity > 50) return 'high';
      if (complexity > 20) return 'medium';
      return 'low';
    }

    extractRequirements(suite) {
      const requirements = new Set();
      
      suite.cases?.forEach(testCase => {
        if (testCase.scenario) requirements.add(`scenario:${testCase.scenario}`);
        
        Object.keys(testCase.faults || {}).forEach(fault => {
          requirements.add(`fault:${fault}`);
        });
      });
      
      return Array.from(requirements);
    }

    generateStreamId() {
      return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateBatchId() {
      return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateScheduleId() {
      return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Additional helper methods would go here...
    
    initSchemas() {
      return {
        suite: {
          type: 'object',
          required: ['suite', 'cases'],
          properties: {
            suite: { type: 'string' },
            description: { type: 'string' },
            cases: {
              type: 'array',
              items: { $ref: '#/definitions/testCase' }
            },
            gate: { $ref: '#/definitions/gate' }
          }
        }
      };
    }

    // Store and retrieve results
    storeResults(id, results) {
      this.resultHistory.set(id, {
        ...results,
        storedAt: new Date().toISOString()
      });
      
      // Also store in localStorage for persistence
      try {
        localStorage.setItem(`eval_results_${id}`, JSON.stringify(results));
      } catch (e) {
        console.warn('Failed to store results in localStorage:', e);
      }
    }

    getStoredResults(id) {
      return this.resultHistory.get(id) || this.loadFromStorage(id);
    }

    loadFromStorage(id) {
      try {
        const stored = localStorage.getItem(`eval_results_${id}`);
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        console.warn('Failed to load results from localStorage:', e);
        return null;
      }
    }

    loadStoredResults() {
      // Load any previously stored results
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('eval_results_')) {
          const id = key.replace('eval_results_', '');
          this.getStoredResults(id); // This will load it into memory
        }
      }
    }

    cleanupOldResults() {
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const cutoff = new Date(Date.now() - maxAge);
      
      for (const [id, result] of this.resultHistory.entries()) {
        if (new Date(result.storedAt) < cutoff) {
          this.resultHistory.delete(id);
          localStorage.removeItem(`eval_results_${id}`);
        }
      }
    }

    // Update metrics
    updateMetrics(duration, success) {
      this.metrics.totalRuns++;
      this.metrics.averageRunTime = (this.metrics.averageRunTime * (this.metrics.totalRuns - 1) + duration) / this.metrics.totalRuns;
      
      if (success) {
        this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalRuns - 1) + 1) / this.metrics.totalRuns;
      } else {
        this.metrics.errorCount++;
        this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalRuns - 1)) / this.metrics.totalRuns;
      }
    }
  }

  // Create global instance
  const enhancedEvals = new EnhancedEvaluationSystem();

  // Expose enhanced API
  window.enhancedEvals = enhancedEvals;
  
  // Enhanced wrapper for original runEvalSuite
  window.runEvalSuiteEnhanced = async function(suiteKeyOrObj, options = {}) {
    const suite = await enhancedEvals.loadEvalSuite(suiteKeyOrObj);
    
    if (options.stream) {
      return enhancedEvals.streamEvalResults(suite, options);
    } else {
      return originalEvals(suite, options.includeBaseline);
    }
  };

  // Backward compatibility
  const originalRunEvalSuite = window.runEvalSuite;
  window.runEvalSuite = function(suiteKeyOrObj, includeBaseline) {
    // Use original implementation for backward compatibility
    return originalRunEvalSuite(suiteKeyOrObj, includeBaseline);
  };

  console.log('Enhanced Evaluation System loaded');

})();