// Results Dashboard Component - Results visualization and analysis
class ResultsDashboard {
  constructor() {
    this.currentView = 'table';
    this.lastBaselineResult = null;
    this.lastChaosResult = null;
    this.isVisualizationEnabled = true;
    
    this.init();
  }

  init() {
    this.bindEventListeners();
    this.initializeVisualization();
    this.loadPreviousResults();
  }

  bindEventListeners() {
    // View toggle buttons
    document.querySelectorAll('.view-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        if (view) {
          this.switchView(view);
        }
      });
    });

    // Download and copy buttons
    const downloadBtn = document.getElementById('btnDownload');
    const copyBtn = document.getElementById('btnCopy');
    const exportBtn = document.getElementById('btnExport');

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadResults());
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyResults());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportReport());
    }
  }

  initializeVisualization() {
    // Set default view
    this.switchView('table');
  }

  loadPreviousResults() {
    try {
      const savedBaseline = localStorage.getItem('chaoslab_last_baseline');
      const savedChaos = localStorage.getItem('chaoslab_last_chaos');

      if (savedBaseline) {
        this.lastBaselineResult = JSON.parse(savedBaseline);
      }
      if (savedChaos) {
        this.lastChaosResult = JSON.parse(savedChaos);
      }

      if (this.lastBaselineResult || this.lastChaosResult) {
        this.updateMetricsDisplay();
      }
    } catch (error) {
      console.warn('Failed to load previous results:', error);
    }
  }

  switchView(viewName) {
    // Update button states
    document.querySelectorAll('.view-toggle').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.view === viewName) {
        btn.classList.add('active');
      }
    });

    // Update view content
    document.querySelectorAll('.view-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewName;
      this.renderCurrentView();
    }
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'table':
        this.renderTableView();
        break;
      case 'json':
        this.renderJSONView();
        break;
      case 'graph':
        this.renderGraphView();
        break;
    }
  }

  renderTableView() {
    const tbody = document.getElementById('traceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Combine traces from both baseline and chaos runs
    const traces = [];
    
    if (this.lastBaselineResult?.trace) {
      this.lastBaselineResult.trace.forEach((row, index) => {
        traces.push({
          ...row,
          runType: 'BASELINE',
          step: String(index + 1).padStart(3, '0')
        });
      });
    }

    if (this.lastChaosResult?.trace) {
      this.lastChaosResult.trace.forEach((row, index) => {
        traces.push({
          ...row,
          runType: 'CHAOS',
          step: String(index + 1).padStart(3, '0')
        });
      });
    }

    if (traces.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">NO TEST DATA AVAILABLE</td></tr>';
      return;
    }

    traces.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = row.runType.toLowerCase();
      
      const fault = row.fault || 'NONE';
      const action = row.action || (row.tool ? row.tool.toUpperCase() : 'UNKNOWN');
      const duration = row.duration_ms ? `${row.duration_ms}MS` : '—';
      const status = this.formatStatus(row.status, row.fault);

      tr.innerHTML = `
        <td>${row.step} <span class="run-type">[${row.runType}]</span></td>
        <td>${row.tool?.toUpperCase() || 'UNKNOWN'}</td>
        <td class="fault-cell">${fault.toUpperCase()}</td>
        <td>${action.toUpperCase()}</td>
        <td>${duration}</td>
        <td>${status}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  renderJSONView() {
    const jsonDisplay = document.getElementById('jsonDisplay');
    if (!jsonDisplay) return;

    const data = {
      baseline: this.lastBaselineResult,
      chaos: this.lastChaosResult,
      comparison: this.generateComparison()
    };

    jsonDisplay.textContent = JSON.stringify(data, null, 2);
  }

  renderGraphView() {
    const graphDiv = document.getElementById('asciiGraph');
    if (!graphDiv) return;

    const graph = this.generateASCIIGraph();
    graphDiv.textContent = graph;
  }

  generateASCIIGraph() {
    if (!this.lastBaselineResult && !this.lastChaosResult) {
      return 'NO DATA AVAILABLE FOR VISUALIZATION';
    }

    const baselineScore = this.lastBaselineResult?.metrics?.score || 0;
    const chaosScore = this.lastChaosResult?.metrics?.score || 0;
    const maxScore = 100;

    // Create horizontal bar chart
    const barWidth = 50;
    const baselineBar = Math.round((baselineScore / maxScore) * barWidth);
    const chaosBar = Math.round((chaosScore / maxScore) * barWidth);

    let graph = 'RESILIENCE SCORE COMPARISON\n';
    graph += '━'.repeat(60) + '\n\n';
    
    // Baseline bar
    graph += `BASELINE [${baselineScore}%]\n`;
    graph += '█'.repeat(baselineBar) + '░'.repeat(barWidth - baselineBar);
    graph += ` ${baselineScore}%\n\n`;

    // Chaos bar  
    graph += `CHAOS    [${chaosScore}%]\n`;
    graph += '█'.repeat(chaosBar) + '░'.repeat(barWidth - chaosBar);
    graph += ` ${chaosScore}%\n\n`;

    // Delta
    const delta = chaosScore - baselineScore;
    const deltaSymbol = delta >= 0 ? '▲' : '▼';
    const deltaColor = delta >= 0 ? '✅' : '❌';
    
    graph += `DELTA: ${deltaColor} ${deltaSymbol} ${Math.abs(delta)}%\n\n`;

    // Timeline if available
    if (this.lastChaosResult?.trace) {
      graph += 'EXECUTION TIMELINE\n';
      graph += '─'.repeat(60) + '\n';
      
      this.lastChaosResult.trace.forEach((step, index) => {
        const symbol = this.getTimelineSymbol(step);
        const duration = step.duration_ms ? `(${step.duration_ms}ms)` : '';
        graph += `${String(index + 1).padStart(2, '0')}. ${symbol} ${step.tool} ${duration}\n`;
      });
    }

    return graph;
  }

  getTimelineSymbol(step) {
    if (step.fault) {
      switch (step.fault) {
        case 'latency_spike': return '⏳';
        case 'http_500': return '☁️';
        case 'rate_limit_429': return '⛔';
        case 'malformed_json': return '▢';
        default: return '💥';
      }
    }
    
    switch (step.status) {
      case 'ok': return '✅';
      case 'recovered': return '🔄';
      case 'error': return '❌';
      default: return '●';
    }
  }

  formatStatus(status, fault) {
    let statusClass = '';
    let statusSymbol = '';
    
    switch (status) {
      case 'ok':
        statusClass = 'status-success';
        statusSymbol = '✅';
        break;
      case 'recovered':
        statusClass = 'status-success';
        statusSymbol = '🔄';
        break;
      case 'error':
        statusClass = 'status-error';
        statusSymbol = '❌';
        break;
      default:
        statusClass = '';
        statusSymbol = '●';
    }

    const displayStatus = fault ? `${statusSymbol} ${status.toUpperCase()} (${fault})` : `${statusSymbol} ${status.toUpperCase()}`;
    return `<span class="${statusClass}">${displayStatus}</span>`;
  }

  updateResults(baselineResult, chaosResult) {
    this.lastBaselineResult = baselineResult;
    this.lastChaosResult = chaosResult;

    // Save to localStorage
    if (baselineResult) {
      localStorage.setItem('chaoslab_last_baseline', JSON.stringify(baselineResult));
    }
    if (chaosResult) {
      localStorage.setItem('chaoslab_last_chaos', JSON.stringify(chaosResult));
    }

    this.updateMetricsDisplay();
    this.renderCurrentView();
  }

  updateMetricsDisplay() {
    const baselineScore = this.lastBaselineResult?.metrics?.score || 0;
    const chaosScore = this.lastChaosResult?.metrics?.score || 0;
    const delta = chaosScore - baselineScore;

    // Update metric cards
    const baselineScoreEl = document.getElementById('baselineScore');
    const chaosScoreEl = document.getElementById('chaosScore');
    const deltaScoreEl = document.getElementById('deltaScore');

    if (baselineScoreEl) {
      baselineScoreEl.textContent = baselineScore || '—';
    }
    if (chaosScoreEl) {
      chaosScoreEl.textContent = chaosScore || '—';
    }
    if (deltaScoreEl) {
      deltaScoreEl.textContent = delta ? `${delta > 0 ? '+' : ''}${delta}` : '—';
      deltaScoreEl.className = delta >= 0 ? 'metric-value positive' : 'metric-value negative';
    }

    // Update individual score badges in main interface if they exist
    this.updateScoreBadge(baselineScore, chaosScore);
  }

  updateScoreBadge(baselineScore, chaosScore) {
    const badge = document.getElementById('scoreBadge');
    if (!badge) return;

    const currentScore = chaosScore || baselineScore || 0;
    
    // Clear existing classes
    badge.className = 'badge';
    
    // Set score display
    badge.textContent = `🎯 Resilience Score: ${currentScore}%`;
    
    // Set styling based on score
    if (currentScore >= 90) {
      badge.classList.add('score-excellent');
    } else if (currentScore >= 70) {
      badge.classList.add('score-good');
    } else if (currentScore >= 50) {
      badge.classList.add('score-moderate');
    } else {
      badge.classList.add('score-poor');
    }
  }

  generateComparison() {
    if (!this.lastBaselineResult || !this.lastChaosResult) {
      return { message: 'Insufficient data for comparison' };
    }

    const baselineMetrics = this.lastBaselineResult.metrics;
    const chaosMetrics = this.lastChaosResult.metrics;

    return {
      scores: {
        baseline: baselineMetrics?.score || 0,
        chaos: chaosMetrics?.score || 0,
        delta: (chaosMetrics?.score || 0) - (baselineMetrics?.score || 0)
      },
      performance: {
        baseline_mttr: baselineMetrics?.mttr_s || 0,
        chaos_mttr: chaosMetrics?.mttr_s || 0,
        mttr_degradation: (chaosMetrics?.mttr_s || 0) - (baselineMetrics?.mttr_s || 0)
      },
      resilience: {
        baseline_success_rate: baselineMetrics?.success_after_fault || 1,
        chaos_success_rate: chaosMetrics?.success_after_fault || 0,
        success_rate_impact: (chaosMetrics?.success_after_fault || 0) - (baselineMetrics?.success_after_fault || 1)
      },
      recovery: {
        retries: chaosMetrics?.retries || 0,
        loop_arrests: chaosMetrics?.loop_arrests || 0,
        rollbacks: chaosMetrics?.rollbacks || 0
      }
    };
  }

  downloadResults() {
    if (!this.lastBaselineResult && !this.lastChaosResult) {
      this.showNotification('❌ No results available to download');
      return;
    }

    const data = {
      timestamp: new Date().toISOString(),
      baseline: this.lastBaselineResult,
      chaos: this.lastChaosResult,
      comparison: this.generateComparison(),
      configuration: window.chaosConfig?.getCurrentConfig()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaos-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('📊 Results downloaded successfully');
  }

  copyResults() {
    if (!this.lastBaselineResult && !this.lastChaosResult) {
      this.showNotification('❌ No results available to copy');
      return;
    }

    let textContent = '';
    
    switch (this.currentView) {
      case 'table':
        textContent = this.generateTableText();
        break;
      case 'json':
        const data = {
          baseline: this.lastBaselineResult,
          chaos: this.lastChaosResult,
          comparison: this.generateComparison()
        };
        textContent = JSON.stringify(data, null, 2);
        break;
      case 'graph':
        textContent = this.generateASCIIGraph();
        break;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textContent).then(() => {
        this.showNotification('📋 Results copied to clipboard');
      }).catch(() => {
        this.fallbackCopyToClipboard(textContent);
      });
    } else {
      this.fallbackCopyToClipboard(textContent);
    }
  }

  generateTableText() {
    let text = 'CHAOS LAB TEST RESULTS\n';
    text += '═'.repeat(80) + '\n\n';

    if (this.lastBaselineResult?.metrics) {
      text += `BASELINE SCORE: ${this.lastBaselineResult.metrics.score}%\n`;
    }
    if (this.lastChaosResult?.metrics) {
      text += `CHAOS SCORE: ${this.lastChaosResult.metrics.score}%\n`;
    }
    
    const delta = (this.lastChaosResult?.metrics?.score || 0) - (this.lastBaselineResult?.metrics?.score || 0);
    text += `DELTA: ${delta > 0 ? '+' : ''}${delta}%\n\n`;

    text += 'EXECUTION TRACE:\n';
    text += '─'.repeat(80) + '\n';
    text += 'STEP | TYPE     | TOOL      | FAULT         | ACTION    | DURATION | STATUS\n';
    text += '─'.repeat(80) + '\n';

    const traces = [];
    
    if (this.lastBaselineResult?.trace) {
      this.lastBaselineResult.trace.forEach((row, index) => {
        traces.push({ ...row, runType: 'BASE', step: index + 1 });
      });
    }

    if (this.lastChaosResult?.trace) {
      this.lastChaosResult.trace.forEach((row, index) => {
        traces.push({ ...row, runType: 'CHAOS', step: index + 1 });
      });
    }

    traces.forEach(row => {
      const step = String(row.step).padStart(4, ' ');
      const type = row.runType.padEnd(8, ' ');
      const tool = (row.tool || 'unknown').padEnd(9, ' ');
      const fault = (row.fault || 'none').padEnd(13, ' ');
      const action = (row.action || row.tool || 'execute').padEnd(9, ' ');
      const duration = (row.duration_ms ? `${row.duration_ms}ms` : '—').padEnd(8, ' ');
      const status = row.status || 'unknown';
      
      text += `${step} | ${type} | ${tool} | ${fault} | ${action} | ${duration} | ${status}\n`;
    });

    return text;
  }

  exportReport() {
    if (!this.lastBaselineResult && !this.lastChaosResult) {
      this.showNotification('❌ No results available for report generation');
      return;
    }

    const report = this.generateMarkdownReport();
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaos-lab-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('📊 Report exported successfully');
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    const config = window.chaosConfig?.getCurrentConfig();
    const comparison = this.generateComparison();

    let report = `# Chaos Lab Test Report\n\n`;
    report += `**Generated:** ${timestamp}\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    
    if (comparison.scores) {
      const delta = comparison.scores.delta;
      const resilience = comparison.scores.chaos >= 70 ? 'Good' : comparison.scores.chaos >= 50 ? 'Moderate' : 'Poor';
      
      report += `- **Baseline Score:** ${comparison.scores.baseline}%\n`;
      report += `- **Chaos Score:** ${comparison.scores.chaos}%\n`;
      report += `- **Score Impact:** ${delta > 0 ? '+' : ''}${delta}%\n`;
      report += `- **Resilience Assessment:** ${resilience}\n\n`;
    }

    // Configuration
    if (config) {
      report += `## Test Configuration\n\n`;
      report += `- **Scenario:** ${config.scenario.toUpperCase()}\n`;
      report += `- **Test Seed:** ${config.seed}\n`;
      report += `- **Network Latency:** ${config.latencyMs}ms (${Math.round(config.latencyRate * 100)}% rate)\n`;
      report += `- **HTTP 500 Errors:** ${Math.round(config.http500Rate * 100)}%\n`;
      report += `- **Rate Limiting:** ${Math.round(config.rate429 * 100)}%\n`;
      report += `- **Malformed Responses:** ${Math.round(config.malformedRate * 100)}%\n`;
      report += `- **Smart Recovery:** ${config.tripwireOn ? 'Enabled' : 'Disabled'}\n`;
      report += `- **Max Retries:** ${config.maxRetries}\n\n`;
    }

    // Detailed Results
    report += `## Detailed Results\n\n`;

    if (this.lastBaselineResult?.metrics) {
      report += `### Baseline Performance\n\n`;
      const m = this.lastBaselineResult.metrics;
      report += `- **Score:** ${m.score}%\n`;
      report += `- **Success Rate:** ${(m.success_after_fault * 100).toFixed(1)}%\n`;
      report += `- **Mean Time to Recovery:** ${m.mttr_s.toFixed(2)}s\n\n`;
    }

    if (this.lastChaosResult?.metrics) {
      report += `### Chaos Test Performance\n\n`;
      const m = this.lastChaosResult.metrics;
      report += `- **Score:** ${m.score}%\n`;
      report += `- **Success Rate:** ${(m.success_after_fault * 100).toFixed(1)}%\n`;
      report += `- **Mean Time to Recovery:** ${m.mttr_s.toFixed(2)}s\n`;
      report += `- **Retries:** ${m.retries}\n`;
      report += `- **Loop Arrests:** ${m.loop_arrests}\n`;
      report += `- **Rollbacks:** ${m.rollbacks}\n\n`;
    }

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (comparison.scores) {
      const chaosScore = comparison.scores.chaos;
      const delta = comparison.scores.delta;
      
      if (chaosScore >= 90) {
        report += `✅ **Excellent Resilience** - Your agent demonstrates enterprise-ready robustness.\n\n`;
      } else if (chaosScore >= 70) {
        report += `✅ **Good Resilience** - Your agent handles most failure scenarios well.\n\n`;
      } else if (chaosScore >= 50) {
        report += `⚠️ **Moderate Resilience** - Consider improving error handling and recovery strategies.\n\n`;
      } else {
        report += `❌ **Poor Resilience** - Significant improvements needed in failure handling.\n\n`;
      }

      if (Math.abs(delta) <= 5) {
        report += `✅ **Stable Performance** - Consistent behavior under stress conditions.\n\n`;
      } else if (delta < -10) {
        report += `⚠️ **Performance Degradation** - Review retry logic and fallback mechanisms.\n\n`;
      }
    }

    // Trace Data
    if (this.lastChaosResult?.trace && this.lastChaosResult.trace.length > 0) {
      report += `## Execution Trace\n\n`;
      report += `| Step | Tool | Fault | Action | Duration | Status |\n`;
      report += `|------|------|-------|--------|----------|--------|\n`;
      
      this.lastChaosResult.trace.forEach((step, index) => {
        const stepNum = String(index + 1).padStart(2, '0');
        const tool = step.tool || 'unknown';
        const fault = step.fault || 'none';
        const action = step.action || tool;
        const duration = step.duration_ms ? `${step.duration_ms}ms` : '—';
        const status = step.status || 'unknown';
        
        report += `| ${stepNum} | ${tool} | ${fault} | ${action} | ${duration} | ${status} |\n`;
      });
    }

    report += `\n---\n\n*Report generated by Chaos Lab - Agent Resilience Tester*\n`;

    return report;
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showNotification('📋 Results copied to clipboard');
    } catch (err) {
      this.showNotification('❌ Failed to copy results');
    }
    document.body.removeChild(textArea);
  }

  showNotification(message) {
    if (window.showToast) {
      window.showToast(message);
    } else {
      console.log('ResultsDashboard:', message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.resultsDashboard = new ResultsDashboard();
});