import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// A project opts out of this kit by one file. Hooks merge across settings
// levels and no project file removes one of ours: `disableAllHooks` takes the
// project's own hooks down too. So every script asks this question itself.
export const OPTOUT_FILE = join(".claude", "qol-mini-off");
export type Feature = "kaizen" | "tab" | "sounds";

// The nearest opt-out file at `cwd` or above it, or null. The walk stops
// below the home directory: a stray file there silences nothing.
function optoutText(cwd: string, home: string): string | null {
  let dir = realpathSync(cwd === "" ? process.cwd() : cwd);
  const stop = realpathSync(home);
  for (;;) {
    const parent = dirname(dir);
    if (dir === stop || parent === dir) return null;
    try {
      return readFileSync(join(dir, OPTOUT_FILE), "utf8");
    } catch {
      dir = parent;
    }
  }
}

// An empty file switches every feature off. A file that names features
// switches off those only: `kaizen`, `tab`, `sounds`, split on spaces or commas.
export function optedOut(cwd: string, feature: Feature, home: string = homedir()): boolean {
  try {
    const listed = optoutText(cwd, home)
      ?.split(/[\s,]+/u)
      .filter((word) => word !== "");
    return listed !== undefined && (listed.length === 0 || listed.includes(feature));
  } catch {
    return false;
  }
}
