import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type LintTool = { tool: string; file: string; where: string };

// Tool, the root file that reveals it, where its ignore list lives
const TOOLS: [string, RegExp, string][] = [
  ["Prettier", /^(\.prettierignore|\.prettierrc.*|prettier\.config\..+)$/, ".prettierignore"],
  ["ESLint", /^eslint\.config\..+$/, "ignores"],
  ["Biome", /^biome\.jsonc?$/, "files.includes, negated"],
  ["Oxlint", /^\.oxlintrc\.json$/, "ignorePatterns"],
  ["Oxfmt", /^\.oxfmtrc\.jsonc?$/, "ignorePatterns"],
  ["Stylelint", /^(\.stylelintignore|\.stylelintrc.*|stylelint\.config\..+)$/, ".stylelintignore"],
  ["markdownlint", /^\.markdownlint.*$/, ".markdownlintignore"],
  ["dprint", /^dprint\.jsonc?$/, "excludes"],
];
const VITE_CONFIG = /^vite\.config\.[cm]?[jt]s$/;
const VITE_PLUS_BLOCK = /\b(fmt|lint)\s*:/;
const VITE_PLUS_WHERE = "fmt.ignorePatterns, lint.ignorePatterns";

// Vite+ keeps Oxfmt and Oxlint settings inside vite.config.ts
async function vitePlus(root: string, names: string[]): Promise<LintTool[]> {
  const file = names.find((name) => VITE_CONFIG.test(name));
  if (file === undefined) return [];
  const text = await readFile(join(root, file), "utf8");
  return VITE_PLUS_BLOCK.test(text) ? [{ tool: "Vite+", file, where: VITE_PLUS_WHERE }] : [];
}

// Formatters and linters configured at the project root, read-only
export async function lintTools(root: string): Promise<LintTool[]> {
  const names = (await readdir(root).catch((): string[] => [])).toSorted();
  const found = TOOLS.flatMap(([tool, pattern, where]) => {
    const file = names.find((name) => pattern.test(name));
    return file === undefined ? [] : [{ tool, file, where }];
  });
  return [...found, ...(await vitePlus(root, names))];
}
