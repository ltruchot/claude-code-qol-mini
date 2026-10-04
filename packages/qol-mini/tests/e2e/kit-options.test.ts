import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { kit, settings } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("bad options are refused before anything is written", async () => {
  const target = await tmpDir();
  for (const [args, message] of [
    [["--no-such-thing"], "unknown option: --no-such-thing"],
    [["--warn", "300000", "--alert", "200000"], "must be below --alert"],
    [["--warn", "banana"], "positive number of tokens"],
    [["--alert"], "positive number of tokens"],
  ] as const) {
    const run = await kit(target, ["install", "--no-sounds", ...args]);
    expect(run.code).toBe(1);
    expect(run.out).toContain(message);
  }
  expect(await readdir(target)).toStrictEqual([]);
  await writeFile(join(target, "settings.json"), "{ not json");
  const broken = await kit(target, ["install", "--defaults"]);
  expect(broken.code).toBe(1);
  expect(broken.out).toContain("is not valid JSON");
  expect(await readdir(target)).toStrictEqual(["settings.json"]);
  await cleanup(target);
});

test("thresholds go on the command line, defaults stay off it", async () => {
  const target = await tmpDir();
  const args = ["install", "--no-sounds", "--warn=120000", "--alert", "250000"];
  expect((await kit(target, args)).code).toBe(0);
  const command = (await settings(target)).statusLine?.command ?? "";
  expect(command).toContain("statusline-context.mjs");
  expect(command).toMatch(/--warn 120000 --alert 250000$/);
  expect((await readdir(target)).some((name) => name === "sounds")).toBe(false);
  await kit(target, ["install", "--defaults"]);
  expect((await settings(target)).statusLine?.command).toMatch(/statusline-context\.mjs"$/);
  expect(await readdir(join(target, "sounds"))).toStrictEqual([
    "done.wav",
    "needs-you.wav",
    "play.mjs",
  ]);
  expect((await kit(target, ["--help"])).out).toContain("qol-mini install [options]");
  await cleanup(target);
});
