# vscode-comfy-claude-config

A small, comfortable [Claude Code](https://code.claude.com) setup: a status line
that always shows how much context you are carrying, two sounds that tell you
when Claude needs you and when it has finished, and a review at compaction time
so the same pitfall is not paid twice. An opt-in marker on the terminal tab is
available too, with its cost spelled out below.

It is built around one idea: **a model that is not working is a model you could
be giving something to.** So the signals answer *is it running* before they
answer anything else — green means work is happening, and anything that is not
green is a session asking for something, an answer or a next task. Knowing which
one needs you at a glance is half of it; keeping them all busy is the other half.

Everything lives in your Claude Code config directory. Nothing is tied to a
machine, an account, or a project. Re-running the installer changes nothing
unless something actually differs.

```
Opus 5 (1M context)  ▓▓▓▓░░░░░░  88/200k     · my-project    green
Opus 5 (1M context)  ▓▓▓▓▓▓░░░░  121/200k    · my-project    orange
Opus 5 (1M context)  ▓▓▓▓▓▓▓▓▓▓  ! 250/200k  · my-project    red
```

## Quick start

```bash
git clone https://github.com/ltruchot/vscode-comfy-claude-config.git
cd vscode-comfy-claude-config
./install.sh          # answer the questions
./install-vscode.sh   # only if you said yes to the tab marker
```

Then **restart Claude Code itself**. `settings.json` is read at startup, and
reloading the editor window is not enough: it reconnects to the terminals that
are already running.

On Windows PowerShell, run `.\install.ps1` and `.\install-vscode.ps1` instead —
or `python install.py` if script execution is blocked.

`python3` is the only prerequisite, plus an audio player on Linux and WSL if you
want the sounds. See [Requirements](#requirements).

### What it asks

One feature at a time, the default in brackets, Enter to accept it:

```
  Context gauge in the status line? [Y/n]
  Orange at how many tokens? [100000]
  Red at how many tokens? [200000]
  Notification sounds? [Y/n]
  Friction review before /compact, via /kaizen? [Y/n]
  Terminal tab marker? [y/N]
```

The tab marker is the only one that is off by default, and the only one that
needs `install-vscode` and a new session. It retitles **every** terminal, not
just Claude's — see [the tab marker](#the-terminal-tab-marker-vs-code-and-cursor)
for what that costs and how to undo it.

Everything goes into `$CLAUDE_CONFIG_DIR`, or `~/.claude` when that variable is
unset. Your `settings.json` is **merged**, not replaced, and copied to
`settings.json.bak-<timestamp>` first, so your own permissions, plugins and
environment survive.

### Options

Pass any of these and it asks nothing.

| Option | Effect |
|---|---|
| `--no-statusline` | leave the context gauge out |
| `--no-sounds` | leave the notification sounds out |
| `--tab-state` | add the terminal tab marker |
| `--no-kaizen` | leave the `/compact` friction review out |
| `--warn N` | gauge turns orange at N tokens (default 100000) |
| `--alert N` | gauge turns red at N tokens (default 200000) |
| `--defaults` | take every default, ask nothing |
| `--replace` | overwrite delivered files that differ |

The two thresholds also read from `CC_CONTEXT_WARN` and `CC_CONTEXT_ALERT`.

### Update

```bash
git pull
./install.sh --replace
```

`--replace` is needed because the installer never overwrites on its own: a file
that differs could be an old version or an edit you made on purpose, and it will
not guess. It stops before writing anything, names the files, and leaves the
choice to you — remove them, `./uninstall.sh`, or `--replace`.

Your sounds are the exception in the other direction: they are never rewritten,
so a WAV you dropped in survives every update.

### Running it twice

Nothing happens.

```
Already installed in /home/you/.claude, with these settings. Nothing changed.
```

No file is touched, no backup is left behind, and `./uninstall.sh` says the same
when there is nothing of ours left. Re-running the interview is safe too: the
brackets hold what is installed right now, so pressing Enter through it keeps
your current setup rather than resetting it.

### Uninstall

```bash
./uninstall.sh        # .\uninstall.ps1 on Windows PowerShell
```

Removes what the installer added, and nothing else.

### Requirements

- **python3** — runs the status line and builds the sounds. Already there on
  most systems; `xcode-select --install` on macOS, `sudo apt install python3` on
  Debian and Ubuntu, [python.org](https://www.python.org/downloads/) on Windows.
- **An audio player**, only for the sounds. Windows and macOS need nothing —
  `winsound` ships with Python, `afplay` with macOS. On Linux and WSL any one of
  `paplay`, `pw-play`, `aplay`, `ffplay`, `mpv` or `play` will do.

No shell is required for the hooks: they are registered in exec form, naming the
interpreter and its arguments directly, so nothing depends on Git Bash or on how
a path with spaces would be quoted.

**Where it has run.** Every path is written to behave the same on Linux, macOS,
WSL and Windows, and one implementation serves all four. Verified end to end on
Linux and WSL2. The macOS and Windows paths follow documented behavior and have
not yet been run on a real machine — if you get there first, an issue saying
what happened is worth a lot.

## The status line

It reads the native `context_window` object that Claude Code hands to every
status line command, so the number is the real size of what gets re-sent on each
request, prompt cache included.

**The gauge fills toward the alert threshold, not toward the context window.**
On a 1M model, 200k is 20% of the window: a window-relative gauge would still
look nearly empty at the exact moment you want to be warned. The readout uses
the same denominator, which is why crossing it reads as `250/200k` rather than
shrinking away against a large number.

| | Default | Environment variable |
|---|---|---|
| green below | 100k | `CC_CONTEXT_WARN` |
| orange from | 100k | `CC_CONTEXT_WARN` |
| red from | 200k | `CC_CONTEXT_ALERT` |

Set them in the `env` block of your `settings.json`:

```json
{ "env": { "CC_CONTEXT_WARN": "60000", "CC_CONTEXT_ALERT": "150000" } }
```

Claude Code populates the count only after the first API response of a session,
so during that gap the status line falls back to reading the session transcript.
On a genuinely fresh session, before the first exchange, no token count exists
anywhere yet and it shows `0k`.

## The sounds

Two different events, so two different sounds:

| Sound | Hook | Fires when |
|---|---|---|
| `needs-you` — two rising notes | `Notification`, matching `permission_prompt`, `agent_needs_input`, `elicitation_dialog`, `elicitation_url_dialog` | Claude cannot go on without you: a permission, a question, a choice. Not `idle_prompt` — nothing is asked of you there |
| `done` — one lower, quieter note | `Stop`, and `PostCompact` matching `manual` | Claude finished responding, once per turn. Silent when the turn ended only to wait on a subagent or a background command. A `/compact` can run for minutes with nothing on screen, so the end of one rings too |

Playback is detached, so a slow audio device never delays a turn, and every
failure path exits 0: a missing file or a dead audio server cannot disturb the
session.

### Use your own sounds

The sounds live here:

```
~/.claude/sounds/          (or $CLAUDE_CONFIG_DIR/sounds/)
├── needs-you.wav          ← played when Claude is waiting for you
└── done.wav               ← played when Claude has finished
```

**Drop your file into that folder and give it one of those two names.** That is
the whole procedure — nothing to edit, nothing to restart, since the player
resolves the file at each call.

- Open the folder in your file manager and drag the file in. On macOS, Finder's
  <kbd>⇧⌘G</kbd> takes `~/.claude/sounds`. On Windows with WSL, type
  `\\wsl$` in the Explorer address bar, then browse to your home directory. In
  VS Code, `File > Open Folder` on `~/.claude/sounds` lets you drag files
  straight into the explorer pane.
- Or from a terminal: `cp ~/Downloads/ping.wav ~/.claude/sounds/needs-you.wav`

Accepted extensions: `.wav`, `.ogg`, `.flac`, `.mp3`, `.m4a`, `.aiff`, `.aif` —
the first match for the name wins, so remove the old file if you add a different
extension.

**Prefer a short `.wav`**, under a second. It is the only format every player on
every platform reads without a decoder, and a long sound that overlaps the next
turn gets tiresome quickly.

To go back to the built-in sounds:

```bash
python3 sounds/generate.py ~/.claude/sounds
```

Edit the frequencies and durations at the bottom of that file if you would
rather tune them than replace them.

### If you hear nothing

1. Check the file plays on its own: `paplay ~/.claude/sounds/done.wav` on Linux
   or WSL, `afplay ~/.claude/sounds/done.wav` on macOS.
2. Check the hooks are registered: run `/hooks` inside Claude Code.
3. On WSL, audio goes through the Windows session — check the volume mixer on
   the Windows side, not only inside Linux.

### Turning the sounds off

`./install.sh --no-sounds` keeps the rest and drops them; `./uninstall.sh`
removes everything.

## The terminal tab marker (VS Code and Cursor)

A colored marker in front of the terminal name, so a wall of identical `claude`
tabs tells you which one wants you:

```
🟢 my-project      working
🔴 my-project      blocked on you: a permission, a choice, or a turn ending on a question
🟡 my-project      idle — free, and waiting for something to do
```

**Green is the state you want to see.** The marker exists to keep sessions busy
as much as to tell you which one needs you, so the first question it answers is
*is it running*. Two tabs out of green are two tabs to deal with: one wants an
answer, the other wants work.

Red is spent on one thing: Claude cannot go on without you. Idle gets its own
marker because *nothing is asked of you* and *answer me* are different
situations, and a red that fires for both stops meaning anything.

Idle is yellow rather than orange. Orange was tried twice and read as red from
across a tab strip — the eye catches the warm/cold split long before it resolves
orange from red, so the only safe distance from red is yellow.

There is no marker for a session that has ended: in use it never shows, or
shows for a few milliseconds — most likely because the shell repaints its own
title the moment Claude Code hands back the prompt. A state nobody sees is not
worth carrying.

Green also covers a turn that ended only to wait on background work — a
subagent, a workflow, a `run_in_background` command, a scheduled wakeup. The
session resumes on its own there, so it neither rests nor calls you, and no
sound plays. `Stop` carries `background_tasks` and `session_crons` for exactly
this distinction. If the session turns out to be idle after all, `idle_prompt`
fires about a minute later and the marker settles to yellow.

Green is reclaimed at every moment work resumes, not only when you submit a
prompt. No event fires when the model starts thinking — the documented cycle is
`PreToolUse`, the tool, `PostToolUse`, `PostToolBatch`, then the model call — so
the marker rides `PostToolBatch`, which lands just before that call, and
`SubagentStop`. Only the main thread turns the tab green: a subagent fires
`PostToolBatch` on its own loop, and those land after the orchestrator has
already finished and gone yellow. Without them the tab stays red from the permission prompt or the
question you just answered, through however long the answer takes.

Green covers a compaction too. No turn brackets a `/compact`, so nothing else
moves the marker and the tab would sit idle for however long it takes:
`PreCompact` turns it green, `PostCompact` puts it back to yellow and rings the
`done` sound. A compaction held back by the friction review goes red instead —
nothing runs until you answer. Only a manual compaction ends in yellow; an
automatic one fires mid-turn and the work goes on after it.

Install it with `./install.sh --tab-state`, then `./install-vscode.sh`, then
**start a new session** — one piece of it is read only at startup.

It is opt-in rather than default because of what it costs, below.

### The three things that have to line up

Each was paid for in a wrong diagnosis, so they are worth stating plainly.

1. **`"terminal.integrated.tabs.title": "${sequence}"`** — without it the tab is
   titled after the process name and no sequence is ever displayed.
   `install-vscode.sh` writes it.
2. **`CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1`** — Claude Code emits its own OSC 0
   title, an animated spinner plus the conversation name, and *redraws it
   continuously*. It therefore wins every race against the marker, not merely
   some. `install.sh --tab-state` puts this in the `env` block of your
   `settings.json`; the `env` block is read at startup, which is why a new
   session is needed. The trade is real: you lose the animated spinner and the
   conversation name in exchange for a state marker that is actually visible.
3. **`terminalSequence` is a top-level field of the hook output**, not a member
   of `hookSpecificOutput`. Nested — which is how the published schema shows it
   — it is dropped in silence: no error, no warning, a correct sequence going
   nowhere. Only OSC 0/1/2/9/99/777 and BEL pass the runtime's allowlist.

### What it costs

`${sequence}` applies to *every* terminal, and every program that sets a title
now owns its tab. A plain zsh or bash tab stops reading `zsh` and starts reading
`you@host:~/some/very/long/path`, which is longer, less useful, and puts your
username on screen. On a list of mostly-Claude tabs the marker is worth it; on a
mixed list it often is not. `./install-vscode.sh --revert` undoes the setting.

You can also just shorten what your shell announces, which keeps the marker and
loses the long path. On oh-my-zsh, add this **after** `source $ZSH/oh-my-zsh.sh`
— `lib/termsupport.zsh` assigns it plainly, so an earlier line is overwritten:

```zsh
ZSH_THEME_TERM_TITLE_IDLE="%1~"   # the current folder, nothing else
```

Bash equivalent, for a `PROMPT_COMMAND` that sets the title:

```bash
PROMPT_COMMAND='printf "\033]0;%s\007" "${PWD##*/}"'
```

### Changing the markers

Set `CC_TAB_WORKING`, `CC_TAB_BLOCKED` or `CC_TAB_IDLE` in the `env` block of
your `settings.json` — an emoji, an ASCII tag like `[..]`, a word like
`(working)`, anything the tab renders. An empty value drops that marker.

There is no animation to be had: the hooks fire on events, not on a clock, so
the marker is a stable state and never a spinner. That is the same reason
Claude Code has to be silenced — only whoever redraws continuously can animate.

### What it is not

The marker is an emoji in the tab **name**, never the tab's icon or its color.
VS Code exposes no escape sequence for those, and only the extension that
created a terminal can set them, at creation time, via
`window.createTerminal({ iconPath, color })`. The
[request to have Claude Code do it](https://github.com/anthropics/claude-code/issues/56925)
was closed as not planned for that reason.

The hook does not write to the terminal itself: hooks run without a controlling
terminal, so they hand the sequence to Claude Code through `terminalSequence`,
and it does the writing.

## Kaizen: reviewing friction before it is summarized away

Compaction is the moment a session's hard-won detail is about to be summarized
away, which makes it exactly the right moment to ask what should outlive it.

With this installed, `/compact` stops with one line:

```
Compaction held back: this session's friction has not been reviewed.
Run /kaizen to review it, then /compact again.
```

`/kaizen` is a skill. It looks back over what actually caused friction — a wrong
assumption undone, a command that failed for a non-obvious reason, a convention
got wrong — and turns each one into a **concrete amendment**, naming the file it
would change: this project's `CLAUDE.md`, a skill, the documentation, or a
comment at the spot where the trap bites. Items come **one at a time**, and you
answer yes or no. Only what you accept is written.

The bar is deliberately high, because a bad amendment costs more than no
amendment: it is re-read on every future session, skimmed, and misapplied. A
finding must have cost something in this session, carry its evidence, and reduce
to a deterministic instruction stated in two to five lines. It is written in the
target file's own language and style, after reading that file in full — so it
lands in the section that already covers the subject, sharpens the line that
half-covered it, or is dropped because the file said it already. Finding nothing
is the normal outcome.

The review then releases the block, and `/compact` goes through. The token is
consumed as it is honored, so the next compaction is armed again. You can also
run `/kaizen` on its own at any time; doing so arms the next `/compact` too.

Three design points that are not arbitrary:

- **The hook cannot run the review, and it does not try.** A `PreCompact` hook
  has no way to hand Claude any work: `exit 2` blocks the compaction and shows
  stderr *to the user*, which the
  [reference](https://code.claude.com/docs/en/hooks) states outright and the
  binary confirms by throwing out of the compaction path. An earlier version
  printed a review brief on stderr and assumed Claude would act on it — Claude
  never saw a word of it. So the hook prints two lines addressed to you, and the
  work lives in a skill you invoke.
- **Automatic compaction is never blocked.** It fires because the context is
  full; refusing it could leave the session with nowhere to go. And there is
  nothing useful to do on that path either: `PreCompact` takes no
  `additionalContext`, and `PostCompact`'s stdout reaches the debug log only. So
  `auto` passes in silence.
- **The token is keyed to the working directory, not the session.** The skill
  has to write it from a plain shell, where it knows where it is far more
  reliably than which session it is; and a review done in one project must not
  release another project's compaction. An earlier version had the *hook* write
  the token as it blocked, so the next attempt would pass — which made the
  signal mean *you already tried once* rather than *the review happened*.

Every failure path exits 0: an unreadable payload or an unwritable state
directory must never make `/compact` unusable. If you want out of a review
without doing it, write the token yourself:

```bash
python3 ~/.claude/hooks/precompact-kaizen.py --release
```

Skip the whole thing with `./install.sh --no-kaizen`.

## What gets written

```
$CLAUDE_CONFIG_DIR/
├── statusline-context.py
├── hooks/
│   ├── tab-state.py
│   └── precompact-kaizen.py
├── skills/
│   └── kaizen/SKILL.md    the review /kaizen runs
├── state/                 release tokens, one per project directory
├── sounds/
│   ├── play.py
│   ├── needs-you.wav
│   └── done.wav
└── settings.json          merged: statusLine, and the hooks for
                           Notification, Stop, UserPromptSubmit,
                           SessionStart, PostToolBatch, SubagentStop,
                           PreCompact and PostCompact
```

## References

- [Status line](https://code.claude.com/docs/en/statusline) and its
  [context window fields](https://code.claude.com/docs/en/statusline#context-window-fields)
- [Hooks](https://code.claude.com/docs/en/hooks)
