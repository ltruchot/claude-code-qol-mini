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
echo "Friction reviewer"
STATE="$(mktemp -d)"
friction() {
    printf '%s' "$2" | CLAUDE_CONFIG_DIR="$STATE" python3 "$REPO/hooks/precompact-friction.py" >/dev/null 2>&1
    local got=$?
    if [ "$got" -eq "$3" ]; then
        printf '  ok    %-34s exit %d\n' "$1" "$got"
    else
        printf '  FAIL  %-34s exit %d, wanted %d\n' "$1" "$got" "$3"
        failures=$((failures + 1))
    fi
}
friction "manual blocks the first time"   '{"session_id":"t","trigger":"manual"}' 2
friction "second call lets it through"    '{"session_id":"t","trigger":"manual"}' 0
friction "and re-arms for the next one"   '{"session_id":"t","trigger":"manual"}' 2
friction "auto never blocks"              '{"session_id":"u","trigger":"auto"}'   0
friction "unreadable payload never blocks" 'not json'                             0
printf '%s' '{"session_id":"v","trigger":"manual"}' | CLAUDE_CONFIG_DIR=/proc/impossible python3 "$REPO/hooks/precompact-friction.py" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    printf '  ok    %-34s exit 0\n' "unwritable state never blocks"
else
    printf '  FAIL  %-34s\n' "unwritable state never blocks"; failures=$((failures + 1))
fi
rm -rf "$STATE"

echo
echo "Tab state"
out="$(printf '%s' '{"cwd":"/tmp/demo","hook_event_name":"Stop"}' | python3 "$REPO/hooks/tab-state.py" waiting)"
if printf '%s' "$out" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['hookSpecificOutput']['terminalSequence'].startswith('\033]0;'); assert 'demo' in d['hookSpecificOutput']['terminalSequence']" 2>/dev/null; then
    echo "  ok    emits a valid OSC 0 title sequence"
else
    echo "  FAIL  tab-state output"; failures=$((failures + 1))
fi

echo
if [ $failures -eq 0 ]; then
    echo "All checks passed."
else
    echo "$failures check(s) failed."
    exit 1
fi
