# vscode-comfy-claude-config

A small, comfortable [Claude Code](https://code.claude.com) setup: a status line
that always shows how much context you are carrying, two sounds that tell you
when Claude wants you and when it has stopped working, a coloured marker on the
VS Code terminal tab so you can see which session needs you, and a review at
compaction time so the same pitfall is not paid twice.

Everything lives in your Claude Code config directory. Nothing here is tied to a
machine, an account, or a project.

```
Opus 5 (1M context)  ▓▓▓▓░░░░░░  88k/200k   · my-project     green
Opus 5 (1M context)  ▓▓▓▓▓▓░░░░  121k/200k  · my-project     orange
Opus 5 (1M context)  ▓▓▓▓▓▓▓▓▓▓  ! 250k/200k · my-project    red
```

## Install

```bash
git clone https://github.com/ltruchot/vscode-comfy-claude-config.git
cd vscode-comfy-claude-config
./install.sh
./install-vscode.sh    # enables the terminal tab marker in VS Code
```

Then **restart Claude Code** — `settings.json` is only read at startup.

The installer writes into `$CLAUDE_CONFIG_DIR`, or `~/.claude` when that
variable is unset. It **merges** into your `settings.json` rather than replacing
it, and copies the previous file to `settings.json.bak-<timestamp>` first, so
your own permissions, plugins and environment survive.

Options: `./install.sh --no-sounds`, `./install.sh --no-statusline`.

To remove everything it added, and only that: `./uninstall.sh`.

### Requirements

- **python3** — runs the status line and builds the sounds. Already present on
  most systems; `xcode-select --install` on macOS, `sudo apt install python3` on
  Debian and Ubuntu.
- **An audio player**, only if you want sounds. macOS has `afplay` built in. On
  Linux and WSL any one of `paplay`, `pw-play`, `aplay`, `ffplay`, `mpv` or
  `play` will do — you almost certainly have one already.

Tested on Linux, macOS and WSL2.

## The status line

It reads the native `context_window` object that Claude Code hands to every
status line command, so the number is the real size of what gets re-sent on each
request, prompt cache included.

**The gauge fills toward the alert threshold, not toward the context window.**
On a 1M model, 200k is 20% of the window: a window-relative gauge would still
look nearly empty at the exact moment you want to be warned. The readout uses
the same denominator, which is why crossing it reads as `250k/200k` rather than
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
| `needs-you` — two rising notes | `Notification`, matching `permission_prompt`, `idle_prompt`, `agent_needs_input` | Claude is blocked on you: a permission prompt, a question, an idle wait |
| `done` — one lower, quieter note | `Stop` | Claude finished responding, once per turn |

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

`./uninstall.sh` removes everything; to keep the status line and drop only
the sounds, delete the `Notification` and `Stop` entries from the `hooks` block
of your `settings.json`.

## The terminal tab indicator (VS Code)

A coloured marker in front of the terminal name, so a wall of identical `claude`
tabs tells you which one wants you:

```
🟠 my-project      a session just opened, waiting for you
🟢 my-project      Claude is working
🟠 my-project      your turn: it finished, or it is asking for something
🔴 my-project      the session ended
```

**This needs one VS Code setting**, because by default a tab is titled after the
process name. `./install-vscode.sh` writes it for you:

```json
{ "terminal.integrated.tabs.title": "${sequence}" }
```

It finds every `settings.json` that applies — the local install for Code, Code -
Insiders, VSCodium and Cursor, the machine-scope file a remote session uses
(`~/.vscode-server/data/Machine/`), and, under WSL, the client's own user
settings on the Windows side, since that is where a non-machine setting is read
from. Then reload the window **and restart Claude Code itself** — reloading the
editor reconnects to existing terminals rather than restarting them, so a
running session keeps the settings it started with.

The file is **JSONC**: VS Code allows comments and trailing commas in it, and
parsing then re-serialising would delete yours without a word. So the key is
inserted textually after the opening brace and the rest of the file is left byte
for byte as it was. Run it with `--dry-run` to see the targets first, `--force`
to overwrite a value you already have.

Two things this is *not*, both worth knowing before you go looking for them:

- **It is not the tab's icon colour.** VS Code exposes no escape sequence for
  the tab icon or colour; only the extension that created a terminal can set
  those, at creation time, via `window.createTerminal({ iconPath, color })`.
  The [request to have Claude Code do it](https://github.com/anthropics/claude-code/issues/56925)
  was closed as not planned for that reason. The title is the one channel a CLI
  can drive, hence a coloured emoji rather than a dot.
- **It does not fight Claude Code's own tab name.** That name comes from the
  process title, which VS Code reads as `${process}` — a separate channel from
  `${sequence}`. Neither overwrites the other.

The hook does not write to the terminal itself: hooks run without a controlling
terminal, so they hand the escape sequence to Claude Code through the
documented `terminalSequence` output field, and it does the writing.

Change the markers at the top of `hooks/tab-state.py`. Skip the whole feature
with `./install.sh --no-tab-state`.

## Capturing friction at compaction time

Compaction is the moment a session's hard-won detail is about to be summarised
away, which makes it exactly the right moment to ask what should outlive it.

With this installed, `/compact` first stops and hands the session a job: look
back over what actually caused friction — a wrong assumption you had to undo, a
command that failed for a non-obvious reason, a convention you got wrong — and
propose each item **one at a time**, saying where it belongs (this project's
`CLAUDE.md`, your user-level one, or a specific skill). You accept, rewrite, or
discard each one. Only what you accept is written. Then you run `/compact` again
and it goes through.

Two design points that are not arbitrary:

- **The review is not done inside the hook.** A hook cannot talk to you — it runs
  with no controlling terminal and can show no dialog — and, more to the point,
  the session about to be compacted still holds the whole context in mind. It is
  a far better reviewer than a subagent re-reading a transcript from disk. So the
  hook only blocks the compaction and hands the work back.
- **Automatic compaction is never blocked.** It fires because the context is
  full; refusing it could leave the session with nowhere to go. On `auto` the
  hook asks for the review to happen *after* compaction instead, and lets it
  proceed.

A guard file in `$CLAUDE_CONFIG_DIR/state/` keeps this to once per compaction,
re-arms for the next one, and is swept after seven days if a session ends
mid-review. Every failure path exits 0: an unreadable payload or an unwritable
state directory must never make `/compact` unusable.

Skip it with `./install.sh --no-friction`.

## What gets written

```
$CLAUDE_CONFIG_DIR/
├── statusline-context.py
├── hooks/
│   ├── tab-state.py
│   └── precompact-friction.py
├── state/                 guard files for the friction reviewer
├── sounds/
│   ├── play.sh
│   ├── needs-you.wav
│   └── done.wav
└── settings.json          merged: statusLine, and the hooks for
                           Notification, Stop, UserPromptSubmit,
                           SessionStart, SessionEnd and PreCompact
```

## References

- [Status line](https://code.claude.com/docs/en/statusline) and its
  [context window fields](https://code.claude.com/docs/en/statusline#context-window-fields)
- [Hooks](https://code.claude.com/docs/en/hooks)
