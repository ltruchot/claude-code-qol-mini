import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { cli, project, setBank } from "../helpers/cli.ts";
import { readLocalFile, readLockFile } from "../helpers/json.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const env = { QOL_MINI_ANSWER_VAULT_URL: "https://vault.test", QOL_MINI_ANSWER_TOKEN: "s3cret" };

test("secrets stay out of lock, skill dir gitignored, restore and remove clean up", async () => {
  const dir = await project("bank-secret");
  const cache = { XDG_CACHE_HOME: await tmpDir("qol-mini-cache-") };
  const skill = join(dir, ".claude/skills/vault/SKILL.md");
  const local = join(dir, ".claude/qol-mini.local.json");
  expect((await cli(dir, ["install", "vault"], { ...env, ...cache })).code).toBe(0);
  expect(await readFile(skill, "utf8")).toContain("Token: s3cret");
  expect(await readFile(skill, "utf8")).toContain("Verbose: false");
  const entry = (await readLockFile(join(dir, ".claude/qol-mini.lock.json"))).skills["vault"];
  expect(entry?.answers).toStrictEqual({ VAULT_URL: "https://vault.test", VERBOSE: "false" });
  expect(entry?.secrets).toStrictEqual(["TOKEN"]);
  expect((await readLocalFile(local)).secrets["vault"]).toStrictEqual({ TOKEN: "s3cret" });
  expect(await readFile(join(dir, ".claude/.gitignore"), "utf8")).toContain("skills/vault/");
  expect(await readFile(join(dir, ".claude/.gitignore"), "utf8")).toContain("qol-mini.local.json");

  await rm(join(dir, ".claude/skills/vault"), { recursive: true });
  expect((await cli(dir, ["check"])).code).toBe(2);
  expect((await cli(dir, ["install"], cache)).code).toBe(0);
  expect(await readFile(skill, "utf8")).toContain("Token: s3cret");

  setBank(dir, "bank-secret-v2");
  expect((await cli(dir, ["update", "-y"], cache)).code).toBe(0);
  expect(await readFile(join(dir, ".claude/skills/vault/notes.md"), "utf8")).toBe(
    "- local notes v1\n",
  );
  expect(await readFile(skill, "utf8")).toContain("Extra line v2");

  expect((await cli(dir, ["remove", "vault", "-y"])).code).toBe(0);
  expect(await readFile(join(dir, ".claude/.gitignore"), "utf8")).not.toContain("skills/vault/");
  expect((await readLocalFile(local)).secrets).toStrictEqual({});
  await cleanup(dir);
  await cleanup(cache.XDG_CACHE_HOME);
});
