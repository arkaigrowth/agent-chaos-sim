/* Data Schemas and Validation
 * Comprehensive schema definitions for chaos testing system
 * Includes validation utilities and data transformation helpers
 */

const DataSchemas = {
  
  // === CORE SCHEMAS ===

  SuiteDefinition: {
    type: 'object',
    required: ['suite', 'cases'],
    properties: {
      suite: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Human-readable suite name'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Suite description'
      },
      version: {
        type: 'string',
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Semantic version (e.g., 1.0.0)'
      },
      author: {
        type: 'string',
        maxLength: 100,
        description: 'Suite author'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 50
        },
        maxItems: 20,
        uniqueItems: true,
        description: 'Categorization tags'
      },
      cases: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: { $ref: '#/definitions/TestCase' },
        description: 'Test cases in this suite'
      },
      gate: {
        $ref: '#/definitions/Gate',
        description: 'Pass/fail criteria for the entire suite'
      },
      timeout: {
        type: 'integer',
        minimum: 30,
        maximum: 7200,
        description: 'Maximum execution time in seconds'
      },
      requirements: {
        type: 'object',
        properties: {
          scenarios: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['fetch', 'rag', 'json', 'custom']
            }
          },
          minAgentVersion: {
            type: 'string',
            description: 'Minimum required agent version'
          },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required agent capabilities'
          }
        }
      }
    },
    definitions: {
      TestCase: {
        type: 'object',
        required: ['name', 'scenario', 'seeds', 'faults', 'assertions'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Human-readable test case name'
          },
          description: {
            type: 'string',
            maxLength: 300,
            description: 'Test case description'
          },
          scenario: {
            type: 'string',
            enum: ['fetch', 'rag', 'json'],
            description: 'Type of scenario to test'
          },
          seeds: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 50
            },
            uniqueItems: true,
            description: 'Random seeds for reproducible tests'
          },
          faults: { $ref: '#/definitions/FaultConfiguration' },
          assertions: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: { $ref: '#/definitions/Assertion' }
          },
          timeout: {
            type: 'integer',
            minimum: 5,
            maximum: 600,
            description: 'Case-specific timeout in seconds'
          },
          retries: {
            type: 'integer',
            minimum: 0,
            maximum: 5,
            default: 0,
            description: 'Number of retries on failure'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
            description: 'Test case priority'
          }
        }
      },

      FaultConfiguration: {
        type: 'object',
        properties: {
          // Network faults
          latency_ms: {
            type: 'integer',
            minimum: 0,
            maximum: 60000,
            description: 'Additional latency in milliseconds'
          },
          latency_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of latency injection (0-1)'
          },
          
          // HTTP error faults
          http_500_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of HTTP 500 errors (0-1)'
          },
          http_timeout_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of request timeouts (0-1)'
          },
          
          // Rate limiting faults
          rate_429: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of HTTP 429 rate limit errors (0-1)'
          },
          
          // Data corruption faults
          malformed_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of malformed responses (0-1)'
          },
          truncation_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability of truncated responses (0-1)'
          },
          
          // RAG-specific faults
          inj_seed: {
            type: 'string',
            maxLength: 100,
            description: 'RAG injection payload identifier'
          },
          ctx_bytes: {
            type: 'integer',
            minimum: 0,
            maximum: 100000,
            description: 'Context truncation size in bytes'
          },
          
          // Custom fault parameters
          custom_faults: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' }
                ]
              }
            },
            description: 'Custom fault parameters'
          }
        }
      },

      Assertion: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: [
              'metric_threshold',
              'event_count',
              'answer_match',
              'score_threshold',
              'success_rate',
              'recovery_time',
              'no_sensitive_leak',
              'graceful_degradation',
              'backoff_pattern',
              'eventual_success',
              'no_infinite_retry',
              'custom'
            ],
            description: 'Type of assertion to evaluate'
          }
        },
        allOf: [
          {
            if: { properties: { type: { const: 'metric_threshold' } } },
            then: {
              required: ['metric', 'op', 'value'],
              properties: {
                metric: {
                  type: 'string',
                  enum: ['success_after_fault', 'mttr', 'mttr_s', 'score', 'error_rate', 'latency_p95'],
                  description: 'Metric to evaluate'
                },
                op: {
                  type: 'string',
                  enum: ['>=', '<=', '>', '<', '==', '!='],
                  description: 'Comparison operator'
                },
                value: {
                  type: 'number',
                  description: 'Expected value for comparison'
                }
              }
            }
          },
          {
            if: { properties: { type: { const: 'event_count' } } },
            then: {
              required: ['event'],
              properties: {
                event: {
                  type: 'string',
                  description: 'Event type to count'
                },
                min: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Minimum expected count'
                },
                max: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Maximum expected count'
                }
              }
            }
          },
          {
            if: { properties: { type: { const: 'answer_match' } } },
            then: {
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['q'],
                    properties: {
                      q: { type: 'string', description: 'Question to ask' },
                      expect_regex: { type: 'string', description: 'Expected regex pattern in answer' },
                      expect_not_regex: { type: 'string', description: 'Pattern that should NOT appear' }
                    }
                  }
                }
              }
            }
          },
          {
            if: { properties: { type: { const: 'custom' } } },
            then: {
              required: ['evaluator'],
              properties: {
                evaluator: {
                  type: 'string',
                  description: 'Custom JavaScript evaluator function'
                },
                parameters: {
                  type: 'object',
                  description: 'Parameters for custom evaluator'
                }
              }
            }
          }
        ]
      },

      Gate: {
        type: 'object',
        properties: {
          score_min: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Minimum required average score'
          },
          pass_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Minimum required pass rate (0-1)'
          },
          critical_failures: {
            type: 'integer',
            minimum: 0,
            description: 'Maximum allowed critical failures'
          },
          performance_threshold: {
            type: 'object',
            properties: {
              max_avg_duration: {
                type: 'number',
                minimum: 0,
                description: 'Maximum allowed average duration in seconds'
              },
              max_p95_duration: {
                type: 'number',
                minimum: 0,
                description: 'Maximum allowed P95 duration in seconds'
              }
            }
          }
        }
      }
    }
  },

  // === RESULT SCHEMAS ===

  EvaluationResult: {
    type: 'object',
    required: ['suite', 'started', 'cases'],
    properties: {
      runId: {
        type: 'string',
        pattern: '^[a-zA-Z0-9_-]+$',
        description: 'Unique run identifier'
      },
      suite: {
        type: 'string',
        description: 'Suite name'
      },
      started: {
        type: 'string',
        format: 'date-time',
        description: 'Run start timestamp'
      },
      finished: {
        type: 'string',
        format: 'date-time',
        description: 'Run completion timestamp'
      },
      duration: {
        type: 'number',
        minimum: 0,
        description: 'Total duration in seconds'
      },
      overall_score: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Overall evaluation score'
      },
      passed_gate: {
        type: 'boolean',
        description: 'Whether the run passed gate criteria'
      },
      environment: {
        type: 'object',
        properties: {
          agent_version: { type: 'string' },
          platform: { type: 'string' },
          runtime: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      cases: {
        type: 'array',
        items: { $ref: '#/definitions/CaseResult' }
      },
      summary: {
        type: 'object',
        properties: {
          total_cases: { type: 'integer', minimum: 0 },
          passed_cases: { type: 'integer', minimum: 0 },
          failed_cases: { type: 'integer', minimum: 0 },
          average_score: { type: 'number', minimum: 0, maximum: 100 },
          total_assertions: { type: 'integer', minimum: 0 },
          passed_assertions: { type: 'integer', minimum: 0 },
          failed_assertions: { type: 'integer', minimum: 0 }
        }
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about the run'
      }
    },
    definitions: {
      CaseResult: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          scenario: { type: 'string', enum: ['fetch', 'rag', 'json'] },
          started: { type: 'string', format: 'date-time' },
          finished: { type: 'string', format: 'date-time' },
          duration: { type: 'number', minimum: 0 },
          runs: {
            type: 'array',
            items: { $ref: '#/definitions/SeedResult' }
          },
          scoreAvg: { type: 'number', minimum: 0, maximum: 100 },
          pass: { type: 'boolean' },
          errors: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      SeedResult: {
        type: 'object',
        properties: {
          seed: { type: 'string' },
          started: { type: 'string', format: 'date-time' },
          finished: { type: 'string', format: 'date-time' },
          duration: { type: 'number', minimum: 0 },
          metrics: {
            type: 'object',
            properties: {
              score: { type: 'number', minimum: 0, maximum: 100 },
              mttr: { type: 'number', minimum: 0 },
              mttr_s: { type: 'number', minimum: 0 },
              success_after_fault: { type: 'number', minimum: 0, maximum: 1 },
              error_rate: { type: 'number', minimum: 0, maximum: 1 },
              latency_p95: { type: 'number', minimum: 0 },
              recovery_attempts: { type: 'integer', minimum: 0 },
              total_operations: { type: 'integer', minimum: 0 },
              successful_operations: { type: 'integer', minimum: 0 }
            }
          },
          baseline: {
            type: 'object',
            properties: {
              score: { type: 'number', minimum: 0, maximum: 100 },
              mttr: { type: 'number', minimum: 0 }
            }
          },
          assertions: {
            type: 'array',
            items: { $ref: '#/definitions/AssertionResult' }
          },
          trace: {
            type: 'array',
            items: { $ref: '#/definitions/TraceEvent' }
          },
          pass: { type: 'boolean' }
        }
      },
      AssertionResult: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          passed: { type: 'boolean' },
          expected: { type: ['string', 'number', 'boolean'] },
          actual: { type: ['string', 'number', 'boolean'] },
          message: { type: 'string' },
          details: { type: 'object' }
        }
      },
      TraceEvent: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          type: { type: 'string' },
          action: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'error', 'timeout', 'recovered'] },
          duration_ms: { type: 'number', minimum: 0 },
          fault_injected: { type: 'string' },
          note: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  },

  // === API REQUEST/RESPONSE SCHEMAS ===

  RunRequest: {
    type: 'object',
    required: ['suiteId'],
    properties: {
      suiteId: {
        type: 'string',
        minLength: 1,
        description: 'ID of suite to run'
      },
      includeBaseline: {
        type: 'boolean',
        default: false,
        description: 'Whether to run baseline tests'
      },
      options: {
        type: 'object',
        properties: {
          timeout: {
            type: 'integer',
            minimum: 30,
            maximum: 7200,
            description: 'Maximum execution time in seconds'
          },
          concurrency: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            default: 1,
            description: 'Concurrent test execution limit'
          },
          retryPolicy: {
            type: 'object',
            properties: {
              maxRetries: { type: 'integer', minimum: 0, maximum: 5 },
              retryDelay: { type: 'integer', minimum: 100, maximum: 30000 }
            }
          },
          environment: {
            type: 'object',
            description: 'Environment-specific configuration'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for this run'
          }
        }
      }
    }
  },

  BatchRunRequest: {
    type: 'object',
    required: ['suites'],
    properties: {
      suites: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          oneOf: [
            { type: 'string' },
            { $ref: '#/definitions/BatchSuiteRequest' }
          ]
        }
      },
      concurrency: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        default: 1,
        description: 'Maximum concurrent suite runs'
      },
      failFast: {
        type: 'boolean',
        default: false,
        description: 'Stop batch on first failure'
      },
      includeBaseline: {
        type: 'boolean',
        default: false,
        description: 'Run baseline tests for all suites'
      },
      timeout: {
        type: 'integer',
        minimum: 60,
        maximum: 28800,
        description: 'Maximum batch execution time in seconds'
      }
    },
    definitions: {
      BatchSuiteRequest: {
        type: 'object',
        required: ['suiteId'],
        properties: {
          suiteId: { type: 'string' },
          priority: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            default: 5
          },
          options: { $ref: '#/definitions/RunOptions' }
        }
      },
      RunOptions: {
        type: 'object',
        properties: {
          includeBaseline: { type: 'boolean' },
          timeout: { type: 'integer' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },

  // === COMPARISON AND ANALYSIS SCHEMAS ===

  ComparisonResult: {
    type: 'object',
    properties: {
      comparisonId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      runIds: {
        type: 'array',
        items: { type: 'string' }
      },
      baseline: { type: 'string', description: 'Baseline run ID' },
      comparisons: {
        type: 'array',
        items: { $ref: '#/definitions/RunComparison' }
      },
      summary: {
        type: 'object',
        properties: {
          trends: {
            type: 'object',
            properties: {
              score: { type: 'string', enum: ['improving', 'stable', 'declining'] },
              reliability: { type: 'string', enum: ['improving', 'stable', 'declining'] },
              performance: { type: 'string', enum: ['improving', 'stable', 'declining'] }
            }
          },
          improvements: {
            type: 'array',
            items: { type: 'string' }
          },
          regressions: {
            type: 'array',
            items: { type: 'string' }
          },
          stability: {
            type: 'object',
            properties: {
              coefficient: { type: 'number', minimum: 0, maximum: 1 },
              assessment: { type: 'string', enum: ['stable', 'variable', 'unstable'] }
            }
          }
        }
      }
    },
    definitions: {
      RunComparison: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          delta: {
            type: 'object',
            properties: {
              scoreChange: { type: 'number' },
              mttrChange: { type: 'number' },
              reliabilityChange: { type: 'number' },
              performanceChange: { type: 'number' }
            }
          },
          verdict: {
            type: 'string',
            enum: ['significant_improvement', 'improvement', 'stable', 'regression', 'significant_regression']
          },
          significance: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Statistical significance of changes'
          }
        }
      }
    }
  },

  // === ERROR RESPONSE SCHEMA ===

  ErrorResponse: {
    type: 'object',
    required: ['error', 'message'],
    properties: {
      error: {
        type: 'boolean',
        const: true
      },
      code: {
        type: 'string',
        enum: [
          'VALIDATION_ERROR',
          'SUITE_NOT_FOUND',
          'RUN_NOT_FOUND',
          'NETWORK_ERROR',
          'TIMEOUT_ERROR',
          'EXECUTION_ERROR',
          'STORAGE_ERROR',
          'AUTHORIZATION_ERROR',
          'RATE_LIMIT_ERROR',
          'INTERNAL_ERROR'
        ]
      },
      message: {
        type: 'string',
        description: 'Human-readable error message'
      },
      details: {
        type: 'object',
        description: 'Additional error details'
      },
      timestamp: {
        type: 'string',
        format: 'date-time'
      },
      requestId: {
        type: 'string',
        description: 'Request ID for debugging'
      }
    }
  }
};

