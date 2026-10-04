import type { CAC } from "cac";
import { managedNames } from "../core/lock/managed.ts";
import { outro } from "../io/ui.ts";
import { loadBank } from "./banks.ts";
import { type GlobalOpts, loadContext } from "./context.ts";
import { cmdIntro } from "./intro.ts";
import { splitArgs } from "./targets.ts";
import { updateName } from "./update-name.ts";

// Named skills, else every managed one; local edits are merged
export async function runUpdate(args: string[], opts: GlobalOpts): Promise<void> {
  cmdIntro("update");
  const { names, project } = splitArgs(args);
  const ctx = await loadContext(opts, project);
  const bank = await loadBank();
  for (const name of names.length > 0 ? names : managedNames(ctx.lock)) {
    await updateName(ctx, bank, name);
  }
  outro("done");
}

export function register(cli: CAC): void {
  cli
    .command("update [...args]", "Merge the kit's changes into installed skills")
    .option("--replace", "Take the kit's version of every file edited locally")
    .option("--conflict <mode>", "An edited file on update: inline (default), rej, ours, theirs")
    .option("--global", "Act on the Claude config dir")
    .example("qol-mini skills update ./my-project")
    .example("qol-mini skills update qa-pr --dry-run")
    .action(runUpdate);
}
