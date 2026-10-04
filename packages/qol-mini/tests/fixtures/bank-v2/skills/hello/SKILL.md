---
name: hello
description: Greets project {{PROJECT_NAME}} for team {{TEAM}}. Use when user asks for hello
---

# Hello

- Project: {{PROJECT_NAME}}
- Repo: {{GITHUB_REPO}}
- Team: {{TEAM}}
- Args stay literal: $ARGUMENTS
- Session dir: ${CLAUDE_SKILL_DIR}
- Undeclared token stays: {{NOT_DECLARED}}

## Steps

- Say hello twice
- Read references/guide.md
