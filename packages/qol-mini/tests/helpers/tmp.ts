import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function tmpDir(prefix = "qol-mini-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function cleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
