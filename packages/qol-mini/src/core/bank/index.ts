import { join } from "node:path";
import { listDirs } from "../../io/dirs.ts";
import { exists, readTree } from "../../io/fs.ts";
import { isSkillName } from "../names.ts";
import { type Skill, SKILL_FILE, skillFromFiles } from "./skill.ts";

export async function readSkill(dir: string, name: string): Promise<Skill> {
  return skillFromFiles(name, dir, await readTree(dir));
}

// Every child dir holding SKILL.md
export async function readBank(dir: string): Promise<Skill[]> {
  const skills: Skill[] = [];
  for (const name of (await listDirs(dir)).filter(isSkillName)) {
    const skillDir = join(dir, name);
    if (await exists(join(skillDir, SKILL_FILE))) skills.push(await readSkill(skillDir, name));
  }
  return skills;
}
