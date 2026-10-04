import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { wav } from "./wav.ts";

// Two rising notes: you are waited on. One lower, quieter note: a turn ended.
const TONES: Record<string, Buffer> = {
  "needs-you.wav": wav(
    [
      [660, 0.11],
      [880, 0.16],
    ],
    0.28,
  ),
  "done.wav": wav([[440, 0.2]], 0.2),
};

// Sound files are never regenerated: users drop their own
export function generateSounds(dir: string): string[] {
  mkdirSync(dir, { recursive: true });
  const missing = Object.keys(TONES).filter((name) => !existsSync(join(dir, name)));
  for (const name of missing) writeFileSync(join(dir, name), TONES[name] ?? "");
  return missing;
}
