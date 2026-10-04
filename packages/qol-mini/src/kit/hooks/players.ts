import { accessSync, constants } from "node:fs";
import { delimiter, extname, join } from "node:path";

// Player, arguments before the file. Ordered by how likely they are to exist.
const POSIX: [string, string[]][] = [
  ["paplay", []], // PulseAudio, incl. WSLg
  ["pw-play", []], // PipeWire
  ["aplay", ["-q"]], // ALSA, WAV only
  ["ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet"]],
  ["mpv", ["--really-quiet", "--no-video"]],
  ["play", ["-q"]], // sox
];
const RAW_ONLY = new Set(["aplay"]); // cannot decode compressed formats
const RAW = new Set([".wav", ".ogg", ".flac"]);

function onPath(name: string): boolean {
  for (const dir of (process.env["PATH"] ?? "").split(delimiter)) {
    try {
      accessSync(join(dir, name), constants.X_OK);
      return true;
    } catch {
      // next directory
    }
  }
  return false;
}

// The command that plays `sound` on this platform, or null when none exists
export function playerFor(sound: string, platform: string = process.platform): string[] | null {
  if (platform === "win32") {
    const quoted = sound.replaceAll("'", "''"); // a ' in the path ends the string
    const script = `(New-Object Media.SoundPlayer '${quoted}').PlaySync()`;
    return ["powershell", "-NoProfile", "-Command", script];
  }
  if (platform === "darwin") return ["afplay", sound];
  const compressed = !RAW.has(extname(sound).toLowerCase());
  for (const [player, args] of POSIX) {
    if (compressed && RAW_ONLY.has(player)) continue;
    if (onPath(player)) return [player, ...args, sound];
  }
  return null;
}
