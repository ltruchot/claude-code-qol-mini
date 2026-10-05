# Instructions — `claude-code-qol-mini`

> Session handoff: read `TODO.md` first — where the last session stopped, and what is left.
> Open a `todo/` file only for the item you work on. An item done → delete its line and its `todo/` file.

A minimal kit for Claude Code, in one npm package, `qol-mini`, developed at
`ltruchot/claude-code-qol-mini`. Two scopes: **global** (hooks, status line, sounds,
the kaizen review, in the Claude config dir) and **project** (skills, in
`<project>/.claude`). It works on **Linux, macOS, WSL and Windows**, in **VS Code
and Cursor**.

**Purpose, which settles the trade-offs**: a model that is not working is a model you
could hand something to. Every signal answers *is it running* first: green is
activity, not rest. Show which session wants you; keep the others busy.

**Vocabulary**: *kit*, *setup*, *hooks*. Never *harness*: in this ecosystem it means
the agent runtime itself.

**Language**: US English everywhere — README, code, comments, this file, commit
messages. The repo is public.

**Commits**: a message states the change and its technical reason. It never names a
person, never narrates a session, a conversation or a review exchange, never speaks
in the first person. The only trailer is `Co-Authored-By`; no `Claude-Session`. A
decision worth keeping is an ADR in `docs/adr/NNNN-title.md`, anonymous: context,
decision, consequences.

**Style**: terse. No metaphors, no wind-up. Name the trigger, then the action. Say
what is measured and what is assumed. The README is tables and commands only: no
reasoning, no adjectives.
**Mandatory**: this file, code comments and the README state what is and what must
be, never what was. No "an earlier version", "used to", "changed from X to Y", no
incident dates or counts. History and proof belong to commit messages.

## What the kit does

Sources are under `packages/qol-mini/src/`.

