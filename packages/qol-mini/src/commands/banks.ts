import { readBank } from "../core/bank/index.ts";
import type { Skill } from "../core/bank/skill.ts";
import { bankDir } from "../io/bank-dir.ts";
import { fetchLocal, type Resolved } from "../io/source-local.ts";

export const SOURCE = "qol-mini";
export const BANK_PATH = "skills";

export type Bank = { resolved: Resolved; skills: Skill[] };
export type Found = { bank: Bank; skill: Skill };

// The one bank: the skills shipped in this package
export async function loadBank(): Promise<Bank> {
  const resolved = await fetchLocal(bankDir());
  return { resolved, skills: await readBank(resolved.dir) };
}

export function findSkill(bank: Bank, name: string): Found | undefined {
  const skill = bank.skills.find((s) => s.name === name);
  return skill === undefined ? undefined : { bank, skill };
}

export function bankNames(bank: Bank): string[] {
  return bank.skills.map((s) => s.name).toSorted();
}
