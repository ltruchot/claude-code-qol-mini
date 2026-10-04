import { isWorkDir } from "../../io/atomic.ts";
import type { LockFile } from "../schema/lock.ts";

export function isManaged(lock: LockFile, name: string): boolean {
  return Object.hasOwn(lock.skills, name);
}

export function managedNames(lock: LockFile): string[] {
  return Object.keys(lock.skills).toSorted();
}

// Skill dirs present on disk but absent from lock
export function unmanagedDirs(lock: LockFile, dirs: string[]): string[] {
  return dirs.filter((d) => !isManaged(lock, d) && !isWorkDir(d)).toSorted();
}
