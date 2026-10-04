// Fail when a source or test file exceeds 50 lines. Skills, docs and the
// repo's own instructions are prose and follow no line law.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MAX = 50;
const ROOT = process.cwd();
const SCOPES = ["packages/qol-mini/src", "packages/qol-mini/tests", "scripts", "lint"];
const SKIP_DIRS = new Set(["node_modules", "fixtures"]);
const TEXT = /\.(ts|js|mjs)$/;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (TEXT.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function count(file: string): number {
  const text = readFileSync(file, "utf8");
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

const long = SCOPES.flatMap((scope) => walk(join(ROOT, scope), []))
  .map((f) => ({ file: relative(ROOT, f), lines: count(f) }))
  .filter((e) => e.lines > MAX);

for (const e of long) console.error(`${e.file}: ${e.lines} lines (max ${MAX})`);
if (long.length > 0) process.exit(1);
console.log("lines: ok");
