import { intro } from "../io/ui.ts";

export const TOOL = "qol-mini";

export function cmdIntro(cmd: string): void {
  intro(`${TOOL} skills ${cmd}`);
}
