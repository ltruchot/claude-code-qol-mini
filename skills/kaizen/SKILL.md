---
name: kaizen
description: Review the friction in the current session and turn it into concrete amendments to CLAUDE.md, a skill, the documentation or a code comment. Use before compacting, or whenever a session has taught something worth keeping. Also releases the /compact block set by the PreCompact hook.
---

# Kaizen — turn this session's friction into something durable

A session ends up knowing things nobody wrote down: an assumption that had to be
undone, a command that failed for a non-obvious reason, a tool that behaved
differently than its documentation. Compaction summarises all of it away. This
review catches it first.

You are the right reviewer for this because you still hold the whole context. Do
not delegate it to a subagent reading the transcript from disk.

## 1. Look back over this session

List what actually caused friction:

- a wrong assumption you had to undo
- a command that failed for a reason that was not obvious
- a convention of this repo you got wrong
- a tool, API or runtime that behaved differently than expected
- a measurement that contradicted what the documentation said

Ignore anything already written down, and anything that is plain conversation
rather than a lesson. If the session was smooth, say so and skip to step 4 — an
empty review is a legitimate outcome, and inventing a lesson to look useful is
worse than recording none.

## 2. Turn each one into a concrete amendment

Not a remark: an edit the user can picture. Name the file and say what text you
would add or change.

| Where | For what |
|---|---|
| this project's `CLAUDE.md` | a constraint specific to this repo |
| a skill — name it, and say whether it exists or you would create it | a lesson too general for one repo |
| the documentation — README, usage notes | something a user of the project needs |
| a comment in the code | a trap that is invisible at the point it bites |

Never the user-level `~/.claude/CLAUDE.md`. A lesson too general for one repo
becomes a skill; it does not move up a level. A user-level file applies to every
project without having been chosen for any of them.

## 3. Propose them one at a time

For each item, in one short block:

- **what happened**, with the concrete evidence from this session
- **the amendment**, naming the file and quoting the text you would write
- **what future friction it prevents**

Then stop and wait. The user answers yes or no. Write only what they accept,
where they agreed to it, and write nothing before they have answered. Do not
batch the list into a single question.

## 4. Release the block

When the review is over — including when it found nothing — run:

```
{{RELEASE_COMMAND}}
```

Then tell the user that `/compact` will go through. The token is consumed as it
is honoured, so the compaction after that is reviewed too.
