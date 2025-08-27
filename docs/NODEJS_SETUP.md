# Node.js Setup Guide - Agent Chaos Monkey 🚀

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Architecture Overview](#architecture-overview)
4. [Starting the Server](#starting-the-server)
5. [API Endpoints](#api-endpoints)
6. [Testing the Setup](#testing-the-setup)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

## 🔧 Prerequisites

### Check if Node.js is Installed
```bash
# Check Node.js version
node --version
# Expected: v16.0.0 or higher (you have v22.18.0 ✅)

# Check npm version
npm --version
# Expected: v7.0.0 or higher (you have v10.9.3 ✅)
```

### Installing Node.js (if needed)

#### macOS
```bash
# Option 1: Using Homebrew
brew install node

# Option 2: Using MacPorts
sudo port install nodejs18

# Option 3: Download from nodejs.org
# Visit https://nodejs.org and download the installer
```

#### Windows
```powershell
# Option 1: Using Chocolatey
choco install nodejs

# Option 2: Using Scoop
scoop install nodejs

# Option 3: Download installer from https://nodejs.org
```

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL/CentOS/Fedora
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs
```

## 📦 Installation

### 1. Clone the Repository
```bash
# Clone the repository
git clone https://github.com/your-org/agent_chaos_monkey_cc.git
cd agent_chaos_monkey_cc
```

### 2. Install Dependencies
```bash
# Install all dependencies from package.json
npm install

# What this installs:
# - express: Web server framework
# - cors: Cross-origin resource sharing
# - @playwright/test: E2E testing framework
# - typescript: Type checking
# - eslint: Code linting
# - prettier: Code formatting
```

### 3. Verify Installation
```bash
# Check installed packages
npm list --depth=0

# Expected output:
# agent-chaos-monkey@1.0.0
# ├── @playwright/test@1.40.0
# ├── @types/node@20.0.0
# ├── @typescript-eslint/eslint-plugin@6.0.0
# ├── @typescript-eslint/parser@6.0.0
# ├── cors@2.8.5
# ├── eslint@8.57.1
# ├── express@4.18.0
# ├── prettier@3.0.0
# └── typescript@5.0.0
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│            Browser (Client)                  │
│                                              │
│  ┌─────────────┐        ┌─────────────┐    │
│  │   Basic     │        │   Task      │    │
│  │   Testing   │        │    Mode     │    │
│  └──────┬──────┘        └──────┬──────┘    │
│         │                       │           │
└─────────┼───────────────────────┼───────────┘
          │                       │
          ▼                       ▼
    ┌─────────────────────────────────┐
    │   Express Server (Port 8080)     │
    │                                  │
    │  • Static File Serving          │
    │  • API Routes                   │
    │  • CORS Handling                 │
    │  • Mock Endpoints               │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │  Mock Agent (Port 9009)          │
    │                                  │
    │  • LLM Simulation               │
    │  • Chaos Injection              │
    │  • Circuit Breaker              │
    │  • Response Caching             │
    └──────────────────────────────────┘
```

### Component Details

#### Express Server (`server.js`)
- **Port**: 8080
- **Purpose**: Main web server
- **Responsibilities**:
  - Serves static HTML/CSS/JS files
  - Provides API endpoints
  - Spawns mock agent subprocess
  - Handles CORS for cross-origin requests

#### Mock Agent (`tests/mock-agent/enhanced-server.js`)
- **Port**: 9009
- **Purpose**: Simulates LLM service
- **Features**:
  - Circuit breaker pattern
  - Response caching
  - Chaos injection
  - Metrics tracking

## 🚀 Starting the Server

### Basic Start
```bash
# Start the server
node server.js

# Expected output:
# 🚀 Agent Chaos Monkey server running at http://localhost:8080
# 📂 Static files served from /public and /docs
# 🔧 API endpoints available at /api/*
# Starting mock agent on port 9009...
# [mock-agent] Enhanced server listening on http://localhost:9009
```

### Using npm Scripts
```bash
# Start with Python server (simple)
npm run dev
# Runs: python -m http.server 8080

# Start with Node.js server (full features)
npm run dev:node
# Runs: node server.js

# Start mock agent separately
npm run mock-agent
# Runs: node tests/mock-agent/enhanced-server.js
```

### Development Mode with Auto-Restart
```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Run with auto-restart
nodemon server.js
```

## 🔌 API Endpoints

### Health Check
```bash
# Check server health
curl http://localhost:8080/health

# Response:
{
  "status": "healthy",
  "timestamp": "2025-08-26T05:24:33.623Z",
  "uptime": 230.654
}
```

### Get Scenarios
```bash
# Get available chaos scenarios
curl http://localhost:8080/api/scenarios

# Response:
{
  "scenarios": [
    {
      "id": "openai_outage",
      "name": "OpenAI Service Outage",
      "description": "Complete API unavailability",
      "severity": "critical",
      "frequency": "rare"
    },
    // ... more scenarios
  ]
}
```

### Mock LLM Completion
```bash
# Test mock LLM endpoint
curl -X POST http://localhost:8080/api/complete \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is chaos engineering?",
    "chaos": {
      "error_rate": 0.2,
      "latency_ms": 1000
    }
  }'

# Response:
{
  "completion": "Mock response to: What is chaos engineering?...",
  "model": "mock-gpt",
  "tokens_used": 42,
  "latency_ms": 1000
}
```

### Mock Agent Endpoints
```bash
# Check mock agent health
curl http://localhost:9009/healthz

# Response:
{
  "status": "healthy",
  "circuit_breaker": "CLOSED",
  "metrics": {
    "requests": 0,
    "successes": 0,
    "failures": 0,
    "retries": 0,
    "fallbacks": 0,
    "circuitBreaks": 0
  }
}

# Run agent with chaos
curl -X POST http://localhost:9009/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "chaos": {
      "error_rate": 0.5,
      "rate_limit": 0.3
    }
  }'

# Reset agent state
curl -X POST http://localhost:9009/reset
```

## 🧪 Testing the Setup

### 1. Basic Connectivity Test
```bash
# Test if server is running
curl -I http://localhost:8080
# Expected: HTTP/1.1 200 OK

# Test mock agent
curl -I http://localhost:9009/healthz
# Expected: HTTP/1.1 200 OK
```

### 2. Load Test Pages
```bash
# Open in browser
open http://localhost:8080/docs/index.html           # Navigation page
open http://localhost:8080/docs/claude_prototype_enhanced.html  # Basic testing
open http://localhost:8080/docs/task_mode_standalone.html      # Task mode
```

### 3. Run Playwright Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:task-mode
npm run test:smoke
npm run test:integration

# Run with UI
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Port Already in Use
```bash
# Error: EADDRINUSE: address already in use :::8080

# Solution 1: Kill the process
pkill -f "node server.js"
pkill -f "python -m http.server"

# Solution 2: Find and kill by port
lsof -i :8080  # Find process
kill -9 <PID>  # Kill process

# Solution 3: Use different port
PORT=8081 node server.js
```

#### Module Not Found
```bash
# Error: Cannot find module 'express'

# Solution:
npm install
# or
npm ci  # Clean install from package-lock.json
```

#### Permission Denied
```bash
# Error: EACCES: permission denied

# Solution:
sudo npm install -g <package>  # For global packages
# or better:
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### Mock Agent Not Starting
```bash
# Check if mock agent port is free
lsof -i :9009

# Start mock agent manually
node tests/mock-agent/enhanced-server.js

# Check logs
tail -f npm-debug.log
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node server.js

# Verbose npm install
npm install --verbose

# Check npm configuration
npm config list
```

## ⚙️ Advanced Configuration

### Environment Variables
```bash
# Create .env file
cat > .env << EOF
PORT=8080
MOCK_AGENT_PORT=9009
NODE_ENV=development
DEBUG=true
EOF

# Use in server
npm install dotenv
# Add to server.js: require('dotenv').config()
```

### Custom Configuration
```javascript
// config.js
module.exports = {
  server: {
    port: process.env.PORT || 8080,
    cors: {
      origin: '*',
      credentials: true
    }
  },
  mockAgent: {
    port: process.env.MOCK_AGENT_PORT || 9009,
    circuitBreaker: {
      threshold: 3,
      timeout: 10000
    },
    cache: {
      maxSize: 100,
      ttl: 300000 // 5 minutes
    }
  }
};
```

### Production Deployment
```bash
# Install PM2 for production
npm install -g pm2

# Start with PM2
pm2 start server.js --name chaos-monkey

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 monit

# Logs
pm2 logs chaos-monkey
```

### Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080 9009
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t chaos-monkey .
docker run -p 8080:8080 -p 9009:9009 chaos-monkey
```

## 📊 Monitoring & Logs

### View Logs
```bash
# Server logs
tail -f server.log

# Mock agent logs
tail -f mock-agent.log

# NPM logs
cat ~/.npm/_logs/*.log
```

### Health Monitoring
```bash
# Simple health check loop
while true; do
  curl -s http://localhost:8080/health | jq .
  sleep 5
done
```

## 🎯 Quick Commands Reference

```bash
# Installation
npm install              # Install dependencies

# Starting
node server.js          # Start server
npm run dev:node        # Start with npm script
npm run mock-agent      # Start mock agent only

# Testing
npm test                # Run all tests
npm run test:headed     # Run with browser visible
curl localhost:8080/health  # Health check

# Debugging
DEBUG=* node server.js  # Debug mode
npm list                # Check installed packages
node --version          # Check Node.js version

# Cleanup
pkill -f node           # Kill all Node processes
rm -rf node_modules     # Remove dependencies
npm cache clean --force # Clear npm cache
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Playwright Documentation](https://playwright.dev/)

---

**Need Help?** Check the [FAQ](/docs/faq.md) or open an issue on GitHub!