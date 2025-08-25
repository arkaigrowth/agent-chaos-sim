// Chaos Configuration Component - Parameter management and preset handling
class ChaosConfig {
  constructor() {
    this.presets = {
      quick: {
        name: 'Quick Test',
        latencyMs: 1000,
        latencyRate: 15,
        http500Rate: 5,
        rate429: 5,
        malformedRate: 10,
        maxRetries: 2,
        backoffBase: 200
      },
      network: {
        name: 'Network Chaos',
        latencyMs: 3000,
        latencyRate: 40,
        http500Rate: 20,
        rate429: 25,
        malformedRate: 10,
        maxRetries: 3,
        backoffBase: 500
      },
      heavy: {
        name: 'Heavy Load',
        latencyMs: 2500,
        latencyRate: 30,
        http500Rate: 15,
        rate429: 35,
        malformedRate: 20,
        maxRetries: 4,
        backoffBase: 300
      },
      full: {
        name: 'Full Chaos',
        latencyMs: 4000,
        latencyRate: 50,
        http500Rate: 25,
        rate429: 30,
        malformedRate: 30,
        maxRetries: 5,
        backoffBase: 400
      }
    };

    this.init();
  }

  init() {
    this.bindEventListeners();
    this.loadSavedConfig();
    this.setupValidation();
  }

