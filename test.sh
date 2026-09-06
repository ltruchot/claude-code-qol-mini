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
echo "Context after compaction"
# The turns above a compact_boundary were just summarized away. Reporting one of
# them is how the readout used to stay on its pre-compact figure.
TR="$(mktemp)"
printf '%s\n' '{"type":"assistant","message":{"usage":{"input_tokens":89000,"cache_read_input_tokens":748}}}' > "$TR"
printf '%s\n' '{"type":"system","subtype":"compact_boundary","compactMetadata":{"trigger":"manual","preTokens":89748,"postTokens":9310}}' >> "$TR"
compacted() {
    local label="$1" want="$2" out
    out="$(printf '%s' "{$model,\"context_window\":{\"total_input_tokens\":0},\"transcript_path\":\"$TR\"}" \
           | $SL | sed 's/\x1b\[[0-9;]*m//g')"
    case "$out" in
        *"$want"/200k*) printf '  ok    %-34s %s\n' "$label" "$out" ;;
        *) printf '  FAIL  %-34s wanted %s, got %s\n' "$label" "$want" "$out"; failures=$((failures + 1)) ;;
    esac
}
compacted "boundary, no turn since" "9"
printf '%s\n' '{"type":"assistant","message":{"usage":{"input_tokens":12000}}}' >> "$TR"
compacted "a turn after the boundary wins" "12"
printf '%s\n' '{"type":"assistant","isSidechain":true,"message":{"usage":{"input_tokens":400000}}}' >> "$TR"
compacted "a subagent turn is ignored" "12"
rm -f "$TR"

echo
echo "Player"
python3 -c "import ast,pathlib;ast.parse(pathlib.Path('$REPO/sounds/play.py').read_text())" && echo "  ok    parses"
for case in "unknown-sound-name:missing file" ":no argument"; do
    python3 "$REPO/sounds/play.py" "${case%%:*}" </dev/null
    code=$?
    if [ $code -eq 0 ]; then
        printf '  ok    %-34s exit 0\n' "${case##*:}"
    else
        printf '  FAIL  %-34s exit %d\n' "${case##*:}" "$code"
        failures=$((failures + 1))
    fi
done

echo
echo "Kaizen reviewer"
STATE="$(mktemp -d)"
WORK="$(mktemp -d)"
HOOK="$REPO/hooks/precompact-kaizen.py"
kaizen() {
    printf '%s' "$2" | CLAUDE_CONFIG_DIR="$STATE" python3 "$HOOK" >/dev/null 2>&1
    local got=$?
    if [ "$got" -eq "$3" ]; then
        printf '  ok    %-34s exit %d\n' "$1" "$got"
    else
        printf '  FAIL  %-34s exit %d, wanted %d\n' "$1" "$got" "$3"
        failures=$((failures + 1))
    fi
}
manual="{\"session_id\":\"t\",\"trigger\":\"manual\",\"cwd\":\"$WORK\"}"
kaizen "manual blocks without a review" "$manual" 2
# The whole point: trying again proves nothing. Only a recorded review releases.
kaizen "trying again still blocks"      "$manual" 2

# The skill releases the block from a plain shell, knowing only where it is.
TOKEN="$(cd "$WORK" && CLAUDE_CONFIG_DIR="$STATE" python3 "$HOOK" --token)"
(cd "$WORK" && CLAUDE_CONFIG_DIR="$STATE" python3 "$HOOK" --release >/dev/null)
if [ -e "$TOKEN" ]; then
    printf '  ok    %-34s %s\n' "--release writes the token" "$(basename "$TOKEN")"
else
    printf '  FAIL  %-34s no token at %s\n' "--release writes the token" "$TOKEN"
    failures=$((failures + 1))
fi
kaizen "a recorded review is honored"  "$manual" 0
if [ -e "$TOKEN" ]; then
    printf '  FAIL  %-34s token survived\n' "the token is consumed"; failures=$((failures + 1))
else
    printf '  ok    %-34s consumed\n' "the token is consumed"
fi
kaizen "and re-arms for the next one"   "$manual" 2

