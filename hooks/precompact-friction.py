#!/usr/bin/env python3
"""Turn each compaction into a chance to record what went wrong, once.

Compaction is the moment the session's hard-won detail is about to be
summarised away, which makes it the right moment to ask what should outlive it.

The review itself is deliberately NOT done here. A hook cannot talk to you --
it runs with no controlling terminal and can present no dialog -- and, more
importantly, the session that is about to be compacted still holds the whole
context in mind. It is a far better reviewer than a subagent re-reading a
transcript from disk. So this hook only does what a hook can do: it blocks the
compaction and hands the job back to the session, which proposes each item and
lets you say yes or no in conversation.

What releases the block is a token file, and the token is written by the
SESSION once the review is over -- never by this hook. An earlier version wrote
it here, at the moment of blocking, so that the next attempt would go through.
That made the signal mean "you already tried once" instead of "the review
happened", and a second /compact sailed past with nothing reviewed. The token
is consumed as it is honoured, so the next compaction in the same session is
armed again.

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

# `.guard` is the token this hook used to write itself, kept here only so a
# machine upgrading from that version does not keep a file nothing consumes.
TOKEN_GLOBS = ("friction-*.done", "friction-*.guard")

REVIEW = """\
Compaction is held back until this session's friction has been reviewed with \
the user, so the detail is turned into something durable before it is \
summarised away.

Look back over THIS session and list what actually caused friction: a wrong \
assumption you had to undo, a command that failed for a non-obvious reason, a \
convention you got wrong, a tool that behaved differently than expected, a \
measurement that contradicted what everyone believed. Ignore anything already \
written down, and anything that is plain conversation rather than a lesson.

Turn each one into a CONCRETE AMENDMENT -- not a remark. Name the file and say \
what text you would add or change, so the user is answering yes or no to an \
edit they can picture:
  - this project's CLAUDE.md
  - a skill (name it; say whether it exists or you would create it)
  - the documentation -- README, usage notes
  - a comment in the code, where the trap is invisible at the point it bites
Never the user-level ~/.claude/CLAUDE.md: a lesson too general for one repo \
becomes a skill, it does not move up a level.

Propose them ONE AT A TIME. For each: what happened, with the concrete \
evidence from this session; the amendment you propose, naming the file; what \
future friction it prevents. Then wait. The user answers yes or no. Write only \
what they accept, where they agreed, and do not write anything before they \
have answered. Do not batch the list into one question.

If nothing in this session is worth recording, say so plainly -- an empty \
review is a legitimate outcome, and inventing a lesson to look useful is worse \
than none.

WHEN THE REVIEW IS OVER, and only then, release the block by creating the \
token file, then tell the user that /compact will now go through:

    {release}

The token is consumed as it is honoured, so the next /compact in this session \
is reviewed too."""

AFTER_AUTO = """\
Context was just auto-compacted. Before continuing, review what caused friction \
earlier in this session: propose each item to the user one at a time as a \
concrete amendment to this project's CLAUDE.md, a skill, the documentation or a \
code comment, naming the file, and write only the ones they accept."""


def sweep_stale(now):
    """Drop tokens left behind by sessions that ended mid-review."""
    for pattern in TOKEN_GLOBS:
        try:
            for token in STATE_DIR.glob(pattern):
                if now - token.stat().st_mtime > STALE_AFTER_SECONDS:
                    token.unlink()
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

    release = STATE_DIR / f"friction-{session}.done"
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        sweep_stale(time.time())
        if release.exists():
            # The session recorded a finished review: honour it, and consume the
            # token so a later /compact in the same session is reviewed too.
            release.unlink()
            sys.exit(0)
    except OSError:
        # If the state directory cannot be managed, never block: a broken state
        # directory must not make /compact unusable.
        sys.exit(0)

    # stderr is both the channel back to Claude and what the user sees on
    # screen. Printing the whole brief there hands the user a wall of text
    # addressed to someone else, which reads as a demand on them. So the brief
    # goes to a file and stderr carries one line naming it.
    brief_text = REVIEW.format(release=f"touch '{release}'")
    try:
        brief = STATE_DIR / "friction-review.md"
        brief.write_text(brief_text, encoding="utf-8")
        print(f"Compaction held back: review this session's friction with the user first. "
              f"Read {brief} and follow it.",
              file=sys.stderr)
    except OSError:
        print(brief_text, file=sys.stderr)  # no file? the brief still has to arrive
    sys.exit(2)


main()
