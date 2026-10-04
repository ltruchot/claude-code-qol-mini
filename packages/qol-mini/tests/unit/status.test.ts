import { expect, test } from "vite-plus/test";
import { hashTree } from "../../src/core/hash/tree.ts";
import type { LockEntry } from "../../src/core/schema/lock.ts";
import { computeStatus } from "../../src/core/status/compute.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";

const disk: FileMap = new Map([["SKILL.md", { bytes: Buffer.from("ok\n"), mode: MODE_FILE }]]);
const tree = hashTree(disk);
const entry: LockEntry = {
  source: "o/r",
  sourceType: "github",
  ref: "main",
  sha: "a".repeat(40),
  skillPath: "skills/x",
  path: ".claude/skills/x",
  templateHash: "b".repeat(64),
  renderedHash: tree.tree,
  files: tree.files,
  answers: {},
  secrets: [],
};

test("status buckets", () => {
  expect(computeStatus({ entry, disk })).toStrictEqual(["ok"]);
  expect(computeStatus({ entry, disk: null })).toStrictEqual(["missing"]);
  expect(computeStatus({ entry, disk, bankTemplateHash: "c".repeat(64) })).toStrictEqual([
    "update",
  ]);
  expect(computeStatus({ entry, disk, configRef: "dev" })).toStrictEqual(["wrong-ref"]);
  expect(computeStatus({ entry, disk, frozenRenderedHash: "d".repeat(64) })).toStrictEqual([
    "tamper",
  ]);
  const edited: FileMap = new Map([
    [
      "SKILL.md",
      {
        bytes: Buffer.from("<<<<<<< local\nx\n=======\ny\n>>>>>>> qol-mini update\n"),
        mode: MODE_FILE,
      },
    ],
  ]);
  expect(computeStatus({ entry, disk: edited })).toStrictEqual(["drift", "conflict"]);
});