# One token per directory: a review done in one project must not release
# another project's compaction.
OTHER="$(mktemp -d)"
(cd "$OTHER" && CLAUDE_CONFIG_DIR="$STATE" python3 "$HOOK" --release >/dev/null)
kaizen "another directory does not release" "$manual" 2
rm -rf "$OTHER"

kaizen "auto never blocks" '{"session_id":"u","trigger":"auto"}' 0
kaizen "unreadable payload never blocks" 'not json'              0
# Captured, not piped into grep: with `pipefail` the pipeline would carry the
# hook's deliberate exit 2 and the test would fail whatever grep found.
msg="$(printf '%s' "$manual" | CLAUDE_CONFIG_DIR="$STATE" python3 "$HOOK" 2>&1 >/dev/null)"
case "$msg" in
    */kaizen*) printf '  ok    %-34s names /kaizen\n' "the message to the user" ;;
    *) printf '  FAIL  %-34s said: %s\n' "the message to the user" "$msg"; failures=$((failures + 1)) ;;
esac
printf '%s' '{"session_id":"v","trigger":"manual"}' | CLAUDE_CONFIG_DIR=/proc/impossible python3 "$HOOK" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    printf '  ok    %-34s exit 0\n' "unwritable state never blocks"
else
    printf '  FAIL  %-34s\n' "unwritable state never blocks"; failures=$((failures + 1))
fi
rm -rf "$STATE" "$WORK"

echo
echo "Kaizen skill"
# The skill has to name a runnable release command; the installer is the only
# thing that knows the interpreter and the absolute path, so it substitutes it.
INST="$(mktemp -d)"
CLAUDE_CONFIG_DIR="$INST" python3 "$REPO/install.py" --no-sounds --no-statusline >/dev/null 2>&1
SKILL="$INST/skills/kaizen/SKILL.md"
if [ -f "$SKILL" ] && ! grep -q '{{' "$SKILL" && grep -q -- '--release' "$SKILL"; then
    echo "  ok    release command substituted"
else
    echo "  FAIL  skill not installed with a release command"; failures=$((failures + 1))
fi
if grep -q 'precompact-kaizen.py' "$INST/settings.json" 2>/dev/null; then
    echo "  ok    PreCompact hook registered"
else
    echo "  FAIL  PreCompact hook missing"; failures=$((failures + 1))
fi

echo
echo "Setup"
# Options mean someone already decided: no prompt may ever block CI.
setup() {
    local label="$1" want="$2"; shift 2
    CLAUDE_CONFIG_DIR="$INST" python3 "$REPO/install.py" "$@" >/dev/null 2>&1 </dev/null
    local got=$?
    if [ "$got" -eq "$want" ]; then
        printf '  ok    %-34s exit %d\n' "$label" "$got"
    else
        printf '  FAIL  %-34s exit %d, wanted %d\n' "$label" "$got" "$want"
        failures=$((failures + 1))
    fi
}
setup "an unknown option is refused"  1 --no-such-thing
setup "warn above alert is refused"   1 --no-sounds --warn 300000 --alert 200000
setup "a threshold needs a number"    1 --no-sounds --warn banana
setup "thresholds are accepted"       0 --no-sounds --warn=120000 --alert 250000
if grep -q -- '--warn 120000 --alert 250000' "$INST/settings.json"; then
    echo "  ok    thresholds reach the status line"
else
    echo "  FAIL  thresholds missing from settings.json"; failures=$((failures + 1))
fi
setup "defaults stay off the command"  0 --no-sounds --defaults
if grep -q -- '--warn' "$INST/settings.json"; then
    echo "  FAIL  a default threshold was written"; failures=$((failures + 1))
else
    echo "  ok    defaults leave CC_CONTEXT_* usable"
