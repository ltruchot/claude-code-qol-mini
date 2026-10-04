import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { hashBytes } from "../../src/core/hash/file.ts";

export type Snapshot = Map<string, string>;

// rel path → content hash, for write-allowlist assertions
export async function snapshotTree(
  root: string,
  dir = root,
  out: Snapshot = new Map(),
): Promise<Snapshot> {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) await snapshotTree(root, full, out);
    else out.set(relative(root, full), hashBytes(await readFile(full)));
  }
  return out;
}

// Paths added, removed or changed between two snapshots
export function changed(before: Snapshot, after: Snapshot): string[] {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((k) => before.get(k) !== after.get(k)).toSorted();
}
