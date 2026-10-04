import { join } from "node:path";
import { KAIZEN, PLAY, TAB } from "./files.ts";
import type { Chosen } from "./options.ts";
import type { Handler, Hooks } from "./ours.ts";

// Red and the rising notes are spent on one thing: Claude cannot go on
// without you. The two quota types are wired from the reference, not observed.
const BLOCKING =
  "permission_prompt|agent_needs_input|elicitation_dialog|elicitation_url_dialog" +
  "|quota_auto_resume_stale|quota_auto_resume_disabled";

// Add the enabled handlers to `hooks`. Exec form: `command` plus `args`, no
// shell in between, so an interpreter path with spaces works everywhere.
export function wire(chosen: Chosen, target: string, node: string, hooks: Hooks): Hooks {
  const hook = (script: string, ...args: string[]): Handler => ({
    type: "command",
    command: node,
    args: [join(target, script), ...args],
  });
  const add = (event: string, handlers: Handler[], matcher?: string): void => {
    if (handlers.length === 0) return;
    (hooks[event] ??= []).push(
      matcher === undefined ? { hooks: handlers } : { hooks: handlers, matcher },
    );
  };
  const play = (name: string): Handler[] => (chosen.sounds ? [hook(PLAY, name)] : []);
  const tab = (state: string): Handler[] => (chosen.tabs ? [hook(TAB, state)] : []);
  add("Notification", [...play("needs-you"), ...tab("blocked")], BLOCKING);
  // PermissionRequest fires when the dialog appears; `permission_prompt` only
  // after about six seconds. The marker takes the early one, the sound the late.
  add("PermissionRequest", tab("blocked"));
  add("Notification", tab("idle"), "idle_prompt");
  add("Notification", tab("working"), "quota_auto_resume_fired");
  add("StopFailure", tab("blocked"));
  add("Stop", [...play("done"), ...tab("idle")]);
  add("SessionStart", tab("idle"));
  // No event fires when the model starts thinking: these three are the last
  // moments before work resumes.
  for (const event of ["UserPromptSubmit", "PostToolBatch", "SubagentStop"])
    add(event, tab("working"));
  // One marker per event: the kaizen hook owns PreCompact when installed
  if (chosen.kaizen) {
    add("PreCompact", [hook(KAIZEN, ...(chosen.tabs ? ["--marker"] : []))]);
    add("SessionStart", [hook(KAIZEN, "--after-compact")], "compact");
  } else add("PreCompact", tab("working"));
  // An automatic compaction happens mid-turn: only `manual` rests and rings
  add("PostCompact", [...play("done"), ...tab("idle")], "manual");
  return hooks;
}
