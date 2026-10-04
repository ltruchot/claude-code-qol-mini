import { intro as clackIntro, log, note as clackNote, outro as clackOutro } from "@clack/prompts";
import pc from "picocolors";
import { KitError } from "../core/errors.ts";

export const intro = (title: string): void => {
  clackIntro(pc.bgCyan(pc.black(` ${title} `)));
};
export const outro = (msg: string): void => {
  clackOutro(msg);
};
export const info = (msg: string): void => {
  log.info(msg);
};
export const warn = (msg: string): void => {
  log.warn(pc.yellow(msg));
};
export const success = (msg: string): void => {
  log.success(msg);
};
export const step = (msg: string): void => {
  log.step(msg);
};
export const note = (lines: string[], title?: string): void => {
  clackNote(lines.join("\n"), title);
};

export function fail(msg: string): never {
  throw new KitError(msg);
}

// Bypass console: vitest swallows it, stdout.write stays capturable
export function print(lines: string[]): void {
  for (const line of lines) process.stdout.write(`${line}\n`);
}

export function printErr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}
