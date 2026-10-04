import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { optedOut } from "../../src/kit/hooks/optout.ts";
import { hook } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("a project opts out with one file, from any depth, and only there", async () => {
  const root = await tmpDir();
  const [off, on] = [join(root, "off"), join(root, "on")];
  const deep = join(off, "deep", "deeper");
  await mkdir(join(off, ".claude"), { recursive: true });
  await mkdir(deep, { recursive: true });
  await mkdir(on);
  await writeFile(join(off, ".claude", "qol-mini-off"), "");
  await writeFile(join(off, "TODO.md"), "# TODO\n");
  const env = { env: { CLAUDE_CONFIG_DIR: join(root, "config") } };
  const event = (cwd: string): string => JSON.stringify({ trigger: "manual", cwd });
  const silent = { code: 0, out: "", err: "" };

  expect(await hook("precompact-kaizen", ["--marker"], event(off), env)).toStrictEqual(silent);
  expect(await hook("precompact-kaizen", ["--marker"], event(deep), env)).toStrictEqual(silent);
  expect(await hook("precompact-kaizen", ["--after-compact"], event(off), env)).toStrictEqual(
    silent,
  );
  expect(await hook("tab-state", ["working"], event(off), env)).toStrictEqual(silent);
  expect(await hook("play", ["done"], event(off), env)).toStrictEqual(silent);
  expect((await hook("precompact-kaizen", [], event(on), env)).code).toBe(2);
  expect((await hook("tab-state", ["working"], event(on), env)).out).toContain("terminalSequence");

  // A stray file in the home directory silences nothing
  expect(optedOut(on, off)).toBe(false);
  expect(optedOut(deep, root)).toBe(true);
  expect(optedOut(off, off)).toBe(false);
  await cleanup(root);
});
