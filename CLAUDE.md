# Instructions — `claude-code-qol-mini`

A quality-of-life kit for Claude Code, published at `ltruchot/claude-code-qol-mini`.
It works on **Linux, macOS, WSL and Windows**, in **VS Code and Cursor**.

**Purpose, which settles the trade-offs**: a model that is not working is a model you
could hand something to. Every signal answers *is it running* first: green is
activity, not rest. Show which session wants you; keep the others busy.

**Vocabulary**: *kit*, *setup*, *hooks*. Never *harness*: in this ecosystem it means
the agent runtime itself.

**Language**: US English everywhere — README, code, comments, this file, commit
messages. The repo is public. Leave the older French commits as they are.

**Style**: terse. No metaphors, no wind-up. Name the trigger, then the action. Say
what is measured and what is assumed. The README is tables and commands only: no
reasoning, no adjectives.
**Mandatory**: this file, code comments and the README state what is and what must
be, never what was. No "an earlier version", "used to", "changed from X to Y", no
incident dates or counts. History and proof belong to commit messages.

## What the kit does

| Feature | File | What you see |
|---|---|---|
| Context status line | `statusline/context.py` | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · my-project` |
| Notification sounds | `sounds/play.py`, `sounds/generate.py` | two rising notes when Claude wants you, one low note when a turn or a manual `/compact` ends |
| Tab marker | `hooks/tab-state.py` | 🟢 working (subagents, background tasks, compaction) · 🔴 blocked on you · 🟡 idle |
| Kaizen review | `hooks/precompact-kaizen.py`, `skills/kaizen/SKILL.md` | `/compact` stops until `/kaizen` has run |

`install.py` installs (`install.sh` / `install.ps1` wrap it), `uninstall.py` removes,
`install-vscode.py` sets the editor, `test.sh` checks.

With no option and a real console, `install.py` asks. With any option, or a stdin
that is not a console, it asks nothing. A prompt that blocks a script or CI is a bug.

## Constraints

### Hook output

- `terminalSequence` is a **root** field. Inside `hookSpecificOutput` it is ignored
  with no error. Keep the `test.sh` check that requires it at the root.
- Only OSC 0/1/2/9/99/777 and BEL pass. One byte outside the allowlist drops the
  whole field silently: strip control characters from anything interpolated.
- It is applied in interactive sessions only, never under `-p` or the Agent SDK.
- A hook has no terminal: `/dev/tty` is unreachable. `terminalSequence` is the only
  way to write to it.
- Stdout on `UserPromptSubmit` that is not strict JSON is injected into the
  conversation. Print JSON or nothing.
- When behavior contradicts the published schema, trust the behavior and read the
  binary with `grep -a`. Without `-a`, grep reports nothing on a binary.

### The tab marker needs three things, and none reports its absence

1. `"terminal.integrated.tabs.title": "${sequence}"` in the editor.
2. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` in the `env` block: Claude Code redraws its
   own title continuously and wins otherwise.
3. The root-level `terminalSequence`.

- The marker is a character in the tab **name**. The tab icon and its color cannot be
  set: only the extension that creates a terminal can, at creation.
- No animation: hooks fire on events, not on a clock.
- No "session ended" state: nobody sees it. `SessionEnd` stays in `EVENTS` with no
  handler, so the purge clears it from any config.
- `${sequence}` retitles **every** terminal, a shell tab included. Hence
  `--tab-state` is opt-in, and `install-vscode.py --revert` exists.

### Reload

- Hooks and `statusLine` in `settings.json` reload without a restart.
- The `env` block and a skills directory created after startup need a new session.
- Reloading the editor window restarts nothing: it reconnects to the same processes.
- Do not ask for a restart beyond those two cases.

### PreCompact hands Claude nothing

- `exit 2` blocks the compaction and shows stderr to the **user** only. It never
  reaches the conversation.
- `PreCompact` accepts no `additionalContext`. `PostCompact` has no decision control.
- So stderr is two lines addressed to a human, naming `/kaizen`. The review lives in
  the skill, never in the hook.
- Read the exit-code table by row: stderr goes to Claude on `PreToolUse`, `Stop`,
  `PostToolUse`, not on `PreCompact`, `SessionStart`, `SubagentStart`,
  `PostModelSwitch`.
- Automatic compaction is never blocked, and no review is possible on it.
- The release token is keyed on the working **directory**, not the session: the
  skill writes it from a plain shell, a manual `/kaizen` arms the next `/compact`,
  and one project's review does not release another's.
- A lesson goes to the repo's `CLAUDE.md` or to a named skill. Never to
  `~/.claude/CLAUDE.md`.

### One marker per event

- Hooks on one event run concurrently and each sequence is applied: two markers on
  one event race. Register one `terminalSequence` emitter per event.
- `PreCompact` belongs to `precompact-kaizen.py`, the only hook that knows whether
  compaction runs: green if it passes, red if held back. It imports `hook_output()`
  from `tab-state.py` through `--marker`. Without kaizen, `tab-state.py` takes
  `PreCompact`; without the marker, no `--marker`.
- On the blocking path the sequence is applied before the exit status is read.
- `PostCompact` matches `manual` only: an automatic compaction happens mid-turn.

### When green is set

- No event fires when the model starts thinking. Reclaim green on `UserPromptSubmit`,
  `PostToolBatch` and `SubagentStop`, the last moments before work resumes.
- Subagents fire `PostToolBatch` on their own loop, after the main thread's `Stop`.
  Only the main thread paints green: skip `working` when `agent_id` or `agent_type`
  is present. Red from a subagent stays.
