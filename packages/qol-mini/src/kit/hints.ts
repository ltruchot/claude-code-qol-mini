import { print } from "../io/ui.ts";
import type { Chosen } from "./options.ts";
import { printOptout } from "./report.ts";
import { TITLE_OFF } from "./settings.ts";
import type { Settings } from "./state.ts";

const titleOff = (data: Settings): unknown => (data["env"] as Settings | undefined)?.[TITLE_OFF];

// The `env` block and a skills directory created after startup need a new
// session; nothing else does, so a restart is named in those two cases only.
export function hints(
  chosen: Chosen,
  before: Settings,
  merged: Settings,
  newSkillsDir: boolean,
  settingsChanged: boolean,
): void {
  print([""]);
  if (chosen.tabs && titleOff(merged) !== titleOff(before))
    print(["Tab marker: run `qol-mini vscode`, then start a new session."]);
  if (newSkillsDir) print(["Kaizen: /kaizen appears in a new session."]);
  printOptout();
  print([settingsChanged ? "Done. Running sessions pick up hooks and the status line." : "Done."]);
}