fi
# The interview is only reached from a terminal, so drive it directly.
if python3 - "$REPO" >/dev/null 2>&1 <<'PY'
import builtins, importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("installer", pathlib.Path(sys.argv[1]) / "install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
answers = iter(["", "150000", "90000", "180000", "n", "", "y"])
builtins.input = lambda prompt="": next(answers)
chosen = installer.interview()
assert chosen == {"statusline": True, "sounds": False, "tabs": True,
                  "kaizen": True, "warn": 150000, "alert": 180000}, chosen
# Enter everywhere must give exactly the documented defaults.
answers = iter([""] * 10)
assert installer.interview() == installer.DEFAULTS
PY
then
    echo "  ok    the interview reads answers"
else
    echo "  FAIL  the interview mis-reads answers"; failures=$((failures + 1))
fi

CLAUDE_CONFIG_DIR="$INST" python3 "$REPO/uninstall.py" >/dev/null 2>&1
if [ ! -e "$INST/skills/kaizen" ]; then
    echo "  ok    uninstall removes the skill"
else
    echo "  FAIL  skill survived uninstall"; failures=$((failures + 1))
fi
rm -rf "$INST"

echo
echo "Idempotence"
IDEM="$(mktemp -d)"
says() {
    local label="$1" want="$2"; shift 2
    local out
    out="$(CLAUDE_CONFIG_DIR="$IDEM" python3 "$REPO/install.py" "$@" </dev/null 2>&1)"
    local code=$?
    case "$out" in
        *"$want"*) printf '  ok    %-34s %s\n' "$label" "$want" ;;
        *) printf '  FAIL  %-34s wanted %s\n' "$label" "$want"
           printf '%s\n' "$out" | sed 's/^/          /'; failures=$((failures + 1)) ;;
    esac
    return $code
}
says "a first install writes"        "created"        --tab-state
says "a second one writes nothing"   "Nothing changed" --tab-state
BEFORE="$(ls "$IDEM" "$IDEM/hooks" | md5sum)"
says "and leaves no backup behind"   "Nothing changed" --tab-state
if [ "$BEFORE" = "$(ls "$IDEM" "$IDEM/hooks" | md5sum)" ]; then
    echo "  ok    no file appears on a no-op"
else
    echo "  FAIL  a no-op run touched the directory"; failures=$((failures + 1))
fi

# An edited file is never overwritten: the installer cannot tell an old version
# from a change made on purpose, so it refuses everything and says what to drop.
echo "# edited by hand" >> "$IDEM/hooks/tab-state.py"
CLAUDE_CONFIG_DIR="$IDEM" python3 "$REPO/install.py" --tab-state </dev/null >/dev/null 2>&1
if [ $? -eq 1 ] && grep -q 'edited by hand' "$IDEM/hooks/tab-state.py"; then
    echo "  ok    an edited file is left alone"
else
    echo "  FAIL  an edited file was overwritten"; failures=$((failures + 1))
fi
says "--replace writes over it"      "replaced"       --tab-state --replace
if grep -q 'edited by hand' "$IDEM/hooks/tab-state.py"; then
    echo "  FAIL  --replace did not replace"; failures=$((failures + 1))
else
    echo "  ok    --replace does replace"
fi

# The README tells you to drop your own WAV in. An install must not undo that.
printf 'MY OWN PING' > "$IDEM/sounds/done.wav"
CLAUDE_CONFIG_DIR="$IDEM" python3 "$REPO/install.py" --tab-state </dev/null >/dev/null 2>&1
if [ "$(cat "$IDEM/sounds/done.wav")" = "MY OWN PING" ]; then
    echo "  ok    a custom sound survives"
else
    echo "  FAIL  a custom sound was regenerated"; failures=$((failures + 1))
fi

CLAUDE_CONFIG_DIR="$IDEM" python3 "$REPO/uninstall.py" >/dev/null 2>&1
out="$(CLAUDE_CONFIG_DIR="$IDEM" python3 "$REPO/uninstall.py" 2>&1)"
case "$out" in
    *"Nothing changed"*) echo "  ok    a second uninstall is a no-op" ;;
    *) echo "  FAIL  uninstall is not idempotent"; failures=$((failures + 1)) ;;
esac
rm -rf "$IDEM"

