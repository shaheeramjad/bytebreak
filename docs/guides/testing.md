# Testing ByteBreak (v0.1.4)

## Prerequisites

```bash
export PATH="$HOME/.local/bin:$PATH"
# or
source ~/.bashrc

bytebreak version    # expect 0.1.5+
```

If missing or outdated:

```bash
npm install -g bytebreak@latest --prefix ~/.local
# from monorepo:
# pnpm install:global
```

Refresh hooks after upgrades:

```bash
bytebreak hooks install
source ~/.bashrc
```

---

## 1. Health

```bash
bytebreak doctor
bytebreak status
bytebreak games
```

**Pass:** Healthy, daemon running, 5 games listed.

---

## 2. Auto-suggest (generic agent)

```bash
bytebreak limit
bytebreak hook peek
```

**Pass:**

```text
  ⚡ ByteBreak
  Your AI agent is sleeping 😴
  ...
  → run bytebreak for a 90s battle
```

Or after `bytebreak limit`, press **Enter** in a hooked shell — tip on next prompt.

Optional label:

```bash
bytebreak limit --source "Grok"
```

Title still uses the generic **Your AI agent** wording.

---

## 3. Play

```bash
bytebreak
```

Or scripted:

```bash
printf '1\nmutable default\n' | bytebreak -l python
```

**Pass:** puzzle shown, XP awarded.

Other games:

```bash
bytebreak -g output-rush
bytebreak -r
```

---

## 4. No spam check

With Cursor/IDE open and no real limit:

```bash
rm -f ~/.bytebreak/suggest
bytebreak doctor
sleep 5
test ! -f ~/.bytebreak/suggest && echo "OK: no random tip"
```

**Pass:** no suggest file created just because the IDE is running.

---

## 5. Daemon lifecycle

```bash
bytebreak status
bytebreak stop
bytebreak doctor   # starts again if needed
```

---

## 6. Fresh-user simulation

```bash
export PATH="$HOME/.local/bin:$PATH"
export BYTEBREAK_HOME=/tmp/bb-test-$$
rm -rf "$BYTEBREAK_HOME"

bytebreak doctor
bytebreak limit
bytebreak hook peek
printf '1\nmutable default\n' | bytebreak -l python
bytebreak stop
rm -rf "$BYTEBREAK_HOME"
```

Note: shell hooks always install against **real** `$HOME/.bytebreak` (not temp homes), so they stay valid after tests.

---

## Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Version | `bytebreak version` | `0.1.5`+ |
| Health | `bytebreak doctor` | Healthy |
| Suggest | `limit` + `hook peek` | Generic agent tip |
| Play | `bytebreak` | Game + XP |
| No spam | idle with IDE open | No tip |
| Stop | `bytebreak stop` | Daemon exits |
