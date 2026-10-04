import { expect, test } from "vite-plus/test";
import { previewPlan } from "../../src/commands/preview.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";
import { renderDiff } from "../../src/io/diff-preview.ts";
import { getTemplate, putTemplate } from "../../src/io/template-cache.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const fm = (obj: Record<string, string>): FileMap =>
  new Map(Object.entries(obj).map(([k, v]) => [k, { bytes: Buffer.from(v), mode: MODE_FILE }]));

test("preview and diff cap, template cache round trip", async () => {
  const long = Array.from({ length: 100 }, (_, i) => `l${i}`).join("\n");
  const diff = renderDiff("f", "", long);
  expect(diff.length).toBeLessThanOrEqual(62);
  const disk = fm({ "a.md": "x\n" });
  const plan = previewPlan(
    [{ rel: "a.md", kind: "merge", entry: { bytes: Buffer.from("y\n"), mode: MODE_FILE } }],
    disk,
  );
  expect(plan.join("\n")).toContain("+ y");
  const cache = await tmpDir("qol-mini-tc-");
  process.env["XDG_CACHE_HOME"] = cache;
  expect(await getTemplate("h")).toBeNull();
  await putTemplate("h", disk);
  expect((await getTemplate("h"))?.get("a.md")?.bytes.toString()).toBe("x\n");
  delete process.env["XDG_CACHE_HOME"];
  await cleanup(cache);
});
