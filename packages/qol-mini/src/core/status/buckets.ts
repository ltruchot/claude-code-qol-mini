export type Status =
  | "ok"
  | "update"
  | "drift"
  | "missing"
  | "wrong-ref"
  | "unverified"
  | "tamper"
  | "extra"
  | "conflict";

export const STATUS_LABEL: Record<Status, string> = {
  ok: "up to date",
  update: "update available",
  drift: "modified on disk",
  missing: "missing on disk",
  "wrong-ref": "ref differs",
  unverified: "not verified against the shipped template",
  tamper: "lock does not match template",
  extra: "not in lock",
  conflict: "conflict markers present",
};
