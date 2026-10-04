import { hashEntry } from "../hash/file.ts";
import type { ConflictMode } from "../schema/conflict.ts";
import type { FileEntry } from "../types.ts";
import { classifyFile } from "./classify.ts";
import { type PlanAction, planDrift } from "./plan-drift.ts";

export type { ActionKind, PlanAction } from "./plan-drift.ts";

export type FileInput = {
  rel: string;
  base?: FileEntry | undefined;
  theirs?: FileEntry | undefined;
  disk?: FileEntry | undefined;
  lockHash?: string | undefined;
  skip: boolean;
  mode: ConflictMode;
};

const hashOf = (rel: string, e?: FileEntry): string | undefined =>
  e === undefined ? undefined : hashEntry(rel, e.mode, e.bytes);

// Decide one file: write, merge, conflict, delete or keep
export function planFile(f: FileInput): PlanAction {
  const { rel, theirs, disk } = f;
  const keep: PlanAction = { rel, kind: "keep" };
  if (f.skip && disk !== undefined) return { rel, kind: "keep", reason: "skipIfExists" };
  const diskHash = hashOf(rel, disk);
  const theirsHash = hashOf(rel, theirs);
  const write: PlanAction = theirs === undefined ? keep : { rel, kind: "write", entry: theirs };
  switch (classifyFile(f.lockHash, diskHash, theirsHash)) {
    case "missing":
      return write;
    case "extra":
      return { rel, kind: "keep", reason: "not managed" };
    case "removed":
      return diskHash === f.lockHash
        ? { rel, kind: "delete" }
        : { rel, kind: "keep", reason: "local edits" };
    case "same":
      return diskHash === theirsHash ? keep : write;
    case "drift":
      if (disk === undefined || theirs === undefined) return keep;
      return planDrift({ rel, base: f.base, disk, theirs, mode: f.mode });
    default:
      return keep;
  }
}
