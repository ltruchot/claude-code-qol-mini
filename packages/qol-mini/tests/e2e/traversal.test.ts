import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { cli, project } from "../helpers/cli.ts";
import { cleanup } from "../helpers/tmp.ts";

test("names that are not kebab-case are rejected on every command and in the lock", async () => {
  const dir = await project("bank-v1");
  for (const args of [
    ["install", "A"],
    ["remove", "a_b"],
    ["update", "a b"],
    ["install", "x.y"],
  ]) {
    const run = await cli(dir, [...args, "-y"]);
    expect(run.code).toBe(1);
    expect(run.out).toContain("invalid skill name");
  }
  const lockPath = join(dir, ".claude/qol-mini.lock.json");
  expect((await cli(dir, ["install", "./a", "./b"])).out).toContain("one project at a time");
  await mkdir(join(dir, ".claude"));
  const lock: { skills: Record<string, unknown> } = { skills: {} };
  lock.skills["../evil"] = {
    source: "x",
    sourceType: "local",
    ref: "main",
    sha: "s",
    skillPath: "skills/evil",
    path: ".claude/skills/../evil",
    templateHash: "a".repeat(64),
    renderedHash: "a".repeat(64),
    files: {},
    answers: {},
    secrets: [],
  };
  await writeFile(lockPath, JSON.stringify({ version: 1, ...lock }));
  const poisoned = await cli(dir, ["remove", "evil", "-y"]);
  expect(poisoned.code).toBe(1);
  expect(poisoned.out).toContain("invalid");
  expect(poisoned.out).toContain("qol-mini.lock.json");
  await cleanup(dir);
});
