import { splitAnswers } from "../core/answers/split.ts";
import { swapDir } from "../io/atomic.ts";
import { snapshot } from "../io/backup.ts";
import { withSecrets } from "../io/local.ts";
import { skillDir } from "../io/paths.ts";
import { confirmOrYes } from "../io/prompts/confirm.ts";
import { putTemplate } from "../io/template-cache.ts";
import { info, print, success, warn } from "../io/ui.ts";
import { entryFor } from "./add-entry.ts";
import { knownAnswers } from "./answers-known.ts";
import type { Ctx } from "./context.ts";
import { previewPlan } from "./preview.ts";
import { applyPlan } from "./update-apply.ts";
import { planUpdate, type UpdateInput } from "./update-plan.ts";

// Preview, confirm, backup, atomic apply; lock keeps the pure render, not disk
export async function applyUpdate(ctx: Ctx, input: UpdateInput): Promise<boolean> {
  const { found, entry, answers } = input;
  const { skill } = found;
  const name = skill.name;
  const planned = await planUpdate(
    ctx,
    skill,
    entry,
    input.base,
    knownAnswers(ctx, name, entry),
    answers,
  );
  if (planned.idle) info(`${name}: nothing to write`);
  else {
    print(previewPlan(planned.plan, planned.disk));
    if (ctx.dryRun) {
      info(`${name}: dry run, nothing written`);
      return false;
    }
    if (!(await confirmOrYes(`Apply to ${skillDir(ctx.p, name)}?`, ctx.yes))) return false;
  }
  await snapshot(ctx.p, name);
  const applied = await swapDir(skillDir(ctx.p, name), (work) => applyPlan(work, planned.plan));
  await putTemplate(skill.templateHash, skill.files);
  ctx.lock.skills[name] = entryFor(found, planned.theirs, answers);
  ctx.local = withSecrets(ctx.local, name, splitAnswers(skill.manifest, answers).secret);
  if (applied.conflicts.length > 0)
    warn(`${name}: resolve conflicts in ${applied.conflicts.join(", ")}`);
  else success(`${name}: ${applied.changed} file(s) written`);
  return true;
}
