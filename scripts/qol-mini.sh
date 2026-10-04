#!/usr/bin/env bash
# Run the CLI from a clone: build the bundles, then hand over to Node. The
# published package needs none of this: `pnpm dlx qol-mini <command>`.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cli="$root/packages/qol-mini/dist/cli.js"
if ! command -v node >/dev/null 2>&1; then
    echo "error: Node.js 22.18+ is required: https://nodejs.org" >&2
    exit 1
fi
if command -v vp >/dev/null 2>&1; then
    [ -d "$root/node_modules" ] || (cd "$root" && vp install --frozen-lockfile >/dev/null)
    (cd "$root/packages/qol-mini" && vp pack >/dev/null)
elif [ ! -f "$cli" ]; then
    echo "error: not built, and Vite+ (vp) is not installed: https://viteplus.dev" >&2
    echo "  Without a clone: pnpm dlx qol-mini $*" >&2
    exit 1
fi
exec node "$cli" "$@"
