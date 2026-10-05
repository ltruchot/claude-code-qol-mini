import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { optedOut } from "./optout.ts";
import type { Payload } from "./payload.ts";

function todoFile(cwd: string): string | undefined {
  const name = readdirSync(cwd)
    .toSorted()
    .find((entry) => entry.toLowerCase() === "todo.md" && statSync(join(cwd, entry)).isFile());
  return name === undefined ? undefined : join(cwd, name);
}

// SessionStart with source `compact` is the only channel to Claude after a
// compaction: name TODO.md there. No terminalSequence: tab-state.js owns the
// marker on SessionStart. Any failure returns null, so the session starts clean.
export function afterCompact(cwd: string): Payload | null {
  try {
    if (optedOut(cwd, "kaizen")) return null;
    const todo = todoFile(cwd);
    if (todo === undefined || readFileSync(todo, "utf8").trim() === "") return null;
    return {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          `Compaction done. Read ${todo} first: where this session stopped, and ` +
          "what is left. Open a todo/ file only for the item you work on.",
      },
    };
  } catch {
    return null;
  }
}
