# Daemon (v0.1.4)

Long-lived Node process started by the CLI. Low CPU when idle.

## Responsibilities

1. **Event engine** — poll detectors (AI limits, installs, builds, …)  
2. **Game engine** — host solo sessions for built-in games  
3. **IPC server** — Unix socket `~/.bytebreak/daemon.sock` (mode `0600`)  
4. **Local store** — XP, history, config, recent events  
5. **Suggestions** — write `~/.bytebreak/suggest` + optional desktop notify  

## Lifecycle

```text
CLI ensureDaemon
  → if pid live + ping ok → reuse
  → else spawn node dist/daemon.cjs (detached)
  → wait for socket (≤5s)
```

Stop:

```bash
bytebreak stop
```

## Suggestion publishing

On accepted events (and forced `AI_LIMIT_REACHED` from `bytebreak limit`):

- Filter by high-signal kinds (see architecture overview)  
- Rate-limit: ≥5 min between tips, ≥10 min between desktop notifies  
- Desktop notify only for `AI_LIMIT_REACHED`  
- Banner text is brand-agnostic: **Your AI agent is sleeping 😴**  

## Files

| Path | Purpose |
|------|---------|
| `~/.bytebreak/daemon.pid` | Process id |
| `~/.bytebreak/daemon.sock` | IPC |
| `~/.bytebreak/daemon.log` | JSON logs |
| `~/.bytebreak/suggest` | One-shot tip for shell hooks |
| `~/.bytebreak/config.json` | User settings |
| `~/.bytebreak/bytebreak.db` | Offline store |

## Debug

```bash
BYTEBREAK_DAEMON_FOREGROUND=1 BYTEBREAK_LOG_LEVEL=debug \
  node "$(npm root -g)/bytebreak/dist/daemon.cjs"
```

(or path under `~/.local/lib/node_modules/bytebreak/`)
