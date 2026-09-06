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
  --replace            overwrite delivered files that differ (see below)

Nothing already on disk is overwritten. Files this installer owns are created
when missing, left alone when identical, and reported when they differ -- with
nothing written at all, so a refused run leaves no half-installed state. Remove
them, or pass --replace. The sounds are never rewritten: the README tells you to
drop your own WAV over them.
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
          "SessionEnd", "PreCompact", "PostCompact")

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


def interview(current=None):
    """Ask what to install. Only reached with no options and a real terminal.

    The brackets hold what is installed right now, not what ships by default,
    so pressing Enter through the whole thing reproduces the current setup
    instead of resetting it.
    """
    chosen = dict(current or DEFAULTS)
    print("What should be installed? Enter accepts the value in brackets.\n")

    print("  The gauge counts what is re-sent to the model on every request, and")
    print("  turns orange then red at fixed token counts -- not at a share of the")
    print("  window, which would stay near-empty on a 1M model.")
    chosen["statusline"] = ask("Context gauge in the status line?", chosen["statusline"])
    if chosen["statusline"]:
        chosen["warn"] = ask_number("Orange at how many tokens?", chosen["warn"])
        while True:
            chosen["alert"] = ask_number("Red at how many tokens?", chosen["alert"])
            if chosen["alert"] > chosen["warn"]:
                break
            print(f"    has to be above the orange threshold ({chosen['warn']})")

    print()
    print("  Two rising notes when Claude is blocked on you, one lower note when")
    print("  a turn ends. Silent while it waits on a subagent of its own.")
    chosen["sounds"] = ask("Notification sounds?", chosen["sounds"])

    print()
    print("  /compact stops until the session's friction has been reviewed: each")
    print("  lesson is proposed as one concrete edit, and you answer yes or no.")
    chosen["kaizen"] = ask("Friction review before /compact, via /kaizen?",
                           chosen["kaizen"])

    print()
    print("  The tab marker puts a colored dot in front of the terminal name, so")
    print("  one tab out of a dozen tells you which session wants you. It costs")
    print("  something: every terminal is retitled, a zsh tab included, and it")
    print("  needs an editor setting plus a new session. install-vscode.py")
    print("  --revert undoes it.")
    chosen["tabs"] = ask("Terminal tab marker?", chosen["tabs"])
    print()
    return chosen


def installed_state(target):
    """What the current settings.json says is installed, for the interview.

    Reading it back means Enter-through in the interview reproduces the setup
    already in place instead of resetting it to the shipped defaults.
    """
    state = dict(DEFAULTS)
    try:
        data = json.loads((target / "settings.json").read_text(encoding="utf-8") or "{}")
    except (OSError, ValueError):
        return state
    command = (data.get("statusLine") or {}).get("command", "")
    state["statusline"] = "statusline-context.py" in command
    for name in ("warn", "alert"):
        marker = f"--{name} "
        if marker in command:
            value = command.split(marker, 1)[1].split()[0]
            if value.isdigit() and int(value) > 0:
                state[name] = int(value)
    ours = json.dumps(data.get("hooks", {}))
    state["sounds"] = "play.py" in ours
    state["tabs"] = "tab-state.py" in ours
    state["kaizen"] = "precompact-kaizen.py" in ours
    return state


def payloads(chosen, target, python):
    """The files this install owns, as {relative path: exact bytes}.

    The sounds are deliberately absent. The README tells you to drop your own
    WAV over them, so they are created when missing and never rewritten -- an
    installer that regenerated them would silently undo that every run.
    """
    files = {}
    if chosen["statusline"]:
        files["statusline-context.py"] = (REPO / "statusline" / "context.py").read_bytes()
    if chosen["tabs"]:
        files["hooks/tab-state.py"] = (REPO / "hooks" / "tab-state.py").read_bytes()
    if chosen["sounds"]:
        files["sounds/play.py"] = (REPO / "sounds" / "play.py").read_bytes()
    if chosen["kaizen"]:
        script = target / "hooks" / "precompact-kaizen.py"
        files["hooks/precompact-kaizen.py"] = (REPO / "hooks" / "precompact-kaizen.py").read_bytes()
        # The skill has to name the release command exactly, and only the
        # installer knows the interpreter and the absolute path it will have.
        body = (REPO / "skills" / "kaizen" / "SKILL.md").read_text(encoding="utf-8")
        files["skills/kaizen/SKILL.md"] = body.replace(
            "{{RELEASE_COMMAND}}", f'"{python}" "{script}" --release').encode("utf-8")
    return files


