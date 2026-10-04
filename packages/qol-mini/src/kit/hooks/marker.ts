import { basename, normalize } from "node:path";

export type State = "working" | "blocked" | "idle";

// Green is activity, red is "cannot go on without you", yellow is idle: orange
// reads as red across a tab strip. CC_TAB_WORKING, CC_TAB_BLOCKED and
// CC_TAB_IDLE override each one; an empty value drops the marker.
export function markers(
  env: Record<string, string | undefined> = process.env,
): Record<State, string> {
  return {
    working: env["CC_TAB_WORKING"] ?? "\u{1F7E2}",
    blocked: env["CC_TAB_BLOCKED"] ?? "\u{1F534}",
    idle: env["CC_TAB_IDLE"] ?? "\u{1F7E1}",
  };
}

// The JSON body a hook prints to move the tab to `state`. `terminalSequence`
// is a root field: nested in hookSpecificOutput it is ignored with no error.
// Only OSC 0/1/2/9/99/777 and BEL pass, and one byte outside that allowlist
// drops the whole field, so control characters are stripped from the label.
export function hookOutput(state: State, cwd: string): { terminalSequence: string } {
  const dir = cwd === "" ? process.cwd() : cwd;
  // The folder name tells several Claude terminals apart: ${sequence}
  // replaces the whole tab title.
  const name = basename(normalize(dir));
  const label = (name === "" ? dir : name).replaceAll(/\p{Cc}/gu, "");
  const title = `${markers()[state]} ${label}`.trim();
  return { terminalSequence: `\u001B]0;${title}\u0007` };
}
