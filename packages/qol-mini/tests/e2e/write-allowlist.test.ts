import { readdir } from "node:fs/promises";
import { expect, test } from "vite-plus/test";
import { cli, project, setBank } from "../helpers/cli.ts";
import { changed, snapshotTree } from "../helpers/snapshot.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("every command writes only under .claude and the cache", async () => {
  const dir = await project("bank-v1");
  const cache = await tmpDir("qol-mini-cache-");
  const env = {
    QOL_MINI_ANSWER_PROJECT_NAME: "Acme",
    QOL_MINI_ANSWER_TEAM: "web",
    XDG_CACHE_HOME: cache,
  };
  const before = await snapshotTree(dir);
  const flows = [["install", "hello"], ["check"], ["list"]];
  for (const args of flows) expect((await cli(dir, args, env)).code).toBe(0);
  setBank(dir, "bank-v2");
  for (const args of [["update"], ["install", "--replace"], ["remove", "hello"]])
    expect((await cli(dir, args, env)).code).toBe(0);
  const touched = changed(before, await snapshotTree(dir));
  expect(touched.length).toBeGreaterThan(0);
  expect(touched.filter((p) => !p.startsWith(".claude/"))).toStrictEqual([]);
  expect(touched.some((p) => p.includes(".qm-work-"))).toBe(false);
  const cacheTop = await readdir(cache);
  expect(cacheTop).toStrictEqual(["qol-mini"]);
  await cleanup(dir);
  await cleanup(cache);
});