echo
echo "Tab state"
out="$(printf '%s' '{"cwd":"/tmp/demo","hook_event_name":"Stop"}' | python3 "$REPO/hooks/tab-state.py" idle)"
# terminalSequence must sit at the ROOT of the output: nested inside
# hookSpecificOutput it is dropped in silence, which is a failure no runtime
# reports and no rendering reveals.
if printf '%s' "$out" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'terminalSequence' in d, 'terminalSequence must be top-level'
assert 'hookSpecificOutput' not in d
assert d['terminalSequence'].startswith('\033]0;'), 'must be OSC 0 (allowlisted)'
assert d['terminalSequence'].endswith('\007')
assert 'demo' in d['terminalSequence']
" 2>/dev/null; then
    echo "  ok    top-level OSC 0 terminalSequence"
else
    echo "  FAIL  tab-state output"; failures=$((failures + 1))
fi
out="$(printf '%s' '{"cwd":"/tmp/demo"}' | CC_TAB_IDLE='(idle)' python3 "$REPO/hooks/tab-state.py" idle)"
if printf '%s' "$out" | grep -q '(idle) demo'; then
    echo "  ok    markers overridable via CC_TAB_*"
else
    echo "  FAIL  marker override"; failures=$((failures + 1))
fi

# Parked on a subagent is not your turn: Stop carries background_tasks and
# session_crons precisely so a hook can tell "done" from "paused".
parked() {
    local label="$1" payload="$2" want="$3" out
    out="$(printf '%s' "$payload" | CC_TAB_IDLE='YELLOW' CC_TAB_WORKING='GREEN' \
           python3 "$REPO/hooks/tab-state.py" idle)"
    case "$out" in
        *"$want"*) printf '  ok    %-34s %s\n' "$label" "$want" ;;
        *) printf '  FAIL  %-34s wanted %s, got %s\n' "$label" "$want" "$out"; failures=$((failures + 1)) ;;
    esac
}
parked "an empty registry rests"   \
       '{"cwd":"/tmp/demo","background_tasks":[],"session_crons":[]}' YELLOW
parked "a running subagent stays green" \
       '{"cwd":"/tmp/demo","background_tasks":[{"id":"t1","type":"subagent","status":"running"}],"session_crons":[]}' GREEN
parked "a background shell stays green" \
       '{"cwd":"/tmp/demo","background_tasks":[{"id":"t2","type":"shell","status":"running"}]}' GREEN
parked "a scheduled wakeup stays green" \
       '{"cwd":"/tmp/demo","background_tasks":[],"session_crons":[{"id":"c1","schedule":"* * * * *"}]}' GREEN
parked "a payload without the arrays"  '{"cwd":"/tmp/demo"}' YELLOW

# A subagent fires PostToolBatch on its own loop, and those land after the
# orchestrator's turn is over. Green from a subagent would undo the Stop that
# just rang. Red is left alone: a subagent asking for input is a real block.
sidechain() {
    local label="$1" state="$2" payload="$3" want="$4" out
    out="$(printf '%s' "$payload" | CC_TAB_WORKING='GREEN' CC_TAB_BLOCKED='RED' \
           python3 "$REPO/hooks/tab-state.py" "$state")"
    if [ "$want" = "silent" ] && [ -z "$out" ]; then
        printf '  ok    %-34s nothing\n' "$label"
    elif [ "$want" != "silent" ] && case "$out" in *"$want"*) true ;; *) false ;; esac; then
        printf '  ok    %-34s %s\n' "$label" "$want"
    else
        printf '  FAIL  %-34s wanted %s, got [%s]\n' "$label" "$want" "$out"
        failures=$((failures + 1))
    fi
}
SUB='{"cwd":"/tmp/demo","hook_event_name":"PostToolBatch","agent_id":"a1","agent_type":"Explore"}'
sidechain "a subagent paints no green" working "$SUB" silent
sidechain "a subagent still paints red"  blocked "$SUB" RED
sidechain "the main thread paints green" working \
          '{"cwd":"/tmp/demo","hook_event_name":"PostToolBatch"}' GREEN

# Distinct markers, or the tab strip stops carrying information.
if python3 -c "
import os, subprocess, sys
seen = {}
for state in ('working', 'blocked', 'idle'):
    out = subprocess.run([sys.executable, '$REPO/hooks/tab-state.py', state],
                         input='{\"cwd\":\"/tmp/demo\"}', capture_output=True,
                         text=True).stdout
    seen[state] = out
