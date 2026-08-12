# ByteBreak architecture (v0.1.4)

Offline-first local platform:

**install CLI → daemon → detect waits → suggest play → solo games → local XP**

## Systems

```text
┌─────────────────────────────────────────────────────────┐
│                    Developer machine                     │
│                                                          │
│  Shell hooks (~/.bashrc)                                 │
│    · long commands → daemon                              │
│    · next prompt → show one-shot tip                     │
│                                                          │
│  ┌──────────┐   Unix socket    ┌────────────────────┐   │
│  │ Runtime  │◄────────────────►│ Daemon             │   │
│  │  (CLI)   │   NDJSON IPC     │  Event engine      │   │
│  └──────────┘                  │  Game engine       │   │
│        │                       │  Local store       │   │
│        │ play / limit          │  Suggest file      │   │
│        ▼                       └────────────────────┘   │
│   Terminal game UI                                        │
│   ~/.bytebreak/  (config, db, hooks, suggest, logs)       │
└─────────────────────────────────────────────────────────┘
```

## Packages

| Package | Role |
|---------|------|
| `bytebreak` | Published npm package (bundled CLI + daemon) |
| `@bytebreak/runtime` | CLI, first-run, hooks, play, `limit` |
| `@bytebreak/daemon` | Background host, IPC, suggestion publisher |
| `@bytebreak/event-engine` | Wait / limit detectors |
| `@bytebreak/game-engine` | Game session lifecycle |
| `@bytebreak/local-store` | Offline XP, history, `suggest` file |
| `@bytebreak/plugin-sdk` | `defineGame` / `defineEventDetector` |
| `@bytebreak/shared` | Types + IPC protocol |
| `games/*` | Built-in game plugins |

## Suggestion policy (anti-spam)

| Signal | Suggest? | Desktop notify? |
|--------|----------|-----------------|
| `AI_LIMIT_REACHED` (limit / marker / `bytebreak limit`) | Yes | Yes (max ~10 min) |
| Long shell command (hooks, ≥5s) | Yes | No |
| npm / pnpm / yarn / docker build | Yes | No |
| AI CLI “thinking” (`AI_WAITING`) | No | No |
| Always-on IDE (`cursor`, VS Code) | Never matched | — |
| Idle | No | No |

Global gap: ≥5 minutes between tips. Per-kind cooldown default: 300s.

Messaging is always generic: **“Your AI agent is sleeping 😴”** (not brand-specific).

## Not in v0.1.4

Cloud API, OAuth, online leaderboards, multiplayer matchmaking, native always-on-top overlay, IDE extensions.

Solo mode only (multiplayer types exist for later).

## Privacy

- No source file collection or upload  
- Process **names** only  
- Shell hooks: command **basename** only  
- Marker files: **presence** only (contents never read)  

## Performance targets

| Metric | Target |
|--------|--------|
| Cold CLI | Aim &lt;100ms where practical |
| Daemon idle | Near-zero CPU (unref’d timers) |
| Game launch | &lt;1s |

See also: [runtime.md](./runtime.md) · [daemon.md](./daemon.md) · [../guides/suggestions.md](../guides/suggestions.md)
