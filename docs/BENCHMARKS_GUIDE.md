# Agent Chaos Monkey: Benchmark Standards Guide

## Overview: Chaos Engineering for AI Agents

Agent Chaos Monkey applies **proven chaos engineering principles** from distributed systems to AI agent reliability testing. Our benchmarks are grounded in industry-standard practices used by companies like Netflix, Amazon, and Google to ensure 99.9%+ availability.

## Why These Benchmarks Matter

### The AI Reliability Gap

While traditional software has mature reliability standards, AI agents face unique challenges:
- **API Dependencies**: Modern agents rely on multiple external services
- **Data Variability**: Agents must handle unpredictable input formats
- **Recovery Complexity**: AI systems need graceful degradation, not just error handling

### Our Approach: Industry-Standard Metrics + AI-Specific Scenarios

We combine established reliability engineering with AI-specific failure patterns:
- **MTTR (Mean Time to Recovery)**: Standard distributed systems metric
- **SLA Thresholds**: Based on industry availability requirements
- **Fault Injection**: Proven chaos engineering methodology
- **AI Failure Modes**: Prompt injection, context overflow, malformed responses

---

## Built-in Benchmark Suites

### 🎯 Reliability Core
**Industry Context**: Essential resilience patterns for 99.9% SLA compliance
**Target Users**: Production AI agents handling mission-critical workflows

#### Test 1: Network Timeout Recovery
```
📊 WHAT IT TESTS: Can your agent handle slow APIs and recover gracefully?
🏭 INDUSTRY CONTEXT: Average API timeout in production is 2-3 seconds
🎯 SUCCESS CRITERIA: ≥70% success rate after network delays
📈 BUSINESS IMPACT: Prevents user experience degradation during service slowdowns
```

**Technical Details:**
- Injects 2-second latency on 20% of requests
- Adds HTTP 500 errors on 10% of requests  
- Corrupts 15% of API responses
- **Expected Behavior**: Agent implements retries, timeouts, fallbacks

#### Test 2: Rate Limit Handling
```
📊 WHAT IT TESTS: Does your agent back off properly when hitting rate limits?
🏭 INDUSTRY CONTEXT: APIs commonly return HTTP 429 under load (Twitter, OpenAI, etc.)
🎯 SUCCESS CRITERIA: Implements exponential backoff, recovers within 10 seconds
📈 BUSINESS IMPACT: Prevents cascade failures and API key suspension
```

**Technical Details:**
- Injects HTTP 429 responses on 10% of requests
- Measures time to successful retry
- **Expected Behavior**: Exponential backoff with jitter, not immediate retry

#### Test 3: Data Corruption Resilience  
```
📊 WHAT IT TESTS: How does your agent handle malformed responses?
🏭 INDUSTRY CONTEXT: 15-25% of API responses contain formatting issues in practice
🎯 SUCCESS CRITERIA: Degrades gracefully, maintains core functionality
📈 BUSINESS IMPACT: Prevents complete system failure from bad data
```

**Technical Details:**
- Truncates context to 600 bytes (context window pressure)
- Injects benign prompt modifications
- **Expected Behavior**: Partial functionality maintained, clear error reporting

### 🔍 RAG Injection (Benign)
**Industry Context**: Validates information retrieval security without harmful content
**Target Users**: Document Q&A systems, knowledge base agents

#### Test: MTTR Definition Validation
```
📊 WHAT IT TESTS: Can your agent extract accurate info despite context manipulation?
🏭 INDUSTRY CONTEXT: RAG systems must resist information pollution attacks
🎯 SUCCESS CRITERIA: Correctly defines MTTR despite benign injection attempts
📈 BUSINESS IMPACT: Ensures knowledge accuracy under adversarial conditions
```

### ⚡ Rate Limit Backoff Discipline
**Industry Context**: Validates proper API usage patterns under pressure
**Target Users**: High-volume agent deployments, API-heavy workflows

