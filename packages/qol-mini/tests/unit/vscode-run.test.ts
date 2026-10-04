import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { runVscode } from "../../src/kit/vscode.ts";
import { capture } from "../helpers/capture.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const JSONC = '// mine\n{\n  "editor.fontSize": 14, // big\n}\n';

test("dry run writes nothing, a patch leaves a backup, revert undoes it", async () => {
  const dir = await tmpDir();
  const file = join(dir, "User", "settings.json");
  await mkdir(join(dir, "User"));
  await writeFile(file, JSONC);
  const run = (args: string[]): Promise<{ out: string }> =>
    capture({}, () =>
      Promise.resolve(runVscode(args, [file, join(dir, "absent", "settings.json")])),
    );
  expect((await run(["--dry-run"])).out).toContain("would patch");
  expect(await readFile(file, "utf8")).toBe(JSONC);
  expect((await run([])).out).toContain("patched");
  expect((await readdir(join(dir, "User"))).some((name) => name.includes(".bak-"))).toBe(true);
  expect((await run([])).out).toContain("already set");
  expect((await run(["--revert"])).out).toContain("reverted");
  expect(await readFile(file, "utf8")).toBe(JSONC);
  expect((await run(["--revert"])).out).toContain("not present");
  await cleanup(dir);
});
