import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOCAL_FILE } from "../core/schema/local.ts";

export const LOCK_FILE = "qol-mini.lock.json";
export const CLAUDE_DIR = ".claude";
export const SKILLS_DIR = "skills";

export type Paths = {
  root: string;
  claude: string;
  skills: string;
  lock: string;
  local: string;
  claudeGitignore: string;
  global: boolean;
};

// Walk up until .git, else cwd
export function findRoot(cwd: string): string {
  let dir = cwd;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return cwd;
    dir = parent;
  }
}

// Project scope sits in <root>/.claude, global scope in the config dir itself
function under(root: string, claude: string, global: boolean): Paths {
  return {
    root,
    claude,
    skills: join(claude, SKILLS_DIR),
    lock: join(claude, LOCK_FILE),
    local: join(claude, LOCAL_FILE),
    claudeGitignore: join(claude, ".gitignore"),
    global,
  };
}

export const paths = (root: string): Paths => under(root, join(root, CLAUDE_DIR), false);

export const globalPaths = (dir: string): Paths => under(dir, dir, true);

export function skillDir(p: Paths, name: string): string {
  return join(p.skills, name);
}