#### Test: 429 Recovery Pattern
```
📊 WHAT IT TESTS: Hit 429 then back off and recover efficiently
🏭 INDUSTRY CONTEXT: Proper backoff prevents API provider penalties
🎯 SUCCESS CRITERIA: At least 1 retry, recovery within 10 seconds MTTR
📈 BUSINESS IMPACT: Maintains service access, prevents rate limit escalation
```

---

## Industry SLA Reference Table

| Availability | Downtime/Month | Downtime/Year | Use Cases |
|-------------|----------------|---------------|-----------|
| 90% | 72 hours | 36.5 days | Development/testing |
| 95% | 36 hours | 18.25 days | Internal tools |
| 99% | 7.2 hours | 3.65 days | Business applications |
| 99.9% | 43.2 minutes | 8.7 hours | **Production agents** |
| 99.99% | 4.32 minutes | 52.6 minutes | Mission-critical |

**Our benchmarks target 99.9% SLA** - the industry standard for production AI services.

---

# Creating Custom Benchmarks

## YAML Schema Explained (For Everyone)

Think of YAML benchmark definitions as **test recipes**. Each recipe tells the system:
1. **What to test** (scenarios)
2. **How to break it** (faults) 
3. **How to measure success** (assertions)

### Complete Example with Annotations

```yaml
# 📝 SUITE DEFINITION
suite: "My E-commerce Agent Test"     # Human-readable name for your test suite
description: "Tests checkout flow resilience"  # Optional: what this tests

# 📋 TEST CASES LIST
cases:
  # Test Case 1: Payment API Reliability
  - name: "Payment Gateway Timeout"   # What you're testing
    description: "Ensures graceful handling of payment delays"
    
    scenario: "fetch"                 # Type of task (fetch = web requests, rag = documents, json = data processing)
    
    seeds: ["12345"]                  # Random seed for reproducible results
                                      # Same seed = same test every time
    
    # 💥 FAILURE INJECTION SETTINGS
    faults:
      latency_ms: 5000               # Add 5-second delays (simulates slow payment processor)
      latency_rate: 0.3              # 30% of requests get delayed
      http_500_rate: 0.15            # 15% return "Internal Server Error"
      rate_429: 0.1                  # 10% return "Rate Limited"
    
    # ✅ SUCCESS CRITERIA  
    assertions:
      - type: "metric_threshold"      # Check if a metric meets our target
        metric: "success_after_fault" # Measure: does the agent succeed despite failures?
        op: ">="                     # Comparison: greater than or equal
        value: 0.8                   # Target: 80% success rate required
        
      - type: "metric_threshold"
        metric: "mttr"               # Mean Time to Recovery (industry standard)
        op: "<="                     # Less than or equal
        value: 8.0                   # Must recover within 8 seconds

# 🎯 OVERALL PASS/FAIL CRITERIA
gate:
  score_min: 75                      # Need 75+ overall score to pass this suite
  description: "Production-ready threshold based on 99.9% SLA"
```

### Field Reference Guide

#### Scenario Types
```yaml
scenario: "fetch"    # Tests web API calls, HTTP requests
scenario: "rag"      # Tests document retrieval, Q&A systems  
scenario: "json"     # Tests data processing, API integration
```

#### Fault Injection Options
```yaml
faults:
  latency_ms: 2000        # Delay in milliseconds (2000 = 2 seconds)
  latency_rate: 0.2       # Fraction of requests affected (0.2 = 20%)
  http_500_rate: 0.1      # Server error rate (0.1 = 10%)
  rate_429: 0.05          # Rate limit rate (0.05 = 5%)
  malformed_rate: 0.15    # Data corruption rate (0.15 = 15%)
  ctx_bytes: 1000         # Context window limit for overflow testing
  inj_seed: "benign-01"   # Prompt injection test (benign only)
```

#### Assertion Types
```yaml
# Check if a metric meets threshold
- type: "metric_threshold"
  metric: "success_after_fault"  # Options: success_after_fault, mttr, availability
  op: ">="                       # Options: >=, <=, >, <, ==
  value: 0.8                     # Your target value

# Count specific events
- type: "event_count"
  event: "retry"                 # Count retry attempts
  min: 1                         # Must see at least 1 retry

# Validate answer content (for RAG/QA)
- type: "answer_match"
  questions:
    - q: "What is MTTR?"
      expect_regex: "Mean Time.*Recovery"  # Answer must match this pattern
```

