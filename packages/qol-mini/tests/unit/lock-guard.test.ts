import { expect, test } from "vite-plus/test";
import { LocalFile } from "../../src/core/schema/local.ts";
import { LockFile } from "../../src/core/schema/lock.ts";

const entry = {
  source: "o/r",
  sourceType: "github",
  ref: "main",
  sha: "a".repeat(40),
  skillPath: "skills/x",
  path: ".claude/skills/x",
  templateHash: "b".repeat(64),
  renderedHash: "c".repeat(64),
  files: { "SKILL.md": "d".repeat(64) },
  answers: {},
  secrets: [],
};

const lock = (skills: Record<string, unknown>): boolean =>
  LockFile.safeParse({ version: 1, skills }).success;

test("lock refuses escaping keys, paths, files and skillPath", () => {
  expect(lock({ x: entry })).toBe(true);
  expect(lock({ "../x": { ...entry, path: ".claude/skills/../x" } })).toBe(false);
  expect(lock({ y: entry })).toBe(false);
  expect(lock({ x: { ...entry, path: "/etc/x" } })).toBe(false);
  expect(lock({ x: { ...entry, files: { "../../evil": "d".repeat(64) } } })).toBe(false);
  expect(lock({ x: { ...entry, files: { "/abs": "d".repeat(64) } } })).toBe(false);
  expect(lock({ x: { ...entry, skillPath: "../skills/x" } })).toBe(false);
  expect(lock({ x: { ...entry, files: { "..\\..\\evil": "d".repeat(64) } } })).toBe(false);
  expect(lock({ x: { ...entry, renderedHash: "zz" } })).toBe(false);
});

test("local secrets file refuses bad keys", () => {
  expect(LocalFile.safeParse({ version: 1, secrets: { "../x": { A: "1" } } }).success).toBe(false);
  expect(LocalFile.safeParse({ version: 1, secrets: { x: { A: "1" } } }).success).toBe(true);
});
