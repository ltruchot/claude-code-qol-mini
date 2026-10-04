import type { CAC } from "cac";
import { isManaged } from "../core/lock/managed.ts";
import { snapshot } from "../io/backup.ts";
import { rmDir } from "../io/fs.ts";
import { removeLines } from "../io/gitignore.ts";
import { withSecrets, writeLocal } from "../io/local.ts";
import { writeLock } from "../io/lock.ts";
import { skillDir } from "../io/paths.ts";
import { confirmOrYes } from "../io/prompts/confirm.ts";
import { fail, info, outro, success } from "../io/ui.ts";
import { type GlobalOpts, loadContext } from "./context.ts";
import { cmdIntro, TOOL } from "./intro.ts";
import { splitArgs } from "./targets.ts";

// Managed skills only: backup, dir, lock entry, secrets, gitignore line
export async function runRemove(args: string[], opts: GlobalOpts): Promise<void> {
  cmdIntro("remove");
  const { names, project } = splitArgs(args);
  const ctx = await loadContext(opts, project);
  if (names.length === 0) fail("name at least one skill");
  for (const name of names) {
    if (!isManaged(ctx.lock, name)) fail(`${name} is not managed by ${TOOL}`);
  }
  if (ctx.dryRun) {
    info(`dry run, would remove ${names.join(", ")}`);
    return;
  }
  if (!(await confirmOrYes(`Remove ${names.join(", ")}?`, ctx.yes))) return;
  for (const name of names) {
    await snapshot(ctx.p, name);
    await rmDir(skillDir(ctx.p, name));
    Reflect.deleteProperty(ctx.lock.skills, name);
    ctx.local = withSecrets(ctx.local, name, {});
    await removeLines(ctx.p.claudeGitignore, [`skills/${name}/`]);
    success(`${name} removed, previous files kept in the backup cache`);
  }
  await writeLock(ctx.p, ctx.lock);
  await writeLocal(ctx.p, ctx.local);
  outro("done");
}

export function register(cli: CAC): void {
  cli
    .command("remove [...args]", "Uninstall managed skills")
    .alias("rm")
    .option("--global", "Act on the Claude config dir")
    .example("qol-mini skills remove qa-pr ./my-project")
    .action(runRemove);
}
