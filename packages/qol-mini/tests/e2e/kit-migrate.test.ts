import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { FIXTURES } from "../helpers/cli.ts";
import { kit, settings } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const mine = { type: "command", command: "echo", args: ["mine"] };
// A Python release on Windows: backslash paths, a handler on SessionEnd
const PAST = join(FIXTURES, "past-settings.json");

test("a past release is purged, the user's settings and options survive", async () => {
  const target = await tmpDir();
  for (const dir of ["hooks", "sounds", "state"]) await mkdir(join(target, dir));
  for (const file of ["statusline-context.py", "hooks/tab-state.py", "sounds/play.sh"])
    await writeFile(join(target, file), "old");
  await copyFile(PAST, join(target, "settings.json"));

  const run = await kit(target, ["install", "--replace"]);
  expect(run.out).toContain("removed       hooks/tab-state.py");
  expect(run.out).toContain("backup        settings.json.bak-");
  const text = JSON.stringify(await settings(target));
  expect(text).not.toMatch(/\.py|\.sh|SessionEnd|python3/);
  expect(text).toContain('"args":["mine"]');
  expect(text).toContain("--warn 150000");
  expect(text).toContain("tab-state.mjs");
  expect(await readdir(join(target, "hooks"))).toStrictEqual([
    "precompact-kaizen.mjs",
    "tab-state.mjs",
  ]);

  expect((await kit(target, ["uninstall"])).out).toContain("cleaned       settings.json");
  expect(await settings(target)).toStrictEqual({
    model: "opus",
    hooks: { Stop: [{ hooks: [mine] }] },
  });
  const left = await readdir(target);
  expect(left.filter((name) => !name.startsWith("settings.json"))).toStrictEqual([]);
  expect(left.length).toBeGreaterThan(1);
  expect((await kit(target, ["uninstall"])).out).toContain("Nothing changed");
  expect(await readdir(target)).toHaveLength(left.length);
  await cleanup(target);
});
