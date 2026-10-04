import { writeLocal } from "../io/local.ts";
import { writeLock } from "../io/lock.ts";
import { fail, info } from "../io/ui.ts";
import { collectAnswers } from "./add-prompts.ts";
import { knownAnswers } from "./answers-known.ts";
import { type Bank, findSkill } from "./banks.ts";
import type { Ctx } from "./context.ts";
import { TOOL } from "./intro.ts";
import { baseSkill } from "./update-base.ts";
import { applyUpdate } from "./update-one.ts";

// Update one managed skill and persist lock + secrets
export async function updateName(ctx: Ctx, bank: Bank, name: string): Promise<void> {
  const entry = ctx.lock.skills[name];
  if (entry === undefined) fail(`${name} is not installed, use ${TOOL} skills install`);
  const found = findSkill(bank, name);
  if (found === undefined) fail(`${name}: no longer shipped, remove it or keep as is`);
  if (found.skill.templateHash === entry.templateHash && !ctx.replace) {
    info(`${name}: up to date`);
    return;
  }
  const base = await baseSkill(found, entry);
  const known = knownAnswers(ctx, name, entry);
  const answers = await collectAnswers(found.skill.manifest, known, ctx.yes);
  await applyUpdate(ctx, { found, entry, base, answers });
  await writeLock(ctx.p, ctx.lock);
  await writeLocal(ctx.p, ctx.local);
}
