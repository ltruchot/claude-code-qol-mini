import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { GREEN, hook, RED } from "../helpers/kit.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const gate = "precompact-kaizen";

test("manual /compact blocks until a review releases it, once", async () => {
  const target = await tmpDir();
  const [here, other] = [join(target, "proj"), join(target, "other")];
  for (const dir of [here, other]) await mkdir(dir);
  const env = { env: { CLAUDE_CONFIG_DIR: join(target, "config") } };
  const manual = JSON.stringify({ trigger: "manual", cwd: here });
  const run = (args: string[], input = manual): ReturnType<typeof hook> =>
    hook(gate, args, input, env);

  const held = await run(["--marker"]);
  expect(held.code).toBe(2);
  expect(held.err).toContain("Run /kaizen");
  expect(JSON.parse(held.out)).toHaveProperty("terminalSequence", `\u001B]0;${RED} proj\u0007`);
  expect((await run([])).out).toBe("");

  await hook(gate, ["--release"], "", { ...env, cwd: other });
  expect((await run([])).code).toBe(2);
  const released = await hook(gate, ["--release"], "", { ...env, cwd: here });
  expect(released.out).toContain("Kaizen recorded");
  expect(released.out).toContain((await hook(gate, ["--token"], "", { ...env, cwd: here })).out);
  const passed = await run(["--marker"]);
  expect(passed.code).toBe(0);
  expect(passed.out).toContain(GREEN);
  expect((await run([])).code).toBe(2);

  expect((await run(["--marker"], JSON.stringify({ trigger: "auto", cwd: here }))).out).toContain(
    GREEN,
  );
  expect(await run([], "not json")).toMatchObject({ code: 0, out: "" });
  await cleanup(target);
});

test("after a compaction Claude is told to read TODO.md, when there is one", async () => {
  const dir = await tmpDir();
  const event = JSON.stringify({ cwd: dir, source: "compact" });
  expect((await hook(gate, ["--after-compact"], event)).out).toBe("");
  await writeFile(join(dir, "TODO.md"), "# TODO\n");
  const out = JSON.parse((await hook(gate, ["--after-compact"], event)).out) as object;
  expect(JSON.stringify(out)).toContain("TODO.md first");
  expect(out).not.toHaveProperty("terminalSequence");
  await cleanup(dir);
});
