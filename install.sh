#!/usr/bin/env bash
# Install the status line and the notification sounds into a Claude Code
# configuration directory.
#
# Written for bash 3.2, which is what macOS still ships: no associative
# arrays, no ${var,,}, no mapfile.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
WITH_STATUSLINE=1
WITH_SOUNDS=1

for arg in "$@"; do
    case "$arg" in
        --no-statusline) WITH_STATUSLINE=0 ;;
        --no-sounds)     WITH_SOUNDS=0 ;;
        -h|--help)
            echo "usage: install.sh [--no-statusline] [--no-sounds]"
            echo
            echo "Installs into \$CLAUDE_CONFIG_DIR, or ~/.claude when unset."
            exit 0
            ;;
        *)
            echo "unknown option: $arg" >&2
            exit 64
            ;;
    esac
done

if ! command -v python3 >/dev/null 2>&1; then
    echo "error: python3 is required (it runs the status line and builds the sounds)." >&2
    echo "  macOS:  xcode-select --install" >&2
    echo "  Debian: sudo apt install python3" >&2
    exit 1
fi

echo "Installing into $CONFIG_DIR"
mkdir -p "$CONFIG_DIR"

if [ "$WITH_STATUSLINE" -eq 1 ]; then
    cp "$REPO/statusline/context.py" "$CONFIG_DIR/statusline-context.py"
    echo "  status line   $CONFIG_DIR/statusline-context.py"
fi

if [ "$WITH_SOUNDS" -eq 1 ]; then
    mkdir -p "$CONFIG_DIR/sounds"
    cp "$REPO/sounds/play.sh" "$CONFIG_DIR/sounds/play.sh"
    chmod +x "$CONFIG_DIR/sounds/play.sh"
    python3 "$REPO/sounds/generate.py" "$CONFIG_DIR/sounds" | sed 's/^/  sound         /'
fi

# The settings file is merged, never rewritten: it holds the user's own
# permissions, plugins and environment, and a fresh write would drop them.
CONFIG_DIR="$CONFIG_DIR" \
WITH_STATUSLINE="$WITH_STATUSLINE" \
WITH_SOUNDS="$WITH_SOUNDS" \
python3 <<'PY'
import datetime
import json
import os
import pathlib
import shutil

config_dir = pathlib.Path(os.environ["CONFIG_DIR"])
settings = config_dir / "settings.json"

data = {}
if settings.exists():
    try:
        data = json.loads(settings.read_text() or "{}")
    except ValueError:
        raise SystemExit(
            f"error: {settings} is not valid JSON. Fix or move it, then re-run."
        )
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = settings.with_name(f"settings.json.bak-{stamp}")
    shutil.copy2(settings, backup)
    print(f"  backup        {backup}")

if os.environ["WITH_STATUSLINE"] == "1":
    data["statusLine"] = {
        "type": "command",
        "command": "python3 ~/.claude/statusline-context.py",
        "padding": 0,
    }
    if os.environ.get("CLAUDE_CONFIG_DIR"):
        data["statusLine"]["command"] = (
            f'python3 "{config_dir}/statusline-context.py"'
        )

if os.environ["WITH_SOUNDS"] == "1":
    player = "bash ~/.claude/sounds/play.sh"
    if os.environ.get("CLAUDE_CONFIG_DIR"):
        player = f'bash "{config_dir}/sounds/play.sh"'
    hooks = data.setdefault("hooks", {})
    hooks["Notification"] = [{
        "matcher": "permission_prompt|idle_prompt|agent_needs_input",
        "hooks": [{"type": "command", "command": f"{player} needs-you"}],
    }]
    hooks["Stop"] = [{
        "hooks": [{"type": "command", "command": f"{player} done"}],
    }]

settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(f"  settings      {settings}")
PY

echo
echo "Done. Restart Claude Code: settings.json is read at startup."
