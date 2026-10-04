import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { print } from "../io/ui.ts";
import { KEY, VALUE } from "./vscode-patch.ts";
import { candidates } from "./vscode-paths.ts";
import { one } from "./vscode-one.ts";

// Set "terminal.integrated.tabs.title": "${sequence}" in every editor
// settings.json that applies; without it the marker is never displayed
export function runVscode(argv: string[], paths: string[] = candidates()): number {
  const flags = {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
    revert: argv.includes("--revert"),
  };
  const targets = paths.filter((path) => existsSync(path) || existsSync(dirname(path)));
  if (targets.length === 0) {
    print(["No editor settings.json found. Add this by hand instead:", `  "${KEY}": "${VALUE}"`]);
    return 0;
  }
  for (const path of targets) one(path, flags);
  print(["", "Reload the editor window to apply."]);
  return 0;
}