### Quick Start Templates

#### Template 1: API Reliability Test
```yaml
suite: "Basic API Reliability"
cases:
  - name: "API Timeout Handling"
    scenario: "fetch"
    seeds: ["1001"]
    faults:
      latency_ms: 3000
      http_500_rate: 0.2
    assertions:
      - type: "metric_threshold"
        metric: "success_after_fault"
        op: ">="
        value: 0.7
gate:
  score_min: 70
```

#### Template 2: High-Volume Testing
```yaml
suite: "High-Volume Resilience"
cases:
  - name: "Rate Limit Recovery"
    scenario: "json"
    seeds: ["2002"]
    faults:
      rate_429: 0.4
      latency_ms: 1000
    assertions:
      - type: "event_count"
        event: "retry"
        min: 2
      - type: "metric_threshold"
        metric: "mttr"
        op: "<="
        value: 12.0
gate:
  score_min: 80
```

#### Template 3: Document Q&A Testing
```yaml
suite: "Document RAG Resilience"
cases:
  - name: "Context Window Pressure"
    scenario: "rag"
    seeds: ["3003"]
    faults:
      ctx_bytes: 800
      inj_seed: "benign-02"
    assertions:
      - type: "answer_match"
        questions:
          - q: "What is our refund policy?"
            expect_regex: "refund.*within.*days"
gate:
  score_min: 85
```

---

## Understanding Your Results

### Resilience Score Calculation
```
Resilience Score = 50% × Success Rate + 30% × (1 - MTTR_normalized) + 20% × Consistency

Where:
- Success Rate: % of tasks completed despite failures
- MTTR_normalized: Recovery time relative to timeout threshold  
- Consistency: How uniform performance is across test runs
```

### Score Interpretation
- **90-100**: Enterprise-ready, exceeds 99.99% SLA standards
- **75-89**: Production-ready, meets 99.9% SLA standards  
- **60-74**: Acceptable for internal tools, needs improvement for production
- **<60**: Significant reliability concerns, not production-ready

### Common Failure Patterns
- **Low Success Rate**: Agent doesn't handle API errors properly
- **High MTTR**: Recovery takes too long, poor retry strategy
- **Low Consistency**: Non-deterministic failures, flaky error handling

---

## FAQ: Common Questions

### Q: Are these real industry standards?
**A: Yes!** Our benchmarks are based on:
- Chaos engineering practices from Netflix, Amazon, Google
- MTTR metrics used in Site Reliability Engineering (SRE)  
- SLA requirements from enterprise AI service providers
- Distributed systems reliability patterns

### Q: How do I know what thresholds to use?
**A: Start with our defaults, then adjust based on your SLA:**
- **99.9% SLA**: Use score_min: 70-75
- **99.99% SLA**: Use score_min: 85-90
- **Development/Testing**: Use score_min: 60-70

### Q: Can I test harmful content?
**A: No.** We only support benign testing for safety. Our injection tests use non-harmful modifications to validate robustness without creating security risks.

### Q: What's the difference between this and AI safety benchmarks?
**A: Focus area:**
- **AI Safety Benchmarks** (HELM, HarmBench): Test against malicious use, prompt injection attacks
- **Chaos Monkey Benchmarks**: Test operational reliability, graceful degradation, recovery patterns

Both are important! Safety ensures your agent won't do bad things. Reliability ensures it will do good things consistently.

---

## Getting Help

- **Schema Validation Issues**: Check YAML syntax with an online validator
- **Test Not Running**: Verify scenario type matches your agent's capabilities
- **Unexpected Results**: Check fault injection rates - high rates (>50%) often cause complete failures
- **Custom Scenarios**: Start with built-in templates and modify incrementally

For more detailed examples and troubleshooting, see our [Integration Guide](INTEGRATION_GUIDE.md).