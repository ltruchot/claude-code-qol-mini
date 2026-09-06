---
name: kaizen
description: Review this session's friction and turn each real finding into one precise amendment to a CLAUDE.md, a skill, the docs or a code comment. Use before compacting, or after a session that taught something. Also releases the /compact block set by the PreCompact hook.
---

# Kaizen

Turn friction from this session into instructions that outlive it.

You are the reviewer because you still hold the context. Do not delegate to a
subagent reading the transcript.

Expect few findings. Usually none. A finding is a eureka: obvious once stated.
Anything less is a false one, and a false one costs more than it saves — it is
read on every future session, skimmed, misread, or silently ignored, and it
makes the file around it harder to trust.

## 1. The bar

A finding qualifies only if all four hold:

1. It cost something **in this session**: a wrong turn taken, a command that
   failed, a rule broken, a belief contradicted by a measurement.
2. You can cite the evidence — what was done, what happened.
3. The fix is a deterministic instruction, not advice.
4. Someone who follows it acts differently from someone who does not.

Reject on sight:

- good practice that is true in any repo
- anything the target file already implies
- anything you cannot state in three lines — unclear now means unusable later
- anything whose only effect is to make the file longer

No finding is the normal outcome. Say so plainly and go to step 5.

## 2. Pick the target, then read it in full

| Target | For |
|---|---|
| this project's `CLAUDE.md` | a constraint specific to this repo |
| a skill — name it, say if it exists | a lesson that outlives this repo |
| `README` / docs | something a user of the project needs |
| a code comment | a trap invisible at the point it bites |

Never `~/.claude/CLAUDE.md`. A lesson too general for one repo becomes a skill;
it does not move up a level.

Open the file. All of it. Then decide:

- **already stated** → drop the finding
- **stated nearby, less precisely** → edit that line; do not add one
- **contradicted** → that is the finding: report the conflict, propose which
  side wins
- **belongs to an existing section** → put it there; do not open a new one

## 3. Write it in the file's own terms

- Same language as the file. A French `CLAUDE.md` gets French.
- Same vocabulary, same headings, same person and tense, same conventions.
- Telegraphic. No metaphor, no narrative, no preamble, no "note that".
- State the trigger, then the action, in the imperative.
- Two to five lines. Longer means the point is not found yet.
- Net length counts. If the amendment makes an older line redundant, delete that
  line in the same edit.

Shape: **when X — do Y, not Z.** Add the evidence only where it is what makes Y
credible.

## 4. Propose one at a time

Per item, three short blocks, nothing else:

- **Cost** — what happened here, one or two lines
- **Amendment** — file, section, and the exact text, already written in the
  target's language and style
- **Trigger** — the situation in which someone reads it and acts

Then stop and wait. The user answers yes or no. Write only what is accepted.
Never batch items into one question.

After each accepted write, re-read the section: it must read as one voice, with
no line now saying twice what another says once.

When the last item is settled, re-read the whole file once. If the additions
made it repetitive or self-contradictory, that is itself an item — propose the
cut the same way.

## 5. Release

When the review is over — including when it found nothing — run:

```
{{RELEASE_COMMAND}}
```

Then tell the user `/compact` will go through. The token is consumed as it is
honoured, so the next compaction is reviewed too.
