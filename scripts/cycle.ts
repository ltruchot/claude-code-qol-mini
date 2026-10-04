// CI: assert what the install cycle left in CLAUDE_CONFIG_DIR
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const target = process.env.CLAUDE_CONFIG_DIR ?? "";
const text = readFileSync(join(target, "settings.json"), "utf8");
const data = JSON.parse(text) as { hooks?: Record<string, unknown> };

function assert(ok: boolean, what: string): void {
  if (ok) return;
  console.error(`cycle: ${what}\n${text}`);
  process.exit(1);
}

if (process.argv.includes("--uninstalled")) {
  assert(Object.keys(data).length === 0, "settings.json is not empty after uninstall");
} else {
  assert(data.hooks?.PermissionRequest !== undefined, "PermissionRequest is not wired");
  assert(text.includes("--warn 120000"), "the threshold did not survive --replace");
  for (const name of ["needs-you.wav", "done.wav"])
    assert(statSync(join(target, "sounds", name)).size > 1000, `${name} is missing`);
  // The delivered hook runs alone, from the config dir
  const out = execFileSync(process.execPath, [join(target, "hooks", "tab-state.mjs"), "working"], {
    input: JSON.stringify({ cwd: process.cwd() }),
    encoding: "utf8",
  });
  assert(out.includes("terminalSequence"), "tab-state.mjs printed no sequence");
}
console.log("cycle: ok");
