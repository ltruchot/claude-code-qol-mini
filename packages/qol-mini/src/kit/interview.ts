import { print } from "../io/ui.ts";
import { ask, askNumber, openConsole } from "./ask.ts";
import type { Chosen } from "./options.ts";

const GAUGE = [
  "What should be installed? Enter accepts the value in brackets.",
  "",
  "  The gauge counts what is re-sent to the model on every request, and",
  "  turns orange then red at fixed token counts, not at a share of the window.",
];
const SOUNDS = [
  "",
  "  Two rising notes when Claude is blocked on you, one lower note when a",
  "  turn ends. Silent while it waits on a subagent of its own.",
];
const KAIZEN = [
  "",
  "  /compact stops until the session's friction has been reviewed: each",
  "  lesson is proposed as one concrete edit, and you answer yes or no.",
];
const TABS = [
  "",
  "  The tab marker puts a colored dot in front of the terminal name. Every",
  "  terminal is retitled, a shell tab included, and it needs an editor",
  "  setting plus a new session. `qol-mini vscode --revert` undoes it.",
];

// Reached with no option and a real console only. The brackets hold what is
// installed now, so Enter through the whole thing reproduces the setup.
export async function interview(current: Chosen): Promise<Chosen> {
  const chosen = { ...current };
  const rl = openConsole();
  print(GAUGE);
  chosen.statusline = await ask(rl, "Context gauge in the status line?", chosen.statusline);
  if (chosen.statusline) {
    chosen.warn = await askNumber(rl, "Orange at how many tokens?", chosen.warn);
    do chosen.alert = await askNumber(rl, "Red at how many tokens?", chosen.alert);
    while (chosen.alert <= chosen.warn);
  }
  print(SOUNDS);
  chosen.sounds = await ask(rl, "Notification sounds?", chosen.sounds);
  print(KAIZEN);
  chosen.kaizen = await ask(rl, "Friction review before /compact, via /kaizen?", chosen.kaizen);
  print(TABS);
  chosen.tabs = await ask(rl, "Terminal tab marker?", chosen.tabs);
  rl.close();
  return chosen;
}
