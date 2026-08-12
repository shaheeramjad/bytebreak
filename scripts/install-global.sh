#!/usr/bin/env bash
# Build the monorepo, bundle the npm package, install globally.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"
cd "$ROOT"

echo "==> Building monorepo packages"
pnpm --filter @bytebreak/shared build
pnpm --filter @bytebreak/plugin-sdk build
pnpm --filter @bytebreak/local-store build
pnpm --filter @bytebreak/event-engine build
pnpm --filter @bytebreak/game-engine build
pnpm --filter './games/*' build
pnpm --filter @bytebreak/daemon build
pnpm --filter @bytebreak/runtime build

echo "==> Bundling installable package"
pnpm --filter bytebreak build

echo "==> Installing globally (user prefix)"
PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.local}"
mkdir -p "$PREFIX"
npm install -g "$ROOT/packages/bytebreak" --prefix "$PREFIX"

echo ""
echo "✓ Installed. Ensure PATH includes: $PREFIX/bin"
echo "  Then run:  bytebreak"
echo ""
command -v bytebreak && bytebreak version || "$PREFIX/bin/bytebreak" version
