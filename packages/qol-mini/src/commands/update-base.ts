import { type Skill, skillFromFiles } from "../core/bank/skill.ts";
import type { LockEntry } from "../core/schema/lock.ts";
import { getTemplate } from "../io/template-cache.ts";
import { warn } from "../io/ui.ts";
import type { Found } from "./banks.ts";

// Template as installed, from the cache; without it local edits become conflicts
export async function baseSkill(found: Found, entry: LockEntry): Promise<Skill | undefined> {
  const cached = await getTemplate(entry.templateHash);
  if (cached !== null) return skillFromFiles(found.skill.name, "cache", cached);
  warn(`${found.skill.name}: base template not in cache, local edits become conflicts`);
  return undefined;
}