def settings_for(chosen, target, python, data):
    """The settings.json this install wants, merged onto what is already there."""
    data = json.loads(json.dumps(data))  # a copy: the original is the comparison

    # Claude Code emits its own OSC 0 title -- an animated spinner plus the
    # conversation name -- and redraws it continuously, so it wins any race
    # against the marker. Silencing it is not optional for this feature.
    env = data.get("env", {})
    if chosen["tabs"]:
        env["CLAUDE_CODE_DISABLE_TERMINAL_TITLE"] = "1"
    else:
        env.pop("CLAUDE_CODE_DISABLE_TERMINAL_TITLE", None)
    if env:
        data["env"] = env
    else:
        data.pop("env", None)

    if chosen["statusline"]:
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

    sounds, tabs = chosen["sounds"], chosen["tabs"]
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
    # SessionEnd stays in EVENTS but gets no handler: an older install put a
    # "stopped" marker there, and the purge above is what removes it.

    # Compaction is a long stretch of work with no turn around it, so nothing
    # else moves the marker: without these two the tab sits idle for minutes
    # while the model is busy. Only `manual` gets the resting marker and the
    # sound -- an automatic compaction happens mid-turn and the work goes on
    # after it, so ringing there would be the beep for nothing.
    if chosen["kaizen"]:
        # One hook owns the PreCompact marker, and it is this one: hooks on an
        # event run concurrently, and it alone knows whether the compaction is
        # going to happen or be held back.
        add("PreCompact", [hook("hooks/precompact-kaizen.py",
                                *(["--marker", str(target / "hooks/tab-state.py")]
                                  if tabs else []))])
    elif tabs:
        add("PreCompact", [hook("hooks/tab-state.py", "working")])
    add("PostCompact", ([hook("sounds/play.py", "done")] if sounds else []) +
                       ([hook("hooks/tab-state.py", "idle")] if tabs else []),
        "manual")

    if hooks:
        data["hooks"] = hooks
    else:
        data.pop("hooks", None)
    return data


def main():
    arguments = sys.argv[1:]
    replace = "--replace" in arguments
    decisive = [a for a in arguments if a != "--replace"]
    target = config_dir()
    # Asking is for a person at a terminal. An option, a pipe or a CI runner
    # means someone already decided, so nothing is asked and nothing blocks.
    if not decisive and sys.stdin.isatty():
        chosen = interview(installed_state(target))
    else:
        chosen = parse(decisive)

    python = sys.executable or "python3"  # resolving "python3" guesses wrong on Windows
    settings = target / "settings.json"
    try:
        current = json.loads(settings.read_text(encoding="utf-8") or "{}")
    except FileNotFoundError:
        current = {}
    except ValueError:
        sys.exit(f"error: {settings} is not valid JSON. Fix or move it, then re-run.")

    wanted = payloads(chosen, target, python)
    merged = settings_for(chosen, target, python, current)

    # What actually has to happen. Nothing is written before this is settled:
    # a run that refuses must not leave a half-installed state behind.
    create = {r: b for r, b in wanted.items() if not (target / r).exists()}
    clash = [r for r in wanted
             if r not in create and (target / r).read_bytes() != wanted[r]]
    sounds = [n for n in ("needs-you.wav", "done.wav")
              if chosen["sounds"] and not (target / "sounds" / n).exists()]
    stale = [r for r in SUPERSEDED if (target / r).exists()]

    if clash and not replace:
        print(f"{len(clash)} file(s) in {target} differ from what this version ships:")
        for relative in clash:
            print(f"  {target / relative}")
        print()
        print("Nothing was written. This installer creates what is missing and")
        print("never overwrites what is already there, because it cannot tell an")
        print("older version from an edit you made on purpose. Remove the files")
        print("above and re-run, or ./uninstall.sh for a clean slate, or re-run")
        print("with --replace to have them written over.")
        sys.exit(1)

    if not create and not clash and not sounds and not stale and merged == current:
        print(f"Already installed in {target}, with these settings. Nothing changed.")
        return

    print(f"Installing into {target}")
    target.mkdir(parents=True, exist_ok=True)
    for relative in stale:
        (target / relative).unlink()
        print(f"  removed       {relative}")
    for relative in sorted(set(create) | set(clash if replace else [])):
        path = target / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(wanted[relative])
        print(f"  {'replaced' if relative in clash else 'created':<14}{relative}")
    for relative in sorted(set(wanted) - set(create) - set(clash)):
        print(f"  unchanged     {relative}")
    if sounds:
        (target / "sounds").mkdir(parents=True, exist_ok=True)
        subprocess.run([python, str(REPO / "sounds" / "generate.py"),
                        str(target / "sounds")], check=True)

    if merged == current:
        print("  unchanged     settings.json")
    else:
        if settings.exists():
            stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            backup = settings.with_name(f"settings.json.bak-{stamp}")
            shutil.copy2(settings, backup)
            print(f"  backup        {backup.name}")
        settings.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")
        print("  updated       settings.json")

    print()
    if chosen["tabs"]:
        print("Tab marker: run install-vscode.py to add the editor setting, then")
        print("start a NEW session -- the env block is read at startup.")
    if chosen["kaizen"]:
        print("Kaizen: /kaizen appears once Claude Code has restarted -- a skills")
        print("directory that did not exist at startup is not watched.")
    if merged != current:
        print("Done. Restart Claude Code itself: settings.json is read at startup,")
        print("and reloading the editor window reconnects to existing terminals")
        print("rather than restarting them.")
    else:
        print("Done. Files only -- settings.json was already correct.")


if __name__ == "__main__":
    main()
