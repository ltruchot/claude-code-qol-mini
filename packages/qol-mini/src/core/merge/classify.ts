export type FileClass = "same" | "drift" | "missing" | "extra" | "removed";

// lock = hash at install, disk = now, theirs = upstream render
export function classifyFile(lock?: string, disk?: string, theirs?: string): FileClass {
  if (disk === undefined) return "missing";
  if (theirs === undefined) return lock === undefined ? "extra" : "removed";
  return disk === lock ? "same" : "drift";
}
