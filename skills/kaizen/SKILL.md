---
name: kaizen
description: Update TODO.md and todo/ with where this session stopped and what is left, clearing what is done, then review the session's friction and turn each real finding into one precise amendment to a CLAUDE.md, a skill, the docs, or a code comment. Use it before compacting, or after a session that taught you something. Also clears the /compact block set by the PreCompact hook.
---

# Kaizen

Leave the next session a place to resume, then turn what this session learned the
hard way into instructions that outlive it.

You're the right reviewer because you still hold the context. Don't hand this to
a subagent reading the transcript.

## 0. Hand off in `TODO.md` — first, always

Before anything else, bring the handoff up to date at the session's primary
working directory. No confirmation: this is state, not a rule. `TODO.md` missing
→ create it. `todo/` is created by its first file, never empty.

### The layout

```
TODO.md          the index: short, read in full after every compaction
todo/<slug>.md   the full context of one item, only when it needs one
```

`TODO.md`, in the language of the project's `CLAUDE.md`, two fixed headings:

```markdown
# TODO

## Where we stopped
<the task in progress, the exact next action, branch, files, commands; what is
half done, what is verified and what is not>
Context: todo/<slug>.md

## Later
- <one line: the action and where> → todo/<slug>.md
- <one line that needs nothing more>
```

- `TODO.md` stays under about 100 lines. It is what a session reads after a
  compaction; every line of it costs context there.
- One line per item in `Later`. An item that needs more than three lines to be
  done cold — why, what was tried, constraints, commands, open questions — gets
  `todo/<slug>.md`, and its line ends with `→ todo/<slug>.md`.
- `Where we stopped` is rewritten on every run, ten to twenty lines. Nothing in
  progress → one line saying so. It links the `todo/` file of the task in
  progress when there is one.
- A `todo/` file is written for someone with none of this session's context:
  paths, commands, names, the state reached. No story.
- `<slug>`: lowercase, hyphens, what the item is (`oauth-migration`, not
  `item-3`).

### The cleanup, on every run

1. **New**: each thing we said we would do later becomes a line, with its
   `todo/` file when it needs one.
2. **Done**: an item finished in this session, or visibly finished in the repo
   (the commit, the code, the file is there), loses its line and its `todo/`
   file. Not sure it is done → keep it and append `(done? check <what>)`. Never
   drop an item for being old or untouched.
3. **Changed**: an item whose plan moved gets its line and its `todo/` file
   rewritten to the current state, not appended to.
4. **Links**: every `→ todo/…` resolves to a file, and every file in `todo/` has
   exactly one line pointing to it. A file with no line: still live → add its
   line; done → delete it. A link to nothing: find the file it meant, or keep the
   line and drop the link.
5. **Other headings** in an existing `TODO.md`: move their live content under
   the two headings, into `todo/` files if long.

A `TODO.md` over the budget, or a case variant (`todo.md`, `Todo.md`), is not
restructured here: update it in place, and propose the split or the rename in
step 5.

Then tell the user, in one line each: items added, items removed as done (with
the evidence), links fixed.

## 1. The bar

Do not look for something to propose. Zero findings is a complete answer, and the
usual one. A false finding costs more than it saves: it gets re-read every session
from here on, skimmed, misapplied, or quietly ignored, and it drags down the trust
in everything around it.

A finding is a friction **you hit yourself** in this session, and all four hold:

1. It came up naturally while you worked — navigating the code, running a
   command, using a tool — with the context you had, and it failed or misled you.
2. You had to find a workaround, and you can point to both: what failed, what
   worked.
3. You are sure the next session, with the same context, hits it again.
4. The fix is a deterministic instruction: someone who follows it does something
   different from someone who doesn't.

Throw out on sight:

- good practice that would be true in any repo
- a one-off slip that the context already prevented
- a preference, a style point, an idea for later (that goes to `TODO.md`)
- anything the target file already implies
- anything you can't state in three lines
- a story with no directive in it. The incident is not the finding; the rule you
  deduce from it is. No rule, no finding.

Nothing passes → say "No friction worth recording." and skip to step 5.

## 2. Pick the target, then read all of it

