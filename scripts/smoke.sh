#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"
export BYTEBREAK_HOME="${BYTEBREAK_HOME:-$ROOT/.bytebreak-smoke}"
rm -rf "$BYTEBREAK_HOME"
mkdir -p "$BYTEBREAK_HOME"

CLI="$ROOT/packages/runtime/dist/cli-main.js"
export BYTEBREAK_SKIP_HOOKS=1
echo "== smoke: init =="
node "$CLI" init
echo "== smoke: status =="
node "$CLI" status
echo "== smoke: doctor =="
node "$CLI" doctor
echo "== smoke: games =="
node "$CLI" games
echo "== smoke: stop =="
node "$CLI" stop
echo "OK"
