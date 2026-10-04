import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { stateDir, sweepStale, tokenFor } from "./kaizen-token.ts";
import { type Payload, text } from "./payload.ts";

export const BLOCKED =
  "Compaction held back: this session's friction has not been reviewed.\n" +
  "Run /kaizen to review it, then /compact again.";

// True when the compaction goes through. Automatic compaction is never
// blocked: it fires because the context is full. A recorded review is honored
// and its token consumed, so the next /compact here is reviewed too.
export function compactionPasses(data: Payload, cwd: string): boolean {
  if (text(data, "trigger") === "auto") return true;
  try {
    mkdirSync(stateDir(), { recursive: true });
    sweepStale(Date.now());
    const token = tokenFor(cwd);
    if (!existsSync(token)) return false;
    unlinkSync(token);
    return true;
  } catch {
    // A state directory that cannot be managed must not make /compact unusable
    return true;
  }
}
