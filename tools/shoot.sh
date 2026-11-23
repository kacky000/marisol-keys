#!/usr/bin/env bash
# Render one frame of the game in headless Chrome: tools/shoot.sh "<query>" <out.png> [budget_ms]
# Needs `node serve.ts --port 8137` running. Prints console errors from the page.
query="$1"; out="$2"; budget="${3:-10000}"
chrome="/c/Program Files/Google/Chrome/Application/chrome.exe"
profile="$(mktemp -d)"
"$chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1280,720 --virtual-time-budget="$budget" --user-data-dir="$profile" \
  --enable-logging=stderr --v=0 --screenshot="$out" "http://localhost:8137/index.html$query" 2>&1 \
  | grep -E "CONSOLE|Uncaught|Error" | grep -v -E "gpu|GPU|dbus|DevTools|Fontconfig" | head -20
rm -rf "$profile"
ls -la "$out" 2>/dev/null | awk '{print $5, $9}'
