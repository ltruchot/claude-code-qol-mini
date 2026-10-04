import { resolve } from "node:path";
import { ConflictMode } from "../core/schema/conflict.ts";
import { configDir } from "../io/config-dir.ts";
import { findRoot, globalPaths, type Paths, paths } from "../io/paths.ts";
import type { GlobalOpts } from "./context.ts";

// A named project is taken as given; without one, walk up from cwd to .git
export function scope(opts: GlobalOpts, project: string | undefined): Paths {
  if (opts.global === true) return globalPaths(configDir());
  if (project !== undefined) return paths(resolve(opts.cwd ?? process.cwd(), project));
  return paths(findRoot(opts.cwd ?? process.cwd()));
}

// --replace takes the kit's version of an edited file; else merge inline
export function conflictMode(opts: GlobalOpts): ConflictMode {
  if (opts.replace === true) return "theirs";
  return ConflictMode.parse(opts.conflict ?? "inline");
}
