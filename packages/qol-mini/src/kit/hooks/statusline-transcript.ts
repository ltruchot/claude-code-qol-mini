import { type Payload, record } from "./payload.ts";
import { tail } from "./tail.ts";

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

function tokensOf(entry: Payload): number | undefined {
  // Everything before a compaction boundary was summarized away
  if (entry["subtype"] === "compact_boundary")
    return num(record(entry, "compactMetadata")["postTokens"]);
  // Sidechain entries are subagents: they carry their own window
  if (entry["type"] !== "assistant" || entry["isSidechain"] === true) return undefined;
  const usage = record(record(entry, "message"), "usage");
  if (Object.keys(usage).length === 0) return undefined;
  const keys = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"];
  return keys.reduce((sum, key) => sum + num(usage[key]), 0);
}

// Context size as of the newest main-thread turn, or 0. Read only when the
// payload has no count yet: before the first response and right after /compact.
export function fromTranscript(path: string): number {
  try {
    for (const line of tail(path).split("\n").toReversed()) {
      try {
        const found = tokensOf(JSON.parse(line) as Payload);
        if (found !== undefined) return found;
      } catch {
        // not a JSON line
      }
    }
  } catch {
    // no transcript
  }
  return 0;
}
