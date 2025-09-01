// Wizard Component - Step-by-step workflow management

// Helper function to safely set HTML content
function safeSetHTML(element, htmlString) {
  // Clear existing content
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  
  // Use DOMParser for complex HTML templates
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Move nodes from parsed document to target element
  while (doc.body.firstChild) {
    element.appendChild(doc.body.firstChild);
  }
}

class ChaosWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.wizardElement = document.getElementById('wizard');
    this.bodyElement = document.getElementById('wizardBody');
    this.data = {};
    
    this.init();
  }

  init() {
    // Bind wizard button
    const wizardBtn = document.getElementById('btnWizard');
    if (wizardBtn) {
      wizardBtn.addEventListener('click', () => this.show());
    }
  }

  show() {
    this.currentStep = 1;
    this.updateStepIndicator();
    this.renderStep();
    this.wizardElement.classList.remove('hidden');
  }

  hide() {
    this.wizardElement.classList.add('hidden');
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateStepIndicator();
      this.renderStep();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepIndicator();
      this.renderStep();
    }
  }

  updateStepIndicator() {
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach((step, index) => {
      if (index + 1 === this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  renderStep() {
    switch (this.currentStep) {
      case 1:
        this.renderConfigStep();
        break;
      case 2:
        this.renderBaselineStep();
        break;
      case 3:
        this.renderChaosStep();
        break;
      case 4:
        this.renderResultsStep();
        break;
    }
  }

  renderConfigStep() {
    safeSetHTML(this.bodyElement, `
      <h3>CONFIGURATION SETUP</h3>
      <p>Configure your chaos testing parameters:</p>
      
      <div class="form-group">
        <label>TEST SCENARIO</label>
        <select id="wizardScenario">
          <option value="fetch">🌐 WEB SCRAPING</option>
          <option value="rag">📚 DOCUMENT Q&A</option>
          <option value="json">🔧 API PROCESSING</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>FAILURE INTENSITY</label>
        <select id="wizardIntensity">
          <option value="low">LOW - Basic testing</option>
          <option value="medium" selected>MEDIUM - Production-like</option>
          <option value="high">HIGH - Stress testing</option>
          <option value="extreme">EXTREME - Chaos engineering</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>TEST SEED</label>
        <input type="text" id="wizardSeed" value="1337" placeholder="Reproducibility seed">
      </div>
      
      <div class="checkbox-group">
        <input type="checkbox" id="wizardRecovery" checked>
        <label for="wizardRecovery">ENABLE SMART RECOVERY</label>
      </div>
      
      <div class="btn-group">
        <button class="btn-secondary" onclick="wizard.hide()">CANCEL</button>
        <button class="btn-primary" onclick="wizard.nextStep()">NEXT →</button>
      </div>
    `);
  }

  renderBaselineStep() {
    safeSetHTML(this.bodyElement, `
      <h3>BASELINE EXECUTION</h3>
      <p>Running baseline test to establish normal performance...</p>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="wizardBaselineProgress"></div>
          <span class="progress-text" id="wizardBaselineText">0%</span>
        </div>
      </div>
      
      <div class="execution-log" id="wizardBaselineLog">
        <div class="log-line">INITIALIZING BASELINE TEST...</div>
      </div>
      
      <div class="metric-preview" id="wizardBaselineMetrics" style="display: none;">
        <div class="metric-card">
          <h4>BASELINE SCORE</h4>
          <div class="metric-value" id="wizardBaselineScore">—</div>
        </div>
      </div>
      
      <div class="btn-group">
        <button class="btn-secondary" onclick="wizard.prevStep()">← BACK</button>
        <button class="btn-primary" id="wizardBaselineBtn" onclick="wizard.runBaseline()">▶️ RUN BASELINE</button>
        <button class="btn-primary hidden" id="wizardBaselineNext" onclick="wizard.nextStep()">NEXT →</button>
      </div>
    `);
  }

  renderChaosStep() {
    safeSetHTML(this.bodyElement, `
      <h3>CHAOS EXECUTION</h3>
      <p>Running chaos test with failure injection...</p>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="wizardChaosProgress"></div>
          <span class="progress-text" id="wizardChaosText">0%</span>
        </div>
      </div>
      
      <div class="execution-log" id="wizardChaosLog">
        <div class="log-line">INITIALIZING CHAOS TEST...</div>
      </div>
      
      <div class="metric-preview" id="wizardChaosMetrics" style="display: none;">
        <div class="metric-card">
          <h4>CHAOS SCORE</h4>
          <div class="metric-value" id="wizardChaosScore">—</div>
        </div>
      </div>
      
      <div class="btn-group">
        <button class="btn-secondary" onclick="wizard.prevStep()">← BACK</button>
        <button class="btn-danger" id="wizardChaosBtn" onclick="wizard.runChaos()">⚡ RUN CHAOS</button>
        <button class="btn-primary hidden" id="wizardChaosNext" onclick="wizard.nextStep()">NEXT →</button>
      </div>
    `);
  }

  renderResultsStep() {
    const baselineScore = this.data.baselineScore || 0;
    const chaosScore = this.data.chaosScore || 0;
    const delta = chaosScore - baselineScore;
    const deltaClass = delta >= 0 ? 'status-success' : 'status-error';
    
    safeSetHTML(this.bodyElement, `
      <h3>RESULTS ANALYSIS</h3>
      <p>Test execution complete. Analysis and recommendations:</p>
      
      <div class="results-summary">
        <div class="results-panel">
          <div class="metric-card">
            <h4>BASELINE</h4>
            <div class="metric-value">${baselineScore}</div>
            <div class="metric-label">SCORE</div>
          </div>
          <div class="metric-card">
            <h4>CHAOS</h4>
            <div class="metric-value">${chaosScore}</div>
            <div class="metric-label">SCORE</div>
          </div>
          <div class="metric-card">
            <h4>DELTA</h4>
            <div class="metric-value ${deltaClass}">${delta > 0 ? '+' : ''}${delta}</div>
            <div class="metric-label">Δ SCORE</div>
          </div>
        </div>
      </div>
      
      <div class="recommendations">
        <h4>RECOMMENDATIONS:</h4>
        <ul>
          ${this.generateRecommendations(baselineScore, chaosScore)}
        </ul>
      </div>
      
      <div class="btn-group">
        <button class="btn-secondary" onclick="wizard.prevStep()">← BACK</button>
        <button class="btn-primary" onclick="wizard.exportResults()">📊 EXPORT REPORT</button>
        <button class="btn-secondary" onclick="wizard.hide()">CLOSE</button>
      </div>
    `);
  }

  generateRecommendations(baseline, chaos) {
    const delta = chaos - baseline;
    let recommendations = [];
    
    if (chaos >= 90) {
      recommendations.push('<li>✅ EXCELLENT: Agent shows enterprise-ready resilience</li>');
    } else if (chaos >= 70) {
      recommendations.push('<li>✅ GOOD: Agent handles failures well</li>');
    } else if (chaos >= 50) {
      recommendations.push('<li>⚠️ MODERATE: Consider improving error handling</li>');
    } else {
      recommendations.push('<li>❌ POOR: Significant resilience improvements needed</li>');
    }
    
    if (Math.abs(delta) <= 5) {
      recommendations.push('<li>✅ STABLE: Consistent performance under stress</li>');
    } else if (delta < -10) {
      recommendations.push('<li>⚠️ DEGRADATION: Review retry and fallback strategies</li>');
    }
    
    if (baseline < 80) {
      recommendations.push('<li>📈 BASELINE: Consider optimizing normal operation flow</li>');
    }
    
    return recommendations.join('');
  }

  async runBaseline() {
    const btn = document.getElementById('wizardBaselineBtn');
    const nextBtn = document.getElementById('wizardBaselineNext');
    const progress = document.getElementById('wizardBaselineProgress');
    const progressText = document.getElementById('wizardBaselineText');
    const log = document.getElementById('wizardBaselineLog');
    const metrics = document.getElementById('wizardBaselineMetrics');
    
    btn.disabled = true;
    btn.textContent = 'RUNNING...';
    
    try {
      // Apply wizard configuration
      this.applyWizardConfig();
      
      // Simulate progress
      const steps = [
        'READING CONFIGURATION...',
        'INITIALIZING TARGET SCENARIO...',
        'EXECUTING BASELINE RUN...',
        'COLLECTING METRICS...',
        'CALCULATING SCORE...'
      ];
      
      for (let i = 0; i < steps.length; i++) {
        const percent = ((i + 1) / steps.length) * 100;
        progress.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
        
        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        logLine.textContent = steps[i];
        log.appendChild(logLine);
        
        await this.sleep(800);
      }
      
      // Run actual baseline test
      const scenario = document.getElementById('wizardScenario').value;
      const seed = document.getElementById('wizardSeed').value;
      
      const result = await window.runScenario(scenario, seed, false);
      const score = result.metrics?.score || 0;
      
      this.data.baselineScore = score;
      this.data.baselineResult = result;
      
      // Show results
      document.getElementById('wizardBaselineScore').textContent = score;
      metrics.style.display = 'block';
      
      const logLine = document.createElement('div');
      logLine.className = 'log-line';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-success';
      statusSpan.textContent = `✅ BASELINE COMPLETE - SCORE: ${score}`;
      logLine.appendChild(statusSpan);
      log.appendChild(logLine);
      
      btn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      
    } catch (error) {
      console.error('Wizard baseline error:', error);
      const logLine = document.createElement('div');
      logLine.className = 'log-line';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-error';
      statusSpan.textContent = `❌ BASELINE FAILED: ${error.message}`;
      logLine.appendChild(statusSpan);
      log.appendChild(logLine);
      
      btn.disabled = false;
      btn.textContent = '▶️ RUN BASELINE';
    }
  }

  async runChaos() {
    const btn = document.getElementById('wizardChaosBtn');
    const nextBtn = document.getElementById('wizardChaosNext');
    const progress = document.getElementById('wizardChaosProgress');
    const progressText = document.getElementById('wizardChaosText');
    const log = document.getElementById('wizardChaosLog');
    const metrics = document.getElementById('wizardChaosMetrics');
    
    btn.disabled = true;
    btn.textContent = 'RUNNING...';
    
    try {
      // Simulate progress with chaos visualization
      const steps = [
        'READING CHAOS CONFIGURATION...',
        'INJECTING NETWORK FAULTS...',
        'EXECUTING CHAOS RUN...',
        'MONITORING RECOVERY...',
        'CALCULATING RESILIENCE SCORE...'
      ];
      
      for (let i = 0; i < steps.length; i++) {
        const percent = ((i + 1) / steps.length) * 100;
        progress.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
        
        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        logLine.textContent = steps[i];
        log.appendChild(logLine);
        
        await this.sleep(1000);
      }
      
      // Run actual chaos test
      const scenario = document.getElementById('wizardScenario').value;
      const seed = document.getElementById('wizardSeed').value;
      
      const result = await window.runScenario(scenario, seed, true);
      const score = result.metrics?.score || 0;
      
      this.data.chaosScore = score;
      this.data.chaosResult = result;
      
      // Show results
      document.getElementById('wizardChaosScore').textContent = score;
      metrics.style.display = 'block';
      
      const logLine = document.createElement('div');
      logLine.className = 'log-line';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-success';
      statusSpan.textContent = `✅ CHAOS COMPLETE - SCORE: ${score}`;
      logLine.appendChild(statusSpan);
      log.appendChild(logLine);
      
      btn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      
    } catch (error) {
      console.error('Wizard chaos error:', error);
      const logLine = document.createElement('div');
      logLine.className = 'log-line';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-error';
      statusSpan.textContent = `❌ CHAOS FAILED: ${error.message}`;
      logLine.appendChild(statusSpan);
      log.appendChild(logLine);
      
      btn.disabled = false;
      btn.textContent = '⚡ RUN CHAOS';
    }
  }

  applyWizardConfig() {
    // Apply scenario selection
    const scenario = document.getElementById('wizardScenario').value;
    const scenarioRadio = document.querySelector(`input[name="scenario"][value="${scenario}"]`);
    if (scenarioRadio) {
      scenarioRadio.checked = true;
    }
    
    // Apply intensity settings
    const intensity = document.getElementById('wizardIntensity').value;
    const intensityMappings = {
      low: { latencyMs: 1000, latencyRate: 10, http500Rate: 5, rate429: 5, malformedRate: 10 },
      medium: { latencyMs: 2000, latencyRate: 20, http500Rate: 10, rate429: 10, malformedRate: 15 },
      high: { latencyMs: 3000, latencyRate: 30, http500Rate: 20, rate429: 20, malformedRate: 25 },
      extreme: { latencyMs: 5000, latencyRate: 50, http500Rate: 30, rate429: 30, malformedRate: 35 }
    };
    
    const settings = intensityMappings[intensity];
    for (const [key, value] of Object.entries(settings)) {
      const input = document.getElementById(key);
      if (input) {
        input.value = value;
      }
    }
    
    // Apply seed
    const seed = document.getElementById('wizardSeed').value;
    const seedInput = document.getElementById('seed');
    if (seedInput) {
      seedInput.value = seed;
    }
    
    // Apply recovery settings
    const recovery = document.getElementById('wizardRecovery').checked;
    const recoveryInput = document.getElementById('tripwireOn');
    if (recoveryInput) {
      recoveryInput.checked = recovery;
    }
  }

  exportResults() {
    if (this.data.baselineResult && this.data.chaosResult) {
      const reportData = {
        timestamp: new Date().toISOString(),
        configuration: {
          scenario: document.getElementById('wizardScenario').value,
          intensity: document.getElementById('wizardIntensity').value,
          seed: document.getElementById('wizardSeed').value,
          recovery: document.getElementById('wizardRecovery').checked
        },
        baseline: this.data.baselineResult,
        chaos: this.data.chaosResult,
        analysis: {
          baselineScore: this.data.baselineScore,
          chaosScore: this.data.chaosScore,
          delta: this.data.chaosScore - this.data.baselineScore,
          recommendations: this.generateRecommendations(this.data.baselineScore, this.data.chaosScore)
        }
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chaos-lab-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize wizard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.wizard = new ChaosWizard();
});