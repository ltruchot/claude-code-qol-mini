import { existsSync, rmdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { configDir } from "../io/config-dir.ts";
import { print } from "../io/ui.ts";
import { BUNDLES, KAIZEN_SKILL, SOUNDS, SUPERSEDED } from "./files.ts";
import { sameSettings } from "./plan.ts";
import { row } from "./report.ts";
import { saveSettings } from "./save-settings.ts";
import { settingsWithout } from "./settings-without.ts";
import { readSettings } from "./state.ts";

const FILES = [...Object.keys(BUNDLES), KAIZEN_SKILL, ...SOUNDS.map((n) => `sounds/${n}`)];
// Emptied dirs go; one holding something of the user's stays
const DIRS = ["skills/kaizen", "skills", "hooks", "sounds"];

function removeFiles(target: string): string[] {
  const removed = [...FILES, ...SUPERSEDED].filter((r) => existsSync(join(target, r)));
  for (const relative of removed) unlinkSync(join(target, relative));
  if (existsSync(join(target, "state"))) {
    rmSync(join(target, "state"), { recursive: true, force: true });
    removed.push("state/");
  }
  for (const dir of DIRS) {
    try {
      rmdirSync(join(target, dir));
    } catch {
      // not empty, or not there
    }
  }
  return removed;
}

// Remove what install added. settings.json is written only when it changes.
export function runUninstall(): number {
  const target = configDir();
  const removed = removeFiles(target);
  for (const relative of removed) row("removed", relative);
  const before = existsSync(join(target, "settings.json")) ? readSettings(target) : null;
  const after = before === null ? null : settingsWithout(before);
  const cleaned = before !== null && after !== null && !sameSettings(before, after);
  if (cleaned) {
    saveSettings(target, after);
    row("cleaned", "settings.json");
  }
  const touched = removed.length > 0 || cleaned;
  print([
    touched ? "Done. Restart Claude Code." : `Nothing of ours left in ${target}. Nothing changed.`,
  ]);
  return 0;
}
