import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Settings } from "./state.ts";

const two = (value: number): string => String(value).padStart(2, "0");

// 20260131-235959, local time
export function stamp(now: Date = new Date()): string {
  const day = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`;
  return `${day}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
}

// Copy the file beside itself as <name>.bak-<stamp>; the backup's name, or null
export function backup(file: string): string | null {
  if (!existsSync(file)) return null;
  const copy = `${file}.bak-${stamp()}`;
  copyFileSync(file, copy);
  return copy;
}

// Called only when the merge changes the file: a no-op run leaves no backup
export function saveSettings(target: string, data: Settings): string | null {
  const file = join(target, "settings.json");
  mkdirSync(dirname(file), { recursive: true });
  const copy = backup(file);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return copy;
}
