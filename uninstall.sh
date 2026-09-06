#!/usr/bin/env bash
# Remove what install.sh added, and nothing else.
set -euo pipefail

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

if ! command -v python3 >/dev/null 2>&1; then
    echo "error: python3 is required to edit settings.json." >&2
    exit 1
fi

rm -f "$CONFIG_DIR/statusline-context.py"
rm -f "$CONFIG_DIR/hooks/tab-state.py" "$CONFIG_DIR/hooks/precompact-friction.py"
rm -rf "$CONFIG_DIR/state"
rmdir "$CONFIG_DIR/hooks" 2>/dev/null || true
rm -f "$CONFIG_DIR/sounds/play.sh" \
      "$CONFIG_DIR/sounds/needs-you.wav" \
      "$CONFIG_DIR/sounds/done.wav"
rmdir "$CONFIG_DIR/sounds" 2>/dev/null || true

CONFIG_DIR="$CONFIG_DIR" python3 <<'PY'
import datetime
import json
import os
import pathlib
import shutil

settings = pathlib.Path(os.environ["CONFIG_DIR"]) / "settings.json"
if not settings.exists():
    raise SystemExit(0)

data = json.loads(settings.read_text() or "{}")
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
shutil.copy2(settings, settings.with_name(f"settings.json.bak-{stamp}"))

data.pop("statusLine", None)
hooks = data.get("hooks", {})
for event in ("Notification", "Stop", "UserPromptSubmit", "SessionStart", "SessionEnd", "PreCompact"):
    entries = [
        group for group in hooks.get(event, [])
        if not any(
            "play.sh" in handler.get("command", "")
            or "tab-state.py" in handler.get("command", "")
            or "precompact-friction.py" in handler.get("command", "")
            for handler in group.get("hooks", [])
        )
    ]
    if entries:
        hooks[event] = entries
    else:
        hooks.pop(event, None)
if not hooks:
    data.pop("hooks", None)

settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(f"cleaned {settings}")
PY

echo "Done. Restart Claude Code."
