import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { GREEN, hook, kit, type Settings, settings } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const wired = (data: Settings, event: string): string[] =>
  (data.hooks?.[event] ?? []).flatMap((g) =>
    g.hooks.map((h) => [g.matcher, ...h.args.slice(1)].join(" ")),
  );
const script = (data: Settings, event: string): string =>
  data.hooks?.[event]?.[0]?.hooks[0]?.args[0] ?? "";

test("one marker per event, exec form, and the delivered hooks run alone", async () => {
  const target = await tmpDir();
  await kit(target, ["install", "--tab-state"]);
  const data = await settings(target);
  expect(data.hooks).not.toHaveProperty("SessionEnd");
  expect(wired(data, "PreCompact")).toStrictEqual([" --marker"]);
  expect(wired(data, "SessionStart")).toStrictEqual([" idle", "compact --after-compact"]);
  expect(wired(data, "PostCompact")).toStrictEqual(["manual done", "manual idle"]);
  expect(wired(data, "PermissionRequest")).toStrictEqual([" blocked"]);
  for (const event of ["UserPromptSubmit", "PostToolBatch", "SubagentStop"])
    expect(wired(data, event)).toStrictEqual([" working"]);
  expect(data.hooks?.["Stop"]?.[0]?.hooks[0]?.command).toBe(process.execPath);

  const skill = await readFile(join(target, "skills/kaizen/SKILL.md"), "utf8");
  const release = `"${process.execPath}" "${join(target, "hooks/precompact-kaizen.mjs")}" --release`;
  expect(skill).toContain(release);
  expect(skill).not.toContain("{{");
  const event = JSON.stringify({ cwd: "/tmp/demo" });
  expect((await hook(script(data, "UserPromptSubmit"), ["working"], event)).out).toContain(GREEN);
  const env = { env: { CLAUDE_CONFIG_DIR: target } };
  expect((await hook(script(data, "PreCompact"), [], event, env)).code).toBe(2);
  expect((await hook(script(data, "Stop"), ["done"], event, env)).code).toBe(0);
  const line = await hook(join(target, "statusline-context.mjs"), [], event);
  expect(line.out).toContain("/200k");
  await cleanup(target);
});

test("without kaizen the tab marker takes PreCompact; without the marker, no --marker", async () => {
  const target = await tmpDir();
  await kit(target, ["install", "--tab-state", "--no-kaizen"]);
  expect(wired(await settings(target), "PreCompact")).toStrictEqual([" working"]);
  await kit(target, ["install", "--no-tab-state", "--kaizen"]);
  expect(wired(await settings(target), "PreCompact")).toStrictEqual([""]);
  expect(wired(await settings(target), "Stop")).toStrictEqual([" done"]);
  await cleanup(target);
});
