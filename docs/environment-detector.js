/**
 * Environment Detection System for Agent Chaos Monkey
 * Detects whether running on GitHub Pages (demo mode) or locally (full mode)
 */

class EnvironmentDetector {
    constructor() {
        this.mode = null;
        this.backendAvailable = false;
        this.mockAgentAvailable = false;
        this.features = {};
        this.callbacks = [];
    }

    /**
     * Initialize detection and set up environment
     */
    async init() {
        await this.detectEnvironment();
        this.setupFeatureFlags();
        this.notifyCallbacks();
        this.updateUI();
        return this;
    }

    /**
     * Detect current environment (GitHub Pages vs Local)
     */
    async detectEnvironment() {
        // Check if running on GitHub Pages
        const isGitHubPages = this.isGitHubPages();
        
        // Check backend connectivity
        const backendStatus = await this.checkBackendConnection();
        const mockAgentStatus = await this.checkMockAgentConnection();
        
        this.backendAvailable = backendStatus;
        this.mockAgentAvailable = mockAgentStatus;
        
        // Determine mode
        if (isGitHubPages && !backendStatus) {
            this.mode = 'demo';
        } else if (backendStatus || mockAgentStatus) {
            this.mode = 'local';
        } else {
            // Local file system without backend
            this.mode = 'local-offline';
        }
        
        console.log(`🔍 Environment detected: ${this.mode}`, {
            github: isGitHubPages,
            backend: this.backendAvailable,
            mockAgent: this.mockAgentAvailable
        });
        
        return this.mode;
    }

    /**
     * Check if running on GitHub Pages
     */
    isGitHubPages() {
        const hostname = window.location.hostname;
        return hostname.includes('.github.io') || 
               hostname.includes('github.dev') ||
               (hostname === '' && window.location.protocol === 'https:');
    }

