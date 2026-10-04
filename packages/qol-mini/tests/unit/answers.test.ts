import { expect, test } from "vite-plus/test";
import { applyDefaults, missingPlaceholders } from "../../src/core/answers/missing.ts";
import { secretNames, splitAnswers } from "../../src/core/answers/split.ts";
import { validateAnswer } from "../../src/core/answers/validate.ts";
import { parseManifest } from "../../src/core/schema/manifest.ts";
import { Placeholder } from "../../src/core/schema/placeholder.ts";

const manifest = parseManifest(
  "version: 1\nplaceholders:\n  - {name: A, prompt: a, default: da}\n  - {name: S, prompt: s, secret: true}\n",
);
const decl = (extra: object): Placeholder =>
  Placeholder.parse({ name: "X", prompt: "x", ...extra });

test("split public and secret", () => {
  expect(splitAnswers(manifest, { A: "1", S: "2" })).toStrictEqual({
    public: { A: "1" },
    secret: { S: "2" },
  });
  expect(secretNames(manifest)).toStrictEqual(["S"]);
});

test("validate by type", () => {
  expect(validateAnswer(decl({}), "")).toMatch(/required/);
  expect(validateAnswer(decl({ type: "url" }), "nope")).toMatch(/url/);
  expect(validateAnswer(decl({ type: "url" }), "https://x.dev")).toBeNull();
  expect(validateAnswer(decl({ type: "boolean" }), "yes")).toMatch(/true/);
  expect(validateAnswer(decl({ type: "enum", options: ["a", "b"] }), "c")).toMatch(/one of/);
  expect(validateAnswer(decl({ pattern: "^v\\d+$" }), "v1")).toBeNull();
  expect(validateAnswer(decl({ pattern: "^v\\d+$" }), "x")).toMatch(/match/);
  expect(validateAnswer(decl({}), "${CLAUDE_PROJECT_DIR}")).toMatch(/reserved/);
});

test("missing and defaults", () => {
  expect(missingPlaceholders(manifest, {}).map((p) => p.name)).toStrictEqual(["A", "S"]);
  expect(applyDefaults(manifest, {})).toStrictEqual({ A: "da" });
  expect(
    missingPlaceholders(manifest, applyDefaults(manifest, {})).map((p) => p.name),
  ).toStrictEqual(["S"]);
});
