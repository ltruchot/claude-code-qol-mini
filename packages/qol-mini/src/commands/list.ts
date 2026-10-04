import type { CAC } from "cac";
import pc from "picocolors";
import { print } from "../io/ui.ts";
import { loadBank } from "./banks.ts";
import { type GlobalOpts, loadContext } from "./context.ts";
import { cmdIntro } from "./intro.ts";
import { listRows, type Row } from "./list-rows.ts";

function color(status: string): string {
  if (status.startsWith("up to date") || status === "available") return pc.green(status);
  if (status.startsWith("unmanaged")) return pc.yellow(status);
  return pc.red(status);
}

const brief = (text: string): string => (text.length > 72 ? `${text.slice(0, 71)}…` : text);

function format(rows: Row[]): string[] {
  const width = Math.max(4, ...rows.map((r) => r.name.length));
  return rows.map(
    (r) => `${r.name.padEnd(width)}  ${color(r.status)}  ${pc.dim(brief(r.description))}`,
  );
}

export async function runList(project: string | undefined, opts: GlobalOpts): Promise<void> {
  const ctx = await loadContext(opts, project);
  const rows = await listRows(ctx, await loadBank());
  if (ctx.json) {
    print([JSON.stringify(rows, null, 2)]);
    return;
  }
  cmdIntro("list");
  print(format(rows));
}

export function register(cli: CAC): void {
  cli
    .command("list [project]", "Show shipped and installed skills")
    .alias("ls")
    .option("--global", "Act on the Claude config dir")
    .action(runList);
}
