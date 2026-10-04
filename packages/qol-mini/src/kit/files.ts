// Paths the kit owns, relative to the Claude config dir. `.mjs`: a bare `.js`
// with no package.json beside it is not read as an ES module.
export const STATUSLINE = "statusline-context.mjs";
export const TAB = "hooks/tab-state.mjs";
export const KAIZEN = "hooks/precompact-kaizen.mjs";
export const PLAY = "sounds/play.mjs";
export const KAIZEN_SKILL = "skills/kaizen/SKILL.md";
export const SOUNDS = ["needs-you.wav", "done.wav"];

// Delivered file -> bundle in dist/
export const BUNDLES: Record<string, string> = {
  [STATUSLINE]: "statusline.js",
  [TAB]: "tab-state.js",
  [KAIZEN]: "precompact-kaizen.js",
  [PLAY]: "play.js",
};

// Files of past releases, deleted on install: pruning their handlers is not
// enough, dead copies would stay next to the live ones.
export const SUPERSEDED = [
  "statusline-context.py",
  "hooks/tab-state.py",
  "hooks/precompact-kaizen.py",
  "hooks/precompact-friction.py",
  "sounds/play.py",
  "sounds/play.sh",
  "state/friction-review.md",
];