    /**
     * Check backend server connection
     */
    async checkBackendConnection() {
        try {
            const response = await fetch('/health', {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (error) {
            console.log('Backend not available:', error.message);
            return false;
        }
    }

    /**
     * Check mock agent connection
     */
    async checkMockAgentConnection() {
        try {
            const response = await fetch('http://localhost:9009/health', {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch (error) {
            console.log('Mock agent not available:', error.message);
            return false;
        }
    }

    /**
     * Set up feature flags based on environment
     */
    setupFeatureFlags() {
        switch (this.mode) {
            case 'demo':
                this.features = {
                    basicTesting: 'full',
                    taskMode: 'limited',
                    tour: 'full',
                    realTimeMetrics: 'mock',
                    customScenarios: 'limited',
                    apiCalls: 'mock',
                    dataUpload: 'disabled',
                    exportResults: 'full',
                    asciiTheatre: 'full',
                    debugPanel: 'limited'
                };
                break;
            
            case 'local':
                this.features = {
                    basicTesting: 'full',
                    taskMode: 'full',
                    tour: 'full',
                    realTimeMetrics: 'full',
                    customScenarios: 'full',
                    apiCalls: 'full',
                    dataUpload: 'full',
                    exportResults: 'full',
                    asciiTheatre: 'full',
                    debugPanel: 'full'
                };
                break;
            
            case 'local-offline':
                this.features = {
                    basicTesting: 'full',
                    taskMode: 'limited',
                    tour: 'full',
                    realTimeMetrics: 'disabled',
                    customScenarios: 'limited',
                    apiCalls: 'disabled',
                    dataUpload: 'limited',
                    exportResults: 'full',
                    asciiTheatre: 'full',
                    debugPanel: 'full'
                };
                break;
        }
    }

    /**
     * Update UI with environment indicators
     */
    updateUI() {
        // Add environment class to body
        document.body.classList.add(`env-${this.mode}`);
        
        // Update status indicators if they exist
        const modeIndicator = document.getElementById('environment-mode');
        if (modeIndicator) {
            modeIndicator.textContent = this.mode.toUpperCase();
            modeIndicator.className = `mode-badge ${this.mode}`;
        }
        
        const backendStatus = document.getElementById('backend-status');
        if (backendStatus) {
            backendStatus.textContent = this.backendAvailable ? 'Connected' : 'Offline';
            backendStatus.className = this.backendAvailable ? 'status-online' : 'status-offline';
        }
        
        // Add tooltips to limited features
        this.addFeatureTooltips();
        
        // Show/hide environment banner
        this.showEnvironmentBanner();
    }

    /**
     * Show environment banner
     */
    showEnvironmentBanner() {
        // Remove existing banner if any
        const existingBanner = document.getElementById('env-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Create new banner
        const banner = document.createElement('div');
        banner.id = 'env-banner';
        banner.className = `environment-banner ${this.mode}`;
        
        if (this.mode === 'demo') {
            banner.innerHTML = `
                <div class="banner-content">
                    <span class="banner-icon">🎭</span>
                    <strong>Demo Mode</strong> - Limited functionality. Some features are simulated.
                    <a href="#setup" class="banner-link">Run locally for full features →</a>
                    <button class="banner-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
        } else if (this.mode === 'local-offline') {
            banner.innerHTML = `
                <div class="banner-content">
                    <span class="banner-icon">⚠️</span>
                    <strong>Offline Mode</strong> - Backend services not running.
                    <a href="#" onclick="window.environmentDetector.showSetupInstructions()">Start services →</a>
                    <button class="banner-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
        } else if (this.mode === 'local') {
            banner.innerHTML = `
                <div class="banner-content">
                    <span class="banner-icon">🚀</span>
                    <strong>Local Mode</strong> - Full functionality enabled.
                    <span class="banner-status">Backend: ✓ Mock Agent: ${this.mockAgentAvailable ? '✓' : '✗'}</span>
                    <button class="banner-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
        }
        
        // Insert banner at the top of body
        document.body.insertBefore(banner, document.body.firstChild);
    }

    /**
     * Add tooltips to features based on availability
     */
    addFeatureTooltips() {
        Object.entries(this.features).forEach(([feature, status]) => {
            const elements = document.querySelectorAll(`[data-feature="${feature}"]`);
            elements.forEach(element => {
                if (status === 'limited') {
                    element.classList.add('feature-limited');
                    element.setAttribute('title', 'This feature has limited functionality in demo mode');
                    element.setAttribute('data-tooltip', 'limited');
                } else if (status === 'disabled') {
                    element.classList.add('feature-disabled');
                    element.setAttribute('title', 'This feature requires backend services');
                    element.setAttribute('data-tooltip', 'disabled');
                } else if (status === 'mock') {
                    element.classList.add('feature-mock');
                    element.setAttribute('title', 'Using simulated data in demo mode');
                    element.setAttribute('data-tooltip', 'mock');
                }
            });
        });
    }

    /**
     * Check if a feature is available
     */
    isFeatureAvailable(feature) {
        return this.features[feature] === 'full';
    }

    /**
     * Check if a feature is limited
     */
    isFeatureLimited(feature) {
        return this.features[feature] === 'limited' || this.features[feature] === 'mock';
    }

    /**
     * Check if a feature is disabled
     */
    isFeatureDisabled(feature) {
        return this.features[feature] === 'disabled';
    }

    /**
     * Get feature status
     */
    getFeatureStatus(feature) {
        return this.features[feature] || 'unknown';
    }

    /**
     * Register callback for environment changes
     */
    onEnvironmentChange(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Notify all callbacks of environment change
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            callback({
                mode: this.mode,
                features: this.features,
                backend: this.backendAvailable,
                mockAgent: this.mockAgentAvailable
            });
        });
    }

    /**
     * Show setup instructions modal
     */
    showSetupInstructions() {
        // This will be implemented by the setup wizard
        console.log('Showing setup instructions...');
        if (window.setupWizard) {
            window.setupWizard.show();
        }
    }

    /**
     * Re-check environment (useful after starting services)
     */
    async recheck() {
        await this.detectEnvironment();
        this.setupFeatureFlags();
        this.notifyCallbacks();
        this.updateUI();
    }
}

// Create global instance
window.environmentDetector = new EnvironmentDetector();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.environmentDetector.init();
    });
} else {
    window.environmentDetector.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentDetector;
}