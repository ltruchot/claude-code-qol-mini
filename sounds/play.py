#!/usr/bin/env python3
"""Play a short notification sound for a Claude Code hook.

Python rather than a shell script, because hooks must work where no POSIX shell
does: on Windows without Git Bash, Claude Code runs hook commands through
PowerShell, and `bash play.sh` would simply fail. Python is already required by
the status line, so it costs no new dependency and removes the shell from the
path entirely.

Two properties matter more than the sound itself:

  Never block. On WSLg the PulseAudio RDP sink can take ~2s to wake from
  SUSPENDED; a hook that waited on that would delay every turn. Playback is
  spawned detached and this returns at once.

  Never fail. A missing file, no audio server, or no player at all must not
  disturb the session, so every path exits 0.

Usage: play.py <sound-name>
"""
import json
import os
import pathlib
import subprocess
import sys

# Any of these is accepted, so replacing a sound is a matter of dropping a file
# in. Which players read which format differs, hence the ordering below.
EXTENSIONS = ("wav", "ogg", "flac", "mp3", "m4a", "aiff", "aif")

# Player, arguments before the file. Ordered by how likely they are to exist.
POSIX_PLAYERS = (
    ("paplay", ()),                                            # PulseAudio, incl. WSLg
    ("pw-play", ()),                                           # PipeWire
    ("aplay", ("-q",)),                                        # ALSA, WAV only
    ("ffplay", ("-nodisp", "-autoexit", "-loglevel", "quiet")),
    ("mpv", ("--really-quiet", "--no-video")),
    ("play", ("-q",)),                                         # sox
)
RAW_ONLY = {"aplay"}  # cannot decode compressed formats


def paused_on_background(data):
    """True when the turn ended only to wait on work that will wake it back up.

    A Stop payload carries `background_tasks` and `session_crons` for exactly
    this purpose: the reference offers them as the way to tell "the session is
    done" from "the session is paused waiting for background work to wake it
    back up". Both arrays are present and empty when nothing is in flight, and
    every task type listed there -- shell, subagent, monitor, workflow,
    teammate, cloud session, MCP task -- re-enters the session when it ends.

    No other event carries them, so this reads False everywhere else. That
    matters for the sounds: a permission prompt still rings while a subagent
    runs, because that one really is waiting on you. And if the session turns
    out to be idle after all, `idle_prompt` fires about a minute later and gets
    the marker back to red.
    """
    return bool(data.get("background_tasks") or data.get("session_crons"))


# Trailing characters that dress a line without ending it: markdown emphasis,
# code ticks, closing brackets and quotes.
QUESTION_TRAIL = " \t*_`\"')]}\u00bb\u201d"


def ends_on_question(data):
    """True when the turn ended on a question addressed to you.

    Nothing in the runtime says so. The notification types cover permissions,
    teammates and dialogs -- `agent_needs_input` is emitted for a teammate or a
    computer-use prompt, never for the main session asking something in prose.
    So a turn that ends on a question is a plain `Stop`, indistinguishable from
    a finished answer, and it used to ring the end-of-turn sound and rest.

    `last_assistant_message` is the only signal, and the reference points at it
    for exactly this: hooks needing the final text of the turn should read it
    rather than the transcript, which lags the turn that just ended.

    Only the last non-empty line counts. A question buried mid-message is not
    what the turn is waiting on. This is the one rule here that reads content
    rather than state, so it is deliberately narrow: it misses a question
    followed by a closing sentence, and that is preferred to a red that fires
    on any paragraph holding a question mark.
    """
    for line in reversed((data.get("last_assistant_message") or "").splitlines()):
        line = line.rstrip(QUESTION_TRAIL)
        if line:
            return line.endswith("?")
    return False


def find_sound(name):
    root = pathlib.Path(
        os.environ.get("CLAUDE_CONFIG_DIR", pathlib.Path.home() / ".claude")
    ) / "sounds"
    for extension in EXTENSIONS:
        candidate = root / f"{name}.{extension}"
        if candidate.is_file():
            return candidate
    return None


def spawn(command):
    """Start a player without waiting for it and without a console window."""
    kwargs = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL,
              "stdin": subprocess.DEVNULL}
    if os.name == "nt":
        kwargs["creationflags"] = 0x00000008 | 0x08000000  # DETACHED | NO_WINDOW
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen(command, **kwargs)


def play(sound):
    if os.name == "nt":
        # winsound is in the standard library and plays asynchronously by
        # itself, so nothing external is needed. It handles WAV only.
        if sound.suffix.lower() == ".wav":
            import winsound

            winsound.PlaySound(str(sound), winsound.SND_FILENAME | winsound.SND_ASYNC)
            return
        quoted = str(sound).replace("'", "''")  # a ' in the path ends the string
        spawn(["powershell", "-NoProfile", "-Command",
               f"(New-Object Media.SoundPlayer '{quoted}').Play()"])
        return

    if sys.platform == "darwin":
        spawn(["afplay", str(sound)])  # reads every format listed above
        return

    compressed = sound.suffix.lower().lstrip(".") not in ("wav", "ogg", "flac")
    for player, arguments in POSIX_PLAYERS:
        if compressed and player in RAW_ONLY:
            continue
        from shutil import which

        if which(player):
            spawn([player, *arguments, str(sound)])
            return


def main():
    if len(sys.argv) < 2:
        return
    try:
        event = json.load(sys.stdin)
    except (ValueError, OSError):
        event = {}
    if paused_on_background(event):
        return  # the turn is not over; ringing here is the beep for nothing
    name = sys.argv[1]
    # The end-of-turn note says "nothing is asked of you". A turn that ends on a
    # question asks something, so it gets the note that means come and look.
    if name == "done" and ends_on_question(event):
        name = "needs-you"
    sound = find_sound(name)
    if sound is None:
        return
    try:
        play(sound)
    except Exception:
        pass  # a sound is never worth disturbing the session for


if __name__ == "__main__":
    main()