assert len(set(seen.values())) == 3, seen
"; then
    echo "  ok    three states, three markers"
else
    echo "  FAIL  markers collide"; failures=$((failures + 1))
fi

# A session that ends leaves no marker: the shell repaints its title within
# milliseconds, so the installer must register no SessionEnd handler of ours.
if CLAUDE_CONFIG_DIR="$(mktemp -d)" python3 -c "
import json, os, pathlib, subprocess, sys
target = pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])
subprocess.run([sys.executable, '$REPO/install.py', '--tab-state', '--no-sounds'],
               stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL, check=True)
data = json.loads((target / 'settings.json').read_text())
assert 'SessionEnd' not in data.get('hooks', {}), data['hooks']['SessionEnd']
"; then
    echo "  ok    no SessionEnd handler is added"
else
    echo "  FAIL  a SessionEnd handler came back"; failures=$((failures + 1))
fi

# The rule lives in two files that are installed separately. They must agree.
if python3 - "$REPO" <<'PY'
import importlib.util, pathlib, sys
repo = pathlib.Path(sys.argv[1])
loaded = {}
for name, rel in (("player", "sounds/play.py"), ("tabs", "hooks/tab-state.py")):
    spec = importlib.util.spec_from_file_location(name, repo / rel)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    loaded[name] = module.paused_on_background
cases = [
    ({}, False),
    ({"background_tasks": [], "session_crons": []}, False),
    ({"background_tasks": [{"id": "t", "type": "subagent"}]}, True),
    ({"session_crons": [{"id": "c"}]}, True),
]
for payload, want in cases:
    for name, fn in loaded.items():
        assert fn(payload) is want, (name, payload)
PY
then
    echo "  ok    both hooks share one rule"
else
    echo "  FAIL  the two hooks disagree"; failures=$((failures + 1))
fi

# Nothing fires when the model starts thinking, so green has to be reclaimed at
# the last moment before work resumes. Without these the tab stays red from the
# permission prompt you just answered, all through the answer.
if CLAUDE_CONFIG_DIR="$(mktemp -d)" python3 -c "
import json, os, pathlib, subprocess, sys
target = pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])
run = lambda *a: subprocess.run([sys.executable, '$REPO/install.py', *a],
                                stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL,
                                check=True)
run('--tab-state')
hooks = json.loads((target / 'settings.json').read_text())['hooks']
for event in ('PostToolBatch', 'SubagentStop'):
    args = hooks[event][0]['hooks'][0]['args']
    assert args[0].endswith('tab-state.py') and args[1] == 'working', (event, args)
# And they go when the marker does.
run('--replace')
hooks = json.loads((target / 'settings.json').read_text()).get('hooks', {})
assert 'PostToolBatch' not in hooks and 'SubagentStop' not in hooks, hooks
"; then
    echo "  ok    work resumes on green, and unwires"
else
    echo "  FAIL  return-to-work events"; failures=$((failures + 1))
fi

echo
echo "Compaction is busy time"
# Nothing else moves the marker while a compaction runs: no turn brackets it,
# so without these the tab sits idle for minutes while the model works.
if CLAUDE_CONFIG_DIR="$(mktemp -d)" python3 -c "
import json, os, pathlib, subprocess, sys
target = pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])
subprocess.run([sys.executable, '$REPO/install.py', '--tab-state'],
               stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL, check=True)
hooks = json.loads((target / 'settings.json').read_text())['hooks']

# One hook owns the PreCompact marker, and it is the kaizen one: hooks on an
# event run concurrently, so two of them emitting a sequence would race.
pre = hooks['PreCompact']
assert len(pre) == 1 and len(pre[0]['hooks']) == 1, pre
args = pre[0]['hooks'][0]['args']
assert args[0].endswith('precompact-kaizen.py'), args
assert args[1:3] == ['--marker', str(target / 'hooks' / 'tab-state.py')], args

