#!/usr/bin/env bash
# Exercise the status line against the payload shapes the documentation warns
# about, and the player against its degraded paths. Prints each rendering so a
# human can look at it; fails only on a crash or a non-zero exit.
set -uo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
SL="python3 $REPO/statusline/context.py"
failures=0

render() {
    local label="$1" payload="$2"
    local out
    out="$(printf '%s' "$payload" | $SL 2>&1)"
    local code=$?
    if [ $code -ne 0 ]; then
        printf '  FAIL  %-34s exit %d: %s\n' "$label" "$code" "$out"
        failures=$((failures + 1))
    else
        printf '  ok    %-34s %s\n' "$label" "$out"
    fi
}

model='"model":{"display_name":"Opus 5 (1M context)"},"workspace":{"current_dir":"/tmp/demo"}'

echo "Status line"
for pair in "green:8000" "green:42000" "green below threshold:99000" \
            "orange at threshold:100000" "orange:121000" "orange just under:199000" \
            "red at threshold:200000" "red over:250000" "red far over:692200"; do
    render "${pair%%:*}" "{$model,\"context_window\":{\"total_input_tokens\":${pair##*:},\"context_window_size\":1000000}}"
done
render "no context_window yet" "{$model}"
render "zeroed after /compact" "{$model,\"context_window\":{\"total_input_tokens\":0,\"used_percentage\":null,\"current_usage\":null}}"
render "empty stdin" ""
render "non-JSON stdin" "not json at all"
render "no cost is ever shown" "{$model,\"context_window\":{\"total_input_tokens\":42000},\"cost\":{\"total_cost_usd\":9.99}}"

if printf '%s' "{$model,\"context_window\":{\"total_input_tokens\":42000},\"cost\":{\"total_cost_usd\":9.99}}" | $SL | grep -q '\$'; then
    echo "  FAIL  a cost leaked into the output"
    failures=$((failures + 1))
fi

echo
echo "Player"
bash -n "$REPO/sounds/play.sh" && echo "  ok    syntax"
for case in "unknown-sound-name:missing file" ":no argument"; do
    bash "$REPO/sounds/play.sh" "${case%%:*}" </dev/null
    code=$?
    if [ $code -eq 0 ]; then
        printf '  ok    %-34s exit 0\n' "${case##*:}"
    else
        printf '  FAIL  %-34s exit %d\n' "${case##*:}" "$code"
        failures=$((failures + 1))
    fi
done

echo
if [ $failures -eq 0 ]; then
    echo "All checks passed."
else
    echo "$failures check(s) failed."
    exit 1
fi
