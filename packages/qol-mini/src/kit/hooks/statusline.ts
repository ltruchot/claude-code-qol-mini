// Claude Code status line: model name and context usage against the alert
// threshold. Thresholds come from --warn and --alert, else CC_CONTEXT_WARN
// and CC_CONTEXT_ALERT.
import { readPayload } from "./payload.ts";
import { threshold } from "./statusline-format.ts";
import { statusLine } from "./statusline-line.ts";

const argv = process.argv.slice(2);
const warn = threshold(argv, "--warn", process.env["CC_CONTEXT_WARN"], 100_000);
const alert = threshold(argv, "--alert", process.env["CC_CONTEXT_ALERT"], 200_000);
process.stdout.write(`${statusLine(readPayload(), { warn, alert })}\n`);
