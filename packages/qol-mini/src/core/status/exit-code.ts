import type { Status } from "./buckets.ts";

export type ExitCode = 0 | 1 | 2 | 3;

const RANK: Record<Status, ExitCode> = {
  ok: 0,
  update: 1,
  "wrong-ref": 1,
  drift: 2,
  missing: 2,
  extra: 2,
  conflict: 2,
  unverified: 2,
  tamper: 3,
};

// Worst status wins: 0 ok, 1 update, 2 drift, 3 tamper
export function exitCode(statuses: Status[]): ExitCode {
  let worst: ExitCode = 0;
  for (const s of statuses) if (RANK[s] > worst) worst = RANK[s];
  return worst;
}
