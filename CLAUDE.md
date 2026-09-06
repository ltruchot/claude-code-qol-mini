# Instructions — `vscode-comfy-claude-config`

A comfort harness for Claude Code, published at `ltruchot/vscode-comfy-claude-config`.
It has to work on **Linux, macOS, WSL and Windows**, in **VS Code and Cursor**.

**What it is for, which settles the trade-offs**: a model that is not working is a
model you could hand something to. Every signal answers *is it running* before it
answers anything else — hence green for activity, not for rest. Knowing at a glance
which session wants you is half of it; keeping the others busy is the other half.

**Language**: everything in this repo is written in **US English** — the README, the
code, its comments, this file, and commit messages. The repo is public. Commits
before September 2026 are in French; leave them.

**Style**: terse. No metaphors, no imagery, no wind-up. Name the trigger, then the
action. Say what was measured and what was assumed.

## What the harness does

| Feature | File | What you see |
|---|---|---|
| Context status line | `statusline/context.py` | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · my-project` |
| Notification sounds | `sounds/play.py`, `sounds/generate.py` | two rising notes when Claude wants you, one low note when a turn or a `/compact` ends |
| Tab marker | `hooks/tab-state.py` | 🟢 working (subagent and compaction included) · 🔴 blocked on you · 🟡 idle |
| Kaizen review | `hooks/precompact-kaizen.py`, `skills/kaizen/SKILL.md` | `/compact` stops and tells you to run `/kaizen`; once reviewed, it goes through |

Install with `install.py` (`install.sh` / `install.ps1` wrap it), uninstall with the
symmetric script, set the editor with `install-vscode.py`, check with `test.sh`.

With no arguments and a real terminal, `install.py` **asks**: gauge and its two
thresholds, sounds, kaizen, tab marker. Pass any option — or give it a `stdin` that
is not a terminal — and it asks nothing. A prompt that blocks a CI runner is a bug.

## Constraints you cannot guess from the code

Each one cost something in a real session.

### `terminalSequence` is a ROOT field of a hook's output

The published schema shows it inside `hookSpecificOutput`. **The runtime reads it at
the root** (`if (e.terminalSequence)`). Nested, it is **ignored silently**: no error,
no warning.

Measured before the fix: **eleven invocations, four event types, the right sequence
produced every time, nothing on screen.** A correct producer whose output goes
nowhere looks exactly like an unimplemented feature.

*Do*: keep the `test.sh` check that requires the field at the root and **absent**
from `hookSpecificOutput`. Only **OSC 0/1/2/9/99/777 and BEL** pass the runtime's
allowlist.
*Don't*: trust a published schema when the behavior contradicts it. Read the binary
(`grep -a`).

### The tab marker needs THREE things at once

1. `"terminal.integrated.tabs.title": "${sequence}"` in the editor — without it the
   tab is titled after the process name and no sequence ever shows.
2. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` in the `env` block. **Claude Code emits its
   own OSC 0 title — an animated spinner plus the conversation name — and redraws it
   continuously**, so it always wins against ours.
3. The root-level field, above.

Miss one and nothing appears. **None of the three reports its absence.**

*Don't*: try to color the tab **icon**. VS Code exposes no sequence for the icon or
its color; only the extension that created the terminal can set them, **at creation
time**. The request to Anthropic (issue 56925) is closed as "not planned" for that
reason. The marker is a character in the **name**, never a dot on the icon.

*Don't*: expect animation. Hooks fire on events, not on a clock, so the marker is a
stable state. Same reason Claude Code has to be silenced: only something that redraws
continuously can animate.

*No "session ended" state*: observed in use, it never shows, or shows for a few
milliseconds. Likely cause — the shell repaints its own title as soon as Claude Code
returns the prompt — **unverified**. What is certain is that nobody sees it, and a
state nobody sees is not worth carrying. `SessionEnd` stays in `EVENTS` with no
handler: the purge is what removes it from older installs.

*What it costs, and the cost is real*: `${sequence}` applies to **every** terminal. A
zsh tab stops showing `zsh` and shows `user@host:/some/long/path`. Hence `--tab-state`
as an option rather than a default, and `install-vscode.py --revert`.

### `settings.json` is re-read hot, its `env` block is not

Measured: a session started at 09:58 fired hooks installed at 14:29. **Hooks reload
without a restart.** The `env` block is read at startup, which is why the installer
asks for a new session only for `--tab-state`.

*Don't*: ask for a full restart out of reflex. And note that **reloading the editor
window restarts nothing**: the server reconnects to the existing processes.

### A hook has no terminal, and its `stderr` is read by the user

`/dev/tty` is not reachable from a hook. That is what `terminalSequence` is for: it
makes Claude Code write on the hook's behalf.

### A `PreCompact` hook can hand Claude NOTHING

The most expensive constraint here, because it is invisible: the mechanism *looks*
like it works.

