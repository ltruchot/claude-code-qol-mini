import { join } from "node:path";
import { configDir } from "../io/config-dir.ts";
import { stdinIsConsole } from "../io/console.ts";
import { fail, print } from "../io/ui.ts";
import { apply } from "./apply.ts";
import { interview } from "./interview.ts";
import { parse } from "./parse.ts";
import { payloads } from "./payloads.ts";
import { idle, plan, sameSettings } from "./plan.ts";
import { hints } from "./hints.ts";
import { printClash, printOptout } from "./report.ts";
import { settingsFor } from "./settings.ts";
import { installedState, readSettings, type Settings } from "./state.ts";

function current(target: string): Settings {
  try {
    return readSettings(target);
  } catch {
    return fail(`${join(target, "settings.json")} is not valid JSON. Fix or move it, then re-run.`);
  }
}

// With no option and a real console, ask. With any option, or a stdin that
// is not a console, ask nothing: a prompt that blocks a script is a bug.
export async function runInstall(argv: string[]): Promise<number> {
  const decisive = argv.filter((arg) => arg !== "--replace");
  const target = configDir();
  const installed = installedState(target);
  const asking = decisive.length === 0 && stdinIsConsole();
  const chosen = asking ? await interview(installed) : parse(decisive, installed);
  const before = current(target);
  const wanted = await payloads(chosen, target, process.execPath);
  const merged = settingsFor(chosen, target, process.execPath, before);
  const p = plan(chosen, target, wanted, !sameSettings(merged, before));
  if (p.clash.length > 0 && !argv.includes("--replace")) {
    printClash(
      target,
      p.clash.map((relative) => join(target, relative)),
    );
    return 1;
  }
  if (idle(p)) {
    print([`Already installed in ${target}, with these settings. Nothing changed.`]);
    printOptout();
    return 0;
  }
  const { newSkillsDir } = apply(p, target, wanted, merged);
  hints(chosen, before, merged, newSkillsDir, p.settings, p.stale.length > 0);
  return 0;
}
