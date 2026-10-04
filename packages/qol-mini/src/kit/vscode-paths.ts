import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const FLAVORS = ["Code", "Code - Insiders", "VSCodium", "Cursor"];
const SERVERS = [".vscode-server", ".vscode-server-insiders", ".cursor-server"];
// The template and shared accounts are nobody's editor
const NOBODY = new Set(["Default", "Default User", "Public", "All Users"]);
const WINDOWS_USERS = "/mnt/c/Users";

export type Where = { platform: string; home: string; env: Record<string, string | undefined> };
export const here = (): Where => ({
  platform: process.platform,
  home: homedir(),
  env: process.env,
});

function isWsl(): boolean {
  try {
    return readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
}

function userRoot({ platform, home, env }: Where): string {
  if (platform === "darwin") return join(home, "Library", "Application Support");
  if (platform === "win32") return env["APPDATA"] ?? join(home, "AppData", "Roaming");
  return env["XDG_CONFIG_HOME"] ?? join(home, ".config");
}

// Under WSL the client's user settings live on the Windows side
function windowsSide(): string[] {
  if (!isWsl() || !existsSync(WINDOWS_USERS)) return [];
  const users = readdirSync(WINDOWS_USERS).filter((name) => !NOBODY.has(name));
  return users.flatMap((user) =>
    FLAVORS.map((f) => join(WINDOWS_USERS, user, "AppData", "Roaming", f, "User", "settings.json")),
  );
}

// Every settings.json the editor might read: the local editor, the remote
// servers (machine scope), and the Windows profiles under WSL
export function candidates(where: Where = here(), wsl: string[] = windowsSide()): string[] {
  return [
    ...FLAVORS.map((flavor) => join(userRoot(where), flavor, "User", "settings.json")),
    ...SERVERS.map((server) => join(where.home, server, "data", "Machine", "settings.json")),
    ...wsl,
  ];
}