  bindEventListeners() {
    // Preset buttons (if they exist in the interface)
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        if (preset && this.presets[preset]) {
          this.applyPreset(preset);
        }
      });
    });

    // Share configuration button
    const shareBtn = document.getElementById('btnPermalink');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareConfiguration());
    }

    // Replay button
    const replayBtn = document.getElementById('btnReplay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.replayLastTest());
    }

    // Auto-save configuration changes
    this.setupAutoSave();
  }

  setupAutoSave() {
    const inputs = [
      'latencyMs', 'latencyRate', 'http500Rate', 'rate429', 'malformedRate',
      'maxRetries', 'backoffBase', 'backoffFactor', 'jitter', 'seed'
    ];

    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('change', () => this.saveCurrentConfig());
        input.addEventListener('input', () => this.validateInput(input));
      }
    });

    // Scenario selection
    document.querySelectorAll('input[name="scenario"]').forEach(radio => {
      radio.addEventListener('change', () => this.saveCurrentConfig());
    });

    // Tripwire checkbox
    const tripwire = document.getElementById('tripwireOn');
    if (tripwire) {
      tripwire.addEventListener('change', () => this.saveCurrentConfig());
    }

    // Randomize checkbox
    const surprise = document.getElementById('surprise');
    if (surprise) {
      surprise.addEventListener('change', () => {
        if (surprise.checked) {
          this.randomizeSettings();
        }
      });
    }
  }

  setupValidation() {
    const validationRules = {
      latencyMs: { min: 0, max: 10000, type: 'number' },
      latencyRate: { min: 0, max: 100, type: 'percentage' },
      http500Rate: { min: 0, max: 100, type: 'percentage' },
      rate429: { min: 0, max: 100, type: 'percentage' },
      malformedRate: { min: 0, max: 100, type: 'percentage' },
      maxRetries: { min: 0, max: 10, type: 'number' },
      backoffBase: { min: 0, max: 5000, type: 'number' },
      backoffFactor: { min: 1, max: 5, type: 'number' },
      jitter: { min: 0, max: 1, type: 'number' }
    };

    Object.entries(validationRules).forEach(([inputId, rules]) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.setAttribute('min', rules.min);
        input.setAttribute('max', rules.max);
        if (rules.type === 'percentage') {
          input.setAttribute('step', '5');
        }
      }
    });
  }

  validateInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.getAttribute('min'));
    const max = parseFloat(input.getAttribute('max'));

    // Visual feedback
    input.classList.remove('invalid', 'valid');
    
    if (isNaN(value) || value < min || value > max) {
      input.classList.add('invalid');
      input.title = `Value must be between ${min} and ${max}`;
    } else {
      input.classList.add('valid');
      input.title = '';
    }
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    // Apply preset values to form inputs
    Object.entries(preset).forEach(([key, value]) => {
      if (key === 'name') return;
      
      const input = document.getElementById(key);
      if (input) {
        input.value = value;
        this.validateInput(input);
      }
    });

    // Show notification
    this.showNotification(`Applied "${preset.name}" preset configuration`);
    this.saveCurrentConfig();
  }

  getCurrentConfig() {
    const scenario = document.querySelector('input[name="scenario"]:checked')?.value || 'fetch';
    
    return {
      scenario,
      seed: document.getElementById('seed')?.value || '1337',
      latencyMs: parseInt(document.getElementById('latencyMs')?.value || '2000'),
      latencyRate: parseInt(document.getElementById('latencyRate')?.value || '20') / 100,
      http500Rate: parseInt(document.getElementById('http500Rate')?.value || '10') / 100,
      rate429: parseInt(document.getElementById('rate429')?.value || '10') / 100,
      malformedRate: parseInt(document.getElementById('malformedRate')?.value || '15') / 100,
      tripwireOn: document.getElementById('tripwireOn')?.checked || true,
      maxRetries: parseInt(document.getElementById('maxRetries')?.value || '3'),
      backoffBase: parseInt(document.getElementById('backoffBase')?.value || '250'),
      backoffFactor: parseFloat(document.getElementById('backoffFactor')?.value || '2.0'),
      jitter: parseFloat(document.getElementById('jitter')?.value || '0.2')
    };
  }

  applyConfig(config) {
    // Apply scenario
    const scenarioRadio = document.querySelector(`input[name="scenario"][value="${config.scenario}"]`);
    if (scenarioRadio) {
      scenarioRadio.checked = true;
    }

    // Apply other settings
    const mappings = {
      seed: config.seed,
      latencyMs: config.latencyMs,
      latencyRate: Math.round(config.latencyRate * 100),
      http500Rate: Math.round(config.http500Rate * 100),
      rate429: Math.round(config.rate429 * 100),
      malformedRate: Math.round(config.malformedRate * 100),
      maxRetries: config.maxRetries,
      backoffBase: config.backoffBase,
      backoffFactor: config.backoffFactor,
      jitter: config.jitter
    };

    Object.entries(mappings).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input && value !== undefined) {
        input.value = value;
        this.validateInput(input);
      }
    });

    const tripwire = document.getElementById('tripwireOn');
    if (tripwire) {
      tripwire.checked = config.tripwireOn;
    }
  }

  saveCurrentConfig() {
    const config = this.getCurrentConfig();
    localStorage.setItem('chaoslab_config', JSON.stringify(config));
  }

  loadSavedConfig() {
    try {
      const saved = localStorage.getItem('chaoslab_config');
      if (saved) {
        const config = JSON.parse(saved);
        this.applyConfig(config);
      }
    } catch (error) {
      console.warn('Failed to load saved configuration:', error);
    }
  }

  shareConfiguration() {
    const config = this.getCurrentConfig();
    
    // Create URL with configuration parameters
    const params = new URLSearchParams();
    Object.entries(config).forEach(([key, value]) => {
      params.set(key, value.toString());
    });
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showNotification('Configuration URL copied to clipboard!');
      }).catch(() => {
        this.fallbackCopyToClipboard(shareUrl);
      });
    } else {
      this.fallbackCopyToClipboard(shareUrl);
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showNotification('Configuration URL copied to clipboard!');
    } catch (err) {
      this.showNotification('Failed to copy URL. Please copy manually from address bar.');
    }
    document.body.removeChild(textArea);
  }

  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;

    const config = {
      scenario: params.get('scenario') || 'fetch',
      seed: params.get('seed') || '1337',
      latencyMs: parseInt(params.get('latencyMs')) || 2000,
      latencyRate: parseFloat(params.get('latencyRate')) || 0.2,
      http500Rate: parseFloat(params.get('http500Rate')) || 0.1,
      rate429: parseFloat(params.get('rate429')) || 0.1,
      malformedRate: parseFloat(params.get('malformedRate')) || 0.15,
      tripwireOn: params.get('tripwireOn') === 'true',
      maxRetries: parseInt(params.get('maxRetries')) || 3,
      backoffBase: parseInt(params.get('backoffBase')) || 250,
      backoffFactor: parseFloat(params.get('backoffFactor')) || 2.0,
      jitter: parseFloat(params.get('jitter')) || 0.2
    };

    this.applyConfig(config);
    this.showNotification('Configuration loaded from URL');
  }

  randomizeSettings() {
    const ranges = {
      latencyMs: [1000, 5000],
      latencyRate: [10, 50],
      http500Rate: [5, 30],
      rate429: [5, 35],
      malformedRate: [10, 40],
      maxRetries: [1, 5],
      backoffBase: [100, 800]
    };

    Object.entries(ranges).forEach(([inputId, [min, max]]) => {
      const input = document.getElementById(inputId);
      if (input) {
        const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
        input.value = randomValue;
        this.validateInput(input);
      }
    });

    // Generate random seed
    const seedInput = document.getElementById('seed');
    if (seedInput) {
      seedInput.value = Math.floor(Math.random() * 9999).toString();
    }

    this.showNotification('Settings randomized!');
    this.saveCurrentConfig();
  }

  replayLastTest() {
    const lastResult = localStorage.getItem('chaoslab_last_result');
    if (lastResult) {
      try {
        const result = JSON.parse(lastResult);
        if (result.config) {
          this.applyConfig(result.config);
          this.showNotification('Replaying last test configuration');
        }
      } catch (error) {
        this.showNotification('No valid test configuration found to replay');
      }
    } else {
      this.showNotification('No previous test found to replay');
    }
  }

  exportConfigYAML() {
    const config = this.getCurrentConfig();
    
    const yamlConfig = `
# Chaos Lab Configuration
mode: chaos_monkey
seed: ${config.seed}

scenario: ${config.scenario}

faults:
  network:
    latency_spike:
      probability: ${config.latencyRate}
      delay_ms: ${config.latencyMs}
    http_500:
      probability: ${config.http500Rate}
    rate_limit_429:
      probability: ${config.rate429}
  
  data:
    malformed_json:
      probability: ${config.malformedRate}

recovery:
  enabled: ${config.tripwireOn}
  max_retries: ${config.maxRetries}
  backoff:
    base_ms: ${config.backoffBase}
    factor: ${config.backoffFactor}
    jitter: ${config.jitter}

timestamp: ${new Date().toISOString()}
    `.trim();

    const blob = new Blob([yamlConfig], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaos-config-${Date.now()}.yml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  showNotification(message) {
    // Use toast if available, otherwise console
    if (window.showToast) {
      window.showToast(message);
    } else {
      console.log('Config:', message);
      
      // Simple visual feedback
      const notification = document.createElement('div');
      notification.className = 'config-notification';
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary);
        color: var(--text-contrast);
        padding: 1rem 2rem;
        border: 2px solid var(--primary);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chaosConfig = new ChaosConfig();
  
  // Load configuration from URL if present
  window.chaosConfig.loadFromUrl();
});