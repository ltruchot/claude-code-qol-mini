---
name: kaizen
description: Review this session's friction and turn each real finding into one precise amendment to a CLAUDE.md, a skill, the docs, or a code comment. Use it before compacting, or after a session that taught you something. Also clears the /compact block set by the PreCompact hook.
---

# Kaizen

Turn what this session learned the hard way into instructions that outlive it.

You're the right reviewer because you still hold the context. Don't hand this to
a subagent reading the transcript.

Expect few findings. Usually none. A real one lands like a eureka: obvious the
moment it's said. Anything short of that is a false finding, and a false finding
costs more than it saves — it gets re-read every session from here on, skimmed,
misapplied, or quietly ignored, and it drags down the trust in everything around
it.

## 1. The bar

Keep a finding only if all four hold:

1. It cost you something **in this session** — a wrong turn, a failed command, a
   rule you broke, a belief a measurement contradicted.
2. You can point to the evidence: what you did, what happened.
3. The fix is a deterministic instruction, not advice.
4. Someone who follows it does something different from someone who doesn't.

Throw out on sight:

- good practice that would be true in any repo
- anything the target file already implies
- anything you can't state in three lines — if it's fuzzy now, it's dead weight
  later
- anything whose only effect is to make the file longer

Finding nothing is the normal outcome. Say so and skip to step 5.

## 2. Pick the target, then read all of it

| Target | For |
|---|---|
| this project's `CLAUDE.md` | a constraint specific to this repo |
| a skill — name it, say whether it exists | a lesson that outlives this repo |
| `README` or docs | something a user of the project needs |
| a code comment | a trap you can't see from where it bites |

Never `~/.claude/CLAUDE.md`. A lesson too general for one repo becomes a skill;
it doesn't move up a level.

Open the file and read the whole thing. Then decide:

- **it already says this** → drop the finding
- **it says something close, less sharply** → rewrite that line; don't add one
- **it says the opposite** → that's the finding: name the conflict and say which
  side should win
- **it has a section for this** → put it there; don't open a new one

## 3. Write it the way the file is written

- Same language as the file. A French `CLAUDE.md` gets French.
- Same vocabulary, same headings, same person, same tense.
- Telegraphic. No metaphors, no story, no wind-up, no "note that".
- Name the trigger, then the action, in the imperative.
- Two to five lines. Longer means you haven't found the point yet.
- Watch the net length: if your line makes an older one redundant, cut the old
  one in the same edit.

Shape it as **when X, do Y — not Z.** Bring in the evidence only where it's what
makes Y believable.

## 4. One at a time

Per item, three short blocks and nothing else:

- **Cost** — what happened here, a line or two
- **Amendment** — the file, the section, and the exact text, already written in
  the target's language and style
- **Trigger** — the moment someone reads it and acts on it

Then stop and wait. The user says yes or no. Write only what they accept. Never
bundle items into one question.

After each accepted edit, re-read the section. It has to read in one voice, with
nothing saying twice what another line already says once.

Once the last item is settled, read the whole file again. If the new lines left
it repetitive or self-contradictory, that's an item too — propose the cut the
same way.

## 5. Clear the block

When the review is done — including when it turned up nothing — run:

```
{{RELEASE_COMMAND}}
```

Then tell the user `/compact` will go through now. The token is spent as it's
honored, so the next compaction gets reviewed too.
