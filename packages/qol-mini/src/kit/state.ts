import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Chosen, DEFAULTS } from "./options.ts";

export type Settings = Record<string, unknown>;

// settings.json as an object; a missing or empty file is {}
export function readSettings(target: string): Settings {
  let raw: string;
  try {
    raw = readFileSync(join(target, "settings.json"), "utf8");
  } catch {
    return {};
  }
  return JSON.parse(raw.trim() === "" ? "{}" : raw) as Settings;
}

function limit(command: string, name: string, fallback: number): number {
  const found = new RegExp(`--${name} (\\d+)`).exec(command)?.[1];
  return found !== undefined && Number(found) > 0 ? Number(found) : fallback;
}

// What settings.json says is installed: options overlay this, so an update
// reproduces the setup in place. With nothing of ours there, the defaults.
export function installedState(target: string): Chosen {
  let data: Settings;
  try {
    data = readSettings(target);
  } catch {
    return { ...DEFAULTS };
  }
  const line = (data["statusLine"] ?? {}) as { command?: string };
  const command = line.command ?? "";
  const ours = JSON.stringify(data["hooks"] ?? {}).replaceAll(String.raw`\\`, "/");
  const found = {
    statusline: command.includes("statusline-context."),
    sounds: ours.includes("sounds/play."),
    tabs: ours.includes("hooks/tab-state."),
    kaizen: /hooks\/precompact-(kaizen|friction)\./.test(ours),
  };
  if (!Object.values(found).includes(true)) return { ...DEFAULTS };
  const warn = limit(command, "warn", DEFAULTS.warn);
  return { ...found, warn, alert: limit(command, "alert", DEFAULTS.alert) };
}
