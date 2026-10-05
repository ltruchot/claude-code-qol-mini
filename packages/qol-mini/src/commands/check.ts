import type { CAC } from "cac";
import pc from "picocolors";
import { managedNames, unmanagedDirs } from "../core/lock/managed.ts";
import { STATUS_LABEL, type Status } from "../core/status/buckets.ts";
import { exitCode } from "../core/status/exit-code.ts";
import { listDirs } from "../io/dirs.ts";
import { info, outro, print } from "../io/ui.ts";
import { loadBank } from "./banks.ts";
import { checkOne } from "./check-one.ts";
import { type GlobalOpts, loadContext } from "./context.ts";
import { cmdIntro } from "./intro.ts";
import { lintHint } from "./lint-hint.ts";

type Opts = GlobalOpts & { frozen?: boolean };

const paint = (s: Status): string =>
  s === "ok" ? pc.green(STATUS_LABEL[s]) : pc.red(STATUS_LABEL[s]);

// Exit 0 ok, 1 update, 2 drift, 3 tamper
export async function runCheck(project: string | undefined, opts: Opts): Promise<number> {
  cmdIntro("check");
  const ctx = await loadContext(opts, project);
  const bank = await loadBank();
  const all: Status[] = [];
  const lines: string[] = [];
  const drifted: string[] = [];
  for (const name of managedNames(ctx.lock)) {
    const entry = ctx.lock.skills[name];
    if (entry === undefined) continue;
    const statuses = await checkOne(ctx, bank, name, entry, opts.frozen === true);
    all.push(...statuses);
    if (statuses.includes("drift")) drifted.push(name);
    lines.push(`${name}: ${statuses.map(paint).join(", ")}`);
  }
  print(lines);
  await lintHint(ctx, drifted);
  const unmanaged = unmanagedDirs(ctx.lock, await listDirs(ctx.p.skills));
  if (unmanaged.length > 0) info(`unmanaged: ${unmanaged.join(", ")}`);
  const code = exitCode(all);
  outro(code === 0 ? pc.green("all good") : pc.red(`exit ${code}`));
  return code;
}

export function register(cli: CAC): void {
  cli
    .command("check [project]", "Report skill status, exit code for CI")
    .option("--frozen", "Also verify the lock against the shipped template")
    .option("--global", "Act on the Claude config dir")
    .action(runCheck);
}
