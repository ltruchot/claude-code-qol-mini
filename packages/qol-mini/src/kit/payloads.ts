import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { releaseCommand } from "../commands/builtins.ts";
import { readSkill } from "../core/bank/index.ts";
import { renderTree } from "../core/render/tree.ts";
import { bankDir, packageRoot } from "../io/bank-dir.ts";
import { fail } from "../io/ui.ts";
import { BUNDLES, KAIZEN, KAIZEN_SKILL, PLAY, STATUSLINE, TAB } from "./files.ts";
import type { Chosen } from "./options.ts";

async function bundle(relative: string): Promise<Buffer> {
  const file = join(packageRoot(), "dist", BUNDLES[relative] ?? "");
  try {
    return await readFile(file);
  } catch {
    return fail(`${file} is missing: build the package first (vp run -r build)`);
  }
}

// The skill names the release command exactly: only the installer knows the
// interpreter and the absolute path the hook will have.
async function kaizenSkill(target: string, node: string): Promise<Buffer> {
  const skill = await readSkill(join(bankDir(), "kaizen"), "kaizen");
  const answers = { RELEASE_COMMAND: releaseCommand(node, target) };
  const rendered = renderTree(skill.files, skill.manifest, answers).get("SKILL.md");
  return rendered?.bytes ?? fail("kaizen: SKILL.md missing from the package");
}

// The files this install owns, as relative path -> exact bytes. The sounds
// are absent: they are created when missing and never rewritten.
export async function payloads(
  chosen: Chosen,
  target: string,
  node: string,
): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  if (chosen.statusline) files.set(STATUSLINE, await bundle(STATUSLINE));
  if (chosen.tabs) files.set(TAB, await bundle(TAB));
  if (chosen.sounds) files.set(PLAY, await bundle(PLAY));
  if (chosen.kaizen) {
    files.set(KAIZEN, await bundle(KAIZEN));
    files.set(KAIZEN_SKILL, await kaizenSkill(target, node));
  }
  return files;
}
