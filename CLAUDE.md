# Agent Chaos Monkey - Claude Configuration

## Task Management
This project uses Archon for persistent task tracking.
- **Archon Project ID**: `007205de-aa00-478a-9436-5e39c0f19c7c`
- Use `archon:list_tasks` to see current tasks
- Use `archon:create_task` for new tasks (not TodoWrite)
- Use `archon:update_task` to track progress

When asked about tasks, always query Archon first for persistent context.

## Project Overview
**Agent Chaos Monkey** is an advanced chaos engineering platform designed for testing AI agent resilience and reliability.

### Core Features
- **Chaos Testing Framework**: Systematic failure injection and recovery testing
- **Evaluation Metrics**: Comprehensive scoring and performance analysis
- **Mock Agent Server**: Enhanced testing server with OpenAI-compatible endpoints
- **Playwright E2E Testing**: Automated browser-based validation
- **Performance Monitoring**: Real-time metrics and health tracking

### Technical Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 with 5 theme variations
- **Backend**: Express.js server with CORS support
- **Testing**: Playwright test suite with comprehensive E2E coverage
- **Configuration**: YAML-based evaluation configs, OpenAPI specification
- **Deployment**: GitHub Pages compatible, CDN-ready static assets

## Project Structure
After comprehensive cleanup (69% file reduction), the project follows a clean, professional structure:

```
📁 ROOT (16 essential items)
├── archive/              # Historical versions and old experiments
├── assets/               # Static assets and resources
├── components/           # Modular JavaScript components
├── config/              
│   ├── evaluations/     # YAML evaluation configurations
│   ├── playwright.ts    # Test configuration
│   └── openapi.yaml     # API specification
├── dev/                  # Development tools (kept accessible)
├── docs/
│   ├── api/             # API documentation
│   ├── project/         # Project docs (CLAUDE.md, CONTRIBUTING.md)
│   ├── reports/         # Analysis and cleanup reports
│   └── guides/          # User and integration guides
├── pages/
│   ├── demos/           # Demo and showcase pages
│   └── tests/           # Test and debug pages
├── public/              # Public web assets
├── scripts/             # Build and deployment scripts
├── src/
│   ├── core/            # Core server and evaluation logic
│   ├── themes/          # CSS theme files
│   └── utils/           # Utility functions
├── tests/               # Test suites and mock agents
├── test-results/        # Test output (kept for analysis)
├── package.json         # Project configuration
└── README.md            # Main documentation
```

## Development Workflow

### Using Archon for Task Management
1. **View Tasks**: `archon:list_tasks --filter-by="status" --filter-value="todo"`
2. **Create Task**: `archon:create_task` with detailed description and acceptance criteria
3. **Update Progress**: `archon:update_task` with status changes (todo → doing → review → done)
4. **Document Decisions**: `archon:create_document` for important architectural choices

### Key Commands
```bash
# Start development server
npm run dev              # or node src/core/server.js

# Run tests
npm test                 # Playwright E2E tests

# Deploy
npm run deploy          # GitHub Pages deployment
```

### Testing Endpoints
- **Health Check**: `GET /health`
- **Mock Agent**: `http://localhost:9009`
- **API Complete**: `POST /api/complete`

## Recent Improvements

### Cleanup Achievement (September 1, 2025)
- **Before**: 51 scattered files in root directory
- **After**: 16 organized items (69% reduction)
- **Impact**: Professional structure, improved navigation, reduced technical debt
- **Documentation**: See `docs/reports/sc-cleanup-report-2025-09-01.md`

### Key Updates
1. ✅ Organized all CSS themes → `src/themes/`
2. ✅ Consolidated documentation → `docs/` subdirectories
3. ✅ Fixed server paths for new structure
4. ✅ Updated theme-switcher references
5. ✅ Archived old experiments (chaos_theatre_pack)

## Agent Integration
For specialized UI/UX work, use the superdesign agent:
- Agent config: `.claude/agents/ui-designer-superdesign.md`
- Call via: `Task tool with subagent_type: "ui-designer-superdesign"`
- Output location: `.superdesign/design_iterations/`

## Best Practices
1. **Always use Archon** for task tracking (persistent across sessions)
2. **Document in Archon** for architectural decisions and important changes
3. **Follow existing patterns** in the codebase for consistency
4. **Test after changes** using the Playwright suite
5. **Keep root clean** - use organized directory structure

## Quick Reference
- **Project ID**: `007205de-aa00-478a-9436-5e39c0f19c7c`
- **GitHub**: https://github.com/alexkamysz/agent_chaos_monkey_cc
- **Main Entry**: `src/core/server.js`
- **Test Suite**: `tests/` directory
- **Themes**: `src/themes/` (5 variations available)