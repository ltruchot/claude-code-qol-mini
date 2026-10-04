export type Handler = Record<string, unknown> & { command?: string; args?: string[] };
export type Group = Record<string, unknown> & { matcher?: string; hooks?: Handler[] };
export type Hooks = Record<string, Group[]>;

// Every script this kit ever registered, matched without its extension so the
// handlers of past releases (.py, .sh) are purged with the current ones.
export const OURS = [
  "sounds/play.",
  "hooks/tab-state.",
  "hooks/precompact-kaizen.",
  "hooks/precompact-friction.",
];
// SessionEnd has no handler: it stays here so the purge clears it.
export const EVENTS = [
  "Notification",
  "Stop",
  "UserPromptSubmit",
  "SessionStart",
  "SessionEnd",
  "PreCompact",
  "PostCompact",
  "PostToolBatch",
  "SubagentStop",
  "PermissionRequest",
  "StopFailure",
];

// Hook paths are written with backslashes on Windows: normalize, then match
export function isOurs(handler: Handler): boolean {
  const line = [handler.command ?? "", ...(handler.args ?? [])].join(" ").replaceAll("\\", "/");
  return OURS.some((mark) => line.includes(mark));
}

// `hooks` without our handlers on the events we write to. Groups left empty
// go, and so do events. Shared by install and uninstall.
export function withoutOurs(hooks: Hooks): Hooks {
  const out: Hooks = { ...hooks };
  for (const event of EVENTS) {
    const groups: Group[] = [];
    for (const group of out[event] ?? []) {
      const kept = (group.hooks ?? []).filter((h) => !isOurs(h));
      if (kept.length > 0) groups.push(Object.assign(structuredClone(group), { hooks: kept }));
    }
    if (groups.length > 0) out[event] = groups;
    else Reflect.deleteProperty(out, event);
  }
  return out;
}
