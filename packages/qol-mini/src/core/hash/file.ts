import { createHash } from "node:crypto";
import { canonical } from "./text.ts";

export function sha256(parts: Buffer[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest("hex");
}

export function hashBytes(bytes: Buffer): string {
  return sha256([canonical(bytes)]);
}

const NUL = Buffer.from([0]);

// sha256(rel \0 mode \0 len \0 bytes), length-prefixed, LF-normalized
export function hashEntry(rel: string, mode: number, bytes: Buffer): string {
  const body = canonical(bytes);
  return sha256([
    Buffer.from(rel, "utf8"),
    NUL,
    Buffer.from(mode.toString(8), "utf8"),
    NUL,
    Buffer.from(String(body.length), "utf8"),
    NUL,
    body,
  ]);
}
