import { KitError } from "./errors.ts";

export const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_NAME = 64;

// Kebab-case, max 64, no separators: the only shape that may touch the filesystem
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name) && name.length <= MAX_NAME;
}

export function assertSkillName(name: string): string {
  if (!isSkillName(name))
    throw new KitError(`invalid skill name "${name}", expected kebab-case up to ${MAX_NAME} chars`);
  return name;
}

export function assertSkillNames(names: string[]): string[] {
  return names.map(assertSkillName);
}
