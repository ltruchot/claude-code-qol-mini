#!/usr/bin/env bash
# Wrapper for macOS, Linux, WSL and Git Bash. The logic lives in install-vscode.py.
set -euo pipefail
for candidate in python3 python py; do
    if command -v "$candidate" >/dev/null 2>&1; then
        exec "$candidate" "$(dirname "$0")/install-vscode.py" "$@"
    fi
done
echo "error: python3 is required." >&2
exit 1
