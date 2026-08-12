# ByteBreak

**The entertainment layer for developers.**

Turn AI limits and long waits into 90-second engineering games — in your terminal.

## Install & play

```bash
npm install -g bytebreak
bytebreak
```

```bash
npx bytebreak
```

If you get `EACCES` on global install:

```bash
npm config set prefix ~/.local
export PATH="$HOME/.local/bin:$PATH"
npm install -g bytebreak
```

First run creates `~/.bytebreak`, starts a background daemon, installs shell hooks, and starts a game. No config files to edit. No API keys.

**Version:** see `bytebreak version` (package `0.1.4+`).

## Commands

```bash
bytebreak                 # setup (once) + play
bytebreak -g output-rush  # pick a game
bytebreak -r              # random game
bytebreak -l python       # language
bytebreak games
bytebreak limit           # signal any AI agent hit a limit
bytebreak status
bytebreak doctor
bytebreak settings
bytebreak stop
bytebreak version
```

## Auto-suggest

When a high-signal wait is detected (rate limit, long install, long shell command), ByteBreak shows a tip on your **next shell prompt**:

```text
  ⚡ ByteBreak
  Your AI agent is sleeping 😴
  Rate limit or wait — ready for a 90-second battle?
  → run bytebreak for a 90s battle
```

Works for **any** agent (Grok, Claude, Codex, Gemini, …) — messaging is brand-agnostic.

```bash
bytebreak limit                    # post a tip now
bytebreak settings --set desktopNotify=false
bytebreak settings --set suggestionsEnabled=false
```

Tips appear in the **terminal**, not inside IDE chat UIs. Always-on apps like Cursor IDE are **not** treated as “AI waiting” (avoids spam).

## Games

| ID | Idea |
|----|------|
| `bug-blitz` | Find the bug |
| `output-rush` | Guess the output |
| `sql-sprint` | Optimize the query |
| `docker-dash` | Fix the Dockerfile |
| `git-arena` | Resolve the merge conflict |

## Privacy

Source code is never collected or uploaded. Anonymous play by default. Shell hooks send command basenames only.

## Requirements

- Node.js 20+
- Linux / macOS (Windows: CLI play works; desktop notify best-effort)

## Links

- npm: https://www.npmjs.com/package/bytebreak  
- Source monorepo docs: see repository `README.md` and `docs/`
