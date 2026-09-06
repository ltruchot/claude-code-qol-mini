#!/usr/bin/env python3
"""Emit a terminal title carrying a state marker, for the VS Code tab list.

Claude Code writes the sequence to the terminal on our behalf, through the
documented `terminalSequence` field of the hook JSON output. That indirection
is not a convenience: hooks run without a controlling terminal, so writing to
/dev/tty ourselves is not an option -- measured, it does not exist there.

VS Code renders this only when `terminal.integrated.tabs.title` contains
${sequence}. The tab's usual title comes from the process name, read as
${process}; the two are separate channels and neither overwrites the other.

Usage: tab-state.py <working|waiting|stopped>
"""
import json
import os
import sys

MARKERS = {
    "working": "\U0001F7E2",  # green: Claude is running
    "waiting": "\U0001F7E0",  # orange: your turn, Claude is waiting on you
    "stopped": "\U0001F534",  # red: the session ended
}


def main():
    state = sys.argv[1] if len(sys.argv) > 1 else "waiting"

    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}

    # The folder name is kept in the title: it is what tells several Claude
    # terminals apart, and ${sequence} replaces the whole tab title.
    cwd = data.get("cwd") or os.getcwd()
    label = os.path.basename(cwd.rstrip("/")) or cwd
    title = f"{MARKERS.get(state, '')} {label}".strip()

    # Anything but strict JSON on stdout would be taken as plain text, and on
    # UserPromptSubmit plain text is injected into the conversation as context.
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": data.get("hook_event_name", ""),
                "terminalSequence": f"\033]0;{title}\007",
            }
        },
        sys.stdout,
    )


main()
