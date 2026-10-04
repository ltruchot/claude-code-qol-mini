import { fail } from "../io/ui.ts";
import { type Chosen, checkThresholds, DEFAULTS, flag, tokens } from "./options.ts";

const THRESHOLD = /^--(warn|alert)(?:=(.*))?$/;

// Options over `base`, the installed state: `--replace` alone is an update,
// not a reset. `--defaults` is the only reset, whatever its position.
export function parse(argv: string[], base: Chosen): Chosen {
  const chosen: Chosen = { ...(argv.includes("--defaults") ? DEFAULTS : base) };
  const rest = argv.filter((arg) => arg !== "--defaults");
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index] ?? "";
    const toggle = flag(arg);
    const limit = THRESHOLD.exec(arg);
    if (toggle !== undefined) chosen[toggle[0]] = toggle[1];
    else if (limit === null) fail(`unknown option: ${arg}`);
    else {
      const name = limit[1] === "warn" ? "warn" : "alert";
      if (limit[2] === undefined) index += 1;
      chosen[name] = tokens(name, limit[2] ?? rest[index]);
    }
  }
  return checkThresholds(chosen);
}
