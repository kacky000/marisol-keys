#!/usr/bin/env bash
# Runs every regression script in this folder through headless Chrome and prints each result.
# Needs `node serve.ts --port 8137` running in the repository root.
set -euo pipefail
cd "$(dirname "$0")/../.."
for script in tools/regression/*.json; do
  echo "== $(basename "$script" .json)"
  node tools/cdp-play.mjs "$script" cdp-out | grep -E '^(EVAL|EXCEPTION|ERROR)' | tail -n 1
done
