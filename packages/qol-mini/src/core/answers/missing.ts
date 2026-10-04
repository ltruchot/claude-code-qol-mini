import type { Manifest } from "../schema/manifest.ts";
import type { Placeholder } from "../schema/placeholder.ts";
import type { Answers } from "../types.ts";

// Declared placeholders without a known answer
export function missingPlaceholders(manifest: Manifest, known: Answers): Placeholder[] {
  return manifest.placeholders.filter((p) => known[p.name] === undefined);
}

// Fill defaults, report names still missing
export function applyDefaults(manifest: Manifest, known: Answers): Answers {
  const out: Answers = { ...known };
  for (const p of manifest.placeholders) {
    if (out[p.name] === undefined && p.default !== undefined) out[p.name] = p.default;
  }
  return out;
}
