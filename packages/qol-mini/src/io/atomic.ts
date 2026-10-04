import { cp, mkdir, rename, rm } from "node:fs/promises";
import { exists } from "./fs.ts";

const WORK = ".qm-work-";
const OLD = ".qm-old-";

// Mutate a copy, swap by two renames; the old dir survives until the new one is in place
export async function swapDir<T>(dir: string, mutate: (work: string) => Promise<T>): Promise<T> {
  const work = `${dir}${WORK}${process.pid}`;
  const old = `${dir}${OLD}${process.pid}`;
  await rm(work, { recursive: true, force: true });
  const present = await exists(dir);
  await (present ? cp(dir, work, { recursive: true }) : mkdir(work, { recursive: true }));
  let result: T;
  try {
    result = await mutate(work);
  } catch (error) {
    await rm(work, { recursive: true, force: true });
    throw error;
  }
  if (present) await rename(dir, old);
  await rename(work, dir);
  if (present) await rm(old, { recursive: true, force: true });
  return result;
}

// Leftovers of an interrupted swap, never listed as skills
export function isWorkDir(name: string): boolean {
  return name.includes(WORK) || name.includes(OLD);
}
