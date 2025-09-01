# Agent Chaos Monkey - Project Configuration

## Superdesign Agent
The superdesign UI/UX design instructions have been moved to `.claude/agents/ui-designer-superdesign.md` to keep agent behavior properly containerized and reusable.

To use the superdesign agent:
- Call it directly via Task tool with `subagent_type: "frontend-developer"`
- It follows the 4-step workflow: Layout → Theme → Animation → HTML
- Outputs to `.superdesign/design_iterations/` folder

## Project-Specific Instructions
Add any project-specific Claude instructions here that aren't agent-specific.