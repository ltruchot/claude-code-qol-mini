import { join } from "node:path";
import { STATUSLINE } from "./files.ts";
import { type Chosen, DEFAULTS } from "./options.ts";
import { type Hooks, withoutOurs } from "./ours.ts";
import type { Settings } from "./state.ts";
import { wire } from "./wire.ts";

export const TITLE_OFF = "CLAUDE_CODE_DISABLE_TERMINAL_TITLE";

export function put(data: Settings, key: string, value: Record<string, unknown>): void {
  if (Object.keys(value).length > 0) data[key] = value;
  else Reflect.deleteProperty(data, key);
}

// Thresholds go on the command line, not into `env`: settings.json reloads
// hot, its `env` block only at startup. Written only when not the default,
// which leaves CC_CONTEXT_WARN and CC_CONTEXT_ALERT usable.
function statusCommand(chosen: Chosen, target: string, node: string): string {
  const limits = (["warn", "alert"] as const)
    .filter((name) => chosen[name] !== DEFAULTS[name])
    .map((name) => ` --${name} ${chosen[name]}`);
  return `"${node}" "${join(target, STATUSLINE)}"${limits.join("")}`;
}

// The settings.json this install wants, merged onto what is already there
export function settingsFor(
  chosen: Chosen,
  target: string,
  node: string,
  current: Settings,
): Settings {
  const data = structuredClone(current);
  // Claude Code redraws its own title continuously and wins otherwise
  const env = { ...(data["env"] as Record<string, unknown> | undefined) };
  if (chosen.tabs) env[TITLE_OFF] = "1";
  else Reflect.deleteProperty(env, TITLE_OFF);
  put(data, "env", env);
  if (chosen.statusline)
    data["statusLine"] = {
      type: "command",
      command: statusCommand(chosen, target, node),
      padding: 0,
    };
  else Reflect.deleteProperty(data, "statusLine");
  // Purge our handlers, then add the enabled ones: a feature turned off is
  // unwired, and hooks the user wrote survive untouched.
  const hooks = withoutOurs((data["hooks"] ?? {}) as Hooks);
  put(data, "hooks", wire(chosen, target, node, hooks));
  return data;
}
