import { expect, test } from "vite-plus/test";
import { assertSkillName, isSkillName } from "../../src/core/names.ts";

test("skill names: kebab only, no separators, max 64", () => {
  for (const ok of ["a", "qa-pr", "npm-vulnerability-check", "a1-b2", "x".repeat(64)])
    expect(isSkillName(ok)).toBe(true);
  for (const bad of [
    "",
    "A",
    "a b",
    "a_b",
    "-a",
    "a-",
    "a--b",
    "..",
    "../x",
    "a/b",
    String.raw`a\b`,
    "é",
    ".hidden",
    "x".repeat(65),
  ]) {
    expect(isSkillName(bad)).toBe(false);
  }
  expect(() => assertSkillName("../etc")).toThrow(/invalid skill name/);
  expect(assertSkillName("ok-name")).toBe("ok-name");
});
