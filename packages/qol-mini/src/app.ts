import { cac, type CAC } from "cac";
import { registerAll } from "./commands/index.ts";
import { isKitError } from "./core/errors.ts";
import { fail, print, printErr } from "./io/ui.ts";
import { runKit } from "./kit/index.ts";
import { VERSION } from "./version.ts";

export const SKILLS = "skills";

// Project scope: `qol-mini skills <command>`
export function skillsCli(): CAC {
  const cli = cac(`qol-mini ${SKILLS}`);
  cli.option("--cwd <dir>", "Dir to resolve a project from, default cwd");
  cli.option("-y, --yes", "Skip prompts, fail on missing answers");
  cli.option("--json", "Machine output where supported");
  cli.option("--dry-run", "Plan and preview, write nothing");
  registerAll(cli);
  cli.help();
  return cli;
}

async function skills(argv: string[]): Promise<number> {
  const cli = skillsCli();
  cli.parse([...argv.slice(0, 2), ...argv.slice(3)], { run: false });
  if (cli.matchedCommand === undefined && cli.options["help"] !== true) cli.outputHelp();
  const result: unknown = await cli.runMatchedCommand();
  return typeof result === "number" ? result : 0;
}

async function dispatch(argv: string[]): Promise<number> {
  if (argv[2] === SKILLS) return skills(argv);
  if (argv[2] === "--version" || argv[2] === "-v") {
    print([VERSION]);
    return 0;
  }
  return (await runKit(argv.slice(2))) ?? fail(`unknown command: ${argv[2]}, see qol-mini --help`);
}

// Run the command, map errors to exit codes
export async function main(argv: string[]): Promise<number> {
  try {
    return await dispatch(argv);
  } catch (error) {
    printErr(`error: ${(error as Error).message}`);
    return isKitError(error) ? error.code : 1;
  }
}
