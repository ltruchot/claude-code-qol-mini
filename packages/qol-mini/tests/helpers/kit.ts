import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { main } from "../../src/app.ts";
import { capture } from "./capture.ts";
import type { Run } from "./cli.ts";

const HOOKS = join(import.meta.dirname, "../../src/kit/hooks");
export const RED = "\u{1F534}";
export const GREEN = "\u{1F7E2}";
export const YELLOW = "\u{1F7E1}";

// Run `qol-mini <args>` in-process against a throwaway config dir
export async function kit(target: string, args: string[]): Promise<Run> {
  const env = { CLAUDE_CONFIG_DIR: target };
  const run = await capture(env, () => main(["node", "qol-mini", ...args]));
  return { code: run.value, out: run.out };
}

export type Settings = {
  hooks?: Record<string, { matcher?: string; hooks: { command: string; args: string[] }[] }[]>;
  statusLine?: { command: string };
  env?: Record<string, string>;
};

export async function settings(target: string): Promise<Settings> {
  return JSON.parse(await readFile(join(target, "settings.json"), "utf8")) as Settings;
}

export type Hooked = { code: number; out: string; err: string };

// Run a hook as Claude Code does: a real process, the event JSON on stdin
export async function hook(
  script: string,
  args: string[],
  input: string,
  opts: { env?: Record<string, string>; cwd?: string } = {},
): Promise<Hooked> {
  const file = script.includes("/") ? script : join(HOOKS, `${script}.ts`);
  const run = await execa("node", [file, ...args], { input, reject: false, ...opts });
  return { code: run.exitCode ?? -1, out: run.stdout, err: run.stderr };
}
