import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// A project opts out of this kit by one file. Hooks merge across settings
// levels and no project file removes one of ours: `disableAllHooks` takes the
// project's own hooks down too. So every script asks this question itself.
export const OPTOUT_FILE = join(".claude", "qol-mini-off");

// True when `cwd`, or a directory above it, carries the opt-out file. The
// walk stops below the home directory: a stray file there silences nothing.
export function optedOut(cwd: string, home: string = homedir()): boolean {
  let dir: string;
  let stop: string;
  try {
    dir = realpathSync(cwd === "" ? process.cwd() : cwd);
    stop = realpathSync(home);
  } catch {
    return false;
  }
  for (;;) {
    const parent = dirname(dir);
    if (dir === stop || parent === dir) return false;
    if (existsSync(join(dir, OPTOUT_FILE))) return true;
    dir = parent;
  }
}
