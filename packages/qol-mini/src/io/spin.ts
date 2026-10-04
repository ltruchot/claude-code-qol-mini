import { log, spinner } from "@clack/prompts";
import pc from "picocolors";

// Spinner frames flood CI logs, plain step when not a TTY
export async function spin<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) {
    log.step(label);
    return fn();
  }
  const s = spinner();
  s.start(label);
  try {
    const result = await fn();
    s.stop(label);
    return result;
  } catch (error) {
    s.stop(pc.red(label));
    throw error;
  }
}
