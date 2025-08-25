# Data Collection Architecture - Agent Chaos Monkey

## Overview

The Agent Chaos Monkey platform now features a comprehensive data collection and management system that captures every interaction, effect injection, and evaluation result for reproducible analysis. This Phase 2 implementation provides a robust foundation for advanced analytics and visualization.

## 🏗️ Core Architecture Components

### 1. DataCollector Class

The `DataCollector` class serves as the central data pipeline, providing:

**Key Features:**
- **Session Management**: UUID-based sessions with user-defined seeds for reproducibility
- **Comprehensive Logging**: Captures all user interactions, effect injections, and evaluation results  
- **High-Resolution Timestamps**: Precise timing for accurate timeline reconstruction
- **Performance Monitoring**: Tracks resource usage and operation performance
- **Real-Time Events**: Custom event system for live monitoring

**Core Methods:**
```javascript
// Session lifecycle
startSession(configuration, mode, userSeed)
endSession(summary)

// Logging operations  
logTrace(action, data)
logInteraction(elementId, interactionType, data)
logEffectInjection(effectType, target, parameters, result)
logRecoveryAttempt(strategy, success, duration, metadata)
logEvaluationResult(testCase, result, score, assertions)

// Export functionality
exportAsJSON(pretty)
exportAsCSV() 
exportAsReport()
exportAsShareableURL()
```

### 2. Standardized Trace Data Structure

All interactions are captured using a consistent JSON structure:

```json
{
  "step": 3,
  "timestamp": "2024-01-01T10:30:01.234Z",
  "relative_time": 1234.5,
  "action": "effect_injection",
  "effect_type": "inject_500_error",
  "target": "fetch_operation", 
  "parameters": {
    "rate": "50%",
    "packet_position": 23.45
  },
  "result": {
    "score_impact": -15,
    "current_score": 75
  },
  "performance_impact": -15,
  "resilience_score": 82
}
```

### 3. Export System Architecture

Four export formats provide comprehensive data access:

#### JSON Export
- **Purpose**: Full trace data for developers and automated analysis
- **Format**: Structured JSON with complete session metadata
- **Use Cases**: API integration, detailed debugging, machine learning datasets

#### CSV Export  
- **Purpose**: Tabular data for spreadsheet analysis
- **Format**: Flattened trace data with configurable columns
- **Use Cases**: Statistical analysis, reporting dashboards, data science workflows

#### Human Report
- **Purpose**: Executive summaries and stakeholder communication
- **Format**: Markdown with key metrics and insights
- **Use Cases**: Post-mortem reports, performance reviews, compliance documentation

#### Shareable URL
- **Purpose**: Session state sharing for collaboration
- **Format**: Base64-encoded compressed session data in URL parameters
- **Use Cases**: Bug reproduction, collaborative debugging, training scenarios

## 🔄 Integration with ChaosSimulator

The DataCollector seamlessly integrates with the existing ChaosSimulator class:

### Enhanced ChaosSimulator Methods

**Session Initialization:**
```javascript
run() {
  // Start data collection session
  this.currentSession = this.dataCollector.startSession({
    scenario: this.state.scenario,
    faults: this.state.faults, 
    recovery: this.state.recovery
  }, 'scenario', seed);
  
  // Log user interaction
  this.dataCollector.logInteraction('runBtn', 'click', {
    scenario_title: this.state.scenario?.title
  });
}
```

**Effect Injection Logging:**
```javascript
injectFault(type, params = {}) {
  // ... existing fault injection logic ...
  
  // Log fault injection with comprehensive metadata
  this.dataCollector.logEffectInjection(
    type,
    `packet@${this.state.packet.x.toFixed(2)}`,
    { ...params, packet_position: this.state.packet.x },
    { score_impact: -10, current_score: this.state.score }
  );
}
```

**Recovery Tracking:**
```javascript
attemptRecovery() {
  const startTime = performance.now();
  // ... existing recovery logic ...
  
  // Log recovery attempt with performance metrics
  this.dataCollector.logRecoveryAttempt(
    'auto_retry',
    true,
    performance.now() - startTime,
    {
      attempt_number: this.state.recoveryCount,
      packet_position: this.state.packet.x,
      score_recovery: 5
    }
  );
}
```

### UI Integration

**Export Controls:**
- Export panel automatically appears when session is active
- Real-time session metrics display
- One-click export to multiple formats
- Shareable URL generation with clipboard integration

**Event Listeners:**
- Parameter change tracking
- Button click logging  
- Scenario selection capture
- Performance monitoring alerts

## 📊 Performance Specifications

The data collection system is designed for minimal performance impact:

### Performance Targets
- **Collection Overhead**: <5ms per trace entry
- **Memory Usage**: <10MB for typical 30-minute sessions
- **Export Speed**: <100ms for JSON/CSV, <500ms for reports
- **UI Responsiveness**: No blocking operations, async exports

### Optimization Techniques
- **Efficient Data Structures**: Optimized for append operations
- **Batch Processing**: Group operations to minimize DOM updates
- **Memory Management**: Automatic cleanup of old traces
- **Async Operations**: Non-blocking export and compression

## 🔧 Reproducibility Features

### Seed-Based Determinism
- **User-Defined Seeds**: Custom seeds for consistent test scenarios
- **Math.random Seeding**: Deterministic random number generation
- **State Restoration**: Replay sessions with identical outcomes
- **Configuration Capture**: Complete parameter state preservation

