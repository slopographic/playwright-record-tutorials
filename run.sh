#!/bin/bash
# Starts a virtual screen, records it with ffmpeg (a steady frame rate, the way OBS does), runs the
# walkthrough in a visible Chromium on that screen, then stops the recording.
# Output: /out/slop-pdf-walkthrough.mp4 (H.264, yuv420p, WIDTH x HEIGHT at FPS).
set -euo pipefail

WIDTH="${WIDTH:-1920}"
HEIGHT="${HEIGHT:-1080}"
FPS="${FPS:-60}"
URL="${URL:-https://slopographic.com/pdf/}"
OUT="/out/slop-pdf-walkthrough.mp4"
DISPLAY_NUM=":99"

export DISPLAY="$DISPLAY_NUM"
Xvfb "$DISPLAY_NUM" -screen 0 "${WIDTH}x${HEIGHT}x24" -nolisten tcp >/tmp/xvfb.log 2>&1 &
XVFB_PID=$!
sleep 2

# Capture the whole screen. -preset veryfast keeps up with the 60 fps capture on a CPU-only machine.
ffmpeg -v error -y -f x11grab -framerate "$FPS" -video_size "${WIDTH}x${HEIGHT}" -i "${DISPLAY_NUM}.0+0,0" \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart "$OUT" &
FF_PID=$!
sleep 2

STATUS=0
node /app/slop-pdf-demo.mjs /app/sample.pdf "$URL" || STATUS=$?

# Stop the recording cleanly (SIGINT lets ffmpeg write the file's end), then the virtual screen.
kill -INT "$FF_PID" 2>/dev/null || true
wait "$FF_PID" 2>/dev/null || true
kill "$XVFB_PID" 2>/dev/null || true

if [ -s "$OUT" ]; then
  ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$OUT"
else
  echo "No recording was written." >&2
  STATUS=1
fi
exit "$STATUS"
