#!/usr/bin/env bash
# Wrapper for macOS, Linux, WSL and Git Bash. The logic lives in install.py so
# that a single implementation serves every platform.
set -euo pipefail
for candidate in python3 python py; do
    if command -v "$candidate" >/dev/null 2>&1; then
        exec "$candidate" "$(dirname "$0")/install.py" "$@"
    fi
done
echo "error: python3 is required (it runs the status line, the hooks and the sounds)." >&2
echo "  macOS:  xcode-select --install" >&2
echo "  Debian: sudo apt install python3" >&2
echo "  Windows: https://www.python.org/downloads/" >&2
exit 1
