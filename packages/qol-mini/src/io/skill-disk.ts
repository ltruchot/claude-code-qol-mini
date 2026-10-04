import type { FileMap } from "../core/types.ts";
import { exists, readTree } from "./fs.ts";
import { type Paths, skillDir } from "./paths.ts";

// Installed skill files, null when absent
export async function readSkillDisk(p: Paths, name: string): Promise<FileMap | null> {
  const dir = skillDir(p, name);
  return (await exists(dir)) ? readTree(dir) : null;
}
