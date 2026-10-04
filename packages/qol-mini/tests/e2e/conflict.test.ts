import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { cli, project, setBank } from "../helpers/cli.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const env = { QOL_MINI_ANSWER_PROJECT_NAME: "Acme", QOL_MINI_ANSWER_TEAM: "web" };
const skill = (dir: string): string => join(dir, ".claude/skills/hello/SKILL.md");

async function seed(): Promise<{ dir: string; env: Record<string, string> }> {
  const dir = await project("bank-v1");
  const all = { ...env, XDG_CACHE_HOME: await tmpDir("qol-mini-cache-") };
  expect((await cli(dir, ["install", "hello"], all)).code).toBe(0);
  const text = await readFile(skill(dir), "utf8");
  await writeFile(skill(dir), text.replace("- Say hello\n", "- Say hello loudly\n"));
  setBank(dir, "bank-v2");
  return { dir, env: all };
}

test("inline conflict markers, check reports conflict", async () => {
  const { dir, env: all } = await seed();
  expect((await cli(dir, ["update"], all)).code).toBe(0);
  const text = await readFile(skill(dir), "utf8");
  expect(text).toContain("<<<<<<< local");
  expect(text).toContain("Say hello loudly");
  expect(text).toContain("Say hello twice");
  const check = await cli(dir, ["check"]);
  expect(check.code).toBe(2);
  expect(check.out).toContain("conflict markers");
  await cleanup(dir);
});

test("rej keeps ours and writes .qm-rej, --replace takes the kit's version", async () => {
  const { dir, env: all } = await seed();
  expect((await cli(dir, ["update", "--conflict", "bogus"], all)).code).toBe(1);
  expect((await cli(dir, ["update", "--conflict", "rej"], all)).code).toBe(0);
  expect(await readFile(skill(dir), "utf8")).toContain("Say hello loudly");
  expect(await readFile(`${skill(dir)}.qm-rej`, "utf8")).toContain("Say hello twice");
  setBank(dir, "bank-v1");
  expect((await cli(dir, ["update", "--replace"], all)).code).toBe(0);
  expect(await readFile(skill(dir), "utf8")).toContain("- Say hello\n");
  await cleanup(dir);
});
