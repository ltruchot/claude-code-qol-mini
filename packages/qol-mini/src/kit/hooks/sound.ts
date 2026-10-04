import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { configDir } from "../../io/config-dir.ts";
import type { Payload } from "./payload.ts";
import { playerFor } from "./players.ts";
import { endsOnQuestion, pausedOnBackground } from "./turn.ts";

// Any of these is accepted: replacing a sound is dropping a file in
const EXTENSIONS = ["wav", "ogg", "flac", "mp3", "m4a", "aiff", "aif"];

export function findSound(name: string): string | undefined {
  return EXTENSIONS.map((ext) => join(configDir(), "sounds", `${name}.${ext}`)).find(
    (file) => statSync(file, { throwIfNoEntry: false })?.isFile() === true,
  );
}

// The sound to play for this event, or null. A turn parked on background
// work is not over; a turn that ends on a question asks for you.
export function soundName(name: string, event: Payload): string | null {
  if (pausedOnBackground(event)) return null;
  return name === "done" && endsOnQuestion(event) ? "needs-you" : name;
}

const ignore = (): void => {
  // a missing player is not an error
};

// Never block: on WSLg the audio sink can take 2s to wake. The player is
// spawned detached, with no console window, and nothing waits for it.
export function play(sound: string): void {
  const command = playerFor(sound);
  const [program, ...args] = command ?? [];
  if (program === undefined) return;
  const child = spawn(program, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", ignore);
  child.unref();
}