### Session Replay Capability
```javascript
// Load session from URL
const sessionData = DataCollector.loadFromURL();
if (sessionData) {
  // Restore configuration
  this.populateUIFromConfiguration(sessionData.collector.configuration);
  
  // Enable replay mode
  this.enableReplayMode(sessionData);
}
```

## 🔍 Analysis Capabilities

### Real-Time Metrics
- **Effect Injection Rate**: Faults per minute/session
- **Recovery Success Rate**: Percentage of successful recoveries  
- **Mean Time To Recovery (MTTR)**: Average recovery duration
- **Resilience Score**: Composite performance metric
- **System Throughput**: Operations per second

### Aggregation Functions
```javascript
// Calculate session-level metrics
calculateSessionMetrics() {
  const effectTraces = this.traces.filter(t => t.action === 'effect_injection');
  const recoveryTraces = this.traces.filter(t => t.action === 'recovery_attempt');
  
  return {
    total_effects: effectTraces.length,
    recovery_rate: recoveryTraces.filter(t => t.success).length / recoveryTraces.length,
    avg_recovery_time: this.calculateAverageRecoveryTime(),
    resilience_score: this.calculateOverallResilienceScore()
  };
}
```

### Trend Analysis
- **Performance Degradation Detection**: Identify declining metrics
- **Recovery Pattern Analysis**: Success/failure clustering
- **Fault Correlation**: Effect injection impact assessment
- **Temporal Analysis**: Time-based performance trends

## 🔒 Security & Privacy

### Data Protection
- **Local Storage Only**: No external data transmission by default
- **Sensitive Data Filtering**: Automatic removal of credentials/tokens
- **Configurable Retention**: User-controlled trace cleanup
- **Export Permissions**: Controlled access to sensitive session data

### Compliance Features
- **Audit Trails**: Complete interaction history
- **Data Lineage**: Trace data provenance tracking  
- **Retention Policies**: Automatic cleanup after configurable periods
- **Access Controls**: Role-based export permissions

## 📈 Phase 3 Preparation

The current architecture provides foundation for advanced features:

### Planned Enhancements
- **Machine Learning Integration**: Pattern recognition and anomaly detection
- **Advanced Visualizations**: Interactive charts and timeline views
- **Distributed Collection**: Multi-instance aggregation
- **Real-Time Dashboards**: Live monitoring interfaces
- **Predictive Analytics**: Failure prediction and prevention

### Extension Points
```javascript
// Plugin architecture for custom analyzers
class CustomAnalyzer {
  analyze(traces) {
    // Custom analysis logic
  }
  
  generateInsights(results) {
    // Custom insight generation
  }
}

// Register analyzer
dataCollector.registerAnalyzer(new CustomAnalyzer());
```

## 🚀 Getting Started

### Basic Usage
```javascript
// Initialize data collector
const collector = new DataCollector();

// Start session
const session = collector.startSession({
  scenario: 'api_meltdown',
  faults: { latencyMs: 2000, http500Rate: 30 }
}, 'scenario', 'my-test-seed');

// Log interactions
collector.logEffectInjection('latency', 'fetch_op', { delay: 2000 });
collector.logRecoveryAttempt('retry', true, 1500);

// Export data
const jsonData = collector.exportAsJSON();
const report = collector.exportAsReport();
const shareUrl = collector.exportAsShareableURL();

// End session
const summary = collector.endSession({ final_score: 85 });
```

### Integration with Existing Systems
```javascript
// Integrate with ChaosSimulator
class EnhancedChaosSimulator extends ChaosSimulator {
  constructor() {
    super();
    this.dataCollector = new DataCollector();
  }
  
  // Override methods to add logging
  injectFault(type, params) {
    super.injectFault(type, params);
    this.dataCollector.logEffectInjection(type, 'system', params);
  }
}
```

## 📝 Configuration Options

### DataCollector Configuration
```javascript
const config = {
  maxTraces: 10000,           // Maximum traces per session
  enablePerformanceMonitoring: true,  // Performance impact tracking
  exportCompression: true,     // Compress exports for sharing
  autoCleanup: true,          // Automatic old trace cleanup
  retentionPeriod: 86400000   // 24 hours in milliseconds
};

const collector = new DataCollector(config);
```

### Export Configuration
```javascript
const exportOptions = {
  includeMetadata: true,      // Include session metadata
  prettyFormat: true,         // Pretty-print JSON
  includeTimestamps: true,    // Include all timestamp data
  filterSensitiveData: true   // Remove sensitive information
};

const data = collector.exportAsJSON(exportOptions);
```

## 🧪 Testing & Validation

### Demo Environment
- **Interactive Demo**: `data_collection_demo.html` provides comprehensive testing
- **Real-Time Validation**: Live trace visualization and metrics
- **Export Testing**: All export formats with sample data
- **Performance Benchmarking**: Execution time and resource usage monitoring

### Integration Tests
```javascript
// Test data collection accuracy
it('should capture all effect injections', () => {
  const collector = new DataCollector();
  collector.startSession({}, 'test');
  
  collector.logEffectInjection('latency', 'test_target');
  
  expect(collector.traces).toHaveLength(2); // start + injection
  expect(collector.traces[1].action).toBe('effect_injection');
});

// Test export functionality
it('should export valid JSON', () => {
  const jsonData = collector.exportAsJSON();
  const parsed = JSON.parse(jsonData);
  
  expect(parsed.session_id).toBeDefined();
  expect(parsed.traces).toBeArray();
});
```

This architecture provides a solid foundation for comprehensive agent behavior analysis while maintaining high performance and extensibility for future enhancements.