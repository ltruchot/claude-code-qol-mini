import { expect, test } from "vite-plus/test";
import { hashTree } from "../../src/core/hash/tree.ts";
import { buildPlan, summarize } from "../../src/core/merge/plan.ts";
import { MODE_FILE, type FileMap } from "../../src/core/types.ts";

const fm = (obj: Record<string, string | Buffer>): FileMap =>
  new Map(Object.entries(obj).map(([k, v]) => [k, { bytes: Buffer.from(v), mode: MODE_FILE }]));

const base = fm({ "SKILL.md": "repo: old\nbody\n", "ref.md": "r\n", "gone.md": "g\n" });
const lockFiles = hashTree(base).files;

test("placeholder-only change is plain write, untouched files deleted", () => {
  const theirs = fm({ "SKILL.md": "repo: new\nbody\n", "ref.md": "r\n" });
  const plan = buildPlan({ base, theirs, disk: base, lockFiles, skip: [], mode: "inline" });
  expect(plan.map((a) => `${a.rel}:${a.kind}`)).toStrictEqual([
    "SKILL.md:write",
    "gone.md:delete",
    "ref.md:keep",
  ]);
});

test("local edit plus upstream change merges", () => {
  const disk = fm({
    "SKILL.md": "repo: old\nbody\nmine\n",
    "ref.md": "r\n",
    "gone.md": "edited\n",
  });
  const theirs = fm({ "SKILL.md": "repo: new\nbody\n", "ref.md": "r\n", "new.md": "n\n" });
  const plan = buildPlan({ base, theirs, disk, lockFiles, skip: [], mode: "inline" });
  const skill = plan.find((a) => a.rel === "SKILL.md");
  expect(skill?.kind).toBe("merge");
  expect(skill?.entry?.bytes.toString()).toBe("repo: new\nbody\nmine\n");
  expect(plan.find((a) => a.rel === "gone.md")?.kind).toBe("keep");
  expect(plan.find((a) => a.rel === "new.md")?.kind).toBe("write");
});

test("overlap conflicts, skipIfExists and extras kept", () => {
  const disk = fm({ "SKILL.md": "repo: mine\nbody\n", "ref.md": "local\n", "manual.md": "m\n" });
  const theirs = fm({ "SKILL.md": "repo: new\nbody\n", "ref.md": "R\n" });
  const plan = buildPlan({ base, theirs, disk, lockFiles, skip: ["ref.md"], mode: "rej" });
  const skill = plan.find((a) => a.rel === "SKILL.md");
  expect(skill?.kind).toBe("conflict");
  expect(skill?.rej?.toString()).toBe("repo: new\nbody\n");
  expect(plan.find((a) => a.rel === "ref.md")?.reason).toBe("skipIfExists");
  expect(plan.find((a) => a.rel === "manual.md")?.reason).toBe("not managed");
  expect(summarize(plan)).toStrictEqual({ conflict: 1, keep: 3 });
});
