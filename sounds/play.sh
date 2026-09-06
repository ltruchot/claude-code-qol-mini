#!/usr/bin/env bash
# Play a short notification sound for a Claude Code hook.
#
# Two properties matter more than the sound itself:
#
#   Never block. On WSLg the PulseAudio RDP sink can take ~2s to wake from
#   SUSPENDED. A hook that waited on that would delay every turn, so playback
#   is detached into a background subshell and this script returns at once.
#   The subshell form is used rather than setsid, which does not exist on macOS.
#
#   Never fail. A missing file, no audio server, or no player at all must not
#   disturb the session, so every path exits 0.
#
# Any of the extensions below is accepted, so replacing a sound is a matter of
# dropping a file next to this script. Which players can read which format
# differs, hence the two candidate lists.
set -u

dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sounds"
name="${1:-}"

sound=""
for ext in wav ogg flac mp3 m4a aiff aif; do
    if [ -r "$dir/$name.$ext" ]; then
        sound="$dir/$name.$ext"
        break
    fi
done
[ -n "$sound" ] || exit 0

play_with() {
    command -v "$1" >/dev/null 2>&1 || return 1
    ( "$@" "$sound" >/dev/null 2>&1 & ) >/dev/null 2>&1
    exit 0
}

if [ "$(uname -s)" = "Darwin" ]; then
    # afplay reads every format listed above.
    play_with afplay
    exit 0
fi

case "$sound" in
    *.wav|*.ogg|*.flac)
        # libsndfile-based and raw players handle these directly.
        play_with paplay
        play_with pw-play
        play_with aplay -q
        ;;
esac

# Decoders, needed for the compressed formats and a fine fallback for the rest.
play_with ffplay -nodisp -autoexit -loglevel quiet
play_with mpv --really-quiet --no-video
play_with play -q

exit 0
