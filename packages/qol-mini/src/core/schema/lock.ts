import { z } from "zod";
import { MAX_NAME, SKILL_NAME } from "../names.ts";

export const SHA40 = /^[0-9a-f]{40}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
// Relative, no dot-dot segment, no backslash: Windows would read one as a separator
const REL = /^(?!\/)(?!.*\\)(?!.*(^|\/)\.\.(\/|$)).+$/;

export const SourceType = z.enum(["github", "local"]);
export const SkillName = z.string().regex(SKILL_NAME).max(MAX_NAME);

export const LockEntry = z.object({
  source: z.string().min(1),
  sourceType: SourceType,
  ref: z.string().min(1),
  sha: z.string().min(1),
  skillPath: z.string().regex(REL),
  path: z.string().regex(REL),
  templateHash: z.string().regex(SHA256),
  renderedHash: z.string().regex(SHA256),
  files: z.record(z.string().regex(REL), z.string().regex(SHA256)),
  answers: z.record(z.string(), z.string()),
  secrets: z.array(z.string()),
});

// Keys are skill names, path is pinned to .claude/skills/<name>: a lock cannot escape
export const LockFile = z
  .object({ version: z.literal(1), skills: z.record(SkillName, LockEntry) })
  .refine((l) => Object.entries(l.skills).every(([n, e]) => e.path === `.claude/skills/${n}`), {
    message: "lock entry path must be .claude/skills/<name>",
  });

export type LockEntry = z.infer<typeof LockEntry>;
export type LockFile = z.infer<typeof LockFile>;

export function emptyLock(): LockFile {
  return { version: 1, skills: {} };
}
