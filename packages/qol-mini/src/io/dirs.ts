import { readdir } from "node:fs/promises";
import { exists } from "./fs.ts";

// Direct child dirs (symlinks included), sorted
export async function listDirs(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .map((e) => e.name)
    .toSorted();
}
