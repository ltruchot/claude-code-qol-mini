import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { row } from "./report.ts";
import { backup } from "./save-settings.ts";
import { parses, patched, present, reverted } from "./vscode-patch.ts";

export type Flags = { dryRun: boolean; force: boolean; revert: boolean };

function save(path: string, updated: string, verb: string, dryRun: boolean): void {
  if (!parses(updated)) {
    row("SKIPPED", `${path} (result would not parse)`);
    return;
  }
  if (dryRun) {
    row(`would ${verb.slice(0, -2)}`, path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  backup(path);
  writeFileSync(path, updated);
  row(verb, path);
}

// Patch or revert one settings.json, with a backup beside it
export function one(path: string, flags: Flags): void {
  const original = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (flags.revert) {
    const updated = reverted(original);
    if (updated === original) {
      row("not present", path);
      return;
    }
    save(path, updated, "reverted", flags.dryRun);
    return;
  }
  if (present(original) && !flags.force) {
    row("already set", path);
    return;
  }
  const updated = patched(original);
  if (updated === null) {
    row("SKIPPED", `${path} (no JSON object found)`);
    return;
  }
  save(path, updated, "patched", flags.dryRun);
}
