import type { CAC } from "cac";
import { register as check } from "./check.ts";
import { register as install } from "./install.ts";
import { register as list } from "./list.ts";
import { register as remove } from "./remove.ts";
import { register as update } from "./update.ts";

const COMMANDS = [install, update, list, check, remove];

export function registerAll(cli: CAC): void {
  for (const register of COMMANDS) register(cli);
}
