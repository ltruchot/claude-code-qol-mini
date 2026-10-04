import { expect, test } from "vite-plus/test";
import { skillFromFiles } from "../../src/core/bank/skill.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";

const fm = (obj: Record<string, string>): FileMap =>
  new Map(Object.entries(obj).map(([k, v]) => [k, { bytes: Buffer.from(v), mode: MODE_FILE }]));

test("a skill needs SKILL.md", () => {
  expect(() => skillFromFiles("s", "/s", fm({}))).toThrow(/SKILL.md/);
  expect(skillFromFiles("s", "/s", fm({ "SKILL.md": "---\nname: s\n---\n" })).name).toBe("s");
});