- `Stop` with a non-empty `background_tasks` or `session_crons` stays green and
  silent: the session wakes itself. The registry can lag by one task at the instant
  it settles; do not treat it as exact.

### When red is set

- `PermissionRequest` fires when the dialog appears; `permission_prompt` fires only
  after about six seconds without a keystroke. Red rides `PermissionRequest`; the
  sound keeps `Notification`, so it does not ring at someone already looking.
- A turn ending on a question is a plain `Stop`. Rule: the last non-empty line of
  `last_assistant_message`, stripped of markdown emphasis and closing brackets, ends
  with `?` → red and `needs-you`. Background work outranks it. Keep it that narrow.
- Wired from the reference, **not observed**: `quota_auto_resume_stale` and
  `quota_auto_resume_disabled` red with sound, `quota_auto_resume_fired` green,
  `StopFailure` red without sound. If one misbehaves, unwire it in `settings_for()`.

### Nothing fires when a turn is cut short

- Esc, or refusing a permission, emits no hook. The marker holds until the next
  prompt. This is a known gap.
- `idle_prompt` does not rescue it: an interrupt leaves the last completion time
  untouched, and the idle check returns on exactly that.
- Not usable: `StopFailure` (API errors only), `PermissionDenied` (auto-mode
  classifier only), the status line (runs on a clock but cannot write to the
  terminal).
- Open: `PostToolUseFailure.is_interrupt` may fire when a running tool is aborted.
  Unmeasured, and it would cover that one case only.
- A transcript watcher per session would close the gap. It is a process on a clock,
  which this kit does not carry.

### Installer

- Hooks use exec form: `{"type": "command", "command": <python>, "args": [<script>,
  <arg>]}`. The interpreter is `sys.executable`. No shell string, no Git Bash.
- The sound player is Python (`winsound` on Windows): hooks run through PowerShell
  there.
- Every delivered file is created if missing, left if identical, and if different
  **nothing at all is written** and the files are named. `--replace` overwrites.
- `settings.json` is written, with a `.bak-` copy, only when the merge changes it.
  Same for `uninstall.py`.
- Sound files are never regenerated: users drop their own. `generate.py` skips an
  existing file without `--force`.
- Options overlay `installed_state()`: `--replace` alone keeps the installed options.
  `--defaults` is the only reset. Each feature has both flags.
- The installer purges its own handlers before adding the enabled ones.
  `without_ours()` is shared with `uninstall.py`. When a delivered file is renamed,
  add the old name to `OURS` and `SUPERSEDED`.
- An editor `settings.json` is JSONC: insert the key textually, never parse and
  reserialize.

### Windows

- Hook paths are written with backslashes: `is_ours()` normalizes separators before
  matching.
- `sys.stdin.isatty()` is true for `NUL`: use `stdin_is_console()`
  (`GetConsoleMode`).
- `python.exe` may be the Microsoft Store stub, which exits 9009. The `.ps1` wrappers
  run each candidate before trusting it, with errors set to `Continue`: under
  PowerShell 5.1 a native command writing to stderr is terminating under `Stop`.
- Keep the Windows job in `.github/workflows/test.yml`: it is the only place the
  native path runs.

### Status line

- The gauge and the fraction share one denominator, the **alert threshold**, not the
  window: on a 1M model a window-relative bar is near empty when the alert matters.
- The unit sits on the denominator only: `0k/200k` reads as "Ok".

## Method

- Instrument the installed copy in `~/.claude/hooks/`: scripts are re-read on each
  call, so a probe works without restart. Remove it and check `git status` after.
- Wake another session with `SendMessage` to make its hooks fire.
- `/proc/PID/environ` cannot show a variable set by `settings.json`.
- To interrupt a running tool, accept its permission prompt first: Esc on the dialog
  is a rejection and the tool never runs.
- Verify a negative result before concluding.
- Check a doc claim with `curl -sL https://code.claude.com/docs/en/<page>.md` and
  `grep`, never a fetched summary: summaries truncate and report ABSENT.

## Verified, and not

| Where | What |
|---|---|
| This machine: terminal and Claude Code in WSL2, Cursor on Windows | install, update, uninstall with user settings preserved; purge of disabled options; tab marker on screen; `test.sh` |
| CI: Linux, macOS, Windows, Python 3.8 | install, update, uninstall; `test.sh` on Linux and macOS |
| Never | native Linux editor path, `afplay`, `winsound`, macOS and Windows editor paths, sounds heard anywhere but WSL |

The README states this. Do not claim more.

## Open threads

- Marker format: settable through `CC_TAB_WORKING`, `CC_TAB_BLOCKED`, `CC_TAB_IDLE`;
  what reads best is untested. Colors are settled: green running, red blocking only,
  yellow idle. Orange reads as red across a tab strip.
- A warning triangle shows on every tab in the terminal list. Cause unknown.
- A full `/compact` with markers is unobserved. Check the dim post-compaction line
  and the compaction instructions for our JSON; if dirty, remove the `PreCompact`
  marker only.
- A full `/compact` → `/kaizen` → `/compact` sequence is unobserved.

## Testing

```bash
./test.sh                # installs nothing
./install.sh --replace   # reinstalls the current options
./install-vscode.sh      # then start a new session
./uninstall.sh           # removes what was installed, nothing else
```

A change is delivered when it is installed: `~/.claude` holds a copy, and editing the
repo changes nothing on screen. `CLAUDE_CONFIG_DIR` points any script at a throwaway
directory.
