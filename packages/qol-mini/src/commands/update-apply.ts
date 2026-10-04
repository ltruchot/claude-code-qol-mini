import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { REJ_SUFFIX } from "../core/merge/conflict.ts";
import type { PlanAction } from "../core/merge/plan-file.ts";

export type Applied = { conflicts: string[]; changed: number };

// Write, delete or leave each file per plan
export async function applyPlan(dir: string, plan: PlanAction[]): Promise<Applied> {
  const out: Applied = { conflicts: [], changed: 0 };
  for (const action of plan) {
    const full = join(dir, ...action.rel.split("/"));
    if (action.kind === "keep") continue;
    if (action.kind === "delete") {
      await rm(full, { force: true });
      out.changed += 1;
      continue;
    }
    if (action.entry === undefined) continue;
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, action.entry.bytes, { mode: action.entry.mode });
    if (action.rej !== undefined) await writeFile(`${full}${REJ_SUFFIX}`, action.rej);
    if (action.kind === "conflict") out.conflicts.push(action.rel);
    out.changed += 1;
  }
  return out;
}
