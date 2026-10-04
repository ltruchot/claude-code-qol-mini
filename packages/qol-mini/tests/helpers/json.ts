import { readFile } from "node:fs/promises";
import { z } from "zod";
import { LocalFile } from "../../src/core/schema/local.ts";
import { LockFile } from "../../src/core/schema/lock.ts";

// Typed JSON readers so tests never touch `any`
export function parseAs<T>(schema: z.ZodType<T>, text: string): T {
  return schema.parse(JSON.parse(text));
}

export async function readLockFile(file: string): Promise<LockFile> {
  return parseAs(LockFile, await readFile(file, "utf8"));
}

export async function readLocalFile(file: string): Promise<LocalFile> {
  return parseAs(LocalFile, await readFile(file, "utf8"));
}

export const Rows = z.array(z.object({ name: z.string(), status: z.string() }));
export const Findings = z.record(z.string(), z.array(z.unknown()));
