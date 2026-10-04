import type { ConflictMode } from "../schema/conflict.ts";
import { mergeThreeWay } from "./three-way.ts";

export type Resolution = { text: string; conflict: boolean; rej?: string };

// Resolve drifted text per conflict mode
export function resolveText(
  mode: ConflictMode,
  base: string | undefined,
  ours: string,
  theirs: string,
): Resolution {
  if (mode === "ours") return { text: ours, conflict: false };
  if (mode === "theirs") return { text: theirs, conflict: false };
  const merged = mergeThreeWay(base ?? "", ours, theirs);
  if (!merged.conflict) return merged;
  if (mode === "rej") return { text: ours, conflict: true, rej: theirs };
  return merged;
}

export const REJ_SUFFIX = ".qm-rej";
