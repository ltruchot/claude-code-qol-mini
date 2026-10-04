# QA checklist

## Correctness

- Behavior matches PR title and body
- Edge cases: empty, null, huge, concurrent
- Errors surfaced, not swallowed

## Safety

- No secrets in diff
- No new network calls without review
- Migrations reversible

## Quality

- Tests added or updated
- Names say what, comments say why
- No dead code, no commented code

## Process

- Targets {{DEFAULT_BRANCH}}
- Commits atomic, messages imperative
- CI green
