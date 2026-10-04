import type { Skill } from "../core/bank/skill.ts";
import { buildPlan, summarize } from "../core/merge/plan.ts";
import type { PlanAction } from "../core/merge/plan-file.ts";
import { renderTree } from "../core/render/tree.ts";
import type { LockEntry } from "../core/schema/lock.ts";
import type { Answers, FileMap } from "../core/types.ts";
import { readSkillDisk } from "../io/skill-disk.ts";
import type { Found } from "./banks.ts";
import type { Ctx } from "./context.ts";

export type UpdateInput = {
  found: Found;
  entry: LockEntry;
  base?: Skill | undefined;
  answers: Answers;
};

export type Planned = { plan: PlanAction[]; theirs: FileMap; disk: FileMap; idle: boolean };

// base = old template + old answers, theirs = new template + answers
export async function planUpdate(
  ctx: Ctx,
  skill: Skill,
  entry: LockEntry,
  base: Skill | undefined,
  oldAnswers: Answers,
  answers: Answers,
): Promise<Planned> {
  const baseFiles: FileMap =
    base === undefined ? new Map() : renderTree(base.files, base.manifest, oldAnswers);
  const theirs = renderTree(skill.files, skill.manifest, answers);
  const disk = (await readSkillDisk(ctx.p, skill.name)) ?? new Map();
  const plan = buildPlan({
    base: baseFiles,
    theirs,
    disk,
    lockFiles: entry.files,
    skip: skill.manifest.skipIfExists,
    mode: ctx.conflict,
  });
  const idle = Object.keys(summarize(plan)).every((k) => k === "keep");
  return { plan, theirs, disk, idle };
}
