import { expect, test } from "vite-plus/test";
import { buildEntry } from "../../src/core/lock/entry.ts";
import { isManaged, unmanagedDirs } from "../../src/core/lock/managed.ts";
import { stableJson } from "../../src/core/lock/sort.ts";
import { LockEntry, emptyLock } from "../../src/core/schema/lock.ts";
import { parseManifest } from "../../src/core/schema/manifest.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";

const files: FileMap = new Map([["SKILL.md", { bytes: Buffer.from("x"), mode: MODE_FILE }]]);
const manifest = parseManifest(
  "version: 1\nplaceholders:\n  - {name: A, prompt: a}\n  - {name: S, prompt: s, secret: true}\n",
);

test("entry keeps public answers, lists secret names", () => {
  const entry = buildEntry({
    source: "o/r",
    sourceType: "github",
    ref: "main",
    sha: "a".repeat(40),
    skillPath: "skills/x",
    path: ".claude/skills/x",
    template: files,
    rendered: files,
    manifest,
    answers: { A: "1", S: "2" },
  });
  expect(LockEntry.safeParse(entry).success).toBe(true);
  expect(entry.answers).toStrictEqual({ A: "1" });
  expect(entry.secrets).toStrictEqual(["S"]);
  expect(Object.keys(entry.files)).toStrictEqual(["SKILL.md"]);
});

test("stable json sorts keys deeply", () => {
  expect(stableJson({ b: { z: 1, y: 2 }, a: [{ d: 1, c: 2 }] })).toBe(
    '{\n  "a": [\n    {\n      "c": 2,\n      "d": 1\n    }\n  ],\n  "b": {\n    "y": 2,\n    "z": 1\n  }\n}\n',
  );
});

test("managed set", () => {
  const lock = emptyLock();
  expect(isManaged(lock, "x")).toBe(false);
  expect(unmanagedDirs(lock, ["b", "a"])).toStrictEqual(["a", "b"]);
});
