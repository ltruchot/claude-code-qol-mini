import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { playerFor } from "../../src/kit/hooks/players.ts";
import { soundName } from "../../src/kit/hooks/sound.ts";
import { generateSounds } from "../../src/kit/sounds.ts";
import { wav } from "../../src/kit/wav.ts";
import { cleanup, tmpDir } from "../helpers/tmp.ts";

test("a mono 16-bit WAV, never regenerated over a file dropped in", async () => {
  const tone = wav([[440, 0.2]], 0.2);
  expect(tone.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(tone.readUInt32LE(40)).toBe(tone.length - 44);
  expect(tone).toHaveLength(44 + 8820 * 2);
  const dir = await tmpDir();
  await writeFile(join(dir, "done.wav"), "mine");
  expect(generateSounds(dir)).toStrictEqual(["needs-you.wav"]);
  expect(await readFile(join(dir, "done.wav"), "utf8")).toBe("mine");
  expect((await readFile(join(dir, "needs-you.wav"))).length).toBeGreaterThan(1000);
  expect(generateSounds(dir)).toStrictEqual([]);
  await cleanup(dir);
});

test("the note follows the turn: silent on background work, rising on a question", () => {
  expect(soundName("done", {})).toBe("done");
  expect(soundName("done", { last_assistant_message: "Ship it?" })).toBe("needs-you");
  expect(soundName("done", { background_tasks: [{ type: "shell" }] })).toBeNull();
  expect(soundName("needs-you", { session_crons: [] })).toBe("needs-you");
});

test("one player per platform, a quote in the path cannot end the string", () => {
  expect(playerFor("/s/done.wav", "darwin")).toStrictEqual(["afplay", "/s/done.wav"]);
  const windows = playerFor(String.raw`C:\it's\done.wav`, "win32") ?? [];
  expect(windows[0]).toBe("powershell");
  expect(windows.at(-1)).toContain("it''s");
});
