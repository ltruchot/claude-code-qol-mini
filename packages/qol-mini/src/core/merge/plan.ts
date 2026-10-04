import type { ConflictMode } from "../schema/conflict.ts";
import type { FileMap } from "../types.ts";
import { type PlanAction, planFile } from "./plan-file.ts";

export type PlanInput = {
  base: FileMap;
  theirs: FileMap;
  disk: FileMap;
  lockFiles: Record<string, string>;
  skip: string[];
  mode: ConflictMode;
};

// One action per path in base ∪ theirs ∪ disk, sorted
export function buildPlan(input: PlanInput): PlanAction[] {
  const rels = new Set([...input.base.keys(), ...input.theirs.keys(), ...input.disk.keys()]);
  const skip = new Set(input.skip);
  return [...rels].toSorted().map((rel) =>
    planFile({
      rel,
      base: input.base.get(rel),
      theirs: input.theirs.get(rel),
      disk: input.disk.get(rel),
      lockHash: input.lockFiles[rel],
      skip: skip.has(rel),
      mode: input.mode,
    }),
  );
}

export function summarize(plan: PlanAction[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of plan) out[a.kind] = (out[a.kind] ?? 0) + 1;
  return out;
}
