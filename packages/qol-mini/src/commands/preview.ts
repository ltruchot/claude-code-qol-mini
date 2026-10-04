import pc from "picocolors";
import { SKILL_FILE } from "../core/bank/skill.ts";
import { hasConflictMarkers } from "../core/merge/three-way.ts";
import type { PlanAction } from "../core/merge/plan-file.ts";
import type { FileMap } from "../core/types.ts";
import { renderDiff } from "../io/diff-preview.ts";

// Files to write, SKILL.md diff when replacing
export function previewInstall(rendered: FileMap, disk: FileMap | null): string[] {
  const lines = [...rendered.keys()].map(
    (rel) => `  ${pc.green("+")} ${rel} (${rendered.get(rel)?.bytes.length} B)`,
  );
  const before = disk?.get(SKILL_FILE)?.bytes.toString("utf8");
  const after = rendered.get(SKILL_FILE)?.bytes.toString("utf8");
  if (before !== undefined && after !== undefined && before !== after)
    lines.push(...renderDiff(SKILL_FILE, before, after));
  return lines;
}

const ICON: Record<PlanAction["kind"], string> = {
  write: pc.green("write"),
  merge: pc.cyan("merge"),
  conflict: pc.red("conflict"),
  delete: pc.red("delete"),
  keep: pc.dim("keep"),
};

// One line per planned action, diff for merged text
export function previewPlan(plan: PlanAction[], disk: FileMap): string[] {
  const lines: string[] = [];
  for (const a of plan) {
    lines.push(
      `  ${ICON[a.kind]} ${a.rel}${a.reason === undefined ? "" : pc.dim(` (${a.reason})`)}`,
    );
    if (a.kind !== "merge" && a.kind !== "conflict") continue;
    const before = disk.get(a.rel)?.bytes.toString("utf8") ?? "";
    const after = a.entry?.bytes.toString("utf8") ?? "";
    if (!hasConflictMarkers(after)) lines.push(...renderDiff(a.rel, before, after).slice(1));
  }
  return lines;
}
