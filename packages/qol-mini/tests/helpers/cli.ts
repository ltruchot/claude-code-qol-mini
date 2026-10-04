import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { main } from "../../src/app.ts";
import { capture } from "./capture.ts";
import { tmpDir } from "./tmp.ts";

export const FIXTURES = join(import.meta.dirname, "../fixtures");

export type Run = { code: number; out: string };

const banks = new Map<string, string>();

// Run `qol-mini skills` in-process against the project's fixture bank
export async function cli(
  cwd: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<Run> {
  const scoped = {
    QOL_MINI_BANK: banks.get(cwd) ?? "",
    CLAUDE_CONFIG_DIR: join(cwd, ".home"),
    ...env,
  };
  const argv = ["node", "qol-mini", "skills", ...args, "--cwd", cwd];
  const run = await capture(scoped, () => main(argv));
  return { code: run.value, out: run.out };
}

// Temp project pointing at a fixture bank
export async function project(bank: string): Promise<string> {
  const dir = await tmpDir("qol-mini-e2e-");
  await mkdir(join(dir, ".git"));
  setBank(dir, bank);
  return dir;
}

export function setBank(dir: string, bank: string): void {
  banks.set(dir, join(FIXTURES, bank, "skills"));
}
