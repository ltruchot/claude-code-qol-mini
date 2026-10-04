import { expect, test } from "vite-plus/test";
import { hashBytes } from "../../src/core/hash/file.ts";
import { hasConflictMarkers } from "../../src/core/merge/three-way.ts";

test("conflict markers need all three lines", () => {
  expect(hasConflictMarkers("docs say `<<<<<<< HEAD` marks a conflict\n")).toBe(false);
  expect(hasConflictMarkers("<<<<<<< local\na\n=======\nb\n>>>>>>> qol-mini update\n")).toBe(true);
  expect(hasConflictMarkers("=======\n")).toBe(false);
});

test("hash corners: empty, lone CR, NUL past sniff window", () => {
  expect(hashBytes(Buffer.alloc(0))).toBe(hashBytes(Buffer.from("")));
  expect(hashBytes(Buffer.from("\r"))).toBe(hashBytes(Buffer.from("\n")));
  const late = Buffer.concat([Buffer.alloc(9000, 0x61), Buffer.from([0])]);
  expect(hashBytes(late)).toBe(hashBytes(late));
});
