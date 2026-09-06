#!/usr/bin/env python3
"""Emit a terminal title carrying a state marker, for the VS Code tab list.

Claude Code writes the sequence to the terminal on our behalf, through the
documented `terminalSequence` field of the hook JSON output. That indirection
is not a convenience: hooks run without a controlling terminal, so writing to
/dev/tty ourselves is not an option -- measured, it does not exist there.

VS Code renders this only when `terminal.integrated.tabs.title` contains
${sequence}. Claude Code emits its own OSC 0 title -- an animated spinner plus
the conversation name -- and redraws it continuously, so it wins any race
against ours; set CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1 to silence it and let
this marker stand.

Usage: tab-state.py <working|waiting|stopped>
"""
import json
import os
import sys

# Override any of these with CC_TAB_WORKING, CC_TAB_WAITING, CC_TAB_STOPPED --
# an emoji, an ASCII tag like "[..]", a word like "(working)", anything the tab
# will render. An empty value drops the marker for that state.
MARKERS = {
    "working": os.environ.get("CC_TAB_WORKING", "\U0001F7E2"),  # green
    "waiting": os.environ.get("CC_TAB_WAITING", "\U0001F534"),  # red
    "stopped": os.environ.get("CC_TAB_STOPPED", "\U0001F7E8"),  # yellow square
}


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


def main():
    state = sys.argv[1] if len(sys.argv) > 1 else "waiting"

    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}

    # Parked on a subagent or a background command is not your turn: the
    # session resumes on its own, so it stays green rather than calling you.
    if state == "waiting" and paused_on_background(data):
        state = "working"

    # The folder name is kept in the title: it is what tells several Claude
    # terminals apart, and ${sequence} replaces the whole tab title.
    cwd = data.get("cwd") or os.getcwd()
    label = os.path.basename(cwd.rstrip("/")) or cwd
    title = f"{MARKERS.get(state, '')} {label}".strip()

    # Anything but strict JSON on stdout would be taken as plain text, and on
    # UserPromptSubmit plain text is injected into the conversation as context.
    #
    # `terminalSequence` is a TOP-LEVEL field, not a member of
    # hookSpecificOutput. The published schema shows it nested; the runtime
    # reads it from the root of the object, so a nested one is silently
    # ignored -- measured, eleven hook invocations emitting a correct sequence
    # that never reached the terminal. Only OSC 0/1/2/9/99/777 and BEL pass the
    # runtime's allowlist; OSC 0 is the title sequence used here.
    json.dump({"terminalSequence": f"\033]0;{title}\007"}, sys.stdout)


if __name__ == "__main__":
    main()
