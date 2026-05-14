# Brand-Guard rules to load by topic

Paths are relative to the repository root. Read only sections relevant to the files under review.

| Topic | Rule file |
|-------|-------------|
| TypeScript | `.cursor/rules/language/typescript.mdc` |
| React / JSX | `.cursor/rules/framework/react.mdc` |
| Clean code | `.cursor/rules/common/clean-code.mdc` |
| Agent/editing constraints (also inform review tone) | `.cursor/rules/common/code-quality.mdc` |
| Git branches / PR expectations | `.cursor/rules/common/git-flow.mdc` |
| Product/stack context | `.cursor/rules/common/project-overview.mdc` |

## Quick git-flow reminders

- Feature work: branch from `develop`, merge back via PR to `develop`; naming `feature/[issue-id]-descriptive-name`.
- Do not commit directly to `main` or `develop`.
- For release/hotfix specifics, read the full git-flow rule file.
