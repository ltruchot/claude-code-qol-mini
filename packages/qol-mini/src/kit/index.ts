import { print } from "../io/ui.ts";
import { runInstall } from "./install.ts";
import { USAGE } from "./report.ts";
import { runUninstall } from "./uninstall.ts";
import { runVscode } from "./vscode.ts";

const HELP = new Set(["-h", "--help", "help"]);

// Global scope: the kit in the Claude config dir. Null when the command is
// not one of ours, so the caller reports it.
export function runKit(argv: string[]): Promise<number> | number | null {
  const [command, ...rest] = argv;
  if (command === undefined || HELP.has(command) || rest.some((arg) => HELP.has(arg))) {
    print(USAGE);
    return 0;
  }
  if (command === "install") return runInstall(rest);
  if (command === "uninstall") return runUninstall();
  if (command === "vscode") return runVscode(rest);
  return null;
}
