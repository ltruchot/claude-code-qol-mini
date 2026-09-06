#!/usr/bin/env bash
# Enable the terminal tab state marker by setting, in VS Code:
#
#     "terminal.integrated.tabs.title": "${sequence}"
#
# Without it the tab keeps its default title, taken from the process name, and
# the coloured marker the hooks emit is never displayed.
#
# Usage: ./install-vscode.sh [--dry-run] [--force]
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
    echo "error: python3 is required." >&2
    exit 1
fi

exec python3 - "$@" <<'PY'
"""Insert one setting into every VS Code settings.json we can find.

The file is JSONC: VS Code allows comments and trailing commas in it, and many
people have them. Parsing and re-serialising would silently delete those, so
the key is inserted textually, right after the opening brace, and the rest of
the file is left byte for byte as it was.
"""
import datetime
import glob
import json
import os
import pathlib
import re
import shutil
import sys

KEY = "terminal.integrated.tabs.title"
VALUE = "${sequence}"

dry_run = "--dry-run" in sys.argv
force = "--force" in sys.argv


def candidates():
    """Every settings.json VS Code might read, on any of the platforms."""
    home = pathlib.Path.home()
    found = []

    # Local installs, per flavour.
    roots = []
    if sys.platform == "darwin":
        roots = [home / "Library" / "Application Support"]
    else:
        roots = [pathlib.Path(os.environ.get("XDG_CONFIG_HOME", home / ".config"))]
    for root in roots:
        for flavour in ("Code", "Code - Insiders", "VSCodium", "Cursor"):
            found.append(root / flavour / "User" / "settings.json")

    # Remote sessions (WSL, SSH, containers): machine-scope settings, applied
    # by the server rather than by the client.
    for server in (".vscode-server", ".vscode-server-insiders", ".cursor-server"):
        found.append(home / server / "data" / "Machine" / "settings.json")

    # Under WSL the client's own user settings live on the Windows side, and
    # that is the file a non-machine-scoped setting is read from.
    if "microsoft" in pathlib.Path("/proc/version").read_text().lower() if pathlib.Path("/proc/version").exists() else False:
        for flavour in ("Code", "Code - Insiders", "VSCodium", "Cursor"):
            found += [
                pathlib.Path(p)
                for p in glob.glob(f"/mnt/c/Users/*/AppData/Roaming/{flavour}/User/settings.json")
            ]

    return found


def strip_jsonc(text):
    """Best-effort JSONC -> JSON, for validation only, never for writing."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|\s)//[^\n]*", r"\1", text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def patch(path):
    original = path.read_text(encoding="utf-8") if path.exists() else ""

    if re.search(r'"%s"' % re.escape(KEY), original) and not force:
        current = "?"
        try:
            current = json.loads(strip_jsonc(original) or "{}").get(KEY, "?")
        except ValueError:
            pass
        print(f"  already set   {path}  ->  {current!r}")
        print(f"                (pass --force to overwrite)")
        return

    if not original.strip():
        updated = json.dumps({KEY: VALUE}, indent=2) + "\n"
    elif force and re.search(r'"%s"' % re.escape(KEY), original):
        updated = re.sub(
            r'"%s"\s*:\s*"(?:[^"\\]|\\.)*"' % re.escape(KEY),
            '"%s": "%s"' % (KEY, VALUE),
            original,
            count=1,
        )
    else:
        brace = original.find("{")
        if brace == -1:
            print(f"  SKIPPED       {path} (no JSON object found)")
            return
        insertion = '\n  "%s": "%s",' % (KEY, VALUE)
        updated = original[: brace + 1] + insertion + original[brace + 1 :]

    try:
        json.loads(strip_jsonc(updated))
    except ValueError as error:
        print(f"  SKIPPED       {path} (result would not parse: {error})")
        return

    if dry_run:
        print(f"  would patch   {path}")
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = path.with_name(f"settings.json.bak-{stamp}")
        shutil.copy2(path, backup)
        print(f"  backup        {backup}")
    path.write_text(updated, encoding="utf-8")
    print(f"  patched       {path}")


targets = [p for p in candidates() if p.exists() or p.parent.exists()]
if not targets:
    print("No VS Code settings.json found. Add this by hand instead:")
    print(f'  "{KEY}": "{VALUE}"')
    sys.exit(0)

for path in targets:
    patch(path)

print()
print("Reload the VS Code window (Developer: Reload Window) to apply.")
PY
