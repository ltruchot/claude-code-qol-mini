import { appendFile, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { kit, settings } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const tab = "hooks/tab-state.mjs";

test("created if missing, left if identical, refused if different, --replace overwrites", async () => {
  const target = await tmpDir();
  const first = await kit(target, ["install", "--tab-state"]);
  expect(first.out).toContain("created       hooks/tab-state.mjs");
  expect(first.out).toContain("start a new session");
  expect(first.out).toContain("/kaizen appears in a new session");
  expect(first.out).toContain("qol-mini-off");
  const files = await readdir(target, { recursive: true });
  const again = await kit(target, ["install", "--tab-state"]);
  expect(again.out).toContain("Nothing changed");
  expect(again.out).toContain("qol-mini-off");
  expect(await readdir(target, { recursive: true })).toStrictEqual(files);

  await appendFile(join(target, tab), "// edited by hand\n");
  const refused = await kit(target, ["install", "--tab-state"]);
  expect(refused.code).toBe(1);
  expect(refused.out).toContain(join(target, tab));
  expect(refused.out).toContain("Nothing was written");
  expect(await readFile(join(target, tab), "utf8")).toContain("edited by hand");
  await writeFile(join(target, "sounds/done.wav"), "mine");
  const replaced = await kit(target, ["install", "--replace"]);
  expect(replaced.out).toContain("replaced      hooks/tab-state.mjs");
  expect(replaced.out).not.toContain("new session");
  expect(await readFile(join(target, tab), "utf8")).not.toContain("edited by hand");
  expect(await readFile(join(target, "sounds/done.wav"), "utf8")).toBe("mine");
  await cleanup(target);
});

test("options overlay the installed state, --defaults is the only reset", async () => {
  const target = await tmpDir();
  await kit(target, ["install", "--tab-state", "--warn", "120000"]);
  expect((await kit(target, ["install", "--replace"])).out).toContain("Nothing changed");
  expect((await settings(target)).statusLine?.command).toContain("--warn 120000");
  expect((await settings(target)).env).toStrictEqual({ CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1" });
  expect((await kit(target, ["install", "--no-tab-state"])).out).toContain("updated");
  expect(JSON.stringify(await settings(target))).not.toContain("tab-state");
  expect(await settings(target)).not.toHaveProperty("env");
  await kit(target, ["install", "--defaults"]);
  expect((await settings(target)).statusLine?.command).not.toContain("--warn");
  await cleanup(target);
});
