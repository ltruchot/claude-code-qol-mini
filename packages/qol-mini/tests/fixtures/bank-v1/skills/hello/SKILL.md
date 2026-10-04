---
name: hello
description: Greets project {{PROJECT_NAME}}. Use when user asks for hello
---

# Hello

- Project: {{PROJECT_NAME}}
- Repo: {{GITHUB_REPO}}
- Args stay literal: $ARGUMENTS
- Session dir: ${CLAUDE_SKILL_DIR}
- Undeclared token stays: {{NOT_DECLARED}}

## Steps

- Say hello
- Read references/guide.md
