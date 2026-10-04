import { basename } from "node:path";
import { type Payload, record, text } from "./payload.ts";
import { human, roundHalfEven } from "./statusline-format.ts";
import { fromTranscript } from "./statusline-transcript.ts";

const BAR = 10;
const [RESET, BOLD, DIM] = ["\u001B[0m", "\u001B[1m", "\u001B[2m"];
const [WHITE, GREEN, RED] = ["\u001B[97m", "\u001B[32m", "\u001B[91m"];
const ORANGE = "\u001B[38;5;208m"; // 256-color orange, distinct from warning yellow

export type Limits = { warn: number; alert: number };

function usedTokens(data: Payload): number {
  const total = record(data, "context_window")["total_input_tokens"];
  if (typeof total === "number" && total > 0) return total;
  const transcript = text(data, "transcript_path");
  return transcript === "" ? 0 : fromTranscript(transcript);
}

// The gauge and the fraction share one denominator, the alert threshold, not
// the window: on a 1M model a window-relative bar is near empty when it matters.
export function statusLine(data: Payload, { warn, alert }: Limits): string {
  const used = usedTokens(data);
  let color = GREEN;
  if (used >= alert) color = RED;
  else if (used >= warn) color = ORANGE;
  const filled = Math.min(BAR, Math.max(0, roundHalfEven((used / alert) * BAR)));
  const gauge = `${color}${"▓".repeat(filled)}${RESET}${DIM}${"░".repeat(BAR - filled)}${RESET}`;
  // The unit sits on the denominator only, unless the two sides differ
  const limit = human(alert);
  const shared = human(used).at(-1) === limit.at(-1);
  const bang = used >= alert ? "! " : "";
  const count = `${color}${BOLD}${bang}${human(used, !shared)}${RESET}${DIM}/${limit}${RESET}`;
  const model = text(record(data, "model"), "display_name") || "?";
  const cwd = text(record(data, "workspace"), "current_dir") || text(data, "cwd");
  const where = cwd === "" ? "" : ` ${DIM}· ${basename(cwd)}${RESET}`;
  return `${BOLD}${WHITE}${model}${RESET} ${gauge} ${count}${where}`;
}
