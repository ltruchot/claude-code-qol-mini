# Skills per project

`qol-mini skills <command> [names…] [project]`. The skills are the directories of
`packages/qol-mini/skills/`, shipped in the package.

## Scope

| Given | Target |
|---|---|
| an argument holding `/` or `\`, or `.` | that project: `<project>/.claude/skills/` |
| no project | the git root above the current directory, else the current directory |
| `--global` | the Claude config dir: `~/.claude/skills/`, or `$CLAUDE_CONFIG_DIR/skills/` |

## Commands

| Command | Does |
|---|---|
| `install <names…>` | renders each skill and writes it; a skill already installed is updated |
| `install` | on a console: a picker; otherwise every installed skill |
| `update [names…]` | merges the shipped version into the installed one |
| `list` | shipped skills and their status, plus directories written by hand |
| `check` | one status per installed skill, and an exit code |
| `remove <names…>` | deletes the directory, the lock entry and the secrets |

| Option | Effect |
|---|---|
| `--replace` | take the shipped version of every file edited locally; replace a directory the kit did not install |
| `--conflict inline\|rej\|ours\|theirs` | an edited file on update. `inline`: merge, conflict markers. `rej`: keep yours, write the shipped one beside it as `<file>.qm-rej`. `ours`: keep yours. `theirs`: same as `--replace` |
| `-y` | no prompt; a missing answer is an error |
| `--dry-run` | preview, write nothing |
| `--json` | `list` as JSON |
| `--frozen` | `check` also re-renders the template and compares it to the lock |

Without a console, nothing is asked.

## Placeholders

A skill declares them in `qol-mini.yaml`, beside `SKILL.md`. The file is not copied
into the project.

```yaml
version: 1
placeholders:
  - name: GITHUB_REPO          # {{GITHUB_REPO}} in any file of the skill
    prompt: GitHub repo owner/name
    pattern: "^[\\w.-]+/[\\w.-]+$"
  - name: DEFAULT_BRANCH
    prompt: Default branch
    default: main
  - name: PROD_TOKEN
    prompt: Token
    secret: true
skipIfExists:
  - notes.md                   # written once, never updated
```

| Field | Values |
|---|---|
| `type` | `string` (default), `url`, `path`, `enum` (with `options`), `boolean` |
| `default`, `pattern`, `secret` | optional |

- Only declared names are substituted. `{{OTHER}}`, `$ARGUMENTS` and `${CLAUDE_*}` stay as written.
- Answer order: the lock, then `QOL_MINI_ANSWER_<NAME>`, then `default`, then a prompt.
- A value holding `${CLAUDE_` is refused.
- `RELEASE_COMMAND` is computed by the kit.

## Files

| File | Holds | Commit |
|---|---|---|
| `.claude/skills/<name>/` | the rendered skill | yes |
| `.claude/qol-mini.lock.json` | per skill: template hash, rendered hash, one hash per file, public answers | yes |
| `.claude/qol-mini.local.json` | secret answers, mode 0600 | no; the installer adds it to `.claude/.gitignore`, with the skill directory |
| `~/.cache/qol-mini/templates/` | templates as installed, the base of the merge | — |
| `~/.cache/qol-mini/backup/` | the previous state of each skill, one slot | — |

A directory under `.claude/skills/` that is not in the lock is never touched
without `--replace`.

## Update, per file

| File | Action |
|---|---|
| in `skipIfExists`, present | kept |
| absent on disk | written |
| unchanged since install | shipped version written |
| edited, text | three-way merge: installed template, disk, shipped template |
| edited, binary | kept, unless `--replace` |
| removed from the kit, unchanged | deleted |
| removed from the kit, edited | kept |
| on disk, never installed by the kit | kept |

- The write goes to a work directory, then two renames.
- The lock records the shipped render, not the disk: a merged local edit still reads as `modified on disk`.
- Without the cached template there is no merge base: an edited file becomes a conflict.

## Status and exit code

| Status | Meaning | Exit |
|---|---|---|
| up to date | disk matches the lock, lock matches the kit | 0 |
| update available | the shipped template changed | 1 |
| modified on disk | a file differs from what was installed | 2 |
| missing on disk | the directory is gone; `install` restores it | 2 |
| conflict markers present | an unresolved merge | 2 |
| not verified against the shipped template | `--frozen`, and the template changed | 2 |
| lock does not match template | `--frozen`: the lock was edited | 3 |

`check` exits with the highest code. A refusal or an error exits 1; a cancelled
prompt, 130.
