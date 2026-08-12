# Runtime / CLI (v0.1.4)

The runtime is what users run after `npm install -g bytebreak`.

## Default behavior

```text
bytebreak
  → if first run:
        detect OS / shell / tools
        create ~/.bytebreak
        install shell hooks ($HOME/.bytebreak/hooks/bytebreak.sh)
        start daemon
        create anonymous identity
  → ensure daemon
  → start interactive solo game (default: bug-blitz)
```

## Commands

| Command | Purpose |
|---------|---------|
| `bytebreak` | Setup if needed + play |
| `bytebreak -g <id>` | Game id |
| `bytebreak -l <lang>` | Language |
| `bytebreak -d <sec>` | Duration |
| `bytebreak -r` | Random game |
| `bytebreak play [gameId]` | Explicit play |
| `bytebreak games` | List games |
| `bytebreak limit` | Signal any AI agent limit → post tip |
| `bytebreak status` | Daemon status |
| `bytebreak doctor` | Environment diagnosis |
| `bytebreak settings` | Get/set config |
| `bytebreak plugins` | Detectors + games |
| `bytebreak hooks install\|uninstall` | Shell integration |
| `bytebreak stop` | Stop daemon |
| `bytebreak version` | Version string |
| `bytebreak login` / `logout` | Reserved (cloud not shipped) |
| `bytebreak hook *` | Internal (shell hooks; hidden) |

## Published package layout

```text
bytebreak/
  bin/bytebreak.cjs     # sets BYTEBREAK_DAEMON_PATH → dist/cli.cjs
  dist/cli.cjs          # CLI bundle
  dist/daemon.cjs       # daemon bundle (spawned detached)
```

## Config keys (`bytebreak settings`)

| Key | Default | Meaning |
|-----|---------|---------|
| `suggestionsEnabled` | `true` | Terminal tips |
| `desktopNotify` | `true` | OS notifications on real limits |
| `cooldownSec` | `300` | Per-kind event cooldown |
| `defaultDurationSec` | `90` | Default game length |
| `preferredLanguages` | ts/js/python | Puzzle preference |
| `quietHours` | off | Suppress tips in a time window |

## Shell hooks

- Installed to **`$HOME/.bytebreak/hooks/bytebreak.sh`** (never temp test paths)  
- Sourced from `~/.bashrc` / `~/.zshrc` via `$HOME/.bytebreak/...`  
- On each prompt: show and clear `~/.bytebreak/suggest` if present  
- After long commands (≥5s): `bytebreak hook long-command` (basename only)  

See [../guides/suggestions.md](../guides/suggestions.md).
