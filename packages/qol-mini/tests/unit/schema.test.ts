import { expect, test } from "vite-plus/test";
import { parseFrontmatter } from "../../src/core/schema/frontmatter.ts";
import { parseManifest } from "../../src/core/schema/manifest.ts";

test("valid manifest parses with defaults", () => {
  const m = parseManifest("version: 1\nplaceholders:\n  - name: A\n    prompt: a\n");
  expect(m.placeholders[0]?.type).toBe("string");
  expect(m.placeholders[0]?.secret).toBe(false);
  expect(m.skipIfExists).toStrictEqual([]);
});

test("enum without options fails", () => {
  const text = "version: 1\nplaceholders:\n  - name: A\n    prompt: a\n    type: enum\n";
  expect(() => parseManifest(text)).toThrow(/enum/);
});

test("duplicate and lowercase names fail", () => {
  const dup = "version: 1\nplaceholders:\n  - {name: A, prompt: a}\n  - {name: A, prompt: b}\n";
  expect(() => parseManifest(dup)).toThrow(/duplicate/);
  expect(() => parseManifest("version: 1\nplaceholders:\n  - {name: a, prompt: a}\n")).toThrow(
    /invalid/,
  );
});

test("frontmatter split", () => {
  const fm = parseFrontmatter("---\nname: x\ndescription: y\n---\n# Body\n");
  expect(fm.data).toStrictEqual({ name: "x", description: "y" });
  expect(fm.body).toBe("# Body\n");
  expect(parseFrontmatter("# No fm\n").data).toStrictEqual({});
});
