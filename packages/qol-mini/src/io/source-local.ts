import { hashTree } from "../core/hash/tree.ts";
import { exists, readTree } from "./fs.ts";

export type Resolved = { dir: string; sha: string };

// sha = "local:" + tree hash of the bank dir
export async function fetchLocal(dir: string): Promise<Resolved> {
  if (!(await exists(dir))) throw new Error(`bank not found: ${dir}`);
  const tree = hashTree(await readTree(dir));
  return { dir, sha: `local:${tree.tree}` };
}
