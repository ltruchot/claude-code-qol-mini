import { type Hooks, withoutOurs } from "./ours.ts";
import { put, TITLE_OFF } from "./settings.ts";
import type { Settings } from "./state.ts";

// What uninstall leaves: no status line, no title switch, none of our hooks
export function settingsWithout(current: Settings): Settings {
  const data = structuredClone(current);
  Reflect.deleteProperty(data, "statusLine");
  const env = { ...(data["env"] as Record<string, unknown> | undefined) };
  Reflect.deleteProperty(env, TITLE_OFF);
  put(data, "env", env);
  put(data, "hooks", withoutOurs((data["hooks"] ?? {}) as Hooks));
  return data;
}
