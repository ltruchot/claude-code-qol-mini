#!/usr/bin/env python3
"""Install the status line, the sounds, the tab marker and the kaizen review.

Python rather than shell, so that one implementation serves macOS, Linux, WSL
and Windows alike; install.sh and install.ps1 are three-line wrappers around it.

Hooks are registered in exec form -- `command` plus `args` -- rather than as a
shell string. That form runs the executable directly, with no shell in between,
which is what makes an interpreter path containing spaces (the usual case on
Windows: C:\\Program Files\\...) work the same everywhere.

Run it with no arguments in a terminal and it asks what to install. Pass any
option and it asks nothing, which is what CI and test.sh need; --defaults takes
every default without asking.

Usage: install.py [options]

  --no-statusline      leave the context gauge out
  --no-sounds          leave the notification sounds out
  --tab-state          add the terminal tab marker (retitles every terminal)
  --no-kaizen          leave the /compact friction review out
  --warn N             gauge turns orange at N tokens (default 100000)
  --alert N            gauge turns red at N tokens (default 200000)
  --defaults           install the defaults without asking
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
# "precompact-friction.py" is the pre-kaizen name of the same hook, kept for
# the same reason.
OURS = ("sounds/play.py", "sounds/play.sh",
        "hooks/tab-state.py", "hooks/precompact-kaizen.py",
        "hooks/precompact-friction.py")
EVENTS = ("Notification", "Stop", "UserPromptSubmit", "SessionStart",
          "SessionEnd", "PreCompact")

# Files we used to deliver under other names. Pruning their handlers is not
# enough: the scripts themselves have to go, or an install leaves dead copies
# in place next to the live ones.
SUPERSEDED = ("hooks/precompact-friction.py", "sounds/play.sh",
              "state/friction-review.md")


DEFAULTS = {"statusline": True, "sounds": True, "tabs": False, "kaizen": True,
            "warn": 100000, "alert": 200000}


def config_dir():
    import os

    override = os.environ.get("CLAUDE_CONFIG_DIR")
    return pathlib.Path(override) if override else pathlib.Path.home() / ".claude"


def parse(argv):
    """Command-line options over the defaults. Exits on anything unrecognized."""
    chosen = dict(DEFAULTS)
    if "-h" in argv or "--help" in argv:
        print(__doc__.strip())
        raise SystemExit(0)
    pending = None
    for argument in argv:
        if pending:
            chosen[pending] = number(pending, argument)
            pending = None
        elif argument == "--no-statusline":
            chosen["statusline"] = False
        elif argument == "--no-sounds":
            chosen["sounds"] = False
        elif argument == "--tab-state":
            chosen["tabs"] = True
        elif argument in ("--no-kaizen", "--no-friction"):  # pre-skill name
            chosen["kaizen"] = False
        elif argument == "--defaults":
            pass
        elif argument in ("--warn", "--alert"):
            pending = argument[2:]
        elif argument.startswith(("--warn=", "--alert=")):
            flag, _, value = argument.partition("=")
            chosen[flag[2:]] = number(flag[2:], value)
        else:
            sys.exit(f"unknown option: {argument}")
    if pending:
        sys.exit(f"{'--' + pending} needs a number of tokens")
    check_thresholds(chosen)
    return chosen


def number(name, raw):
    if not raw.isdigit() or int(raw) <= 0:
        sys.exit(f"--{name} needs a positive number of tokens, got {raw!r}")
    return int(raw)


def check_thresholds(chosen):
    if chosen["warn"] >= chosen["alert"]:
        sys.exit(f"--warn ({chosen['warn']}) must be below --alert "
                 f"({chosen['alert']}): the gauge goes green, orange, red.")


def ask(question, default):
    """A yes/no question. Enter takes the default; EOF takes it too."""
    suffix = "[Y/n]" if default else "[y/N]"
    while True:
        try:
            answer = input(f"  {question} {suffix} ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            return default
        if not answer:
            return default
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False


def ask_number(question, default):
    while True:
        try:
            answer = input(f"  {question} [{default}] ").strip().replace("_", "")
        except (EOFError, KeyboardInterrupt):
            print()
            return default
        if not answer:
            return default
        if answer.isdigit() and int(answer) > 0:
            return int(answer)
        print(f"    a positive number of tokens, or Enter for {default}")


def interview():
    """Ask what to install. Only reached with no options and a real terminal."""
    chosen = dict(DEFAULTS)
    print("What should be installed? Enter accepts the value in brackets.\n")

    print("  The gauge counts what is re-sent to the model on every request, and")
    print("  turns orange then red at fixed token counts -- not at a share of the")
    print("  window, which would stay near-empty on a 1M model.")
    chosen["statusline"] = ask("Context gauge in the status line?", True)
    if chosen["statusline"]:
        chosen["warn"] = ask_number("Orange at how many tokens?", DEFAULTS["warn"])
        while True:
            chosen["alert"] = ask_number("Red at how many tokens?", DEFAULTS["alert"])
            if chosen["alert"] > chosen["warn"]:
                break
            print(f"    has to be above the orange threshold ({chosen['warn']})")

    print()
    print("  Two rising notes when Claude is blocked on you, one lower note when")
    print("  a turn ends. Silent while it waits on a subagent of its own.")
    chosen["sounds"] = ask("Notification sounds?", True)

    print()
    print("  /compact stops until the session's friction has been reviewed: each")
    print("  lesson is proposed as one concrete edit, and you answer yes or no.")
    chosen["kaizen"] = ask("Friction review before /compact, via /kaizen?", True)

    print()
    print("  The tab marker puts a colored dot in front of the terminal name, so")
    print("  one tab out of a dozen tells you which session wants you. It costs")
    print("  something: every terminal is retitled, a zsh tab included, and it")
    print("  needs an editor setting plus a new session. install-vscode.py")
    print("  --revert undoes it.")
    chosen["tabs"] = ask("Terminal tab marker?", False)
    print()
    return chosen


def main():
    arguments = sys.argv[1:]
    # Asking is for a person at a terminal. An option, a pipe or a CI runner
    # means someone already decided, so nothing is asked and nothing blocks.
    if not arguments and sys.stdin.isatty():
        chosen = interview()
    else:
        chosen = parse(arguments)

    statusline = chosen["statusline"]
    sounds = chosen["sounds"]
    tabs = chosen["tabs"]
    kaizen = chosen["kaizen"]

    target = config_dir()
    # The interpreter running this installer is by definition present and
    # correct; resolving a name like "python3" would guess wrong on Windows.
    python = sys.executable or "python3"

    print(f"Installing into {target}")
    target.mkdir(parents=True, exist_ok=True)
    for relative in SUPERSEDED:
        stale = target / relative
        if stale.exists():
            stale.unlink()
            print(f"  removed       {stale}")

    if statusline:
        shutil.copy2(REPO / "statusline" / "context.py", target / "statusline-context.py")
        print(f"  status line   {target / 'statusline-context.py'}")

    if tabs or kaizen:
        (target / "hooks").mkdir(exist_ok=True)
    if tabs:
        shutil.copy2(REPO / "hooks" / "tab-state.py", target / "hooks" / "tab-state.py")
        print(f"  tab marker    {target / 'hooks' / 'tab-state.py'}")
    if kaizen:
        script = target / "hooks" / "precompact-kaizen.py"
        shutil.copy2(REPO / "hooks" / "precompact-kaizen.py", script)
        print(f"  kaizen hook   {script}")
        # The skill has to name the release command exactly, and only the
        # installer knows the interpreter and the absolute path it will have.
        skill = target / "skills" / "kaizen" / "SKILL.md"
        skill.parent.mkdir(parents=True, exist_ok=True)
        body = (REPO / "skills" / "kaizen" / "SKILL.md").read_text(encoding="utf-8")
        skill.write_text(
            body.replace("{{RELEASE_COMMAND}}", f'"{python}" "{script}" --release'),
            encoding="utf-8")
        print(f"  kaizen skill  {skill}")

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
        # Thresholds go on the command line rather than into `env`: settings.json
        # is re-read hot, its `env` block only at startup, so a change here takes
        # effect without a new session. Written only when they differ from the
        # defaults, which leaves CC_CONTEXT_WARN and CC_CONTEXT_ALERT usable.
        command = f'"{python}" "{target / "statusline-context.py"}"'
        for name in ("warn", "alert"):
            if chosen[name] != DEFAULTS[name]:
                command += f" --{name} {chosen[name]}"
        data["statusLine"] = {"type": "command", "command": command, "padding": 0}
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

    # Red and the rising notes are spent on one thing: Claude cannot go on
    # without you. `idle_prompt` fires a minute after a turn ends and asks for
    # nothing, so it gets the resting marker and no sound.
    blocked = ([hook("sounds/play.py", "needs-you")] if sounds else []) + \
              ([hook("hooks/tab-state.py", "blocked")] if tabs else [])
    add("Notification", blocked,
        "permission_prompt|agent_needs_input|elicitation_dialog|elicitation_url_dialog")
    if tabs:
        add("Notification", [hook("hooks/tab-state.py", "idle")], "idle_prompt")
    add("Stop", ([hook("sounds/play.py", "done")] if sounds else []) +
                ([hook("hooks/tab-state.py", "idle")] if tabs else []))
    if tabs:
        # Claim the tab as soon as the session exists: with ${sequence}
        # configured, a session that emitted nothing yet shows no marker of ours.
        add("SessionStart", [hook("hooks/tab-state.py", "idle")])
        add("UserPromptSubmit", [hook("hooks/tab-state.py", "working")])
        add("SessionEnd", [hook("hooks/tab-state.py", "stopped")])
    if kaizen:
        add("PreCompact", [hook("hooks/precompact-kaizen.py")])

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
    if kaizen:
        print("Kaizen: /kaizen appears once Claude Code has restarted -- a skills")
        print("directory that did not exist at startup is not watched.")
    print("Done. Restart Claude Code itself: settings.json is read at startup,")
    print("and reloading the editor window reconnects to existing terminals")
    print("rather than restarting them.")


if __name__ == "__main__":
    main()
