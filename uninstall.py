#!/usr/bin/env python3
"""Remove what install.py added, and nothing else."""
import datetime
import json
import os
import pathlib
import shutil

# "sounds/play.sh" is the pre-Python shell player: kept here so that upgrading
# from an older install removes its orphaned hook instead of leaving it behind.
# "precompact-friction.py" is the pre-kaizen name of the same hook, kept for
# the same reason.
OURS = ("sounds/play.py", "sounds/play.sh",
        "hooks/tab-state.py", "hooks/precompact-kaizen.py",
        "hooks/precompact-friction.py")
EVENTS = ("Notification", "Stop", "UserPromptSubmit", "SessionStart",
          "SessionEnd", "PreCompact")

target = pathlib.Path(os.environ.get("CLAUDE_CONFIG_DIR") or pathlib.Path.home() / ".claude")

removed = []
for relative in ("statusline-context.py", "hooks/tab-state.py",
                 "hooks/precompact-kaizen.py", "hooks/precompact-friction.py",
                 "skills/kaizen/SKILL.md", "sounds/play.py",
                 "sounds/needs-you.wav", "sounds/done.wav"):
    if (target / relative).exists():
        (target / relative).unlink()
        removed.append(relative)
if (target / "state").exists():
    shutil.rmtree(target / "state", ignore_errors=True)
    removed.append("state/")
for directory in ("skills/kaizen", "skills", "hooks", "sounds"):
    try:
        (target / directory).rmdir()
    except OSError:
        pass  # the user put something else in there; leave it alone
for relative in removed:
    print(f"  removed       {relative}")

settings = target / "settings.json"
touched = bool(removed)
if settings.exists():
    original = settings.read_text(encoding="utf-8") or "{}"
    data = json.loads(original)
    before = json.dumps(data, sort_keys=True)

    data.pop("statusLine", None)
    env = data.get("env", {})
    env.pop("CLAUDE_CODE_DISABLE_TERMINAL_TITLE", None)
    if not env:
        data.pop("env", None)
    hooks = data.get("hooks", {})
    for event in EVENTS:
        groups = []
        for group in hooks.get(event, []):
            kept = [h for h in group.get("hooks", [])
                    if not any(m in " ".join([h.get("command", ""), *h.get("args", [])])
                               for m in OURS)]
            if kept:
                groups.append({**group, "hooks": kept})
        if groups:
            hooks[event] = groups
        else:
            hooks.pop(event, None)
    if not hooks:
        data.pop("hooks", None)

    # Same rule as the installer: write only when something actually changes,
    # so a second uninstall neither rewrites the file nor leaves a backup.
    if json.dumps(data, sort_keys=True) != before:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(settings, settings.with_name(f"settings.json.bak-{stamp}"))
        settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")
        print(f"  cleaned       {settings.name}")
        touched = True

if touched:
    print("Done. Restart Claude Code.")
else:
    print(f"Nothing of ours left in {target}. Nothing changed.")
