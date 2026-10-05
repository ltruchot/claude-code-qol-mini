// Emit a terminal title carrying a state marker, for the editor's tab list.
// A hook has no terminal: Claude Code writes the sequence on its behalf,
// through the `terminalSequence` field of the hook JSON output.
//
// Usage: tab-state.js <working|blocked|idle>
import { hookOutput } from "./marker.ts";
import { optedOut } from "./optout.ts";
import { emit, readPayload, text } from "./payload.ts";
import { parseState, resolveState } from "./tab-rules.ts";

const data = readPayload();
const cwd = text(data, "cwd");
if (!optedOut(cwd, "tab")) {
  const state = resolveState(parseState(process.argv[2]), data);
  if (state !== null) emit(hookOutput(state, cwd));
}