The reference says it in as many words: *"Exit with code 2 to block compaction. For a
manual `/compact`, the stderr message is shown to the **user**."* The binary agrees —
the blocking function logs, then throws out of the compaction path. It never returns
to the conversation:

```js
n(`Compaction blocked by PreCompact hook: ${e.blockedBy}`,{level:"warn"});
… throw new R0(`${z5e}: ${e.blockedBy}`)
```

There is no back door: `PreCompact` does **not** accept `additionalContext` (only
root-level `decision`/`reason`), and `PostCompact` carries no decision at all.

*What that produced*: the first version printed its whole review brief on `stderr`
and assumed Claude would read it. **Claude never saw a line of it.** Every review
that appeared to work was one the user had asked for in their next message. The
mechanism never fired once on its own, and nothing said so.

*Do*: treat `stderr` as what it is — **two lines addressed to a human**, naming the
command to type. The work lives in a **skill** (`/kaizen`) the user invokes, never in
the hook.

*Don't*: read "exit 2 sends stderr back to Claude" off the exit-code table. That
holds for `PreToolUse`, `Stop`, `PostToolUse` — **not** for `PreCompact`,
`SessionStart`, `SubagentStart`, `PostModelSwitch`, where the per-event table says
*shows stderr to user only*. Read the table by row.

A lesson has two possible destinations: the `CLAUDE.md` of the repo it concerns, or a
named **skill**. Never `~/.claude/CLAUDE.md` — a lesson too general for one repo
becomes a skill, it does not move up a level. Loïc's call: a user-level file applies
to every project without having been chosen for any of them.

### No turn brackets a compaction, and an event's hooks run concurrently

Nothing else moves the marker during a `/compact`: `Stop` already fired, and
`UserPromptSubmit` does not fire on a built-in command. The tab used to sit yellow
through minutes of work. `PreCompact` turns it green, `PostCompact` returns it to
yellow and rings the end.

*Do*: match `manual` on `PostCompact`. An automatic compaction fires mid-turn and the
work continues after it — ringing there is the beep for nothing, already fixed once
for subagents.

*Don't*: register two hooks that emit a `terminalSequence` on the same event. The
runtime starts them all and waits for the set (`await Promise.all`), applying each
one's sequence: two markers on one event race, and the last to land wins.

Hence the `PreCompact` wiring: one hook, and it is `precompact-kaizen.py`, the only
one that knows whether the compaction will happen. It imports `hook_output()` from
`tab-state.py` through the path the installer passes as `--marker`. Green if it lets
the compaction run, **red if it holds it back** — a held-back compaction is the
definition of blocked on you. Without kaizen, `tab-state.py` takes `PreCompact`;
without the tab marker, no `--marker` and nothing is emitted.

*Verified in the binary*: on the blocking path the JSON output is parsed and the
sequence applied **before** the exit status is looked at. `exit 2` and a marker are
not mutually exclusive.

*Not yet observed*: what the dim post-compaction line now shows. It repeats each
hook's `stdout` (`PreCompact [...] completed successfully: …`), so our JSON will
probably land there. The online docs are silent; they only say that for most events
`stdout` goes to the debug log. Check at the next `/compact`: if it is unreadable,
drop the `PreCompact` marker and leave the rest.

### The release token is keyed on the DIRECTORY, not the session

The skill has to write it from a plain shell, and it knows **where** it is far better
than **who** it is. Two consequences, both wanted: running `/kaizen` by hand arms the
next `/compact`, and a review done in one project does not unblock compaction in
another — a collision actually observed, two sessions overwriting the same state file.

### Hooks are registered in exec form, never as a shell string

`{"type": "command", "command": <interpreter>, "args": [<script>, <arg>]}`.

That is what makes a path with spaces — `C:\Program Files\…`, ordinary on Windows —
work the same everywhere, with no dependency on Git Bash. The interpreter is
`sys.executable`, the one that ran the installer: it exists by construction, where
resolving `python3` would pick the wrong thing on Windows.

Same reason **the sound player is Python** and not shell: on Windows without Git
Bash, Claude Code runs hooks through PowerShell. `winsound`, from the standard
library, gives Windows audio with no external player.

### An installer overwrites nothing: it creates, it leaves, or it refuses

`install.py` computes everything it would write, then compares. Three outcomes and no
others: the file is missing, it writes it; identical, it leaves it; different, **it
writes nothing at all** — not that file, not the others, not `settings.json` — names
the files and returns. `--replace` is the only way to overwrite.

The reason: an installer cannot tell an old version from a deliberate edit. And a
partial refusal would be worse than overwriting, hence the full plan before any
write: a refused run leaves nothing half-installed.

`settings.json` is rewritten only if the merge actually changes it — otherwise no
write, and **no extra `.bak-`**. A second identical install prints one line and stops.
`uninstall.py` follows the same rule.

