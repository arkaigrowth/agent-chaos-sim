# Agent Chaos Monkey - Analytics & Visualization System

## Overview

The Analytics & Visualization System transforms raw chaos testing data into actionable insights through terminal-compatible ASCII graphics and intelligent resilience scoring. This system provides real-time monitoring, comprehensive analysis, and actionable recommendations for improving AI agent resilience.

## Components

### 1. **chaos_analytics.js** - Core Analytics Engine
The main analytics library that provides:
- Resilience scoring algorithm
- ASCII graph generation
- Pattern detection
- Actionable insights generation
- Export capabilities

### 2. **chaos_analytics_integration.html** - Analytics Dashboard
A standalone dashboard featuring:
- Real-time score cards
- Multiple ASCII visualizations
- Live monitoring mode
- Insights and recommendations panel
- Export functionality

### 3. **test_analytics.html** - Test Harness
A testing interface for:
- Simulating different chaos scenarios
- Testing visualization components
- Validating export formats
- Performance testing

## Features

### ASCII Visualizations

#### Timeline Graph
Shows the temporal distribution of effects and recoveries:
```
EFFECT TIMELINE:
════════════════════════════════════════════════════════════
500_error    ▓··█···▓···█·············▓█··········· 75%
rate_limit   ····▓█·····▓······█······▓··········· 60%
timeout      ·······▓█········▓····█·············· 80%
```

#### Success Rate Graph
Displays recovery rates by error type:
```
SUCCESS RATE BY ERROR TYPE:
════════════════════════════════════════════════════════════
500_error    ████████████████████████████░░░░░░░░░░ 70%
rate_limit   ████████████████░░░░░░░░░░░░░░░░░░░░░░ 40%
timeout      ████████████████████████████████░░░░░░ 85%
malformed    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 30%
```

#### Performance Graph
Shows recovery time trends over the session:
```
RECOVERY PERFORMANCE:
════════════════════════════════════════════════════════════
█···········································█······· 2500ms
█▓··········································█·······
██▓·······················▓·················█▓······
███▓·····················██▓···············███▓·····
████▓··················▓████▓·············█████▓···· 
█████▓················███████▓···········███████▓··· 0ms
──────────────────────────────────────────────────── Time →
```

#### Resilience Meter
Overall system health indicator:
```
RESILIENCE SCORE:
[████████████████████████████░░░░░░░░░░] 73/100
```

### Resilience Scoring Algorithm

The scoring system evaluates four key components:

1. **Recovery Time (40% weight)**
   - Measures how quickly the agent recovers from failures
   - Thresholds: Excellent <500ms, Good <1000ms, Poor <2000ms

2. **Success Rate (30% weight)**
   - Percentage of successful operations under stress
   - Thresholds: Excellent >95%, Good >80%, Poor >60%

3. **Adaptation (20% weight)**
   - How well the agent improves over time
   - Measured by comparing recent vs earlier success rates

4. **Robustness (10% weight)**
   - Consistency across different failure types
   - Lower variance = higher robustness score

### Actionable Insights

The system generates prioritized recommendations based on detected weaknesses:

```
⚠️ CRITICAL ISSUES:
▶ Slow recovery time (1823ms avg)
▶ Poor rate_limit recovery (45%)
▶ Limited learning/adaptation capability

🔧 RECOMMENDED FIXES:
□ Implement circuit breaker pattern (+20 points)
□ Add exponential backoff strategy (+15 points)
□ Implement rate limit detection (+15 points)
□ Add request queuing and throttling (+12 points)
□ Enhance error handling coverage (+12 points)
```

## Usage

### Basic Integration

```javascript
// Include the analytics library
<script src="chaos_analytics.js"></script>

// Initialize with DataCollector
const analytics = new ChaosAnalytics(dataCollector);

// Generate analysis
const analysis = analytics.analyzeResilience();
console.log(`Overall Score: ${analysis.overall_score}/100`);

// Generate visualizations
const timeline = analytics.generateTimelineGraph();
const successRate = analytics.generateSuccessRateGraph();
const performance = analytics.generatePerformanceGraph();
const meter = analytics.generateResilienceMeter(analysis.overall_score);

// Export results
const jsonExport = analytics.exportAnalytics('json');
const csvExport = analytics.exportAnalytics('csv');
const reportExport = analytics.exportAnalytics('report');
```

### Live Monitoring

```javascript
// Generate live monitor display
const liveMonitor = analytics.generateLiveMonitor();

// Update in real-time
setInterval(() => {
  const monitor = analytics.generateLiveMonitor();
  updateDisplay(monitor);
}, 1000);
```

### Dashboard Usage

1. Open `chaos_analytics_integration.html` in a browser
2. The dashboard can run standalone with demo data or integrate with the main chaos testing system
3. Use the control buttons to:
   - Refresh analytics
   - Toggle live mode
   - Export reports in various formats
   - Clear data

### Testing

1. Open `test_analytics.html` in a browser
2. Run different chaos simulations:
   - Light Chaos: Few errors, high recovery
   - Moderate Chaos: Balanced scenario
   - Heavy Chaos: Many errors, lower recovery
   - Catastrophic: System under extreme stress
   - Adaptive: Agent that improves over time
3. Test individual visualizations
4. Validate export formats

## Performance Metrics

- Graph generation: <50ms for real-time updates
- Analysis computation: <100ms for full analysis
- Memory efficient: Reuses canvas elements
- Terminal-compatible: No external dependencies

## Export Formats

### JSON
Complete analysis data with all metrics, scores, and recommendations.

### CSV
Tabular format suitable for spreadsheet analysis:
```csv
Metric,Value
Overall Score,73
Recovery Time Score,85
Success Rate Score,70
Adaptation Score,60
Robustness Score,75
```

### Report
Human-readable terminal report with visualizations and insights.

## Customization

### Thresholds
Modify scoring thresholds in the ChaosAnalytics constructor:

```javascript
this.thresholds = {
  recovery: { excellent: 500, good: 1000, poor: 2000 },
  successRate: { excellent: 95, good: 80, poor: 60 },
  adaptation: { excellent: 20, good: 10, poor: 5 },
  robustness: { excellent: 90, good: 75, poor: 50 }
};
```

### ASCII Characters
Customize visualization characters:

```javascript
this.chars = {
  block: '█',
  shade: '▓',
  medium: '▒',
  light: '░',
  empty: '·'
};
```

### Colors
Maintain terminal green theme or customize:

```javascript
this.colors = {
  green: '#00ff41',
  yellow: '#ffff00',
  orange: '#ffaa00',
  red: '#ff4444'
};
```

## Integration with Main System

To integrate with `claude_prototype_enhanced.html`:

1. Include the analytics script
2. Pass the DataCollector instance to ChaosAnalytics
3. Call analytics methods during or after chaos testing
4. Display results in the terminal interface

```javascript
// In main chaos testing system
const analytics = new ChaosAnalytics(this.dataCollector);

// After simulation
const report = analytics.generateAnalysisReport();
this.displayInTerminal(report);
```

## Future Enhancements

- [ ] Machine learning for pattern recognition
- [ ] Predictive failure analysis
- [ ] Comparative analysis between sessions
- [ ] Custom metric definitions
- [ ] Real-time alerting system
- [ ] Integration with monitoring platforms
- [ ] Historical trend analysis
- [ ] Team collaboration features

## License

Part of the Agent Chaos Monkey project - Terminal-based chaos engineering for AI agents.