# ByteBreak demo assets

## Video

**File:** [`bytebreak-demo.mp4`](./bytebreak-demo.mp4)

| Property | Value |
|----------|--------|
| Duration | ~25 seconds |
| Resolution | 1280×720 |
| Format | H.264 MP4 |
| Style | Terminal product demo (text-accurate frames from real CLI capture) |

### Scenes

1. Title — tagline + install commands  
2. Doctor — healthy zero-config install  
3. AI limit tip — “Your AI agent is sleeping 😴”  
4. Bug Blitz play — Python mutable default puzzle  
5. XP result — +110 XP PERFECT  
6. Games list  
7. End card — `npm install -g bytebreak`  

### Regenerate

```bash
export PATH="/tmp/ffbin/node_modules/ffmpeg-static:$HOME/.local/bin:$PATH"
# or any ffmpeg on PATH
cd demo
python3 render_demo.py
```

### Real CLI capture used as source of truth

See `capture.txt` (from `bytebreak` 0.1.4).

## Preview stills

- `preview-title.png`
- `preview-limit.png`
- `preview-xp.png`

## Logo

Professional lockup and mark for ByteBreak (violet bolt with a mid cut — a “byte break”).

| File | Use |
|------|-----|
| [`logo.png`](./logo.png) | Primary lockup (icon + wordmark, dark) |
| [`logo-light.png`](./logo-light.png) | Lockup on light |
| [`logo-banner.png`](./logo-banner.png) | Lockup + tagline |
| [`logo-icon.png`](./logo-icon.png) | App icon, transparent corners |
| [`logo-wordmark.png`](./logo-wordmark.png) | Wordmark only, dark |
| [`logo-wordmark-light.png`](./logo-wordmark-light.png) | Wordmark only, light |
| [`logo.svg`](./logo.svg) | Vector lockup |
| [`logo-icon.svg`](./logo-icon.svg) | Vector icon |
