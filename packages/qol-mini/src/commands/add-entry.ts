import { buildEntry } from "../core/lock/entry.ts";
import type { LockEntry } from "../core/schema/lock.ts";
import type { Answers, FileMap } from "../core/types.ts";
import { VERSION } from "../version.ts";
import { BANK_PATH, type Found, SOURCE } from "./banks.ts";

// Lock entry for a freshly rendered skill
export function entryFor(found: Found, rendered: FileMap, answers: Answers): LockEntry {
  const { bank, skill } = found;
  return buildEntry({
    source: SOURCE,
    sourceType: "local",
    ref: VERSION,
    sha: bank.resolved.sha,
    skillPath: `${BANK_PATH}/${skill.name}`,
    path: `.claude/skills/${skill.name}`,
    template: skill.files,
    rendered,
    manifest: skill.manifest,
    answers,
  });
}
