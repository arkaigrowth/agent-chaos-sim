# 🚀 Testing Real LLM Agents with Chaos Engineering

## Quick Start (For You - Right Now!)

### 1. Start the Backend Servers
```bash
# In your project directory, run:
npm run dev:node

# This starts BOTH:
# - Main server on http://localhost:8080
# - Mock agent on http://localhost:9009
```

### 2. Open the UI
Navigate to: http://localhost:8080/docs/claude_prototype_enhanced.html

### 3. Test the Integration
1. Click **"🔍 Real Agent Testing"** mode button
2. You should see:
   - ✅ Connection successful! (mock agent is auto-configured)
   - Sample data ready to use
3. Click **"Use Sample Data"** button
4. Click any **"🚀 Real Test"** button to run chaos tests
5. Watch the timeline for progress
6. Check the debug panel (bottom) for results

## 📊 What You're Testing

### Three Evaluation Suites Available:
1. **🔧 Reliability Core** - Tests latency, 500 errors, and malformed JSON
2. **💉 RAG Injection** - Tests prompt injection resilience  
3. **⏳ Rate-limit Backoff** - Tests exponential backoff behavior

### Each Real Test Runs:
- **Baseline**: 5 test cases without chaos
- **Chaos Run**: Same 5 cases WITH fault injection
- **Comparison**: Shows degradation and resilience scores

## 🎯 Testing Different LLM Providers

### Option 1: Mock Agent (Default)
- Already configured and running
- No API key needed
- Perfect for testing the system

### Option 2: OpenAI
```javascript
1. Select "OpenAI API" from dropdown
2. Enter your OpenAI API key
3. Click "Test Connection"
4. Run tests against real GPT models
```

### Option 3: Custom HTTP Agent
```javascript
1. Select "Custom HTTP Endpoint"
2. Enter your agent's URL (e.g., http://localhost:3000/chat)
3. Test connection
4. Run chaos tests
```

## 📁 Using Custom Datasets

### JSONL Format
```jsonl
{"input": "What is the capital of France?", "expected": "Paris"}
{"input": "Calculate 2+2", "expected": "4"}
{"input": "Who wrote Romeo and Juliet?", "expected": "Shakespeare"}
```

### CSV Format
```csv
input,expected
"What is the capital of France?","Paris"
"Calculate 2+2","4"
"Who wrote Romeo and Juliet?","Shakespeare"
```

Upload via the **"📁 Upload Dataset"** button in the UI.

## 🔬 Understanding the Results

### Success Metrics
- **Success Rate**: % of requests that completed without errors
- **Avg Latency**: Average response time in milliseconds
- **Failed Count**: Number of requests that failed

### Resilience Analysis
- **Degradation**: How much performance dropped with chaos
- **Latency Impact**: Additional delay introduced by chaos
- **Resilience Score**: Overall ability to handle failures (>70% is good)

### Recommendations
The system provides actionable suggestions based on results:
- Circuit breaker implementation for <50% success
- Timeout/retry logic for high latency
- Fallback responses for increased failures

## 🛠️ Troubleshooting

### Server Won't Start
```bash
# Kill any existing processes
pkill -f "node server.js"
pkill -f "enhanced-server.js"

# Restart
npm run dev:node
```

### Connection Failed
- Check mock agent is running: `curl http://localhost:9009/run -X POST -H "Content-Type: application/json" -d '{"prompt": "test"}'`
- Verify main server: `curl http://localhost:8080/api/scenarios`

### No Results Showing
1. Open browser console (F12)
2. Look for error messages
3. Ensure adapters loaded: Should see "✅ Adapters loaded"

## 🎨 Advanced Testing

### Simulate Different Chaos Scenarios
Click the scenario buttons before running tests:
- **🔥 API Meltdown** - Heavy errors and rate limits
- **🐌 Latency Spike** - 10-second delays
- **🗑️ Garbage JSON** - Malformed responses
- **💣 Context Bomb** - Token limit overflow

### Custom Chaos Parameters
1. Expand **"⚙️ Chaos Parameters"** section
2. Adjust sliders for:
   - HTTP 500 rate (0-100%)
   - 429 rate limits (0-100%)
   - Latency (0-10000ms)
   - Malformed JSON probability

### Export Results
Click **"📋 Copy"** in the debug panel to copy JSON logs

## 📚 For End Users

### Installation
```bash
# Clone the repository
git clone [your-repo-url]
cd agent_chaos_monkey_cc

# Install dependencies
npm install

# Start the servers
npm run dev:node

# Open browser to:
http://localhost:8080/docs/claude_prototype_enhanced.html
```

### Basic Workflow
1. **Configure** your LLM (mock, OpenAI, or custom)
2. **Load** test data (sample or upload your own)
3. **Select** an evaluation suite
4. **Run** the test
5. **Analyze** results and implement improvements

### What This Tests
- **Reliability**: How well your agent handles errors
- **Performance**: Response time under stress
- **Recovery**: Ability to recover from failures
- **Consistency**: Maintaining quality during chaos

## 🎯 Next Steps

1. **Test with OpenAI**: Try with a real API key
2. **Create Custom Datasets**: Test domain-specific scenarios
3. **Build Custom Agents**: Test your own HTTP endpoints
4. **Adjust Chaos Levels**: Find your breaking points
5. **Implement Fixes**: Use recommendations to improve

## 📧 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify both servers are running
3. Ensure your firewall allows localhost connections
4. Try the mock agent first before external APIs

---

**Remember**: The goal isn't to break things—it's to find weaknesses before they break in production! 🛡️