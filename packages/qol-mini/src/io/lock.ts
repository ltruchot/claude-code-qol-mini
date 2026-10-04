import { emptyLock, LockFile } from "../core/schema/lock.ts";
import { readJson, writeJson } from "./json.ts";
import type { Paths } from "./paths.ts";

export function readLock(p: Paths): Promise<LockFile> {
  return readJson(p.lock, LockFile, emptyLock);
}

export function writeLock(p: Paths, lock: LockFile): Promise<void> {
  return writeJson(p.lock, lock);
}
