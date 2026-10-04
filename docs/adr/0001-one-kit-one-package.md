# 0001 — One kit, one package, two scopes

## Context

- The kit was three repositories: hooks and a status line installed globally by
  Python scripts, a TypeScript CLI installing skills per project from a remote
  bank, and the bank itself.
- The CLI was built to be forked: no bank of its own, a white-label preset baked at
  build time, a guide to rebrand it. Nobody used that path.
- The global kit required Python and a clone. The CLI required Node. A user needed
  both, and three places to look.

## Decision

- One repository and one npm package, `qol-mini`. `pnpm dlx qol-mini install` is the
  whole installation.
- One runtime: Node.js. The hooks, the status line, the sound player and the
  installer are TypeScript, bundled with no runtime dependency.
- Two scopes. Global: `qol-mini install`, into the Claude config dir. Project:
  `qol-mini skills …`, into `<project>/.claude`.
- The skills ship in the package. There is no remote bank, no configuration file,
  no token, no white-label build, no policy, no audit.
- The mechanics of the skills CLI stay: declared placeholders, a lock with hashes,
  a three-way merge on update, atomic writes with a backup.
- `--replace` means the same thing in both scopes: take what the kit ships.

## Consequences

- Python is no longer required. Node.js 22.18+ is.
- The hooks are copied into the config dir as standalone `.mjs` bundles: a `dlx`
  cache is temporary, so they cannot be referenced in place.
- A config that holds handlers on `.py` copies is migrated by `install`: the
  handlers are purged by path, the files deleted.
- A skill reaches users through a release of the package, not through a push to a
  bank.
- An organization that wants private skills forks the repository or points
  `QOL_MINI_BANK` at its own directory. No tooling serves that case.
