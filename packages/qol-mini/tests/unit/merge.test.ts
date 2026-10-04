import { expect, test } from "vite-plus/test";
import { classifyFile } from "../../src/core/merge/classify.ts";
import { resolveText } from "../../src/core/merge/conflict.ts";
import { hasConflictMarkers, mergeThreeWay } from "../../src/core/merge/three-way.ts";

test("classify buckets", () => {
  expect(classifyFile(undefined, undefined, "t")).toBe("missing");
  expect(classifyFile(undefined, "d")).toBe("extra");
  expect(classifyFile("l", "l")).toBe("removed");
  expect(classifyFile("l", "l", "t")).toBe("same");
  expect(classifyFile("l", "d", "t")).toBe("drift");
});

test("clean three-way merge keeps both edits", () => {
  const res = mergeThreeWay("a\nb\nc\n", "a\nb\nc\nlocal\n", "A\nb\nc\n");
  expect(res.conflict).toBe(false);
  expect(res.text).toBe("A\nb\nc\nlocal\n");
});

test("overlapping edits conflict with markers", () => {
  const res = mergeThreeWay("a\n", "x\n", "y\n");
  expect(res.conflict).toBe(true);
  expect(hasConflictMarkers(res.text)).toBe(true);
  expect(res.text).toContain("qol-mini update");
});

test("conflict modes", () => {
  expect(resolveText("ours", "a", "x", "y").text).toBe("x");
  expect(resolveText("theirs", "a", "x", "y").text).toBe("y");
  const rej = resolveText("rej", "a", "x", "y");
  expect(rej.text).toBe("x");
  expect(rej.rej).toBe("y");
  expect(resolveText("inline", "a", "x", "y").conflict).toBe(true);
});
