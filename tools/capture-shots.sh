#!/usr/bin/env bash
# Renders every shot listed in shots.json with headless Chrome and saves 1280x720 JPEGs under
# 256 KiB into screenshots/. Needs `node serve.ts --port 8137` running and Python with Pillow.
set -e
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
mkdir -p screenshots
rm -f screenshots/*.jpg screenshots/*.png
node -e "for (const s of JSON.parse(require('fs').readFileSync('shots.json','utf8'))) console.log(s.name + ' ' + s.query)" | tr -d '\r' |
while read -r name query; do
  bash tools/shoot.sh "$query" "$tmp/${name%.*}.png" 20000 > /dev/null
  python tools/to_jpeg.py "$tmp/${name%.*}.png" "screenshots/$name"
done
rm -rf "$tmp"
ls -la screenshots
