import { type Payload, text } from "./payload.ts";

const filled = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

// True when the turn ended only to wait on work that wakes it back up. A Stop
// payload carries `background_tasks` and `session_crons` for this; no other
// event does, so this reads false everywhere else.
export function pausedOnBackground(data: Payload): boolean {
  return filled(data["background_tasks"]) || filled(data["session_crons"]);
}

// Trailing characters that dress a line without ending it: markdown emphasis,
// code ticks, closing brackets and quotes.
const TRAIL = /[ \t*_`"')\]}»”]+$/;

// True when the turn ended on a question. Nothing in the runtime says so: a
// turn ending on a question is a plain Stop. Only the last non-empty line of
// `last_assistant_message` counts; kept that narrow on purpose.
export function endsOnQuestion(data: Payload): boolean {
  const lines = text(data, "last_assistant_message").split(/\r?\n/);
  for (const raw of lines.toReversed()) {
    const line = raw.replace(TRAIL, "");
    if (line !== "") return line.endsWith("?");
  }
  return false;
}
