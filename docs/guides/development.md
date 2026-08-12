# Developer guide (v0.1.4)

## Prerequisites

- Node.js **20+**  
- pnpm **9+**  
- Linux or macOS recommended  

## Setup

```bash
git clone <repo> && cd ByteBreak
pnpm install
pnpm build
```

## Install like a user (local package)

```bash
pnpm install:global
# or:
pnpm --filter bytebreak build
npm install -g ./packages/bytebreak --prefix ~/.local
export PATH="$HOME/.local/bin:$PATH"

bytebreak version
bytebreak doctor
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build packages + games |
| `pnpm bundle` | Bundle publishable `bytebreak` package |
| `pnpm test` | Unit tests (vitest) |
| `pnpm smoke` | CLI smoke (init / status / doctor / games / stop) |
| `pnpm install:global` | Build + global install to user prefix |
| `pnpm doctor` | Runtime doctor via monorepo CLI |

## Dev CLI (without global install)

```bash
pnpm --filter @bytebreak/runtime exec node dist/cli-main.js
pnpm --filter @bytebreak/runtime exec node dist/cli-main.js doctor
pnpm --filter @bytebreak/runtime exec node dist/cli-main.js limit
```

## Testing

See [testing.md](./testing.md).

```bash
pnpm test
pnpm smoke
```

## Version bump & publish

1. Bump `packages/bytebreak/package.json` version  
2. Align `PRODUCT_VERSION` in `packages/shared/src/constants.ts`  
3. Build:

```bash
pnpm install
pnpm build
pnpm --filter bytebreak build
```

4. Publish (new version only — npm rejects re-publish):

```bash
cd packages/bytebreak
npm publish --access public
# 2FA:
npm publish --access public --otp=XXXXXX
```

5. Verify:

```bash
npm view bytebreak version
```

## Layout

```text
packages/   core platform + publishable CLI
games/      built-in game plugins
docs/       architecture + guides + SDK
scripts/    install-global.sh, smoke.sh
```

See root [README.md](../../README.md).
