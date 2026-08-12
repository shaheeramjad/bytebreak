# Plugin SDK (v0.1.4)

Games and event detectors are plugins. Built-in games register at daemon startup.

```bash
# monorepo workspace
pnpm add @bytebreak/plugin-sdk
```

(`@bytebreak/*` workspace packages are not all published separately yet; the user-facing npm package is `bytebreak`.)

## Game plugin

```ts
import { defineGame } from '@bytebreak/plugin-sdk';
import type { Game } from '@bytebreak/shared';

export default defineGame({
  manifest: {
    id: 'my-game',
    name: 'My Game',
    version: '1.0.0',
    description: 'A fun engineering micro-game',
  },
  createGame: (): Game => new MyGame(),
});
```

Implement on `Game`:

| Method | Role |
|--------|------|
| `initialize(options)` | Build puzzle / session state |
| `play()` | Mark active |
| `submit(submission)` | Score answer |
| `finish()` | Final `GameResult` |
| `score(playerId)` | Per-player score |
| `cleanup()` | Release resources |

Supported modes in types include multiplayer, but the host runs **solo** in v0.1.4.

## Event detector plugin

```ts
import { defineEventDetector } from '@bytebreak/plugin-sdk';

export default defineEventDetector({
  manifest: { id: 'my-detector', name: 'My Detector', version: '1.0.0' },
  detector: {
    id: 'my-detector',
    name: 'My Detector',
    version: '1.0.0',
    kinds: ['CUSTOM_WAIT'],
    pollIntervalMs: 2000,
    detect(_ctx) {
      // Never read user source files
      // Set metadata.suggest = false to avoid auto tips
      return [];
    },
  },
});
```

### Suggestion hygiene

- Prefer high-signal events only  
- Use generic user-facing titles when relevant (**Your AI agent**)  
- Set `metadata.suggest = false` for noisy telemetry events  
- Never match always-on IDE process names  

## Rules

1. **No source code access** — process names / signals only  
2. **Unique plugin ids** (kebab-case)  
3. Built-in games are registered by the daemon host  

Loading arbitrary plugins from `~/.bytebreak/plugins` is planned; v0.1.4 ships built-in games only.
