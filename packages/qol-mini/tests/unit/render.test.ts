import { expect, test } from "vite-plus/test";
import { renderText } from "../../src/core/render/text.ts";
import { scanTokens } from "../../src/core/render/tokens.ts";
import { renderTree } from "../../src/core/render/tree.ts";
import { emptyManifest, parseManifest } from "../../src/core/schema/manifest.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";

const declared = new Set(["A", "B"]);

test("declared tokens replaced, others verbatim", () => {
  const out = renderText("{{A}} {{B}} {{C}} {{a}}", { A: "1", C: "3" }, declared);
  expect(out).toBe("1 {{B}} {{C}} {{a}}");
});

test("claude code syntax untouched", () => {
  const text = "$ARGUMENTS $1 ${CLAUDE_SKILL_DIR} !`date` {{A}}";
  expect(renderText(text, { A: "x" }, declared)).toBe(
    "$ARGUMENTS $1 ${CLAUDE_SKILL_DIR} !`date` x",
  );
});

test("scanTokens finds uppercase tokens only", () => {
  expect([...scanTokens("{{A}} {{B_2}} {{c}} {{A}}")]).toStrictEqual(["A", "B_2"]);
});

test("renderTree drops manifest, keeps binaries", () => {
  const manifest = parseManifest("version: 1\nplaceholders:\n  - {name: A, prompt: a}\n");
  const bin = Buffer.from([0, 1, 2]);
  const files: FileMap = new Map([
    ["SKILL.md", { bytes: Buffer.from("hi {{A}}"), mode: MODE_FILE }],
    ["qol-mini.yaml", { bytes: Buffer.from("version: 1"), mode: MODE_FILE }],
    ["assets/x.bin", { bytes: bin, mode: MODE_FILE }],
  ]);
  const out = renderTree(files, manifest, { A: "there" });
  expect(out.get("SKILL.md")?.bytes.toString()).toBe("hi there");
  expect(out.has("qol-mini.yaml")).toBe(false);
  expect(out.get("assets/x.bin")?.bytes).toBe(bin);
  expect(renderTree(files, emptyManifest(), { A: "z" }).get("SKILL.md")?.bytes.toString()).toBe(
    "hi {{A}}",
  );
});
