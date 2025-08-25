# Contributing to Agent Chaos Monkey 🐒

## Welcome Chaos Engineers! 🚀

We're thrilled that you want to contribute to Agent Chaos Monkey. This document provides guidelines for contributing to the project.

## Code of Conduct

Be kind, respectful, and constructive. We're building a community that welcomes diversity and collaboration.

### Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project a harassment-free experience for everyone.

## How to Contribute

### 1. Report Bugs 🐞

**Before Submitting a Bug Report:**
- Check existing issues to see if it's already reported
- Gather information:
  - Python version
  - Chaos Monkey version
  - Detailed description
  - Error logs

**How to Submit:**
```bash
# Generate debug report
python chaos_monkey.py --debug-report
```

### 2. Suggest Enhancements 💡

- Clearly describe the enhancement
- Provide context and use cases
- Include potential implementation details

### 3. Pull Requests

#### PR Checklist
✅ Fork the repository
✅ Create a feature branch
✅ Write tests
✅ Document changes
✅ Ensure all tests pass
✅ Update documentation

#### Contribution Process

```bash
# Fork the repo
git clone https://github.com/your-username/agent-chaos-monkey.git
cd agent-chaos-monkey

# Create a feature branch
git checkout -b feature/awesome-chaos-mode

# Make your changes
# Write tests
# Update docs

# Run tests
pytest tests/

# Commit with a clear message
git commit -m "Add: Custom network chaos mode for microservices"

# Push to your fork
git push origin feature/awesome-chaos-mode
```

## Development Setup

```bash
# Create virtual environment
python3 -m venv chaos_env
source chaos_env/bin/activate

# Install development dependencies
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

## Testing 🧪

- Write tests for new features
- Maintain 90%+ test coverage
- Use `pytest` for testing
- Run `make test` before submitting PRs

## Code Quality

- Follow PEP 8 style guidelines
- Use type hints
- Write docstrings for all functions
- Use `mypy` for static type checking

## Review Process

1. Automated checks run
2. Maintainers review the PR
3. Feedback and iterations
4. Squash and merge

## Extension Development Guidelines

- Inherit from base classes
- Implement comprehensive error handling
- Add logging
- Write unit and integration tests
- Document new extensions

## Community Recognition 🏆

- Contributors listed in CONTRIBUTORS.md
- Most innovative extensions featured in docs
- Potential for maintainer status for consistent, high-quality contributions

## Communication Channels

- GitHub Discussions
- Slack Channel
- Monthly Community Calls

## Hacktoberfest & Community Events

We participate in Hacktoberfest and host community hackathons. Look for `good first issue` and `hacktoberfest` labels!

## Financial Contributions

Support the project:
- GitHub Sponsors
- Open Collective

## Legal

By contributing, you agree to the project's MIT License.

---

**Remember: Every line of code is a chance to make systems more resilient! 💪**