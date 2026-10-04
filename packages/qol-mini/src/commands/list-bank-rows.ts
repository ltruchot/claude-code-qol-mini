import { description } from "../core/bank/skill.ts";
import { STATUS_LABEL } from "../core/status/buckets.ts";
import { computeStatus } from "../core/status/compute.ts";
import { readSkillDisk } from "../io/skill-disk.ts";
import type { Bank } from "./banks.ts";
import type { Ctx } from "./context.ts";

export type Row = { name: string; status: string; description: string };

// One row per shipped skill: available, or lock status
export async function bankRows(ctx: Ctx, bank: Bank): Promise<Row[]> {
  const rows: Row[] = [];
  for (const skill of bank.skills) {
    const entry = ctx.lock.skills[skill.name];
    let status = "available";
    if (entry !== undefined) {
      const disk = await readSkillDisk(ctx.p, skill.name);
      const statuses = computeStatus({ entry, disk, bankTemplateHash: skill.templateHash });
      status = statuses.map((s) => STATUS_LABEL[s]).join(", ");
    }
    rows.push({ name: skill.name, status, description: description(skill) });
  }
  return rows;
}
