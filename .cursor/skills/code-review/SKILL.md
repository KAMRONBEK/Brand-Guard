---
name: code-review
description: Reviews changes for correctness, security, maintainability, and alignment with Brand-Guard Cursor rules (TypeScript, React, clean code, git flow). Use when reviewing pull requests, diffs, staged changes, or when the user asks for a code review.
disable-model-invocation: true
---

# Code review (Brand-Guard)

## Before reviewing

1. Read the diff or files in scope; prefer whole-function context over single hunks when assessing logic.
2. For stack-specific depth, open [reference.md](reference.md) and load only the listed rule files that match the change.

## Review checklist

- **Correctness**: Logic matches intent; edge cases and error paths handled; no regressions for callers.
- **Security**: Input validation, XSS/authz/session handling, secrets not logged or committed, safe handling of URLs and HTML.
- **TypeScript**: No unnecessary `any`; sound narrowing; explicit public APIs where the project expects them.
- **React**: Hooks rules, effect deps and cleanup, keys in lists, avoid avoidable re-renders.
- **Maintainability**: Single responsibility, meaningful names, DRY without premature abstraction; matches surrounding patterns.
- **Tests**: Critical paths and regressions covered where the project tests similar code.
- **Scope**: Change stays focused; unrelated code and drive-by refactors flagged only when risky.

## Feedback format

Use severity labels (no emoji required):

- **Critical**: Must fix before merge (bugs, security, data loss, broken contracts).
- **Suggestion**: Should fix or discuss (maintainability, clearer types, smaller components).
- **Nice to have**: Optional polish.

For each finding: short title, why it matters, and a concrete fix or alternative. Use code citations with ```startLine:endLine:path when referencing existing code.

## PR / merge readiness

- Call out missing migrations, env changes, or breaking API changes.
- If git-flow applies: branch naming and target branch match [reference.md](reference.md) git-flow summary.

## Anti-patterns during review

- Do not nitpick pure formatting or whitespace-only churn.
- Do not propose large unrelated refactors unless blocking correctness or security.
- Verify claims against the code shown; flag uncertainty explicitly.
