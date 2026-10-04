---
name: qa-pr
description: Reviews a pull request of {{GITHUB_REPO}} against team QA rules. Use when asked to QA, review or check a PR
allowed-tools: Bash(gh:*) Bash(git:*) Read Grep
---

# QA a pull request

- Repo: {{GITHUB_REPO}}
- Default branch: {{DEFAULT_BRANCH}}
- Prod URL: {{PROD_URL}}

## Steps

- Read PR: `gh pr view $ARGUMENTS --repo {{GITHUB_REPO}} --json title,body,files`
- Diff against base: `gh pr diff $ARGUMENTS --repo {{GITHUB_REPO}}`
- Walk `references/checklist.md`, one bullet per finding
- Flag anything touching prod config or {{PROD_URL}}
- Never approve, never merge, report only

## Output

- Verdict line: `ready`, `needs work`, `blocked`
- Findings as `file:line — issue — fix`
- Missing tests listed last
