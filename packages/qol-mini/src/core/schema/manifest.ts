import { parse } from "yaml";
import { z } from "zod";
import { Placeholder } from "./placeholder.ts";

export const MANIFEST_FILE = "qol-mini.yaml";

export const Manifest = z
  .object({
    version: z.literal(1),
    placeholders: z.array(Placeholder).default([]),
    skipIfExists: z.array(z.string().min(1)).default([]),
  })
  .refine((m) => new Set(m.placeholders.map((p) => p.name)).size === m.placeholders.length, {
    message: "duplicate placeholder name",
  });

export type Manifest = z.infer<typeof Manifest>;

export function emptyManifest(): Manifest {
  return { version: 1, placeholders: [], skipIfExists: [] };
}

export function parseManifest(text: string): Manifest {
  const raw: unknown = parse(text);
  const result = Manifest.safeParse(raw);
  if (!result.success) throw new Error(`invalid ${MANIFEST_FILE}: ${result.error.message}`);
  return result.data;
}

export function declaredNames(manifest: Manifest): Set<string> {
  return new Set(manifest.placeholders.map((p) => p.name));
}
