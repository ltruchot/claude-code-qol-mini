import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, vi } from "vite-plus/test";
import { backupPath, hasBackup, restoreBackup, snapshot } from "../../src/io/backup.ts";
import { paths } from "../../src/io/paths.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("snapshot and restore round trip, outside the project", async () => {
  const root = await tmpDir("qol-mini-backup-");
  const cache = await tmpDir("qol-mini-cache-");
  vi.stubEnv("XDG_CACHE_HOME", cache);
  const p = paths(root);
  await mkdir(join(p.skills, "hello"), { recursive: true });
  await writeFile(join(p.skills, "hello/SKILL.md"), "v1");
  expect(await hasBackup(p, "hello")).toBe(false);
  await snapshot(p, "ghost");
  await snapshot(p, "hello");
  expect(backupPath(p, "hello").startsWith(cache)).toBe(true);
  await writeFile(join(p.skills, "hello/SKILL.md"), "v2");
  await restoreBackup(p, "hello");
  expect(await readFile(join(p.skills, "hello/SKILL.md"), "utf8")).toBe("v1");
  await expect(restoreBackup(p, "ghost")).rejects.toThrow(/no backup/);
  vi.unstubAllEnvs();
  await cleanup(root);
  await cleanup(cache);
});
