import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { swapDir } from "../../src/io/atomic.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("swapDir mutates a copy, swaps atomically, cleans up on failure", async () => {
  const root = await tmpDir("qol-mini-atomic-");
  const dir = join(root, "skill");
  await mkdir(dir);
  await writeFile(join(dir, "a.md"), "old");
  await swapDir(dir, async (work) => {
    expect(await readFile(join(work, "a.md"), "utf8")).toBe("old");
    await writeFile(join(work, "a.md"), "new");
    await writeFile(join(work, "b.md"), "added");
  });
  expect(await readFile(join(dir, "a.md"), "utf8")).toBe("new");
  await expect(
    swapDir(dir, async (work) => {
      await writeFile(join(work, "a.md"), "broken");
      throw new Error("boom");
    }),
  ).rejects.toThrow(/boom/);
  expect(await readFile(join(dir, "a.md"), "utf8")).toBe("new");
  expect(await readdir(root)).toStrictEqual(["skill"]);
  await swapDir(join(root, "fresh"), (work) => writeFile(join(work, "x"), "1"));
  expect(await readFile(join(root, "fresh/x"), "utf8")).toBe("1");
  await cleanup(root);
});
