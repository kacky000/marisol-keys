#!/usr/bin/env bash
# Runs every regression script in this folder through headless Chrome and prints each result,
# plus any page exceptions it hit along the way.
# Needs `node serve.ts --port 8137` running in the repository root.
set -euo pipefail
cd "$(dirname "$0")/../.."
for script in tools/regression/*.json; do
  echo "== $(basename "$script" .json)"
  out=$(node tools/cdp-play.mjs "$script" cdp-out)
  echo "$out" | grep -E '^(EXCEPTION|ERROR)' | head -n 3 || true
  echo "$out" | grep -E '^EVAL' | tail -n 1
done
