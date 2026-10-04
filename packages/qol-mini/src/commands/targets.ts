import { managedNames } from "../core/lock/managed.ts";
import { assertSkillNames } from "../core/names.ts";
import { stdinIsConsole } from "../io/console.ts";
import { selectSkills } from "../io/prompts/select.ts";
import { fail } from "../io/ui.ts";
import { type Bank, bankNames } from "./banks.ts";
import type { Ctx } from "./context.ts";

export type Split = { names: string[]; project: string | undefined };

const isPath = (arg: string): boolean => /[\\/]/.test(arg) || arg === "." || arg === "..";

// A skill name is kebab-case; an argument holding a separator is the project
export function splitArgs(args: string[]): Split {
  const dirs = args.filter(isPath);
  if (dirs.length > 1) fail(`one project at a time, got ${dirs.join(", ")}`);
  return { names: assertSkillNames(args.filter((a) => !isPath(a))), project: dirs[0] };
}

// Named skills, else a picker on a console, else every managed skill
export function pickSkills(ctx: Ctx, bank: Bank, names: string[]): Promise<string[]> {
  if (names.length > 0) return Promise.resolve(names);
  const managed = managedNames(ctx.lock);
  if (stdinIsConsole() && !ctx.yes) return selectSkills(bankNames(bank), managed);
  if (managed.length > 0) return Promise.resolve(managed);
  return fail(`name a skill: ${bankNames(bank).join(", ")}`);
}
