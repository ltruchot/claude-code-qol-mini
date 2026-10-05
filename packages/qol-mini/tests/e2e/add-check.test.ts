import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { cli, project } from "../helpers/cli.ts";
import { parseAs, readLockFile, Rows } from "../helpers/json.ts";
import { cleanup } from "../helpers/tmp.ts";

const ANSWERS = { QOL_MINI_ANSWER_PROJECT_NAME: "Acme" };

test("install, check, list, drift, remove", async () => {
  const dir = await project("bank-v1");
  const lockPath = join(dir, ".claude/qol-mini.lock.json");
  await mkdir(join(dir, ".claude/skills/manual"), { recursive: true });
  await writeFile(join(dir, ".claude/skills/manual/SKILL.md"), "hand written");

  expect((await cli(dir, ["install"])).out).toContain("name a skill: hello");
  expect((await cli(dir, ["install", "nope"])).out).toContain("unknown skill: nope");
  await writeFile(join(dir, ".prettierignore"), "dist\n");
  const installed = await cli(dir, ["install", "hello", "-y"], ANSWERS);
  expect(installed.code).toBe(0);
  expect(installed.out).toContain(".claude/skills/hello/");
  expect(installed.out).toContain("Prettier: .prettierignore");
  const skill = await readFile(join(dir, ".claude/skills/hello/SKILL.md"), "utf8");
  expect(skill).toContain("Project: Acme");
  expect(skill).toContain("Repo: acme/example");
  expect(skill).toContain("{{NOT_DECLARED}}");
  expect(skill).toContain("$ARGUMENTS");
  const entry = (await readLockFile(lockPath)).skills["hello"];
  expect(entry?.answers).toStrictEqual({ GITHUB_REPO: "acme/example", PROJECT_NAME: "Acme" });
  expect(entry?.source).toBe("qol-mini");
  expect(entry?.sha).toMatch(/^local:/);

  expect((await cli(dir, ["check"])).out).not.toContain("Keep formatters");
  const list = parseAs(Rows, (await cli(dir, ["list", "--json"])).out);
  expect(list.map((r) => `${r.name}=${r.status}`)).toStrictEqual([
    "hello=up to date",
    "manual=unmanaged, hand-written",
  ]);

  await appendFile(join(dir, ".claude/skills/hello/SKILL.md"), "- my edit\n");
  const drift = await cli(dir, ["check"]);
  expect(drift.code).toBe(2);
  expect(drift.out).toContain("Keep formatters and linters off managed skills");

  expect((await cli(dir, ["remove", "manual", "-y"])).code).toBe(1);
  expect((await cli(dir, ["remove", "hello", "-y"])).code).toBe(0);
  expect((await readLockFile(lockPath)).skills).toStrictEqual({});
  expect((await cli(dir, ["install", "hello", "-y"], {})).code).toBe(1);
  await cleanup(dir);
});
