#!/usr/bin/env python3
"""Remove what install.py added, and nothing else."""
import datetime
import json
import os
import pathlib
import shutil

# "sounds/play.sh" is the pre-Python shell player: kept here so that upgrading
# from an older install removes its orphaned hook instead of leaving it behind.
OURS = ("sounds/play.py", "sounds/play.sh",
        "hooks/tab-state.py", "hooks/precompact-friction.py")
EVENTS = ("Notification", "Stop", "UserPromptSubmit", "SessionStart",
          "SessionEnd", "PreCompact")

target = pathlib.Path(os.environ.get("CLAUDE_CONFIG_DIR") or pathlib.Path.home() / ".claude")

for relative in ("statusline-context.py", "hooks/tab-state.py",
                 "hooks/precompact-friction.py", "sounds/play.py",
                 "sounds/needs-you.wav", "sounds/done.wav"):
    (target / relative).unlink(missing_ok=True)
shutil.rmtree(target / "state", ignore_errors=True)
for directory in ("hooks", "sounds"):
    try:
        (target / directory).rmdir()
    except OSError:
        pass  # the user put something else in there; leave it alone

settings = target / "settings.json"
if settings.exists():
    data = json.loads(settings.read_text(encoding="utf-8") or "{}")
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(settings, settings.with_name(f"settings.json.bak-{stamp}"))

    data.pop("statusLine", None)
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

    settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    print(f"cleaned {settings}")

print("Done. Restart Claude Code.")
