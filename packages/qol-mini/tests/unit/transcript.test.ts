import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { statusLine } from "../../src/kit/hooks/statusline-line.ts";
import { fromTranscript } from "../../src/kit/hooks/statusline-transcript.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

const LIMITS = { warn: 100_000, alert: 200_000 };
const model = { display_name: "Opus" };

test("the transcript scan stops at the compaction boundary", async () => {
  const dir = await tmpDir();
  const file = join(dir, "t.jsonl");
  const turn = (n: number, side = false): string =>
    JSON.stringify({
      type: "assistant",
      isSidechain: side,
      message: { usage: { input_tokens: n } },
    });
  const boundary = JSON.stringify({
    subtype: "compact_boundary",
    compactMetadata: { postTokens: 9 },
  });
  await writeFile(file, [turn(500), boundary].join("\n"));
  expect(fromTranscript(file)).toBe(9);
  await writeFile(file, [turn(500), boundary, turn(12), turn(99, true), "not json"].join("\n"));
  expect(fromTranscript(file)).toBe(12);
  expect(statusLine({ model, transcript_path: file }, LIMITS)).toContain("0.0");
  expect(fromTranscript(join(dir, "absent"))).toBe(0);
  await cleanup(dir);
});
