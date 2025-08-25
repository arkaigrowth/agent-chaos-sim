# Agent Chaos Monkey - Quick Start Guide 🚀

## Prerequisites

- Python 3.8+
- pip
- Virtual environment (recommended)

## 0. Setup Your Environment

```bash
# Create a virtual environment
python3 -m venv chaos_env
source chaos_env/bin/activate

# Clone the repository
git clone https://github.com/your-org/agent-chaos-monkey.git
cd agent-chaos-monkey

# Install dependencies
pip install -r requirements.txt
```

## 1. Basic Configuration

Create a basic configuration file `chaos_config.yaml`:

```yaml
# Basic Chaos Monkey Configuration
global_settings:
  logging_level: INFO
  default_timeout: 60  # seconds

scenarios:
  network_stress:
    type: network
    intensity: moderate
    targets:
      - protocol: tcp
      - protocol: udp
```

## 2. Run Your First Chaos Test

```bash
# Basic network stress test
python chaos_monkey.py --scenario network_stress

# Database connection simulation
python chaos_monkey.py --scenario db_connection_flood

# Microservice dependency test
python chaos_monkey.py --scenario service_dependency
```

## 3. Analyze Results

After each test, check:
- `logs/chaos_results.json`
- Terminal output for real-time analytics
- Generated visualization in `reports/`

## 4. Customize Your Scenario

Modify `chaos_config.yaml` to:
- Change target systems
- Adjust failure intensity
- Define specific failure modes

## 5. Advanced Configuration

```yaml
# Advanced Scenario
microservice_chaos:
  type: service
  targets:
    - service: user_authentication
      failure_modes:
        - latency_injection
        - error_rate_increase
  monitoring:
    - response_time
    - error_percentage
```

## 6. Integration Options

### Continuous Integration

Add to your CI pipeline:
```yaml
# GitHub Actions Example
- name: Chaos Testing
  run: python chaos_monkey.py --ci-mode
```

### Slack/Discord Notifications

Configure webhooks in `chaos_config.yaml`:
```yaml
notifications:
  slack:
    webhook_url: https://hooks.slack.com/...
  discord:
    webhook_url: https://discord.com/api/webhooks/...
```

## Troubleshooting

- Ensure all dependencies are installed
- Check `logs/chaos_debug.log` for detailed error information
- Verify network connectivity for remote tests

## Next Steps

1. Explore `examples/` directory for more scenarios
2. Review `EXTENSION_GUIDE.md` for custom plugin development
3. Join our community discussions!

## CLI Reference

```bash
# Basic usage
python chaos_monkey.py [OPTIONS]

# Options
--scenario   Specify chaos scenario
--config     Custom configuration file
--duration   Test duration
--intensity  Chaos intensity level
--dry-run    Simulate without actual failures
```

## Recommended Learning Path

1. Run pre-configured scenarios
2. Modify existing scenarios
3. Create custom scenarios
4. Develop custom chaos effects
5. Integrate with your infrastructure

Happy Chaos Engineering! 💥🔧