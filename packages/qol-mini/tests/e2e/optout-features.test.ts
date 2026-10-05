import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { optedOut } from "../../src/kit/hooks/optout.ts";
import { hook } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("an opt-out file that names features switches off those only", async () => {
  const root = await tmpDir();
  const project = join(root, "project");
  await mkdir(join(project, ".claude"), { recursive: true });
  await writeFile(join(project, ".claude", "qol-mini-off"), "kaizen\n");
  await writeFile(join(project, "TODO.md"), "# TODO\n");
  const env = { env: { CLAUDE_CONFIG_DIR: join(root, "config") } };
  const event = JSON.stringify({ trigger: "manual", cwd: project });

  // Compaction passes, and the marker this hook owns on PreCompact still moves
  const gate = await hook("precompact-kaizen", ["--marker"], event, env);
  expect(gate.code).toBe(0);
  expect(gate.out).toContain("terminalSequence");
  expect((await hook("precompact-kaizen", ["--after-compact"], event, env)).out).toBe("");
  expect((await hook("tab-state", ["working"], event, env)).out).toContain("terminalSequence");

  expect(optedOut(project, "kaizen", root)).toBe(true);
  expect(optedOut(project, "sounds", root)).toBe(false);
  await writeFile(join(project, ".claude", "qol-mini-off"), "tab, sounds");
  expect(optedOut(project, "kaizen", root)).toBe(false);
  expect(optedOut(project, "tab", root)).toBe(true);
  expect(optedOut(project, "sounds", root)).toBe(true);
  expect((await hook("precompact-kaizen", ["--marker"], event, env)).code).toBe(2);
  await cleanup(root);
});
