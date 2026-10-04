import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { print } from "../io/ui.ts";
import { KAIZEN_SKILL } from "./files.ts";
import type { Plan } from "./plan.ts";
import { row } from "./report.ts";
import { saveSettings } from "./save-settings.ts";
import { generateSounds } from "./sounds.ts";
import type { Settings } from "./state.ts";

export type Applied = { newSkillsDir: boolean };

// Write the plan: stale files go, missing files are created, differing ones
// are replaced (the caller refused earlier without --replace)
export function apply(
  p: Plan,
  target: string,
  wanted: Map<string, Buffer>,
  merged: Settings,
): Applied {
  const newSkillsDir = p.create.includes(KAIZEN_SKILL) && !existsSync(join(target, "skills"));
  print([`Installing into ${target}`]);
  mkdirSync(target, { recursive: true });
  for (const relative of p.stale) {
    unlinkSync(join(target, relative));
    row("removed", relative);
  }
  for (const relative of [...p.create, ...p.clash].toSorted()) {
    mkdirSync(dirname(join(target, relative)), { recursive: true });
    writeFileSync(join(target, relative), wanted.get(relative) ?? "");
    row(p.clash.includes(relative) ? "replaced" : "created", relative);
  }
  for (const relative of p.same) row("unchanged", relative);
  if (p.sounds.length > 0)
    for (const name of generateSounds(join(target, "sounds"))) row("created", `sounds/${name}`);
  if (p.settings) {
    const copy = saveSettings(target, merged);
    if (copy !== null) row("backup", copy.slice(target.length + 1));
    row("updated", "settings.json");
  } else row("unchanged", "settings.json");
  return { newSkillsDir };
}
