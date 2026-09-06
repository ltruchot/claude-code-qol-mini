#!/usr/bin/env python3
"""Turn each compaction into a chance to record what went wrong, once.

Compaction is the moment the session's hard-won detail is about to be
summarised away, which makes it the right moment to ask what should outlive it.

The review itself is deliberately NOT done here. A hook cannot talk to you --
it runs with no controlling terminal and can present no dialog -- and, more
importantly, the session that is about to be compacted still holds the whole
context in mind. It is a far better reviewer than a subagent re-reading a
transcript from disk. So this hook only does what a hook can do: it blocks the
compaction once and hands the job back to the session, which can then propose
each item and let you accept, amend or discard it in conversation.

Manual and automatic compaction are treated differently on purpose. Blocking
`/compact` is harmless: you typed it, you get a review, you type it again.
Blocking auto-compaction is not: it fires because the context is full, and
refusing it could leave the session with nowhere to go. So on `auto` this hook
never blocks; it asks for the review to happen afterwards instead.

Exit codes: 2 blocks the compaction and sends stderr back to Claude; 0 lets it
proceed.
"""
import json
import os
import pathlib
import sys
import time

CONFIG_DIR = pathlib.Path(os.environ.get("CLAUDE_CONFIG_DIR", pathlib.Path.home() / ".claude"))
STATE_DIR = CONFIG_DIR / "state"
STALE_AFTER_SECONDS = 7 * 24 * 3600

REVIEW = """\
Compaction was held back so this session's friction can be captured before the \
detail is summarised away. Do this now, then tell the user to run /compact again.

Look back over THIS session and list what actually caused friction: a wrong \
assumption you had to undo, a command that failed for a non-obvious reason, a \
convention you got wrong, a tool that behaved differently than expected, a \
measurement that contradicted what everyone believed. Ignore anything already \
written down, and anything that is plain conversation rather than a lesson.

Then, ONE AT A TIME, propose each candidate to the user. For each one give:
  - what happened, in a sentence, with the concrete evidence from this session
  - what to do and what not to do next time
  - where it belongs: this project's CLAUDE.md, the user-level CLAUDE.md, or a \
specific skill -- and say which, with a reason

Wait for the user on each item. They may accept it, rewrite it, or discard it. \
Write only what they accept, and write it where they agreed. Do not batch the \
list into one question, and do not write anything before they have answered.

If nothing in this session is worth recording, say so plainly and tell them to \
run /compact again -- an empty review is a legitimate outcome, and inventing a \
lesson to look useful is worse than none."""

AFTER_AUTO = """\
Context was just auto-compacted. Before continuing, review what caused friction \
earlier in this session and propose each item to the user one at a time, for \
them to accept, amend or discard, then write only the accepted ones to the \
CLAUDE.md or skill you agreed on."""


def sweep_stale(now):
    """Drop guards left behind by sessions that ended mid-review."""
    try:
        for guard in STATE_DIR.glob("friction-*.guard"):
            if now - guard.stat().st_mtime > STALE_AFTER_SECONDS:
                guard.unlink()
    except OSError:
        pass


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)  # Unreadable payload must never block a compaction.

    session = str(data.get("session_id") or "unknown")
    trigger = data.get("trigger")

    if trigger == "auto":
        # Never block: auto-compaction fires because the context is full.
        json.dump(
            {"hookSpecificOutput": {
                "hookEventName": "PreCompact",
                "additionalContext": AFTER_AUTO,
            }},
            sys.stdout,
        )
        sys.exit(0)

    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        sweep_stale(time.time())
        guard = STATE_DIR / f"friction-{session}.guard"
        if guard.exists():
            # The review already happened for this compaction: let it through
            # and re-arm, so a later /compact in the same session is reviewed too.
            guard.unlink()
            sys.exit(0)
        guard.write_text(str(time.time()))
    except OSError:
        # If the guard cannot be managed, never block: a broken state directory
        # must not make /compact unusable.
        sys.exit(0)

    # stderr is both the channel back to Claude and what the user sees on
    # screen. Printing the whole brief there hands the user a wall of text
    # addressed to someone else, which reads as a demand on them. So the brief
    # goes to a file and stderr carries one line naming it.
    try:
        brief = STATE_DIR / "friction-review.md"
        brief.write_text(REVIEW, encoding="utf-8")
        print(f"Compaction held back: review this session's friction first. "
              f"Read {brief} and follow it, then tell the user to run /compact again.",
              file=sys.stderr)
    except OSError:
        print(REVIEW, file=sys.stderr)  # no file? the brief still has to arrive
    sys.exit(2)


main()
