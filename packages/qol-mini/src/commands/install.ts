import type { CAC } from "cac";
import { isManaged } from "../core/lock/managed.ts";
import { exists } from "../io/fs.ts";
import { writeLocal } from "../io/local.ts";
import { writeLock } from "../io/lock.ts";
import { skillDir } from "../io/paths.ts";
import { fail, outro } from "../io/ui.ts";
import { addOne } from "./add-one.ts";
import { type Bank, bankNames, findSkill, type Found, loadBank } from "./banks.ts";
import { type Ctx, type GlobalOpts, loadContext } from "./context.ts";
import { cmdIntro } from "./intro.ts";
import { pickSkills, splitArgs } from "./targets.ts";
import { updateName } from "./update-name.ts";

// A managed skill present on disk is merged; anything else is written fresh
async function installOne(ctx: Ctx, bank: Bank, found: Found): Promise<void> {
  const { name } = found.skill;
  const merge = isManaged(ctx.lock, name) && (await exists(skillDir(ctx.p, name)));
  return merge ? updateName(ctx, bank, name) : addOne(ctx, found);
}

export async function runInstall(args: string[], opts: GlobalOpts): Promise<void> {
  cmdIntro("install");
  const { names, project } = splitArgs(args);
  const ctx = await loadContext(opts, project);
  const bank = await loadBank();
  for (const name of await pickSkills(ctx, bank, names)) {
    const found = findSkill(bank, name);
    if (found === undefined) fail(`unknown skill: ${name}, shipped: ${bankNames(bank).join(", ")}`);
    await installOne(ctx, bank, found);
    await writeLock(ctx.p, ctx.lock);
    await writeLocal(ctx.p, ctx.local);
  }
  outro(`done: ${ctx.p.skills}`);
}

export function register(cli: CAC): void {
  cli
    .command("install [...args]", "Install skills into a project: names, then a project path")
    .option("--replace", "Take the kit's version of every file edited locally")
    .option("--conflict <mode>", "An edited file on update: inline (default), rej, ours, theirs")
    .option("--global", "Install into the Claude config dir, for every project")
    .example("qol-mini skills install qa-pr ./my-project")
    .example("qol-mini skills install --replace /path/to/my-project")
    .action(runInstall);
}
