# claude-code-qol-mini

[![test](https://github.com/ltruchot/claude-code-qol-mini/actions/workflows/test.yml/badge.svg)](https://github.com/ltruchot/claude-code-qol-mini/actions/workflows/test.yml)

Quality-of-life kit for [Claude Code](https://code.claude.com) when you run
several sessions at once. Hooks, one status line, one skill. Nothing else.

| | |
|---|---|
| **Context gauge** | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · my-project` — green, orange at 100k, red at 200k |
| **Sounds** | two rising notes: Claude waits on you · one low note: turn over |
| **Tab marker** (VS Code, Cursor, opt-in) | `🟢 my-project` working · `🔴 my-project` blocked on you · `🟡 my-project` idle |
| **Kaizen** | `/compact` refuses until you run `/kaizen`, a review of what this session got wrong |

Linux, macOS, WSL, Windows. Python 3.8+. MIT.

## Install

```bash
git clone https://github.com/ltruchot/claude-code-qol-mini.git
cd claude-code-qol-mini
./install.sh            # asks four yes/no questions; --defaults asks nothing
./install-vscode.sh     # tab marker only
```

Windows PowerShell: `.\install.ps1`, `.\install-vscode.ps1`.

Then start a new Claude Code session. Reloading the editor window is not enough.

Writes into `~/.claude` (or `$CLAUDE_CONFIG_DIR`). `settings.json` is merged, not
replaced, and backed up first. Your own hooks, permissions and plugins survive.

### Options

Each option changes one thing and keeps the rest as installed.

| | |
|---|---|
| `--statusline` / `--no-statusline` | gauge (default on) |
| `--sounds` / `--no-sounds` | sounds (default on) |
| `--kaizen` / `--no-kaizen` | compaction review (default on) |
| `--tab-state` / `--no-tab-state` | tab marker (default off, see cost below) |
| `--warn N` / `--alert N` | gauge thresholds (100000 / 200000) |
| `--defaults` | every default, no questions |
| `--replace` | overwrite a delivered file you edited |

### Update

```bash
git pull && ./install.sh --replace
```

Keeps your options. Without `--replace`, an edited file makes the installer stop
and write nothing. Your own sound files are never overwritten.

### Uninstall

```bash
./uninstall.sh
```

Removes what was installed, nothing else.

## Context gauge

Fills toward the **alert threshold**, not the window: on a 1M model, 200k is 20%
of the window and a window-relative bar would look empty when you should worry.
Past the threshold it reads `! 250/200k`.

Thresholds: `--warn`, `--alert`, or `CC_CONTEXT_WARN` / `CC_CONTEXT_ALERT` in the
`env` block of `settings.json`.

## Sounds

| File | Fires on |
|---|---|
| `needs-you.wav` | permission prompt, question, choice, usage-limit wait that needs your Enter |
| `done.wav` | end of a turn, end of a manual `/compact`. Silent while a subagent or background task keeps the session busy |

A turn that ends on a question plays `needs-you`, not `done`.

**Own sounds**: drop a `.wav` (or ogg, flac, mp3, m4a, aiff) named `needs-you` or
`done` into `~/.claude/sounds/`. Back to the defaults:
`python3 sounds/generate.py --force ~/.claude/sounds`.

**Nothing plays?** Linux and WSL need one of `paplay`, `pw-play`, `aplay`,
`ffplay`, `mpv`, `play`. Test with `paplay ~/.claude/sounds/done.wav`. On WSL,
check the Windows volume mixer. macOS uses `afplay`, Windows `winsound`.

Why a hook: the VS Code and Cursor terminals get no built-in Claude Code
notification, and the built-in bell cannot tell "waiting on you" from "done".

## Tab marker

```
🟢 api-server    🔴 web-client    🟡 docs
```

| Marker | Meaning |
|---|---|
| 🟢 | working — includes subagents, background tasks, a running `/compact` |
| 🔴 | blocked on you — permission, question, choice, API error, usage-limit wait |
| 🟡 | idle |

Red fires the moment a permission dialog appears, not six seconds later.
Markers: `CC_TAB_WORKING`, `CC_TAB_BLOCKED`, `CC_TAB_IDLE` in the `env` block.

**Cost**: the editor setting `terminal.integrated.tabs.title: ${sequence}` applies
to every terminal. A zsh tab shows `you@host:~/long/path` instead of `zsh`. Fix in
`.zshrc`, after `source $ZSH/oh-my-zsh.sh`:

```zsh
ZSH_THEME_TERM_TITLE_IDLE="%1~"
```

Or undo the setting: `./install-vscode.sh --revert`.

**Known gap**: Esc, or refusing a permission, fires no hook. The tab keeps its last
marker until your next message.

**Needs all three**, none reports its absence: the editor setting above
(`install-vscode`), `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` in the `env` block
(`install --tab-state`), and a new session. Claude Code's own animated title wins
otherwise.

Not possible: coloring the tab icon. VS Code exposes no sequence for it
([anthropics/claude-code#56925](https://github.com/anthropics/claude-code/issues/56925)).

## Kaizen

`/compact` stops:

```
Compaction held back: this session's friction has not been reviewed.
Run /kaizen to review it, then /compact again.
```

`/kaizen` lists what cost something in this session, one item at a time, each as
an exact edit to a `CLAUDE.md`, a skill, the docs or a code comment. You answer
yes or no. Finding nothing is normal. Then `/compact` goes through, once.

Automatic compaction is never blocked. Skip a review:
`python3 ~/.claude/hooks/precompact-kaizen.py --release`.

## Files

```
~/.claude/
├── statusline-context.py
├── hooks/tab-state.py
├── hooks/precompact-kaizen.py
├── skills/kaizen/SKILL.md
├── sounds/{play.py,needs-you.wav,done.wav}
├── state/                      kaizen tokens, one per project directory
└── settings.json               statusLine + hooks, merged
```

## Verified where

On screen: one hybrid setup only — terminal and Claude Code in WSL2, Cursor on the
Windows side. Native Linux, macOS and native Windows: install, update and uninstall
run in CI; sounds and editor settings there follow the docs and have not been
watched on a real machine. Issues welcome.

## Related

- [franzvill/claude-code-tab-title](https://github.com/franzvill/claude-code-tab-title) — two-state tab title, plugin, writes to `/dev/tty`
- [LiveNL/tmux-claude-status-tabs](https://github.com/LiveNL/tmux-claude-status-tabs) — four states on tmux, catches Esc via the transcript
- [dimokol/claude-notifications](https://github.com/dimokol/claude-notifications) — VS Code extension, focus button on the notification
- `claude agents` — built-in view of which session needs input, in its own screen
- [Hooks reference](https://code.claude.com/docs/en/hooks) · [Status line](https://code.claude.com/docs/en/statusline)
