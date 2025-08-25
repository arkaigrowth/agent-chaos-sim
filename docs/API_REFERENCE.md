# Agent Chaos Monkey - API Reference 🔧

## Core Components

### 1. ChaosSimulator 
Primary interface for creating and managing chaos scenarios.

```python
class ChaosSimulator:
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize simulator with configuration.
        
        Args:
            config (Dict): Chaos testing configuration
        """
    
    def inject_failure(self, target: str, mode: str, intensity: float):
        """
        Inject a specific failure into a system component.
        
        Args:
            target (str): System component to target
            mode (str): Type of failure (e.g., 'network_partition', 'latency')
            intensity (float): Severity of failure (0.0 - 1.0)
        
        Returns:
            FailureResult: Detailed information about injected failure
        """
    
    def run_scenario(self, scenario_name: str):
        """
        Execute a predefined or custom chaos scenario.
        
        Args:
            scenario_name (str): Name of scenario to run
        
        Returns:
            ScenarioReport: Comprehensive report of scenario execution
        """
```

### 2. DataCollector
Manages data collection during chaos tests.

```python
class DataCollector:
    def collect_metrics(self, 
                        targets: List[str], 
                        metrics: List[str] = None):
        """
        Collect system metrics before, during, and after chaos injection.
        
        Args:
            targets (List[str]): Systems to monitor
            metrics (List[str], optional): Specific metrics to collect
        
        Returns:
            MetricsReport: Comprehensive metrics collection
        """
    
    def export_results(self, 
                       format: str = 'json', 
                       destination: str = None):
        """
        Export collected chaos testing results.
        
        Args:
            format (str): Export format (json, csv, html)
            destination (str, optional): File path for export
        
        Returns:
            ExportResult: Details of export operation
        """
```

### 3. AnalyticsEngine
Processes and analyzes chaos test results.

```python
class AnalyticsEngine:
    def calculate_resilience_score(self, test_results: Dict):
        """
        Compute system resilience based on test results.
        
        Args:
            test_results (Dict): Comprehensive test results
        
        Returns:
            float: Resilience score (0.0 - 1.0)
        """
    
    def identify_vulnerabilities(self, scenario_reports: List):
        """
        Detect potential system vulnerabilities.
        
        Args:
            scenario_reports (List): Multiple scenario test reports
        
        Returns:
            VulnerabilityReport: Identified system weak points
        """
```

## Configuration Schema

```yaml
chaos_config:
  global_settings:
    logging_level: str
    default_timeout: int
  
  scenarios:
    scenario_name:
      type: str  # network, service, database, etc.
      intensity: float  # 0.0 - 1.0
      targets: List[str]
      failure_modes: List[str]
  
  monitoring:
    metrics: List[str]
    export_formats: List[str]
```

## Failure Injection Modes

- `network_partition`: Simulate network disconnections
- `latency_injection`: Introduce artificial delays
- `error_rate_increase`: Simulate increased error responses
- `resource_exhaustion`: Simulate system overload
- `dependency_failure`: Simulate upstream/downstream service failures

## Extension Hooks

### Custom Failure Modes

```python
from agent_chaos_monkey import BaseFailureMode

class CustomFailureMode(BaseFailureMode):
    def __init__(self, config: Dict):
        """Define custom failure injection logic"""
    
    def inject(self, target: str, intensity: float):
        """Implement specific failure injection"""
    
    def rollback(self):
        """Implement failure recovery mechanism"""
```

## Error Handling

```python
class ChaosError(Exception):
    """Base exception for Chaos Monkey errors"""
    
class FailureInjectionError(ChaosError):
    """Raised when failure injection encounters issues"""
    
class ConfigurationError(ChaosError):
    """Raised for invalid configuration settings"""
```

## Recommended Practices

1. Always use a configuration file
2. Start with low-intensity scenarios
3. Monitor system comprehensively
4. Have rollback mechanisms ready
5. Test in staging before production

## Performance Considerations

- Minimal overhead (<5% performance impact)
- Configurable timeout and intensity
- Adaptive failure injection
- Detailed logging with minimal resource consumption

## Security Notes

- Use environment-specific configurations
- Limit chaos testing to authorized environments
- Implement strict access controls
- Avoid exposing sensitive system details

## Example Usage

```python
from agent_chaos_monkey import ChaosSimulator, AnalyticsEngine

# Initialize simulator
chaos = ChaosSimulator(config='chaos_config.yaml')

# Run a network stress test
result = chaos.run_scenario('network_stress')

# Analyze results
analytics = AnalyticsEngine()
resilience_score = analytics.calculate_resilience_score(result)
```

## Versioning

- Semantic Versioning (SemVer)
- Backward compatibility maintained
- Deprecation notices with 2-release notice

## Community & Support

- GitHub Issues for bug reports
- Discussion forums for implementation questions
- Regular library updates
- Community-driven extension ecosystem