import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export const BANK_ENV = "QOL_MINI_BANK";

// Package root: the first parent holding package.json, from dist or from src
export function packageRoot(from: string = import.meta.dirname): string {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no package.json above ${from}`);
    dir = parent;
  }
}

// The skills shipped in the package; QOL_MINI_BANK points elsewhere
export function bankDir(env: Record<string, string | undefined> = process.env): string {
  const set = env[BANK_ENV] ?? "";
  return set === "" ? join(packageRoot(), "skills") : set;
}
