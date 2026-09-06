#!/usr/bin/env python3
"""Hold back /compact until this session's friction has been reviewed.

Compaction is the moment a session's hard-won detail is about to be summarized
away, which makes it the right moment to ask what should outlive it.

The review itself happens in the `kaizen` skill, not here, and that split is
forced by the runtime rather than chosen. A PreCompact hook cannot hand Claude
any work: `exit 2` blocks the compaction and shows stderr TO THE USER -- the
reference says so in as many words, and the binary throws an error out of the
compaction path rather than resuming the conversation. An earlier version of
this hook printed a review brief on stderr and assumed Claude would act on it.
Claude never saw a word of it. Every review that appeared to work was one the
user had asked for in their next message.

So the two lines stderr carries are addressed to the user, and they name the
command that does the work: /kaizen. The skill runs the review in conversation,
one item at a time, and ends by calling this same script with --release.

What releases the block is a token file keyed by the working directory, so the
skill can write it without knowing the session id, and so running /kaizen on
its own arms the next /compact. The token is consumed as it is honored, which
re-arms the review for the compaction after that.

Automatic compaction is never blocked: it fires because the context is full,
and refusing it can leave the session with nowhere to go. There is nothing
useful to do on that path -- PreCompact takes no additionalContext and
PostCompact's stdout reaches the debug log only -- so it passes in silence.

Usage:
  precompact-kaizen.py            hook mode, reads the event JSON on stdin
  precompact-kaizen.py --release  write the token for the current directory
  precompact-kaizen.py --token    print the token path, and nothing else
"""
import hashlib
import json
import os
import pathlib
import re
import sys
import time

CONFIG_DIR = pathlib.Path(os.environ.get("CLAUDE_CONFIG_DIR", pathlib.Path.home() / ".claude"))
STATE_DIR = CONFIG_DIR / "state"
STALE_AFTER_SECONDS = 7 * 24 * 3600

# Tokens from superseded versions of this hook, swept but never honored, so an
# upgrade does not leave files behind that nothing will ever consume.
LEGACY_GLOBS = ("friction-*.done", "friction-*.guard")

BLOCKED = ("Compaction held back: this session's friction has not been reviewed.\n"
           "Run /kaizen to review it, then /compact again.")


def token_for(cwd):
    """One token per working directory.

    Not per session: the skill has to be able to write this path from a plain
    shell, and it knows where it is far more reliably than it knows which
    session it is. Keying on the directory also means a manual /kaizen arms the
    next /compact, which is the whole point of being able to run it by hand.
    """
    path = pathlib.Path(cwd).resolve()
    slug = re.sub(r"[^A-Za-z0-9._-]", "-", path.name) or "root"
    digest = hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:8]
    return STATE_DIR / f"kaizen-{slug}-{digest}.done"


def sweep_stale(now):
    """Drop tokens left behind by sessions that ended mid-review."""
    for pattern in ("kaizen-*.done",) + LEGACY_GLOBS:
        try:
            for token in STATE_DIR.glob(pattern):
                if now - token.stat().st_mtime > STALE_AFTER_SECONDS:
                    token.unlink()
        except OSError:
            pass


def release():
    token = token_for(os.getcwd())
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    token.touch()
    print(f"Kaizen recorded. /compact will now go through.\n{token}")


def main():
    if "--token" in sys.argv[1:]:
        print(token_for(os.getcwd()))
        return
    if "--release" in sys.argv[1:]:
        release()
        return

    try:
        data = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)  # An unreadable payload must never block a compaction.

    if data.get("trigger") == "auto":
        sys.exit(0)

    token = token_for(data.get("cwd") or os.getcwd())
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        sweep_stale(time.time())
        if token.exists():
            # A recorded review: honor it, and consume the token so the next
            # /compact in this directory is reviewed too.
            token.unlink()
            sys.exit(0)
    except OSError:
        # A state directory that cannot be managed must not make /compact
        # unusable, so a broken one lets the compaction through.
        sys.exit(0)

    print(BLOCKED, file=sys.stderr)
    sys.exit(2)


main()
