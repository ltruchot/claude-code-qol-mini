import { join } from "node:path";
import type { Manifest } from "../core/schema/manifest.ts";
import type { Answers } from "../core/types.ts";
import { configDir } from "../io/config-dir.ts";
import { KAIZEN } from "../kit/files.ts";

// The command the kaizen skill runs to release /compact
export function releaseCommand(node: string = process.execPath, dir = configDir()): string {
  return `"${node}" "${join(dir, KAIZEN)}" --release`;
}

const BUILTINS: Record<string, () => string> = { RELEASE_COMMAND: releaseCommand };

// Placeholders the kit computes: never prompted, never taken from the lock
export function builtinAnswers(manifest: Manifest): Answers {
  const declared = manifest.placeholders.filter((p) => Object.hasOwn(BUILTINS, p.name));
  return Object.fromEntries(declared.map((p) => [p.name, BUILTINS[p.name]?.() ?? ""]));
}
