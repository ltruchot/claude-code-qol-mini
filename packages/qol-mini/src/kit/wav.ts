const RATE = 44_100;
const FADE = Math.max(1, Math.floor(RATE * 0.008));

type Note = [frequency: number, seconds: number];

// Each note is faded in and out: an abrupt sine start clicks louder than the note
function samples(notes: Note[], volume: number): number[] {
  return notes.flatMap(([frequency, seconds]) => {
    const count = Math.floor(RATE * seconds);
    return Array.from({ length: count }, (_unused, i) => {
      const envelope = Math.min(1, i / FADE, (count - i) / FADE);
      return Math.trunc(
        Math.sin((2 * Math.PI * frequency * i) / RATE) * envelope * volume * 32_767,
      );
    });
  });
}

// A mono 16-bit PCM WAV
export function wav(notes: Note[], volume: number): Buffer {
  const data = samples(notes, volume);
  const out = Buffer.alloc(44 + data.length * 2);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + data.length * 2, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(RATE, 24);
  out.writeUInt32LE(RATE * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(data.length * 2, 40);
  for (const [i, sample] of data.entries()) out.writeInt16LE(sample, 44 + i * 2);
  return out;
}