| Feature | Source | What you see |
|---|---|---|
| Context status line | `kit/hooks/statusline*.ts` | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · my-project` |
| Notification sounds | `kit/hooks/play.ts`, `kit/sounds.ts` | two rising notes when Claude wants you, one low note when a turn or a manual `/compact` ends |
| Tab marker | `kit/hooks/tab-state.ts` | 🟢 working (subagents, background tasks, compaction) · 🔴 blocked on you · 🟡 idle |
| Kaizen review | `kit/hooks/precompact-kaizen.ts`, `skills/kaizen/SKILL.md` | `/compact` stops until `/kaizen` has run; `/kaizen` first updates `TODO.md` (index) and `todo/` (one file per item needing context), then proposes at most three `ADD`/`CUT`/`MOVE`/`REWORD` items, one ASCII block each; after a compaction Claude is told to read `TODO.md` |
| Skills per project | `commands/`, `core/`, `io/`, `packages/qol-mini/skills/` | `qol-mini skills install qa-pr ./my-project` renders a shipped skill into `.claude/skills/`, records it in `.claude/qol-mini.lock.json`, and merges local edits on update |

| Command | Does |
|---|---|
| `qol-mini install` | global scope: copies the hook bundles, merges `settings.json` (`kit/install.ts`) |
| `qol-mini uninstall` | removes what `install` added (`kit/uninstall.ts`) |
| `qol-mini vscode` | sets the editor (`kit/vscode.ts`) |
| `qol-mini skills install\|update\|list\|check\|remove` | project scope, or `--global` |

`install.sh`, `uninstall.sh`, `install-vscode.sh`, `install-skills.sh` and their
`.ps1` twins run the same commands from a clone, through `scripts/qol-mini.sh`.

With no option and a real console, `qol-mini install` asks. With any option, or a
stdin that is not a console, it asks nothing, and `skills` commands confirm nothing.
A prompt that blocks a script or CI is a bug.

## Constraints

### Hook output

- `terminalSequence` is a **root** field. Inside `hookSpecificOutput` it is ignored
  with no error. Keep the test that requires it at the root.
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
  `--tab-state` is opt-in, and `qol-mini vscode --revert` exists.

### A project opts out with a file

- Hook entries merge across settings levels and no project file removes one of
  ours: `disableAllHooks` in a project takes that project's own hooks down too.
  So each script asks the question itself.
- `.claude/qol-mini-off` in a project: `precompact-kaizen`, `tab-state` and `play`
  do nothing there, from any depth below it. The walk up stops
  below `$HOME`, so a stray file in the home directory silences nothing.
- The status line is not in the opt-out: a project that wants another one sets
  `statusLine` in its own settings, which outranks ours.

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
- `SessionStart` with matcher `compact` is the only channel to Claude after a
  compaction, manual or automatic. `precompact-kaizen --after-compact` uses it
  to name `TODO.md`, and emits no marker: `tab-state` owns `SessionStart`.
- The release token is keyed on the working **directory**, not the session: the
  skill writes it from a plain shell, a manual `/kaizen` arms the next `/compact`,
  and one project's review does not release another's.
- A lesson goes to the repo's `CLAUDE.md` or to a named skill. Never to
  `~/.claude/CLAUDE.md`.

### One marker per event

- Hooks on one event run concurrently and each sequence is applied: two markers on
  one event race. Register one `terminalSequence` emitter per event.
- `PreCompact` belongs to `precompact-kaizen`, the only hook that knows whether
  compaction runs: green if it passes, red if held back. It emits `hookOutput()`
  under `--marker`. Without kaizen, `tab-state` takes `PreCompact`; without the
  marker, no `--marker`.
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
  `StopFailure` red without sound. If one misbehaves, unwire it in `kit/wire.ts`.

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

- Hooks use exec form: `{"type": "command", "command": <node>, "args": [<script>,
  <arg>]}`. The interpreter is `process.execPath`. No shell string, no Git Bash.
  Under a version manager that path is tied to one Node version: `install
  --replace` rewrites it.
- A `dlx` run lives in a temporary cache: the hooks are copied into the config dir,
  never referenced in the package. Each one is a standalone bundle, built from its
  own `pack` entry so no chunk is shared, and named `.mjs`: a bare `.js` with no
  `package.json` beside it is not read as an ES module.
- The installer reads the bundles from `dist/`: build before `install` from a clone.
- Every delivered file is created if missing, left if identical, and if different
  **nothing at all is written** and the files are named. `--replace` overwrites.
- `settings.json` is written, with a `.bak-` copy, only when the merge changes it.
  Same for `uninstall`.
- Sound files are never regenerated: users drop their own.
- Options overlay `installedState()`: `--replace` alone keeps the installed options.
  With nothing of ours in `settings.json`, the base is the defaults. `--defaults` is
  the only reset. Each feature has both flags.
- The installer purges its own handlers before adding the enabled ones.
  `withoutOurs()` is shared with `uninstall`. `OURS` matches a script without its
  extension, so a handler on a `.py` or `.sh` copy goes too. When a delivered file is
  renamed, add the old name to `OURS` and `SUPERSEDED`.
- A restart is named in two cases only: the `env` block changed, or `skills/` did
  not exist before the run.
- An editor `settings.json` is JSONC: insert the key textually, never parse and
  reserialize.

### Skills

- One bank: `packages/qol-mini/skills/`, shipped in the package. `QOL_MINI_BANK`
  points the CLI at another directory; the tests use it.
- A skill declares its `{{NAME}}` placeholders in `qol-mini.yaml`. Only declared
  names are substituted. `RELEASE_COMMAND` is computed, never asked.
- The lock, `.claude/qol-mini.lock.json`, is the managed set: a skill directory
  absent from it is never touched without `--replace`.
- `install` on a managed skill is an update: three-way merge of the installed
  template, the disk and the shipped template. `--replace` takes the shipped side.
- The global `install` renders `kaizen` with the same code and delivers it under
  the installer's file rule, with no lock entry.
- An argument holding a path separator, or `.`, is the project; every other
  argument must be a kebab-case skill name.
- Writes go to `<project>/.claude` and `~/.cache/qol-mini`, nowhere else.
- The bank grows by review: skills duplicated across local projects are collected and
  compared at intervals, and one enters when the same need shows in several projects.
  Its text is rewritten generic, every claim checked against a primary source.
- A skill enters only if it serves professional work and can be public. Never: a
  secret or a credential, private or personal data, a host or account name, an insecure
  practice, copyrighted text without a license that allows it, a third party's skill
  that has its own installer, anything specific to one project. What is specific to
  a project is a placeholder, or stays in that project.
- A managed skill is a vendor file for the project's formatters and linters: one that
  rewrites it turns it into `drift` and makes its update conflict. `install` names the
  paths to ignore after it adds a skill, `check` when it finds `drift`; both list the
  tools configured at the project root (`io/lint-configs.ts`). The kit reads those
  configs and never writes one: the README holds the prompt that does.
- The bank's `SKILL.md` frontmatter holds only the fields of the skills reference; a
  field outside the table is ignored by Claude Code with no error.
  `tests/unit/shipped-skills.test.ts` holds the list.

### Windows

- Hook paths are written with backslashes: `isOurs()` normalizes separators before
  matching.
- Keep the Windows job in `.github/workflows/test.yml`: it is the only place the
  native path runs.
- The `.ps1` wrappers set errors to `Continue` around native commands: under
  PowerShell 5.1 a native command writing to stderr is terminating under `Stop`.

### Status line

- The gauge and the fraction share one denominator, the **alert threshold**, not the
  window: on a 1M model a window-relative bar is near empty when the alert matters.
- The unit sits on the denominator only: `0k/200k` reads as "Ok".

## Method

- Instrument the installed copy in `~/.claude/hooks/`: scripts are re-read on each
  call, so a probe works without restart. Reinstall with `--replace` after.
- A hook that returns `additionalContext` leaves no transcript entry and no
  terminal output. Running it by hand proves the script, not the wiring: for
  that, start with `claude --debug` and read `~/.claude/debug/<session-id>.txt`.
- Wake another session with `SendMessage` to make its hooks fire.
- `/proc/PID/environ` cannot show a variable set by `settings.json`.
- The shell is zsh: quote a word that starts with `=` and any glob passed as an
  argument, and wrap a command in a function, not in a variable: `$CMD args` is
  one word there.
- To interrupt a running tool, accept its permission prompt first: Esc on the dialog
  is a rejection and the tool never runs.
- Verify a negative result before concluding.
- Check a doc claim with `curl -sL https://code.claude.com/docs/en/<page>.md` and
  `grep`, never a fetched summary: summaries truncate and report ABSENT.

