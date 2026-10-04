import { hashTree } from "../hash/tree.ts";
import { hasConflictMarkers } from "../merge/three-way.ts";
import type { LockEntry } from "../schema/lock.ts";
import type { FileMap } from "../types.ts";
import type { Status } from "./buckets.ts";

export type StatusInput = {
  entry: LockEntry;
  disk: FileMap | null;
  configRef?: string | undefined;
  bankTemplateHash?: string | undefined;
  frozenRenderedHash?: string | undefined;
};

// Statuses for one managed skill, ["ok"] when clean
export function computeStatus(input: StatusInput): Status[] {
  const out: Status[] = [];
  const { entry, disk } = input;
  if (disk === null) out.push("missing");
  else {
    const tree = hashTree(disk);
    if (tree.tree !== entry.renderedHash) out.push("drift");
    if (anyConflict(disk)) out.push("conflict");
  }
  if (input.configRef !== undefined && input.configRef !== entry.ref) out.push("wrong-ref");
  if (input.bankTemplateHash !== undefined && input.bankTemplateHash !== entry.templateHash)
    out.push("update");
  if (input.frozenRenderedHash !== undefined && input.frozenRenderedHash !== entry.renderedHash)
    out.push("tamper");
  return out.length === 0 ? ["ok"] : out;
}

function anyConflict(disk: FileMap): boolean {
  for (const entry of disk.values()) {
    if (hasConflictMarkers(entry.bytes.toString("utf8"))) return true;
  }
  return false;
}