// === VALIDATION UTILITIES ===

class SchemaValidator {
  constructor() {
    this.schemas = DataSchemas;
  }

  /**
   * Validate data against a schema
   * @param {Object} data - Data to validate
   * @param {string} schemaName - Name of schema to validate against
   * @returns {Object} Validation result
   */
  validate(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown schema: ${schemaName}`]
      };
    }

    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      this.validateAgainstSchema(data, schema, '', result);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  validateAgainstSchema(data, schema, path, result) {
    // Type validation
    if (schema.type) {
      const actualType = this.getType(data);
      if (actualType !== schema.type) {
        result.errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        result.valid = false;
        return;
      }
    }

    // Required properties
    if (schema.required && schema.type === 'object') {
      for (const prop of schema.required) {
        if (!(prop in data)) {
          result.errors.push(`${path}: Missing required property '${prop}'`);
          result.valid = false;
        }
      }
    }

    // Object properties
    if (schema.properties && schema.type === 'object') {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in data) {
          this.validateAgainstSchema(
            data[prop], 
            propSchema, 
            path ? `${path}.${prop}` : prop, 
            result
          );
        }
      }
    }

    // Array items
    if (schema.items && schema.type === 'array' && Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        this.validateAgainstSchema(
          data[i], 
          schema.items, 
          `${path}[${i}]`, 
          result
        );
      }
    }

    // String constraints
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.minLength && data.length < schema.minLength) {
        result.errors.push(`${path}: String too short (min: ${schema.minLength})`);
        result.valid = false;
      }
      if (schema.maxLength && data.length > schema.maxLength) {
        result.errors.push(`${path}: String too long (max: ${schema.maxLength})`);
        result.valid = false;
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        result.errors.push(`${path}: String does not match pattern ${schema.pattern}`);
        result.valid = false;
      }
      if (schema.enum && !schema.enum.includes(data)) {
        result.errors.push(`${path}: Value must be one of: ${schema.enum.join(', ')}`);
        result.valid = false;
      }
    }

    // Number constraints
    if (schema.type === 'number' && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        result.errors.push(`${path}: Value too small (min: ${schema.minimum})`);
        result.valid = false;
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        result.errors.push(`${path}: Value too large (max: ${schema.maximum})`);
        result.valid = false;
      }
    }

    // Array constraints
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.minItems && data.length < schema.minItems) {
        result.errors.push(`${path}: Too few items (min: ${schema.minItems})`);
        result.valid = false;
      }
      if (schema.maxItems && data.length > schema.maxItems) {
        result.errors.push(`${path}: Too many items (max: ${schema.maxItems})`);
        result.valid = false;
      }
      if (schema.uniqueItems) {
        const uniqueItems = new Set(data.map(item => JSON.stringify(item)));
        if (uniqueItems.size !== data.length) {
          result.errors.push(`${path}: Array items must be unique`);
          result.valid = false;
        }
      }
    }
  }

  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Get list of available schemas
   * @returns {Array} List of schema names
   */
  getSchemaNames() {
    return Object.keys(this.schemas);
  }

  /**
   * Get schema definition
   * @param {string} schemaName - Name of schema
   * @returns {Object} Schema definition
   */
  getSchema(schemaName) {
    return this.schemas[schemaName];
  }
}

// === DATA TRANSFORMATION UTILITIES ===

class DataTransformer {
  
  /**
   * Transform suite definition for API compatibility
   * @param {Object} suite - Suite definition
   * @returns {Object} Transformed suite
   */
  static transformSuiteForAPI(suite) {
    return {
      ...suite,
      id: suite.id || this.generateSuiteId(suite),
      createdAt: suite.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...suite.metadata,
        caseCount: suite.cases?.length || 0,
        scenarios: [...new Set(suite.cases?.map(c => c.scenario) || [])],
        complexity: this.calculateComplexity(suite)
      }
    };
  }

  /**
   * Transform evaluation result for storage
   * @param {Object} result - Raw evaluation result
   * @returns {Object} Transformed result
   */
  static transformResultForStorage(result) {
    return {
      ...result,
      id: result.runId || this.generateRunId(),
      storedAt: new Date().toISOString(),
      summary: this.calculateSummary(result),
      metadata: {
        ...result.metadata,
        version: '1.0.0',
        format: 'chaos_testing_result'
      }
    };
  }

  static generateSuiteId(suite) {
    const name = suite.suite?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unnamed';
    const timestamp = Date.now().toString(36);
    return `${name}_${timestamp}`;
  }

  static generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static calculateComplexity(suite) {
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

  static calculateSummary(result) {
    const cases = result.cases || [];
    const totalCases = cases.length;
    const passedCases = cases.filter(c => c.pass).length;
    const failedCases = totalCases - passedCases;

    const allAssertions = cases.flatMap(c => 
      c.runs?.flatMap(r => r.assertions || []) || []
    );
    const totalAssertions = allAssertions.length;
    const passedAssertions = allAssertions.filter(a => a.passed).length;

    return {
      total_cases: totalCases,
      passed_cases: passedCases,
      failed_cases: failedCases,
      pass_rate: totalCases > 0 ? passedCases / totalCases : 0,
      total_assertions: totalAssertions,
      passed_assertions: passedAssertions,
      failed_assertions: totalAssertions - passedAssertions,
      assertion_pass_rate: totalAssertions > 0 ? passedAssertions / totalAssertions : 0,
      average_score: result.overall_score || 0
    };
  }
}

// Export schemas and utilities
if (typeof window !== 'undefined') {
  window.DataSchemas = DataSchemas;
  window.SchemaValidator = SchemaValidator;
  window.DataTransformer = DataTransformer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DataSchemas,
    SchemaValidator,
    DataTransformer
  };
}