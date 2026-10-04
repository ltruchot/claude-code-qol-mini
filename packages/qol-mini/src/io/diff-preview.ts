import { diffComm } from "node-diff3";
import pc from "picocolors";

const MAX_LINES = 60;

// Two-way line diff, capped
export function renderDiff(rel: string, before: string, after: string): string[] {
  const out: string[] = [pc.bold(rel)];
  for (const block of diffComm(before.split("\n"), after.split("\n"))) {
    if (block.common !== undefined) continue;
    for (const line of block.buffer1) out.push(pc.red(`- ${line}`));
    for (const line of block.buffer2) out.push(pc.green(`+ ${line}`));
    if (out.length > MAX_LINES) return [...out.slice(0, MAX_LINES), pc.dim("…")];
  }
  return out;
}
