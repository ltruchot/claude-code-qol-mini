#!/usr/bin/env python3
"""Claude Code status line: model name and context window usage, always visible.

Primary source is the native `context_window` object of the documented status
line payload (https://code.claude.com/docs/en/statusline#context-window-fields).
That object reads 0 before the session's first API response and right after
/compact, so a count is recovered from the session transcript in those windows
rather than showing a placeholder. The transcript scan stops at the compaction
boundary: past it lie the turns that were just summarized away, and reporting
one of those is how the readout used to sit on its pre-compact figure until the
next API response replaced it.

Thresholds come from --warn and --alert when the installer wrote them into the
status line command, from CC_CONTEXT_WARN and CC_CONTEXT_ALERT otherwise. The
arguments win because settings.json is re-read hot while its `env` block is only
read at startup: changing a threshold through them takes effect at once.

Colors and the gauge follow fixed token thresholds, not a share of the window:
what matters is the absolute size of what is being re-sent on every request. The
readout is shown over ALERT_AT rather than over the window size, so crossing the
threshold reads as an over-unity fraction (250/200k) instead of shrinking away
against a 1M denominator.
"""
import json
import os
import sys

def threshold(flag, variable, default):
    """Command-line value, else environment, else the default. Never raises."""
    arguments = sys.argv[1:]
    for index, argument in enumerate(arguments):
        if argument == flag and index + 1 < len(arguments):
            raw = arguments[index + 1]
        elif argument.startswith(f"{flag}="):
            raw = argument.split("=", 1)[1]
        else:
            continue
        if raw.isdigit() and int(raw) > 0:
            return int(raw)
    raw = os.environ.get(variable, "")
    return int(raw) if raw.isdigit() and int(raw) > 0 else default


WARN_AT = threshold("--warn", "CC_CONTEXT_WARN", 100000)
ALERT_AT = threshold("--alert", "CC_CONTEXT_ALERT", 200000)
BAR_WIDTH = 10

RESET, BOLD, DIM = "\033[0m", "\033[1m", "\033[2m"
WHITE = "\033[97m"          # bright white, for the model name
GREEN = "\033[32m"
ORANGE = "\033[38;5;208m"   # 256-color orange, distinct from the warning yellow
RED = "\033[91m"


def human(tokens, unit=True):
    """1_000_000 -> '1M', 214_500 -> '214k', 700 -> '0.7k'.

    Without the unit, for the left side of a fraction that already carries it
    on the right: '0k/200k' reads as the word "Ok" before it reads as a count.
    """
    if tokens >= 1_000_000:
        value = tokens / 1_000_000
        text = f"{value:.0f}M" if value == int(value) else f"{value:.1f}M"
    elif tokens == 0:
        text = "0k"
    elif tokens < 1000:
        text = f"{tokens / 1000:.1f}k"
    else:
        text = f"{tokens / 1000:.0f}k"
    return text if unit else text[:-1]


def from_transcript(path):
    """Context size as of the newest main-thread turn, or 0.

    Only read when the payload has no count yet, so the cost is paid at most
    once or twice per session. Sidechain entries are subagents: they carry
    their own separate window and would overstate this one.

    A `compact_boundary` entry ends the scan. Everything written before it was
    summarized away, so the last assistant turn above it describes a context
    that no longer exists; the boundary carries the size of what replaced it in
    `compactMetadata.postTokens`.
    """
    if not path or not os.path.exists(path):
        return 0
    try:
        with open(path, "rb") as fh:
            fh.seek(0, os.SEEK_END)
            end = fh.tell()
            data = b""
            while end > 0 and data.count(b"\n") <= 400:
                step = min(65536, end)
                end -= step
                fh.seek(end)
                data = fh.read(step) + data
        for line in reversed(data.decode("utf-8", "replace").splitlines()):
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get("subtype") == "compact_boundary":
                return entry.get("compactMetadata", {}).get("postTokens") or 0
            if entry.get("type") != "assistant" or entry.get("isSidechain"):
                continue
            usage = entry.get("message", {}).get("usage")
            if usage:
                return (
                    usage.get("input_tokens", 0)
                    + usage.get("cache_creation_input_tokens", 0)
                    + usage.get("cache_read_input_tokens", 0)
                )
    except OSError:
        pass
    return 0


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}

    model = data.get("model", {}).get("display_name") or "?"

    window = data.get("context_window") or {}
    used = window.get("total_input_tokens") or 0
    if not used:
        used = from_transcript(data.get("transcript_path"))

    color = RED if used >= ALERT_AT else ORANGE if used >= WARN_AT else GREEN
    filled = min(BAR_WIDTH, max(0, round(used / ALERT_AT * BAR_WIDTH)))
    gauge = f"{color}{'▓' * filled}{RESET}{DIM}{'░' * (BAR_WIDTH - filled)}{RESET}"

    # The unit belongs to the denominator alone -- unless the two sides don't
    # share it, where dropping it would turn 1.2M into a number read as 1.2k.
    limit = human(ALERT_AT)
    both_in = human(used)[-1] == limit[-1]
    count = f"{color}{BOLD}{'! ' if used >= ALERT_AT else ''}{human(used, not both_in)}{RESET}"
    count += f"{DIM}/{limit}{RESET}"

    line = f"{BOLD}{WHITE}{model}{RESET} {gauge} {count}"

    cwd = data.get("workspace", {}).get("current_dir") or data.get("cwd") or ""
    if cwd:
        line += f" {DIM}· {os.path.basename(cwd)}{RESET}"

    print(line)


main()
