import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { exists } from "./fs.ts";

async function readLines(file: string): Promise<string[]> {
  if (!(await exists(file))) return [];
  return (await readFile(file, "utf8")).split("\n").filter((l) => l.length > 0);
}

async function writeLines(file: string, lines: string[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, lines.length === 0 ? "" : `${lines.join("\n")}\n`);
}

// Append missing lines, true when file changed
export async function ensureLines(file: string, lines: string[]): Promise<boolean> {
  const current = await readLines(file);
  const missing = lines.filter((l) => !current.includes(l));
  if (missing.length === 0) return false;
  await writeLines(file, [...current, ...missing]);
  return true;
}

export async function removeLines(file: string, lines: string[]): Promise<boolean> {
  const current = await readLines(file);
  const next = current.filter((l) => !lines.includes(l));
  if (next.length === current.length) return false;
  await writeLines(file, next);
  return true;
}
