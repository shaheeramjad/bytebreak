# Auto-suggest guide (v0.1.4)

ByteBreak can nudge you to play when a **high-signal wait** happens. Nudges are optional, rate-limited, and brand-agnostic.

## User-facing copy

```text
  ⚡ ByteBreak
  Your AI agent is sleeping 😴
  Rate limit or wait — ready for a 90-second battle?
  → run bytebreak for a 90s battle
```

“Your AI agent” covers **Grok, Claude, Codex, Gemini, Cursor agent, Aider**, and others. You can pass an optional label with `bytebreak limit --source "Grok"` for metadata; the banner title stays generic.

## How a tip is delivered

1. Daemon accepts an event  
2. Writes `~/.bytebreak/suggest` (JSON + ANSI banner)  
3. Optionally calls `notify-send` / macOS notification (**limits only**)  
4. Shell hook on **next prompt** runs `bytebreak hook peek` → prints banner → deletes file  

## What triggers a tip

| Trigger | How |
|---------|-----|
| Manual | `bytebreak limit` |
| Env | `BYTEBREAK_AI_LIMIT=1` (or tool-specific rate-limit env) |
| Marker file presence | e.g. `~/.bytebreak/triggers/ai-limit`, tool rate-limit files |
| Long shell command | Hooks after ≥5s (basename only) |
| Package install / docker build | Process detectors |

## What does **not** trigger a tip

| Non-trigger | Reason |
|-------------|--------|
| Cursor / VS Code process running | Always-on IDE; would spam |
| Agent “thinking” for a long time | `AI_WAITING` has `suggest: false` |
| Idle time | Too noisy |
| Bare `git` / ambient `go` | False positives |
| IDE chat UI | No shell prompt there |

## Rate limits

| Limit | Value |
|-------|--------|
| Between tips (global) | ≥ 5 minutes |
| Between desktop notifications | ≥ 10 minutes |
| Per event kind (`cooldownSec`) | default **300** seconds |

## Settings

```bash
bytebreak settings --set suggestionsEnabled=true
bytebreak settings --set desktopNotify=true
bytebreak settings --set cooldownSec=300

# quiet mode
bytebreak settings --set desktopNotify=false
bytebreak settings --set suggestionsEnabled=false
```

## Shell hooks health

```bash
# Must point at real home, not /tmp
grep bytebreak ~/.bashrc
# expect: $HOME/.bytebreak/hooks/bytebreak.sh

bytebreak hooks install
source ~/.bashrc
ls ~/.bytebreak/hooks/bytebreak.sh
```

## Integrate from any agent / script

```bash
# when your agent hits a limit:
bytebreak limit

# or:
mkdir -p ~/.bytebreak/triggers
touch ~/.bytebreak/triggers/ai-limit
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No tips ever | `bytebreak hooks install && source ~/.bashrc` |
| Tips only for Claude | Upgrade to ≥0.1.4; use `bytebreak limit` |
| Spam while Cursor open | Upgrade to ≥0.1.2; stop old daemon; `rm -f ~/.bytebreak/suggest` |
| Tips in IDE chat | Not supported — use a terminal |