## Verified, and not

| Where | What |
|---|---|
| This machine: WSL2, Node 24 | the test suite; install, update, uninstall and skills install against throwaway directories, from a clone and from npm through `pnpm dlx`; the update of a real config that held `.py` handlers |
| CI: Linux, macOS | the test suite |
| CI: Linux, macOS, Windows | install, update, a delivered hook run alone, a skill installed and checked, uninstall |
| Never | the Node hooks in a live session: tab marker on screen, sounds heard, `/compact` held back; `afplay`, PowerShell `SoundPlayer`; the editor paths outside WSL |

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
vp install                 # once
vp check --fix             # format, lint, types
vp run lines               # 50 lines per source and test file
vp run -r test             # builds the bundles first
vp run -r build && vp run packcheck
./install.sh --replace     # reinstalls the current options from this clone
./uninstall.sh             # removes what was installed, nothing else
```

- `vp run --no-cache ready` chains the gates. All of them pass before a change
  is done. Without `--no-cache`, `vp check` stops on `tsgolint EBUSY`.
- Sources and tests hold 50 lines per file. Skills, docs and this file do not.
- Lint runs every oxlint category as an error. An exception is one line in
  `lint/off-*.ts`, with its reason.
- The root `package.json` names pnpm twice: `packageManager` is what Vite+ reads
  to pick the version, `devEngines` is what makes `npm` refuse the root. Without
  `packageManager`, `vp install` runs an older pnpm that rejects the lockfile.
- No dependency at runtime: everything is bundled. A new dev dependency gets an
  exact pin in the `pnpm-workspace.yaml` catalog.
- Hooks are tested as real processes with the event JSON on stdin; the installer
  and the skills commands run in-process against `CLAUDE_CONFIG_DIR` and temporary
  projects. No test touches `~/.claude`.

A change is delivered when it is installed: `~/.claude` holds a copy, and editing the
repo changes nothing on screen. `CLAUDE_CONFIG_DIR` points any command at a throwaway
directory.

## Release

A tag `v<version>` matching `packages/qol-mini/package.json` publishes to npm from
`.github/workflows/release.yml`, through trusted publishing.

- `npm` refuses to run at the repository root: the root `package.json` pins pnpm
  through `devEngines`. Run `npm login` and `npm publish` from `packages/qol-mini`.
- Publish the tarball made by `vp pm pack`, never the directory: pnpm resolves the
  `catalog:` versions when it packs. The README holds the commands.
