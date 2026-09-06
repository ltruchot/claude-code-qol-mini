#!/usr/bin/env python3
"""Generate the two notification sounds into a target directory.

Uses only the standard library, so nothing has to be installed and no binary
blobs need to live in the repository.

Usage: python3 generate.py <output-directory>
"""
import math
import pathlib
import struct
import sys
import wave

RATE = 44100
FADE_SECONDS = 0.008


def write_tone(notes, path, volume):
    """Write a small mono WAV from a list of (frequency_hz, duration_s) notes.

    Each note is faded in and out: without that, the abrupt start and stop of a
    sine wave produce a click that is louder and harsher than the note itself.
    """
    frames = bytearray()
    for frequency, duration in notes:
        count = int(RATE * duration)
        fade = max(1, int(RATE * FADE_SECONDS))
        for i in range(count):
            envelope = min(1.0, i / fade, (count - i) / fade)
            sample = math.sin(2 * math.pi * frequency * i / RATE) * envelope * volume
            frames += struct.pack("<h", int(sample * 32767))
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(bytes(frames))


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: generate.py <output-directory>")
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)

    # Two rising notes: meant to be noticed, because you are being waited on.
    write_tone([(660, 0.11), (880, 0.16)], out / "needs-you.wav", volume=0.28)
    # One lower, quieter note: meant to inform without demanding attention.
    write_tone([(440, 0.20)], out / "done.wav", volume=0.20)

    for name in ("needs-you.wav", "done.wav"):
        print(f"{out / name} ({(out / name).stat().st_size} bytes)")


main()
