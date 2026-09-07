#!/usr/bin/env python3
"""Enable the terminal tab marker in VS Code, Cursor and their variants.

Sets, in every settings.json that applies:

    "terminal.integrated.tabs.title": "${sequence}"

Without it a tab keeps its default title, taken from the process name, and the
marker the hooks emit is never displayed.

The file is JSONC: VS Code allows comments and trailing commas in it, and many
people have them. Parsing then re-serializing would delete those silently, so
the key is inserted textually and the rest of the file is left byte for byte
as it was.

Usage: install-vscode.py [--dry-run] [--force] [--revert]
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
FLAVORS = ("Code", "Code - Insiders", "VSCodium", "Cursor")
SERVERS = (".vscode-server", ".vscode-server-insiders", ".cursor-server")

dry_run = "--dry-run" in sys.argv
force = "--force" in sys.argv
revert = "--revert" in sys.argv


def is_wsl():
    version = pathlib.Path("/proc/version")
    try:
        return "microsoft" in version.read_text().lower()
    except OSError:
        return False


def candidates():
    """Every settings.json the editor might read, on any platform."""
    home = pathlib.Path.home()
    found = []

    # The editor installed on this machine.
    if sys.platform == "darwin":
        root = home / "Library" / "Application Support"
    elif os.name == "nt":
        root = pathlib.Path(os.environ.get("APPDATA", home / "AppData" / "Roaming"))
    else:
        root = pathlib.Path(os.environ.get("XDG_CONFIG_HOME", home / ".config"))
    for flavor in FLAVORS:
        found.append(root / flavor / "User" / "settings.json")

    # Remote sessions (WSL, SSH, dev containers): machine-scope settings, which
    # the server applies rather than the client.
    for server in SERVERS:
        found.append(home / server / "data" / "Machine" / "settings.json")

    # Under WSL the client's own user settings live on the Windows side, and
    # that is where a setting which is not machine-scoped is read from.
    if is_wsl():
        for flavor in FLAVORS:
            for match in glob.glob(f"/mnt/c/Users/*/AppData/Roaming/{flavor}/User/settings.json"):
                # Real profiles only: the template and shared accounts are
                # nobody's editor, and patching them would land in every new
                # Windows user's settings.
                if match.split("/")[3] not in ("Default", "Default User", "Public", "All Users"):
                    found.append(pathlib.Path(match))

    return found


def strip_jsonc(text):
    """Best-effort JSONC -> JSON, for validation only, never for writing."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|\s)//[^\n]*", r"\1", text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def save(path, updated, verb):
    try:
        json.loads(strip_jsonc(updated))
    except ValueError as error:
        print(f"  SKIPPED       {path} (result would not parse: {error})")
        return
    if dry_run:
        print(f"  would {verb:7} {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(path, path.with_name(f"settings.json.bak-{stamp}"))
    path.write_text(updated, encoding="utf-8")
    print(f"  {verb:13} {path}")


def unpatch(path):
    if not path.exists():
        return
    original = path.read_text(encoding="utf-8")
    updated = re.sub(
        r'^[ \t]*"%s"\s*:\s*"(?:[^"\\]|\\.)*"\s*,?[ \t]*\r?\n' % re.escape(KEY),
        "", original, count=1, flags=re.M)
    if updated == original:
        print(f"  not present   {path}")
        return
    save(path, updated, "reverted")


def patch(path):
    original = path.read_text(encoding="utf-8") if path.exists() else ""
    present = re.search(r'"%s"' % re.escape(KEY), original)

    if present and not force:
        current = "?"
        try:
            current = json.loads(strip_jsonc(original) or "{}").get(KEY, "?")
        except ValueError:
            pass
        print(f"  already set   {path}  ->  {current!r}")
        return

    if not original.strip():
        updated = json.dumps({KEY: VALUE}, indent=2) + "\n"
    elif present:
        updated = re.sub(r'"%s"\s*:\s*"(?:[^"\\]|\\.)*"' % re.escape(KEY),
                         '"%s": "%s"' % (KEY, VALUE), original, count=1)
    else:
        brace = original.find("{")
        if brace == -1:
            print(f"  SKIPPED       {path} (no JSON object found)")
            return
        updated = original[:brace + 1] + '\n  "%s": "%s",' % (KEY, VALUE) + original[brace + 1:]

    save(path, updated, "patched")


targets = [p for p in candidates() if p.exists() or p.parent.exists()]
if not targets:
    print("No editor settings.json found. Add this by hand instead:")
    print(f'  "{KEY}": "{VALUE}"')
    sys.exit(0)

for path in targets:
    (unpatch if revert else patch)(path)

print()
print("Reload the editor window to apply.")
