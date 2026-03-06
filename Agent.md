# Agent Context & Logs

This repository maintains an `.agent-logs/` folder to track autonomous AI AI development tasks, implementation plans, and feature walkthroughs. 

Whenever active development is ongoing, the following artifacts will be updated inside `.agent-logs/`:
- **task.md**: A live checklist of the agent's current objective.
- **implementation_plan.md**: Technical summaries of feature architectures before execution.
- **walkthrough.md**: Reviews and validation test results following task execution.

These logs act as persistent tracking context between coding sessions.

## Versioning & Changelog Workflow

Whenever new features are implemented and ready to be committed, the agent MUST follow these steps before committing:
1. **Bump Version:** Increment the version number in `package.json` appropriately (major, minor, or patch depending on the scope of changes).
2. **Update Changelog UI:** Modify `app/changelog/page.tsx` to include the newest version block at the top, describe the changes, and shift older versions down.
3. **Commit & Tag:** Formally commit the codebase and tag the latest release using `git tag v[VERSION]` (e.g., `git tag v0.1.1`).
