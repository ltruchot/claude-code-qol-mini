import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { configDir } from "../../io/config-dir.ts";

const STALE_MS = 7 * 24 * 3600 * 1000;
// Current tokens, and names from past releases: swept, never honored
const TOKENS = /^(kaizen-.*\.done|friction-.*\.(done|guard))$/;

export function stateDir(): string {
  return join(configDir(), "state");
}

function real(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    return resolve(dir);
  }
}

// One token per working directory, not per session: the skill writes it from
// a plain shell, and one project's review does not release another's.
export function tokenFor(cwd: string): string {
  const path = real(cwd);
  const slug = basename(path).replaceAll(/[^A-Za-z0-9._-]/g, "-");
  const digest = createHash("sha1").update(path).digest("hex").slice(0, 8);
  return join(stateDir(), `kaizen-${slug === "" ? "root" : slug}-${digest}.done`);
}

// Drop tokens left behind by sessions that ended mid-review
export function sweepStale(now: number): void {
  for (const name of readdirSync(stateDir()).filter((n) => TOKENS.test(n))) {
    const file = join(stateDir(), name);
    if (now - statSync(file).mtimeMs > STALE_MS) unlinkSync(file);
  }
}

export function release(cwd: string): string {
  const token = tokenFor(cwd);
  mkdirSync(stateDir(), { recursive: true });
  writeFileSync(token, "");
  return token;
}
