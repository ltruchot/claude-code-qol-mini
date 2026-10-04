import { join } from "node:path";
import type { FileMap } from "../core/types.ts";
import { cacheRoot } from "./cache.ts";
import { exists, readTree, writeTree } from "./fs.ts";

// Raw templates by template hash, base for 3-way merges
export function templatePath(hash: string): string {
  return join(cacheRoot(), "templates", hash);
}

export async function putTemplate(hash: string, files: FileMap): Promise<void> {
  const dir = templatePath(hash);
  if (!(await exists(dir))) await writeTree(dir, files);
}

export async function getTemplate(hash: string): Promise<FileMap | null> {
  const dir = templatePath(hash);
  return (await exists(dir)) ? readTree(dir) : null;
}
