import { homedir } from "node:os";
import { join } from "node:path";

// CLAUDE_CONFIG_DIR when set and non-empty, else ~/.claude
export function configDir(env: Record<string, string | undefined> = process.env): string {
  const set = env["CLAUDE_CONFIG_DIR"] ?? "";
  return set === "" ? join(homedir(), ".claude") : set;
}
