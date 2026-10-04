import { expect, test } from "vite-plus/test";
import { hashBytes, hashEntry } from "../../src/core/hash/file.ts";
import { isText, normalizeLf } from "../../src/core/hash/text.ts";
import { hashTree } from "../../src/core/hash/tree.ts";
import { MODE_EXEC, MODE_FILE, type FileMap } from "../../src/core/types.ts";

const buf = (s: string): Buffer => Buffer.from(s, "utf8");

test("cRLF, CR and BOM normalize to same hash", () => {
  const lf = hashBytes(buf("a\nb\n"));
  expect(hashBytes(buf("a\r\nb\r\n"))).toBe(lf);
  expect(hashBytes(buf("a\rb\r"))).toBe(lf);
  expect(hashBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buf("a\nb\n")]))).toBe(lf);
});

test("binary detected and hashed raw", () => {
  const bin = Buffer.from([0x89, 0x50, 0x00, 0x0d, 0x0a]);
  expect(isText(bin)).toBe(false);
  expect(normalizeLf(buf("x\r\n")).toString()).toBe("x\n");
  expect(hashBytes(bin)).not.toBe(hashBytes(Buffer.from([0x89, 0x50, 0x00, 0x0a])));
});

test("path, mode and content all affect entry hash", () => {
  const a = hashEntry("a.md", MODE_FILE, buf("x"));
  expect(hashEntry("b.md", MODE_FILE, buf("x"))).not.toBe(a);
  expect(hashEntry("a.md", MODE_EXEC, buf("x"))).not.toBe(a);
  expect(hashEntry("a.md", MODE_FILE, buf("y"))).not.toBe(a);
});

test("tree hash independent of insertion order", () => {
  const one: FileMap = new Map([
    ["b.md", { bytes: buf("b"), mode: MODE_FILE }],
    ["a.md", { bytes: buf("a"), mode: MODE_FILE }],
  ]);
  const two: FileMap = new Map([...one].toReversed());
  expect(hashTree(one).tree).toBe(hashTree(two).tree);
  expect(Object.keys(hashTree(one).files)).toStrictEqual(["a.md", "b.md"]);
});
