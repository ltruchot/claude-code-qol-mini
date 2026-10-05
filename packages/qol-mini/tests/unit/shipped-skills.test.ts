import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { readBank } from "../../src/core/bank/index.ts";
import { SKILL_FILE } from "../../src/core/bank/skill.ts";
import { MANIFEST_FILE } from "../../src/core/schema/manifest.ts";

// The frontmatter table of code.claude.com/docs/en/skills: any other key is ignored silently
const FIELDS = new Set(
  `name description when_to_use argument-hint arguments disable-model-invocation user-invocable
  allowed-tools disallowed-tools model effort context agent background hooks paths shell metadata
  license compatibility`.split(/\s+/),
);
const MAX_LINES = 500;
const MAX_LISTING = 1536;

const bank = await readBank(join(import.meta.dirname, "../../skills"));
const text = (value: unknown): string => (typeof value === "string" ? value : "");

test("the bank ships skills", () => {
  expect(bank.length).toBeGreaterThan(0);
});

test.each(bank)("$name: frontmatter holds documented fields only", ({ name, frontmatter }) => {
  const { data } = frontmatter;
  expect(Object.keys(data).filter((key) => !FIELDS.has(key))).toStrictEqual([]);
  expect(data["name"]).toBe(name);
  const listing = text(data["description"]) + text(data["when_to_use"]);
  expect(text(data["description"]).length).toBeGreaterThan(0);
  expect(listing.length).toBeLessThanOrEqual(MAX_LISTING);
});

test.each(bank)("$name: SKILL.md stays short and names every other file", ({ files }) => {
  const skillMd = files.get(SKILL_FILE)?.bytes.toString("utf8") ?? "";
  expect(skillMd.split("\n").length).toBeLessThanOrEqual(MAX_LINES);
  const others = [...files.keys()].filter((rel) => rel !== SKILL_FILE && rel !== MANIFEST_FILE);
  expect(others.filter((rel) => !skillMd.includes(rel))).toStrictEqual([]);
});
