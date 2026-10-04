import { join } from "node:path";
import { hashTree } from "../core/hash/tree.ts";
import { renderTree } from "../core/render/tree.ts";
import type { LockEntry } from "../core/schema/lock.ts";
import type { Status } from "../core/status/buckets.ts";
import { computeStatus } from "../core/status/compute.ts";
import { configDir } from "../io/config-dir.ts";
import { exists } from "../io/fs.ts";
import { readSkillDisk } from "../io/skill-disk.ts";
import { warn } from "../io/ui.ts";
import { knownAnswers } from "./answers-known.ts";
import { builtinAnswers } from "./builtins.ts";
import { type Bank, findSkill } from "./banks.ts";
import type { Ctx } from "./context.ts";

// Statuses for one managed skill, tamper check under --frozen
export async function checkOne(
  ctx: Ctx,
  bank: Bank,
  name: string,
  entry: LockEntry,
  frozen: boolean,
): Promise<Status[]> {
  const skill = findSkill(bank, name)?.skill;
  let frozenRenderedHash: string | undefined;
  if (frozen && skill !== undefined && skill.templateHash === entry.templateHash) {
    const answers = { ...knownAnswers(ctx, name, entry), ...builtinAnswers(skill.manifest) };
    frozenRenderedHash = hashTree(renderTree(skill.files, skill.manifest, answers)).tree;
  }
  const statuses = computeStatus({
    entry,
    disk: await readSkillDisk(ctx.p, name),
    bankTemplateHash: skill?.templateHash,
    frozenRenderedHash,
  });
  if (frozen && frozenRenderedHash === undefined) statuses.push("unverified");
  if (!ctx.p.global && (await exists(join(configDir(), "skills", name))))
    warn(`${join(configDir(), "skills", name)} shadows the project skill`);
  return statuses.filter((s, _i, all) => s !== "ok" || all.length === 1);
}
