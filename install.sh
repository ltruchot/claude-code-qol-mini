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
WITH_TAB_STATE=1
WITH_FRICTION=1

for arg in "$@"; do
    case "$arg" in
        --no-statusline) WITH_STATUSLINE=0 ;;
        --no-sounds)     WITH_SOUNDS=0 ;;
        --no-tab-state)  WITH_TAB_STATE=0 ;;
        --no-friction)   WITH_FRICTION=0 ;;
        -h|--help)
            echo "usage: install.sh [--no-statusline] [--no-sounds] [--no-tab-state] [--no-friction]"
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

if [ "$WITH_TAB_STATE" -eq 1 ]; then
    mkdir -p "$CONFIG_DIR/hooks"
    cp "$REPO/hooks/tab-state.py" "$CONFIG_DIR/hooks/tab-state.py"
    echo "  tab state     $CONFIG_DIR/hooks/tab-state.py"
fi

if [ "$WITH_FRICTION" -eq 1 ]; then
    mkdir -p "$CONFIG_DIR/hooks"
    cp "$REPO/hooks/precompact-friction.py" "$CONFIG_DIR/hooks/precompact-friction.py"
    echo "  friction      $CONFIG_DIR/hooks/precompact-friction.py"
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
WITH_TAB_STATE="$WITH_TAB_STATE" \
WITH_FRICTION="$WITH_FRICTION" \
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

prefix = "~/.claude"
if os.environ.get("CLAUDE_CONFIG_DIR"):
    prefix = f'"{config_dir}"'

sounds = os.environ["WITH_SOUNDS"] == "1"
tabs = os.environ["WITH_TAB_STATE"] == "1"


def handler(command):
    return {"type": "command", "command": command}


def sound(name):
    return handler(f"bash {prefix}/sounds/play.sh {name}")


def tab(state):
    return handler(f"python3 {prefix}/hooks/tab-state.py {state}")


if sounds or tabs:
    hooks = data.setdefault("hooks", {})

    # Claude is blocked on you: a permission prompt, a question, an idle wait.
    attention = []
    if sounds:
        attention.append(sound("needs-you"))
    if tabs:
        attention.append(tab("waiting"))
    hooks["Notification"] = [{
        "matcher": "permission_prompt|idle_prompt|agent_needs_input",
        "hooks": attention,
    }]

    # Claude finished the turn: also your move, so the same marker.
    finished = []
    if sounds:
        finished.append(sound("done"))
    if tabs:
        finished.append(tab("waiting"))
    hooks["Stop"] = [{"hooks": finished}]

    if tabs:
        hooks["UserPromptSubmit"] = [{"hooks": [tab("working")]}]
        hooks["SessionEnd"] = [{"hooks": [tab("stopped")]}]

if os.environ["WITH_FRICTION"] == "1":
    hooks = data.setdefault("hooks", {})
    hooks["PreCompact"] = [{"hooks": [
        handler(f"python3 {prefix}/hooks/precompact-friction.py"),
    ]}]

settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(f"  settings      {settings}")
PY

echo
echo "Done. Restart Claude Code: settings.json is read at startup."
