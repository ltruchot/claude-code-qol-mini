// Play a short notification sound for a Claude Code hook. Never fail: a
// missing file, no audio server or no player must not disturb the session.
//
// Usage: play.js <sound-name>
import { optedOut } from "./optout.ts";
import { readPayload, text } from "./payload.ts";
import { findSound, play, soundName } from "./sound.ts";

try {
  const event = readPayload();
  const wanted = process.argv[2];
  if (wanted !== undefined && !optedOut(text(event, "cwd"))) {
    const name = soundName(wanted, event);
    const sound = name === null ? undefined : findSound(name);
    if (sound !== undefined) play(sound);
  }
} catch {
  // a sound is never worth disturbing the session for
}