*Don't*: regenerate the sounds. The README invites you to drop your own WAV over
them, so `generate.py` skips a file that is already there and needs `--force` to
overwrite. The version before this recreated them on every install and silently undid
that.

### An installer that adds must also remove

`install.py` purges **its own** handlers before laying back the enabled ones,
otherwise turning a feature off leaves its hooks behind. Observed on a real config,
not assumed.

The `OURS` list also carries `sounds/play.sh`, the **old** shell player: without that
migration marker, an update left two orphan hooks pointing at a deleted file.

*Do*: when a delivered file is renamed, add the old name to `OURS`.

### An editor's `settings.json` is JSONC

It can hold comments and trailing commas. Parsing and reserializing would drop them
silently. `install-vscode.py` inserts the key **textually** after the opening brace
and leaves the rest byte for byte. Tested against a fixture with a line comment, a
block comment and a trailing comma: all three survive.

### The status line gauge targets the THRESHOLD, not the window

On a 1M model, 200k is 20% of the window: a window-relative gauge would be nearly
empty at the exact moment the alert has to show. Bar and fraction share one
denominator — `250/200k` is the signal. The unit sits on the denominator alone,
because `0k/200k` reads as the word "Ok" before it reads as a count.

## Method: how these were found

- **Instrument the installed copy, not the repo.** Hook scripts are re-read on every
  invocation, so a probe added to `~/.claude/hooks/…` takes effect **without a
  restart**. That is what proved hooks were firing while nothing showed. Check
  `git status` and remove the probe afterwards.
- **Wake another session with `SendMessage`** to make its hooks fire without
  disturbing the user.
- **`grep -a` on a binary.** Without `-a`, `grep` stays quiet on a binary and a count
  of zero reads as an absence: six strings reported as "0 occurrences" were all there.
- **`/proc/PID/environ` is frozen at `exec`**: it cannot see a variable set by
  `settings.json`, which Node applies in `process.env`. A check that uses it for that
  proves nothing.
- **Verify a negative result before concluding.** Twice in one session an
  unsuccessful search was taken as proof of absence, and both times it was wrong.

## What is verified, and what is not

**Verified on this machine** (WSL2 + Cursor installed on the Windows side): the
install → reinstall with different options → uninstall cycle, preserving `model`,
`permissions`, `enabledPlugins`, `autoMode` and hooks written by the user; the purge
of disabled options; the tab marker **seen on screen**; the 68 checks in `test.sh`.

**Never run on a real machine**: the **macOS** and **native Windows** paths —
`afplay`, `winsound`, and each editor's settings location. Written from documented
behavior. The README says so plainly; do not let anyone believe three platforms were
tested.

## Open threads

- **The marker format is still open.** Settable without touching the code through
  `CC_TAB_WORKING`, `CC_TAB_BLOCKED`, `CC_TAB_IDLE` in the `env` block — emoji,
  `[..]`, `(working)`. Emoji render correctly; what reads best in a list is untested.
  The colors are settled: **green = running**, the state you want to see; **red is
  spent on blocking only** — permission, question, choice — or it stops meaning
  anything; **yellow for idle**. Orange was tried twice for idle and read as red from
  across a tab strip, so the only safe distance from red is yellow.
- **A warning triangle appeared on every tab** in the terminal list, absent from
  earlier screenshots. Cause unknown, never investigated. The hover tooltip will say.
- **The `auto` branch triggers no review, and that is final.** It went through
  `additionalContext`; the reference shows `PreCompact` does not accept it and
  `PostCompact` has no decision control. There is no way to trigger a review on an
  automatic compaction. It passes, setting the green marker and nothing else.
- **The full `/compact` with markers has not been seen yet.** Green at the start,
  yellow and a sound at the end: wired, checked outside the runtime by `test.sh`,
  never observed in a real session. Two things to watch at the next one: the dim
  post-compaction line, which repeats each hook's `stdout` and will probably show our
  JSON; and `PreCompact`'s `stdout`, which the binary feeds into the compaction
  instructions (`newCustomInstructions`). If either is dirty, the `PreCompact` marker
  comes out on its own — the sound and the yellow from `PostCompact` do not depend on
  it.
- **The full `/kaizen` path has not run for real**: the block has been seen and
  `--release` is covered by `test.sh`, but the `/compact` → `/kaizen` → `/compact`
  sequence remains to be observed in a session. Its three real passes each exposed a
  defect: `stderr` dumped on screen, a token that proved nothing, then `stderr` not
  reaching Claude at all.

## Testing

```bash
./test.sh                           # 68 checks, installs nothing
./install.sh --tab-state --replace  # without --replace, an edited file makes it refuse
./install-vscode.sh                 # sets the editor, then start a NEW session
./uninstall.sh                      # removes what we laid down, and nothing else
```

`CLAUDE_CONFIG_DIR` points the install at a throwaway folder. That is how a full cycle
is exercised without touching a real configuration.
