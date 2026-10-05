# claude-code-qol-mini

[![test](https://github.com/ltruchot/claude-code-qol-mini/actions/workflows/test.yml/badge.svg)](https://github.com/ltruchot/claude-code-qol-mini/actions/workflows/test.yml)

Quality-of-life kit for [Claude Code](https://code.claude.com) when you run
several sessions at once: hooks and one status line for every project, skills
per project. One package, `qol-mini`.

| | |
|---|---|
| **Context gauge** | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · my-project` — green, orange at 100k, red at 200k |
| **Sounds** | two rising notes: Claude waits on you · one low note: turn over |
| **Tab marker** (VS Code, Cursor, opt-in) | `🟢 my-project` working · `🔴 my-project` blocked on you · `🟡 my-project` idle |
| **Kaizen** | `/compact` refuses until you run `/kaizen`, a review of what this session got wrong |
| **Skills, per project** | `qol-mini skills install qa-pr ./my-project` — placeholders filled, local edits merged on update |
| **Opt out, per project** | `touch <project>/.claude/qol-mini-off` — [what it silences](#leave-one-project-alone) |

Linux, macOS, WSL, Windows. Node.js 22.18+. MIT.

## Quick start

Needs Node.js 22.18+. Nothing to clone.

```bash
pnpm dlx qol-mini install                                   # 1. global: asks four yes/no questions
pnpm dlx qol-mini skills install /path/to/my-project        # 2. skills: pick from a list
pnpm dlx qol-mini skills install qa-pr /path/to/my-project  #    or name them
```

`npx qol-mini <command>` and `npm install -g qol-mini` run the same package.

| Step | Writes into | Then |
|---|---|---|
| 1 | `~/.claude` (or `$CLAUDE_CONFIG_DIR`) | start a new Claude Code session |
| 2 | `/path/to/my-project/.claude/skills/` and `.claude/qol-mini.lock.json` | commit both; start a new session in that project |

A skill asks for its values once (`qa-pr`: the GitHub repo, the production URL).
Shipped skills: `css-modern`, `datastar`, `npm-vulnerability-check`, `qa-pr`, `vp`, `kaizen`.

## Install

| Command | From a clone, with [Vite+](https://viteplus.dev) (`.sh`, `.ps1`) |
|---|---|
| `qol-mini install` | `./install.sh` |
| `qol-mini uninstall` | `./uninstall.sh` |
| `qol-mini vscode` | `./install-vscode.sh` |
| `qol-mini skills install` | `./install-skills.sh` |
| `qol-mini skills <other>` | `./scripts/qol-mini.sh skills <other>` |

`qol-mini install --defaults` asks nothing. `qol-mini vscode` sets the editor for
the tab marker only.

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
pnpm dlx qol-mini@latest install --replace
```

Keeps your options. Without `--replace`, an edited file makes the installer stop
and write nothing. The hooks are registered with the path of the Node binary that
ran the installer: after a Node upgrade through a version manager, run it again.
Your own sound files are never overwritten.

A project that runs its own setup is left alone with
[`.claude/qol-mini-off`](#leave-one-project-alone).

### Uninstall

```bash
pnpm dlx qol-mini uninstall
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
delete the file, then `qol-mini install`: a missing sound is created, an existing
one is never rewritten.

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

Or undo the setting: `qol-mini vscode --revert`.

**Known gap**: Esc, or refusing a permission, fires no hook. The tab keeps its last
marker until your next message.

**Needs all three**, none reports its absence: the editor setting above
(`qol-mini vscode`), `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` in the `env` block
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

| Step | `/kaizen` does |
|---|---|
| 1 | updates `TODO.md`, an index under 100 lines: where the session stopped, one line per item left; an item that needs context gets `todo/<slug>.md`; done items and their files are removed, links checked |
| 2 | proposes at most three items, one message each, in an ASCII block with a one-sentence TLDR: `ADD` a line it had to work around the lack of, `CUT` one that earns nothing, `MOVE` one loaded at the wrong moment, `REWORD` one it misread; you answer yes or no; none is normal |
| 3 | proposes the handoff lines at the top of `CLAUDE.md`, the split of an oversized `TODO.md`, and a merge of `SESSION_STATE`-style files |
| 4 | releases the block: `/compact` goes through, once |

After any compaction, a `SessionStart` hook tells Claude to read `TODO.md` when it
exists.

Automatic compaction is never blocked. Skip a review:
`node ~/.claude/hooks/precompact-kaizen.mjs --release`.

## Skills

Shipped in the package: `css-modern`, `datastar`, `npm-vulnerability-check`, `qa-pr`, `vp`, `kaizen`.
`qol-mini` below is `pnpm dlx qol-mini`, or `./scripts/qol-mini.sh` from a clone.

```bash
qol-mini skills install qa-pr ./my-project    # into ./my-project/.claude/skills/qa-pr
qol-mini skills install ./my-project          # pick from a list; without a console, the installed ones
qol-mini skills update ./my-project           # merge the kit's changes, keep local edits
qol-mini skills install --replace ./my-project   # take the kit's version of every edited file
qol-mini skills list ./my-project
qol-mini skills check ./my-project            # exit 0 ok, 1 update, 2 modified, 3 tampered
qol-mini skills remove qa-pr ./my-project
```

| | |
|---|---|
| Project argument | any argument holding `/` or `\`, or `.`; none: the git root above the current directory |
| `--global` | the Claude config dir instead of a project |
| `{{NAME}}` in a skill | asked once, then read from the lock; `QOL_MINI_ANSWER_<NAME>` answers without a prompt |
| A file you edited | three-way merge; conflict markers when both sides changed a line; `--conflict rej\|ours\|theirs` |
| `-y`, `--dry-run`, `--json` | no prompt · preview only · machine output for `list` |
| Commit | `.claude/skills/` and `.claude/qol-mini.lock.json` |
| Never commit | `.claude/qol-mini.local.json`: secret answers, gitignored by the installer |

Details: [docs/skills.md](docs/skills.md).

## Linters and managed skills

A formatter or linter that rewrites a managed skill makes `skills check` exit 2 and the next
`skills update` conflict. `skills install` and `skills check` print the paths to ignore and
the tools configured at the project root. The kit writes no linter config.

| Tool | Ignore the path in |
|---|---|
| Prettier | `.prettierignore` |
| ESLint | a config object holding only `ignores`, in `eslint.config.*` |
| Biome 2 | `files.includes`, negated: `"!.claude/skills/<name>"` |
| Biome 1 | `files.ignore` |
| Oxlint | `ignorePatterns` in `.oxlintrc.json` |
| Oxfmt | `ignorePatterns` in `.oxfmtrc.json` |
| Vite+ | `fmt.ignorePatterns` and `lint.ignorePatterns` in the root `vite.config.ts` |
| Stylelint | `.stylelintignore` |
| markdownlint | `.markdownlintignore`, or `ignores` in `.markdownlint-cli2.jsonc` |
| dprint | `excludes` in `dprint.json` |
| lint-staged, lefthook, husky | the glob of each command that formats or fixes |

Prompt for an agent, to paste in the project:

```text
This project installs skills with qol-mini. The managed ones are the keys of "skills" in
.claude/qol-mini.lock.json; each lives in .claude/skills/<name>/. They are vendor files: no
formatter and no linter of this project may rewrite or report them.

1. List the managed skills: read .claude/qol-mini.lock.json.
2. Find every tool that formats or lints files here. Look at the root and at each workspace
   package for: .prettierrc*, prettier.config.*, .prettierignore, eslint.config.*,
   biome.json(c), .oxlintrc.json, .oxfmtrc.json, vite.config.* with a fmt or lint block,
   .stylelintrc*, stylelint.config.*, .markdownlint*, dprint.json, .editorconfig-driven
   formatters, and the commands in package.json scripts, Makefile, lint-staged, lefthook.yml,
   .husky/ and the CI workflows.
3. For each tool found, add one ignore entry per managed skill, .claude/skills/<name>/, in
   that tool's own ignore mechanism. Never ignore .claude/skills/ as a whole: the skills
   written by hand in this project stay linted and formatted. Keep the existing entries and
   comments. Add a one-line comment saying the path is managed by qol-mini.
4. If a command passes .claude/skills explicitly (a script, a hook glob), check that the
   tool's ignore file still applies to it; if it does not, narrow the command.
5. Verify: run each formatter in check mode and each linter over .claude/skills, and show
   that no managed file is reported or changed. Then run
   `pnpm dlx qol-mini skills check .` and report its output.
6. If `skills check` says a managed skill is "modified on disk", do not reformat it back by
   hand. Show the diff against the kit's version with
   `pnpm dlx qol-mini skills install <name> . --dry-run` and ask whether the local changes
   are wanted, or whether `--replace` should restore the kit's files.
7. Change nothing else. Do not commit.
```

## Leave one project alone

```bash
mkdir -p <project>/.claude && touch <project>/.claude/qol-mini-off
```

| In that project | |
|---|---|
| `/compact` | never held back |
| after a compaction | nothing is injected |
| tab marker, sounds | silent |
| `/kaizen` | still runs if you type it |
| status line | still this one, unless the project sets its own `statusLine` |

Sessions started below the file are covered too. Remove the file to undo.

## Files

```
~/.claude/
├── statusline-context.mjs
├── hooks/tab-state.mjs
├── hooks/precompact-kaizen.mjs
├── skills/kaizen/SKILL.md
├── sounds/{play.mjs,needs-you.wav,done.wav}
├── state/                      kaizen tokens, one per project directory
└── settings.json               statusLine + hooks, merged

<project>/.claude/
├── skills/<name>/              rendered skills
├── qol-mini.lock.json          what was installed, with hashes and answers
└── qol-mini.local.json         secret answers, mode 0600

~/.cache/qol-mini/              templates for merges, one backup per skill
```

## Develop

```bash
vp install
vp run ready      # format, lint, types, 50-line gate, tests, build, pack check
```

| CI job (`.github/workflows/test.yml`) | Runs on | Checks |
|---|---|---|
| `ready` | Linux, macOS | the same gates as `vp run ready` |
| `install-cycle` | Linux, macOS, Windows | the built CLI on a real runner: install, update with `--replace`, a delivered hook run alone, a skill installed and checked, uninstall leaving `settings.json` empty |

## Publish

What a published version changes for a user:

| | From a clone | From npm |
|---|---|---|
| Needs | Node.js, git, Vite+ to build | Node.js |
| Install | `git clone`, then `./install.sh` | `pnpm dlx qol-mini install` |
| Skills in a project | `./install-skills.sh qa-pr <project>` | `pnpm dlx qol-mini skills install qa-pr <project>` |
| Update | `git pull && ./install.sh --replace` | `pnpm dlx qol-mini@latest install --replace` |
| Left on the machine | the clone | nothing: `dlx` runs from a temporary cache, the hooks are copied into `~/.claude` |

`npx qol-mini <command>` and `npm install -g qol-mini` are the same package.

### By hand

| Step | Command, from `packages/qol-mini` | Note |
|---|---|---|
| 1. Log in | `npm login` | once per machine |
| 2. Build and pack | `vp run build && vp pm pack` | writes `qol-mini-<version>.tgz`, `catalog:` versions resolved |
| 3. Publish | `npm publish qol-mini-<version>.tgz` | opens a browser page to authenticate |
| 3, under WSL | `BROWSER=wslview npm publish qol-mini-<version>.tgz` | WSL has no browser to open |
| 4. Check | `npm view qol-mini version` | prints the version just published |

| Error | Cause | Fix |
|---|---|---|
| `EBADDEVENGINES … "pnpm" does not match "npm"` | `npm` was run at the repository root, whose `package.json` pins pnpm | `cd packages/qol-mini` |
| `Set the BROWSER environment variable` | WSL: the authentication page cannot be opened | `BROWSER=wslview`, or `--auth-type=legacy` to type a one-time code in the terminal |
| `404` on step 4 | step 3 stopped before publishing | run step 3 again: the tarball is still there |

### From CI

```bash
git tag v<version> && git push origin v<version>
```

| Step of `.github/workflows/release.yml` | Why |
|---|---|
| tag must equal the version in `packages/qol-mini/package.json` | a tag cannot publish another version |
| the gates of `ready` | nothing unchecked reaches npm |
| `vp pm pack`, then `npm publish` of the tarball | pnpm resolves the `catalog:` versions when it packs; `npm publish` of the directory would ship them unresolved |
| trusted publishing | no npm token stored in the repository; configure it once for `qol-mini` on npmjs.com |

## Verified where

| Where | What |
|---|---|
| WSL2 (terminal and Claude Code), Node 24 | the test suite; install, update, uninstall and skills install against throwaway directories, from a clone and from npm through `pnpm dlx` |
| CI: Linux, macOS | the test suite |
| CI: Linux, macOS, Windows | install, update, a delivered hook run alone, a skill installed and checked, uninstall |
| Nowhere yet | the Node hooks on screen in a live session; sounds heard; editor settings on native Linux, macOS, Windows |

## Related

- [franzvill/claude-code-tab-title](https://github.com/franzvill/claude-code-tab-title) — two-state tab title, plugin, writes to `/dev/tty`
- [LiveNL/tmux-claude-status-tabs](https://github.com/LiveNL/tmux-claude-status-tabs) — four states on tmux, catches Esc via the transcript
- [dimokol/claude-notifications](https://github.com/dimokol/claude-notifications) — VS Code extension, focus button on the notification
- `claude agents` — built-in view of which session needs input, in its own screen
- [Hooks reference](https://code.claude.com/docs/en/hooks) · [Status line](https://code.claude.com/docs/en/statusline)
