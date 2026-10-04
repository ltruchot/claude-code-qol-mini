import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { SOUNDS, SUPERSEDED } from "./files.ts";
import type { Chosen } from "./options.ts";
import type { Settings } from "./state.ts";

export type Plan = {
  create: string[];
  clash: string[];
  same: string[];
  sounds: string[];
  stale: string[];
  settings: boolean;
};

// Python dicts compare without key order, and so does this
export const sameSettings = (a: Settings, b: Settings): boolean => isDeepStrictEqual(a, b);

// What has to happen. Nothing is written before this is settled: a run that
// refuses leaves no half-installed state.
export function plan(
  chosen: Chosen,
  target: string,
  wanted: Map<string, Buffer>,
  changed: boolean,
): Plan {
  const names = [...wanted.keys()].toSorted();
  const on = (relative: string): string => join(target, relative);
  const differs = (r: string): boolean =>
    !readFileSync(on(r)).equals(wanted.get(r) ?? Buffer.alloc(0));
  const create = names.filter((r) => !existsSync(on(r)));
  const clash = names.filter((r) => !create.includes(r) && differs(r));
  return {
    create,
    clash,
    same: names.filter((r) => !create.includes(r) && !clash.includes(r)),
    sounds: chosen.sounds ? SOUNDS.filter((n) => !existsSync(on(join("sounds", n)))) : [],
    stale: SUPERSEDED.filter((r) => existsSync(on(r))),
    settings: changed,
  };
}

export function idle(p: Plan): boolean {
  return [p.create, p.clash, p.sounds, p.stale].every((l) => l.length === 0) && !p.settings;
}
