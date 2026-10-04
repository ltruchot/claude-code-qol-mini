import { print } from "../io/ui.ts";

// One line per file, the verb in a 14-character column
export function row(verb: string, what: string): void {
  print([`  ${verb.padEnd(14)}${what}`]);
}

export function printOptout(): void {
  print([
    "Leave one project alone -- no block, no marker, no sound:",
    "  mkdir -p <project>/.claude && touch <project>/.claude/qol-mini-off",
  ]);
}

export function printClash(target: string, files: string[]): void {
  print([
    `${files.length} file(s) in ${target} differ from what this version ships:`,
    ...files.map((file) => `  ${file}`),
    "",
    "Nothing was written. The installer creates what is missing and never",
    "overwrites what is there: it cannot tell an older version from an edit",
    "made on purpose. Remove the files above and re-run, or uninstall for a",
    "clean slate, or re-run with --replace to have them written over.",
  ]);
}

export const USAGE = [
  "Usage: qol-mini install [options]",
  "  --statusline / --no-statusline   the context gauge (default on)",
  "  --sounds / --no-sounds           the notification sounds (default on)",
  "  --kaizen / --no-kaizen           the /compact friction review (default on)",
  "  --tab-state / --no-tab-state     the terminal tab marker (default off:",
  "                                   it retitles every terminal)",
  "  --warn N       gauge turns orange at N tokens (default 100000)",
  "  --alert N      gauge turns red at N tokens (default 200000)",
  "  --defaults     install the defaults without asking",
  "  --replace      overwrite delivered files that differ",
  "",
  "       qol-mini uninstall",
  "       qol-mini vscode [--dry-run] [--force] [--revert]",
  "       qol-mini skills --help",
];
