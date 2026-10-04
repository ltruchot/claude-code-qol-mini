import { merge } from "node-diff3";

export type MergeResult = { text: string; conflict: boolean };

const LABELS = { a: "local", o: "qol-mini base", b: "qol-mini update" };

// base = old render, ours = disk, theirs = new render
export function mergeThreeWay(base: string, ours: string, theirs: string): MergeResult {
  const res = merge(ours, base, theirs, {
    stringSeparator: /\n/,
    excludeFalseConflicts: true,
    label: LABELS,
  });
  return { text: res.result.join("\n"), conflict: res.conflict };
}

// All three markers must be present, a doc quoting one marker is not a conflict
export function hasConflictMarkers(text: string): boolean {
  return /^<{7} /m.test(text) && /^={7}$/m.test(text) && /^>{7} /m.test(text);
}
