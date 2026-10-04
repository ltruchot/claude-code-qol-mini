import type { ConflictMode } from "../core/schema/conflict.ts";
import type { LocalFile } from "../core/schema/local.ts";
import type { LockFile } from "../core/schema/lock.ts";
import { stdinIsConsole } from "../io/console.ts";
import { readLocal } from "../io/local.ts";
import { readLock } from "../io/lock.ts";
import type { Paths } from "../io/paths.ts";
import { conflictMode, scope } from "./scope.ts";

export type GlobalOpts = {
  cwd?: string;
  yes?: boolean;
  json?: boolean;
  dryRun?: boolean;
  global?: boolean;
  replace?: boolean;
  conflict?: string;
};

export type Ctx = {
  p: Paths;
  conflict: ConflictMode;
  replace: boolean;
  lock: LockFile;
  local: LocalFile;
  yes: boolean;
  json: boolean;
  dryRun: boolean;
};

// Load lock and secrets for the scope
export async function loadContext(opts: GlobalOpts, project?: string): Promise<Ctx> {
  const p = scope(opts, project);
  const replace = opts.replace === true;
  return {
    p,
    conflict: conflictMode(opts),
    replace,
    lock: await readLock(p),
    local: await readLocal(p),
    yes: opts.yes === true || !stdinIsConsole(),
    json: opts.json === true,
    dryRun: opts.dryRun === true,
  };
}
