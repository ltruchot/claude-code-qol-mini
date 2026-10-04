import { homedir } from "node:os";
import { join } from "node:path";

// ~/.cache/qol-mini or $XDG_CACHE_HOME/qol-mini
export function cacheRoot(env: Record<string, string | undefined> = process.env): string {
  const base = env["XDG_CACHE_HOME"] ?? join(homedir(), ".cache");
  return join(base, "qol-mini");
}