| Target | For |
|---|---|
| this project's `CLAUDE.md`, its traps section | a generic shell, git, container or CI trap: anything that bites regardless of what you were working on |
| this project's `CLAUDE.md`, another section | a rule of this repo, or a dated decision by its owner |
| a skill of this project — name it and the section | a trap or fact tied to one tool or workflow of a domain (test harness, editor, images, SEO, deployment): something you only need when doing that |
| the project's ops log (`LEADS.md` or equivalent) | a fact about the environment or production |
| `TODO.md` (step 0) / a ticket | work to do, not a rule |
| `README` or docs | something a user of the project needs |
| a code comment | a trap you can't see from where it bites |

Never `~/.claude/CLAUDE.md`. A lesson too general for one repo becomes a skill;
it doesn't move up a level. And never a "traps" skill: a skill is loaded when a
task needs a competence; a trap is what you didn't expect, so it must be in what
is always loaded, or next to the tool it belongs to.

Open the file and read the whole thing. Then decide:

- **it already says this** → drop the finding
- **it says something close, less sharply** → rewrite that line; don't add one
- **it says the opposite** → that's the finding: name the conflict and say which
  side should win
- **it has a section for this** → put it there; don't open a new one
- **it says it three times** → that's a finding too: keep one line, mark it
  **important** or **mandatory**, cut the others in the same edit

Before writing, `grep` the target for the parade you are about to add. The trap
rarely comes back with the same words; search for the command, the flag, the
error text.

## 3. Write it the way the file is written

- Same language as the file. A French `CLAUDE.md` gets French.
- Same vocabulary, same headings, same person, same tense.
- Telegraphic. No metaphors, no story, no wind-up, no "note that".
- Directive only: **symptom → cause → parade**, or **when X, do Y — not Z**. A
  table row when the section is a table.
- No date, no figure, no file name of the incident, no "how we knew". The proof
  goes in the commit message of the amendment, never in the file: git keeps it,
  the file doesn't have to.
- A `CLAUDE.md`, a code comment or a README states what is and what must be,
  never what was: no "an earlier version", "used to", "changed from X to Y".
  History belongs to git.
- One to three lines. Longer means you haven't found the point yet.
- Watch the net length. A project `CLAUDE.md` is loaded every session and stays
  under about 500 lines: an amendment that would cross that removes as much as
  it adds. If your line makes an older one redundant, cut the old one in the
  same edit.

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

## 5. Check the handoff wiring

Same protocol as step 4: one item, one yes or no.

- The project's `CLAUDE.md` opens with the handoff line. Missing, buried below,
  or worded otherwise → propose this at the top, in the file's language:

  ```markdown
  > Session handoff: read `TODO.md` first — where the last session stopped, and what is left.
  > Open a `todo/` file only for the item you work on. An item done → delete its line and its `todo/` file.
  ```

  No `CLAUDE.md` → propose creating one with those lines only.
- `TODO.md` over about 100 lines → propose the split: which items move to which
  `todo/<slug>.md`, and the resulting index. Show the plan, not the files.
- `TODO.md` under another case (`todo.md`, `Todo.md`) → propose the rename
  (`git mv` when tracked) and fix every reference to it.
- A file doing `TODO.md`'s job under another name — `SESSION_STATE*`,
  `session-state*`, `HANDOFF*`, `NEXT*` — at the root, in `docs/` or in
  `.claude/` → propose, per file: merge its live content into `TODO.md` and
  `todo/`, remove it (`git rm` when tracked), and fix every reference to it
  (`grep` the repo for its name).

Stay inside the working directory. Never `~/.claude/CLAUDE.md`.

## 6. Clear the block

When the review is done — including when it turned up nothing — run the release
**from the session's primary working directory**. The token is keyed by the
directory, and the shell keeps whatever one an earlier call left it in, so
releasing from the wrong place arms another project and the block comes back
here:

```
cd <primary working directory> \
  && {{RELEASE_COMMAND}}
```

It prints the token it wrote, and the name carries the directory. Read that line
before telling the user `/compact` will go through now. The token is spent as
it's honored, so the next compaction gets reviewed too.
