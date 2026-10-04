import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { z } from "zod";
import { stableJson } from "../core/lock/sort.ts";
import { exists } from "./fs.ts";

// Read + validate JSON, fallback when file absent
export async function readJson<T>(
  file: string,
  schema: z.ZodType<T>,
  fallback: () => T,
): Promise<T> {
  if (!(await exists(file))) return fallback();
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`invalid ${file}: ${result.error.message}`);
  return result.data;
}

// Temp file then rename, temp removed when either step fails
export async function writeJson(file: string, value: unknown, mode = 0o644): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, stableJson(value), { mode });
    await rename(tmp, file);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}
