import { z } from "zod";
import { SkillName } from "./lock.ts";

export const LOCAL_FILE = "qol-mini.local.json";

// skill name → placeholder name → secret value
export const LocalFile = z.object({
  version: z.literal(1),
  secrets: z.record(SkillName, z.record(z.string(), z.string())),
});

export type LocalFile = z.infer<typeof LocalFile>;

export function emptyLocal(): LocalFile {
  return { version: 1, secrets: {} };
}
