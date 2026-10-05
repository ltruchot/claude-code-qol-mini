// Hold back /compact until this session's friction has been reviewed. The
// review lives in the `kaizen` skill: a PreCompact hook hands Claude nothing,
// `exit 2` blocks and shows stderr to the user only.
//
//   precompact-kaizen.js                  hook mode, event JSON on stdin
//   precompact-kaizen.js --marker         ... and move the tab marker with it
//   precompact-kaizen.js --release        write the token for the current dir
//   precompact-kaizen.js --token          print the token path, nothing else
//   precompact-kaizen.js --after-compact  SessionStart `compact`: name TODO.md
import { afterCompact } from "./after-compact.ts";
import { BLOCKED, compactionPasses } from "./compact-gate.ts";
import { release, tokenFor } from "./kaizen-token.ts";
import { hookOutput, type State } from "./marker.ts";
import { optedOut } from "./optout.ts";
import { emit, type Payload, readPayloadOrNull, text } from "./payload.ts";

const args = new Set(process.argv.slice(2));
const out = (line: string): boolean => process.stdout.write(`${line}\n`);
const cwdOf = (data: Payload): string => text(data, "cwd") || process.cwd();

// This script owns the marker on PreCompact: two emitters on one event race,
// and only this one knows whether the compaction runs.
function mark(state: State, cwd: string): void {
  if (args.has("--marker")) emit(hookOutput(state, cwd));
}

// Green while compaction runs; red when held back, applied before the exit
// status is read. An unreadable payload or an opted-out project never blocks,
// and a project that keeps the marker still gets it.
function gate(data: Payload | null): number {
  if (data === null) return 0;
  const cwd = cwdOf(data);
  const passes = optedOut(cwd, "kaizen") || compactionPasses(data, cwd);
  if (!optedOut(cwd, "tab")) mark(passes ? "working" : "blocked", cwd);
  if (passes) return 0;
  process.stderr.write(`${BLOCKED}\n`);
  return 2;
}

if (args.has("--token")) out(tokenFor(process.cwd()));
else if (args.has("--release"))
  out(`Kaizen recorded. /compact will now go through.\n${release(process.cwd())}`);
else if (args.has("--after-compact")) {
  const body = afterCompact(cwdOf(readPayloadOrNull() ?? {}));
  if (body !== null) emit(body);
} else process.exitCode = gate(readPayloadOrNull());
