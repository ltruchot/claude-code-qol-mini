import { fail } from "../io/ui.ts";

export type Chosen = {
  statusline: boolean;
  sounds: boolean;
  tabs: boolean;
  kaizen: boolean;
  warn: number;
  alert: number;
};
type Switch = "statusline" | "sounds" | "tabs" | "kaizen";

// The tab marker is off by default: it retitles every terminal
export const DEFAULTS: Chosen = {
  statusline: true,
  sounds: true,
  tabs: false,
  kaizen: true,
  warn: 100_000,
  alert: 200_000,
};

const NAMES: Record<string, Switch> = {
  statusline: "statusline",
  sounds: "sounds",
  kaizen: "kaizen",
  "tab-state": "tabs",
};

// --<name> turns a feature on, --no-<name> off
export function flag(arg: string): [Switch, boolean] | undefined {
  const off = arg.startsWith("--no-");
  const key = NAMES[arg.slice(off ? 5 : 2)];
  return arg.startsWith("--") && key !== undefined ? [key, !off] : undefined;
}

export function tokens(name: string, raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw) || Number(raw) <= 0)
    fail(`--${name} needs a positive number of tokens, got ${JSON.stringify(raw ?? "")}`);
  return Number(raw);
}

export function checkThresholds(chosen: Chosen): Chosen {
  if (chosen.warn >= chosen.alert)
    fail(`--warn (${chosen.warn}) must be below --alert (${chosen.alert}): green, orange, red.`);
  return chosen;
}