# The end of a manual compaction only: an automatic one fires mid-turn, and
# the work goes on after it.
post = hooks['PostCompact']
assert len(post) == 1 and post[0]['matcher'] == 'manual', post
ran = [h['args'][0].rsplit('/', 1)[-1] for h in post[0]['hooks']]
assert ran == ['play.py', 'tab-state.py'], ran
assert post[0]['hooks'][1]['args'][1] == 'idle', post
"; then
    echo "  ok    PreCompact and PostCompact are wired"
else
    echo "  FAIL  compaction wiring"; failures=$((failures + 1))
fi

# Leave kaizen out and PreCompact falls back to tab-state, which is then the
# only hook on the event.
if CLAUDE_CONFIG_DIR="$(mktemp -d)" python3 -c "
import json, os, pathlib, subprocess, sys
target = pathlib.Path(os.environ['CLAUDE_CONFIG_DIR'])
subprocess.run([sys.executable, '$REPO/install.py', '--no-kaizen', '--tab-state'],
               stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL, check=True)
hooks = json.loads((target / 'settings.json').read_text())['hooks']
args = hooks['PreCompact'][0]['hooks'][0]['args']
assert args[0].endswith('tab-state.py') and args[1] == 'working', args
"; then
    echo "  ok    no kaizen, tab-state takes PreCompact"
else
    echo "  FAIL  PreCompact fallback"; failures=$((failures + 1))
fi

# Green while it runs, red when it is held back: the marker follows the
# decision, and the decision is made in this one script.
KZ="$REPO/hooks/precompact-kaizen.py"
TS="$REPO/hooks/tab-state.py"
STATE="$(mktemp -d)"
PAYLOAD='{"hook_event_name":"PreCompact","trigger":"manual","cwd":"/tmp/demo"}'
compaction() {
    local label="$1" payload="$2" want_exit="$3" want="$4" out code
    out="$(printf '%s' "$payload" | CLAUDE_CONFIG_DIR="$STATE" \
           CC_TAB_WORKING='GREEN' CC_TAB_BLOCKED='RED' \
           python3 "$KZ" --marker "$TS" 2>/dev/null)"
    code=$?
    case "$out" in
        *"$want"*) [ "$code" = "$want_exit" ] && ok=1 || ok=0 ;;
        *) ok=0 ;;
    esac
    if [ "$ok" = 1 ]; then
        printf '  ok    %-34s exit %s, %s\n' "$label" "$code" "$want"
    else
        printf '  FAIL  %-34s wanted exit %s and %s, got exit %s and %s\n' \
               "$label" "$want_exit" "$want" "$code" "$out"
        failures=$((failures + 1))
    fi
}
compaction "held back, so blocked" "$PAYLOAD" 2 RED
CLAUDE_CONFIG_DIR="$STATE" python3 -c "
import importlib.util, sys
spec = importlib.util.spec_from_file_location('kz', '$KZ')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.STATE_DIR.mkdir(parents=True, exist_ok=True)
m.token_for('/tmp/demo').touch()
"
compaction "token honored, so working" "$PAYLOAD" 0 GREEN
compaction "automatic, so working" '{"trigger":"auto","cwd":"/tmp/demo"}' 0 GREEN

out="$(printf '%s' "$PAYLOAD" | CLAUDE_CONFIG_DIR="$STATE" python3 "$KZ" 2>/dev/null)"
if [ -z "$out" ]; then
    echo "  ok    no --marker, no sequence"
else
    echo "  FAIL  a sequence without --marker: $out"; failures=$((failures + 1))
fi

# No marker is worth a refused compaction, so a broken path stays silent.
out="$(printf '%s' "$PAYLOAD" | CLAUDE_CONFIG_DIR="$STATE" \
       python3 "$KZ" --marker /nowhere/tab-state.py 2>/dev/null)"
code=$?
if [ "$code" = 2 ] && [ -z "$out" ]; then
    echo "  ok    an unreachable marker stays silent"
else
    echo "  FAIL  broken marker path: exit $code, out $out"; failures=$((failures + 1))
fi
rm -rf "$STATE"

echo
if [ $failures -eq 0 ]; then
    echo "All checks passed."
else
    echo "$failures check(s) failed."
    exit 1
fi
