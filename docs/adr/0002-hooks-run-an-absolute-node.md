# 0002 — Hooks name the absolute path of Node

## Context

- A hook is registered in exec form: `command` is an executable, `args` holds the
  script. No shell runs, so no profile is read and no `PATH` is rebuilt.
- `command` can be the absolute path of the Node binary that ran the installer, or
  the bare name `node`, resolved on the `PATH` of the Claude Code process.
- A bare `node` follows the environment of each session. Under a version manager it
  resolves per directory: a project pinned to another Node version, or to none, runs
  the hooks with that version or with nothing. A Claude Code started from a desktop
  launcher can hold a `PATH` with no Node on it at all.
- An absolute path is the same binary in every session and every directory. Under
  a version manager it names one installed version, and stops working when that
  version is removed.

## Decision

- The installer registers `process.execPath`, the absolute path.
- `qol-mini install` rewrites the path whenever it differs from the one registered:
  running it again is the repair.

## Consequences

- The hooks and the status line behave the same in every project, whatever Node the
  project pins.
- Removing the Node version that ran the installer stops every hook and the status
  line at once. The status line going blank is the visible sign.
- The README names the cause and the command in its troubleshooting entries.
- Not measured: how each version manager lays out its binaries, and which ones keep
  a removed version's path alive.
