import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { cli, project, setBank } from "../helpers/cli.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const read = (dir: string): Promise<string> =>
  readFile(join(dir, ".claude/skills/hello/SKILL.md"), "utf8");

test("update merges the kit's changes and keeps local edits", async () => {
  const dir = await project("bank-v1");
  const env = {
    XDG_CACHE_HOME: await tmpDir("qol-mini-cache-"),
    QOL_MINI_ANSWER_PROJECT_NAME: "Acme",
  };
  expect((await cli(dir, ["install", "hello"], env)).code).toBe(0);
  expect((await cli(dir, ["update"], env)).out).toContain("up to date");

  setBank(dir, "bank-v2");
  expect((await cli(dir, ["check"], env)).code).toBe(1);
  expect((await cli(dir, ["update"], env)).code).toBe(1);
  const up = await cli(dir, ["install"], { ...env, QOL_MINI_ANSWER_TEAM: "core" });
  expect(up.code).toBe(0);
  expect(await read(dir)).toContain("Team: core");
  expect(await read(dir)).toContain("Say hello twice");
  expect(await readFile(join(dir, ".claude/skills/hello/references/guide.md"), "utf8")).toContain(
    "Version 2",
  );
  expect((await cli(dir, ["check"], env)).code).toBe(0);

  await appendFile(join(dir, ".claude/skills/hello/SKILL.md"), "- my edit\n");
  expect((await cli(dir, ["check"], env)).code).toBe(2);
  setBank(dir, "bank-v1");
  expect((await cli(dir, ["update", "."], env)).code).toBe(0);
  expect(await read(dir)).toContain("- my edit");
  expect(await read(dir)).not.toContain("Team:");
  expect(await read(dir)).toContain("- Say hello\n");
  expect((await cli(dir, ["check"], env)).code).toBe(2);

  expect((await cli(dir, ["install", "--replace", dir], env)).code).toBe(0);
  expect(await read(dir)).not.toContain("- my edit");
  expect((await cli(dir, ["check"], env)).code).toBe(0);
  await cleanup(dir);
  await cleanup(env.XDG_CACHE_HOME);
}, 90_000);
