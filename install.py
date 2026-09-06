#!/usr/bin/env python3
"""Install the status line, the sounds, the tab marker and the friction review.

Python rather than shell, so that one implementation serves macOS, Linux, WSL
and Windows alike; install.sh and install.ps1 are three-line wrappers around it.

Hooks are registered in exec form -- `command` plus `args` -- rather than as a
shell string. That form runs the executable directly, with no shell in between,
which is what makes an interpreter path containing spaces (the usual case on
Windows: C:\\Program Files\\...) work the same everywhere.

Usage: install.py [--no-statusline] [--no-sounds] [--tab-state] [--no-friction]
"""
import datetime
import json
import pathlib
import shutil
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent

# Everything this installer owns, matched to prune stale hooks on re-run.
# "sounds/play.sh" is the pre-Python shell player: kept here so that upgrading
# from an older install removes its orphaned hook instead of leaving it behind.
OURS = ("sounds/play.py", "sounds/play.sh",
        "hooks/tab-state.py", "hooks/precompact-friction.py")
EVENTS = ("Notification", "Stop", "UserPromptSubmit", "SessionStart",
          "SessionEnd", "PreCompact")


def config_dir():
    import os

    override = os.environ.get("CLAUDE_CONFIG_DIR")
    return pathlib.Path(override) if override else pathlib.Path.home() / ".claude"


def main():
    flags = set(sys.argv[1:])
    if flags & {"-h", "--help"}:
        print(__doc__.strip())
        return
    unknown = flags - {"--no-statusline", "--no-sounds", "--tab-state", "--no-friction"}
    if unknown:
        sys.exit(f"unknown option: {', '.join(sorted(unknown))}")

    statusline = "--no-statusline" not in flags
    sounds = "--no-sounds" not in flags
    tabs = "--tab-state" in flags
    friction = "--no-friction" not in flags

    target = config_dir()
    # The interpreter running this installer is by definition present and
    # correct; resolving a name like "python3" would guess wrong on Windows.
    python = sys.executable or "python3"

    print(f"Installing into {target}")
    target.mkdir(parents=True, exist_ok=True)

    if statusline:
        shutil.copy2(REPO / "statusline" / "context.py", target / "statusline-context.py")
        print(f"  status line   {target / 'statusline-context.py'}")

    if tabs or friction:
        (target / "hooks").mkdir(exist_ok=True)
    if tabs:
        shutil.copy2(REPO / "hooks" / "tab-state.py", target / "hooks" / "tab-state.py")
        print(f"  tab marker    {target / 'hooks' / 'tab-state.py'}")
    if friction:
        shutil.copy2(REPO / "hooks" / "precompact-friction.py",
                     target / "hooks" / "precompact-friction.py")
        print(f"  friction      {target / 'hooks' / 'precompact-friction.py'}")

    if sounds:
        (target / "sounds").mkdir(exist_ok=True)
        shutil.copy2(REPO / "sounds" / "play.py", target / "sounds" / "play.py")
        subprocess.run([python, str(REPO / "sounds" / "generate.py"),
                        str(target / "sounds")], check=True)

    settings = target / "settings.json"
    data = {}
    if settings.exists():
        try:
            data = json.loads(settings.read_text(encoding="utf-8") or "{}")
        except ValueError:
            sys.exit(f"error: {settings} is not valid JSON. Fix or move it, then re-run.")
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = settings.with_name(f"settings.json.bak-{stamp}")
        shutil.copy2(settings, backup)
        print(f"  backup        {backup}")

    # Claude Code emits its own OSC 0 title -- an animated spinner plus the
    # conversation name -- and redraws it continuously, so it wins any race
    # against the marker. Silencing it is not optional for this feature.
    env = data.get("env", {})
    if tabs:
        env["CLAUDE_CODE_DISABLE_TERMINAL_TITLE"] = "1"
    else:
        env.pop("CLAUDE_CODE_DISABLE_TERMINAL_TITLE", None)
    if env:
        data["env"] = env
    else:
        data.pop("env", None)

    if statusline:
        data["statusLine"] = {
            "type": "command",
            "command": f'"{python}" "{target / "statusline-context.py"}"',
            "padding": 0,
        }
    else:
        data.pop("statusLine", None)

    def hook(script, *arguments):
        return {"type": "command", "command": python,
                "args": [str(target / script), *arguments]}

    hooks = data.get("hooks", {})

    # Drop the handlers this installer owns before adding back the enabled ones,
    # so turning a feature off uninstalls it. Hooks the user wrote themselves
    # match none of OURS and survive untouched.
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

    def add(event, handlers, matcher=None):
        if not handlers:
            return
        group = {"hooks": handlers}
        if matcher:
            group["matcher"] = matcher
        hooks.setdefault(event, []).append(group)

    attention = ([hook("sounds/play.py", "needs-you")] if sounds else []) + \
                ([hook("hooks/tab-state.py", "waiting")] if tabs else [])
    add("Notification", attention, "permission_prompt|idle_prompt|agent_needs_input")
    add("Stop", ([hook("sounds/play.py", "done")] if sounds else []) +
                ([hook("hooks/tab-state.py", "waiting")] if tabs else []))
    if tabs:
        # Claim the tab as soon as the session exists: with ${sequence}
        # configured, a session that emitted nothing yet shows no marker of ours.
        add("SessionStart", [hook("hooks/tab-state.py", "waiting")])
        add("UserPromptSubmit", [hook("hooks/tab-state.py", "working")])
        add("SessionEnd", [hook("hooks/tab-state.py", "stopped")])
    if friction:
        add("PreCompact", [hook("hooks/precompact-friction.py")])

    if hooks:
        data["hooks"] = hooks
    else:
        data.pop("hooks", None)

    settings.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    print(f"  settings      {settings}")
    print()
    if tabs:
        print("Tab marker: run install-vscode.py to add the editor setting, then")
        print("start a NEW session -- the env block is read at startup.")
    print("Done. Restart Claude Code itself: settings.json is read at startup,")
    print("and reloading the editor window reconnects to existing terminals")
    print("rather than restarting them.")


main()
