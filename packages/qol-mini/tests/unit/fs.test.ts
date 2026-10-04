import { chmod, mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { MODE_EXEC, MODE_FILE } from "../../src/core/types.ts";
import { listDirs } from "../../src/io/dirs.ts";
import { readTree, writeTree } from "../../src/io/fs.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("readTree keeps exec bit and nested paths, writeTree round-trips", async () => {
  const dir = await tmpDir();
  await mkdir(join(dir, "a/scripts"), { recursive: true });
  await writeFile(join(dir, "a/SKILL.md"), "x");
  await writeFile(join(dir, "a/scripts/run.sh"), "#!/bin/sh");
  await chmod(join(dir, "a/scripts/run.sh"), 0o755);
  const tree = await readTree(join(dir, "a"));
  expect([...tree.keys()]).toStrictEqual(["SKILL.md", "scripts/run.sh"]);
  expect(tree.get("scripts/run.sh")?.mode).toBe(MODE_EXEC);
  expect(tree.get("SKILL.md")?.mode).toBe(MODE_FILE);
  await writeTree(join(dir, "b"), tree);
  expect(await readTree(join(dir, "b"))).toStrictEqual(tree);
  expect(await listDirs(dir)).toStrictEqual(["a", "b"]);
  await cleanup(dir);
});

test("symlinks refused", async () => {
  const dir = await tmpDir();
  await writeFile(join(dir, "real.md"), "x");
  await symlink(join(dir, "real.md"), join(dir, "link.md"));
  await expect(readTree(dir)).rejects.toThrow(/symlink/);
  await cleanup(dir);
});
