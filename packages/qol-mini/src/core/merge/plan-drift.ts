import { isText } from "../hash/text.ts";
import type { ConflictMode } from "../schema/conflict.ts";
import type { FileEntry } from "../types.ts";
import { resolveText } from "./conflict.ts";

export type ActionKind = "write" | "merge" | "conflict" | "delete" | "keep";
export type PlanAction = {
  rel: string;
  kind: ActionKind;
  entry?: FileEntry | undefined;
  rej?: Buffer | undefined;
  reason?: string | undefined;
};

export type DriftInput = {
  rel: string;
  base?: FileEntry | undefined;
  disk: FileEntry;
  theirs: FileEntry;
  mode: ConflictMode;
};

// Disk differs from lock: merge text, keep binaries
export function planDrift(f: DriftInput): PlanAction {
  const { rel, mode, disk, theirs } = f;
  if (!isText(disk.bytes) || !isText(theirs.bytes)) {
    return mode === "theirs"
      ? { rel, kind: "write", entry: theirs }
      : { rel, kind: "keep", reason: "binary drift" };
  }
  const base = f.base === undefined ? undefined : f.base.bytes.toString("utf8");
  const res = resolveText(mode, base, disk.bytes.toString("utf8"), theirs.bytes.toString("utf8"));
  const entry = { bytes: Buffer.from(res.text, "utf8"), mode: theirs.mode };
  const rej = res.rej === undefined ? undefined : Buffer.from(res.rej, "utf8");
  return { rel, kind: res.conflict ? "conflict" : "merge", entry, rej };
}
