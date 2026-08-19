#!/usr/bin/env python3
"""Render ByteBreak demo as terminal-style frames → MP4 via ffmpeg."""
from __future__ import annotations

import os
import shutil
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
OUT = ROOT / "bytebreak-demo.mp4"
W, H = 1280, 720
FPS = 30

# Dark product terminal palette
BG = (11, 13, 18)
PANEL = (18, 20, 28)
BORDER = (40, 44, 58)
TEXT = (241, 245, 249)
DIM = (148, 163, 184)
MAGENTA = (192, 132, 252)
CYAN = (56, 189, 248)
GREEN = (74, 222, 128)
YELLOW = (250, 204, 21)


def font(size: int, mono: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
        "/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf",
        "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
    ]
    if not mono:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ] + candidates
    for p in candidates:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def new_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    # subtle gradient bar
    for y in range(6):
        c = 30 + y * 8
        draw.line([(0, y), (W, y)], fill=(c, 20, 50 + y * 10))
    # window chrome
    margin = 40
    draw.rounded_rectangle(
        [margin, 50, W - margin, H - 40],
        radius=16,
        fill=PANEL,
        outline=BORDER,
        width=2,
    )
    # traffic lights
    for i, col in enumerate([(239, 68, 68), (234, 179, 8), (34, 197, 94)]):
        draw.ellipse([margin + 18 + i * 22, 68, margin + 32 + i * 22, 82], fill=col)
    draw.text((margin + 100, 64), "bytebreak — demo", fill=DIM, font=font(16, mono=False))
    return img, draw


def draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[tuple[str, tuple[int, int, int]]],
    start_y: int = 110,
    size: int = 18,
) -> None:
    f = font(size)
    x = 70
    y = start_y
    line_h = size + 8
    for text, color in lines:
        # wrap long lines
        max_chars = 88
        chunks = textwrap.wrap(text, width=max_chars, replace_whitespace=False) or [""]
        for chunk in chunks:
            if y > H - 70:
                return
            draw.text((x, y), chunk, fill=color, font=f)
            y += line_h


def save_scene(name: str, lines: list[tuple[str, tuple[int, int, int]]], hold: float = 2.5) -> list[Path]:
    img, draw = new_canvas()
    draw_lines(draw, lines)
    path = FRAMES / f"{name}.png"
    img.save(path)
    n = max(1, int(hold * FPS))
    paths = []
    for i in range(n):
        p = FRAMES / f"{name}_{i:04d}.png"
        if i == 0:
            shutil.copy(path, p)
        else:
            # hardlink or copy
            if not p.exists():
                try:
                    os.link(path, p)
                except OSError:
                    shutil.copy(path, p)
        paths.append(p)
    return paths


def scene_title() -> list[Path]:
    img, draw = new_canvas()
    draw_lines(
        draw,
        [
            ("", TEXT),
            ("  ByteBreak", MAGENTA),
            ("  The entertainment layer for developers.", TEXT),
            ("", TEXT),
            ("  Steam + Discord + Chess.com", DIM),
            ("  for software engineers.", DIM),
            ("", TEXT),
            ("  $ npm install -g bytebreak", CYAN),
            ("  $ bytebreak", CYAN),
        ],
        start_y=160,
        size=22,
    )
    path = FRAMES / "title.png"
    img.save(path)
    return expand(path, 3.0)


def expand(path: Path, hold: float) -> list[Path]:
    n = max(1, int(hold * FPS))
    out = []
    for i in range(n):
        p = path.parent / f"{path.stem}_{i:04d}.png"
        if not p.exists():
            try:
                os.link(path, p)
            except OSError:
                shutil.copy(path, p)
        out.append(p)
    return out


def main() -> None:
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir(parents=True)

    all_frames: list[Path] = []
    all_frames += scene_title()

    all_frames += save_scene(
        "install",
        [
            ("$ npm install -g bytebreak", CYAN),
            ("", TEXT),
            ("added 1 package in 1s", DIM),
            ("", TEXT),
            ("$ bytebreak doctor", CYAN),
            ("", TEXT),
            ("  Healthy", GREEN),
            ("", TEXT),
            ("  ✓ Node.js: Node v22.23.2", GREEN),
            ("  ✓ Daemon: Running", GREEN),
            ("  ✓ Event engine: 8 detectors loaded", GREEN),
            ("  ✓ AI coding tools: Found: claude-code, codex-cli, grok-cli…", GREEN),
            ("  ✓ Privacy: Source code is never collected or uploaded", GREEN),
            ("", TEXT),
            ("  Zero config. Anonymous play. Offline-first.", DIM),
        ],
        hold=3.5,
    )

    all_frames += save_scene(
        "limit",
        [
            ("# Vibe coding… your AI agent hits a rate limit", DIM),
            ("", TEXT),
            ("$ bytebreak limit", CYAN),
            ("  ⚡ Suggestion posted.", MAGENTA),
            ("", TEXT),
            ("$ # next shell prompt", DIM),
            ("", TEXT),
            ("  ⚡ ByteBreak", MAGENTA),
            ("  Your AI agent is sleeping 😴", TEXT),
            ("  Rate limit or wait — ready for a 90-second battle?", DIM),
            ("  → run bytebreak for a 90s battle", CYAN),
            ("", TEXT),
            ("  Works for Grok · Claude · Codex · Gemini · any agent", DIM),
        ],
        hold=4.5,
    )

    all_frames += save_scene(
        "play",
        [
            ("$ bytebreak -l python", CYAN),
            ("", TEXT),
            ("  Bug Blitz", MAGENTA),
            ("  Mutable default argument · python", DIM),
            ("  ────────────────────────────────────────", DIM),
            ("  1  def append_item(item, items=[]):", TEXT),
            ("  2      items.append(item)", TEXT),
            ("  3      return items", TEXT),
            ("  4", TEXT),
            ("  5  print(append_item(1))", TEXT),
            ("  6  print(append_item(2))", TEXT),
            ("  ────────────────────────────────────────", DIM),
            ("  Bug line number(s): 1", CYAN),
            ("  Short explanation: mutable default", CYAN),
        ],
        hold=4.0,
    )

    all_frames += save_scene(
        "xp",
        [
            ("  ✓ +110 XP  ·  100 pts  ·  PERFECT", GREEN),
            ("  Total XP: 110 · Intern · streak 1", TEXT),
            ("", TEXT),
            ("  Play again:  bytebreak", DIM),
            ("  Other games: output-rush · sql-sprint · docker-dash · git-arena", DIM),
            ("", TEXT),
            ("  Back to coding. Entertainment first.", MAGENTA),
        ],
        hold=3.5,
    )

    all_frames += save_scene(
        "games",
        [
            ("$ bytebreak games", CYAN),
            ("", TEXT),
            ("  bug-blitz      Find the bug", TEXT),
            ("  output-rush    Guess the output", TEXT),
            ("  sql-sprint     Optimize the query", TEXT),
            ("  docker-dash    Fix the Dockerfile", TEXT),
            ("  git-arena      Resolve the merge conflict", TEXT),
            ("", TEXT),
            ("  Languages: JS TS Python Go Rust Java C# SQL Docker YAML", DIM),
        ],
        hold=3.5,
    )

    all_frames += save_scene(
        "end",
        [
            ("", TEXT),
            ("  ByteBreak", MAGENTA),
            ("  The entertainment layer for developers.", TEXT),
            ("", TEXT),
            ("  $ npm install -g bytebreak", CYAN),
            ("  $ npx bytebreak", CYAN),
            ("", TEXT),
            ("  When developers wait — they play.", DIM),
        ],
        hold=3.5,
    )

    # Write concat list of sequential frames for ffmpeg image2
    # Use numbered sequence
    seq_dir = FRAMES / "seq"
    seq_dir.mkdir(exist_ok=True)
    for i, src in enumerate(all_frames):
        dst = seq_dir / f"frame_{i:05d}.png"
        if dst.exists():
            dst.unlink()
        try:
            os.link(src, dst)
        except OSError:
            shutil.copy(src, dst)

    total = len(all_frames)
    duration = total / FPS
    print(f"Rendered {total} frames (~{duration:.1f}s)")

    ffmpeg = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")
    if not os.path.isfile(ffmpeg) or not os.access(ffmpeg, os.X_OK):
        # try npm path
        npm_ff = Path("/tmp/ffbin/node_modules/ffmpeg-static/ffmpeg")
        if npm_ff.is_file():
            ffmpeg = str(npm_ff)
        else:
            print("ERROR: ffmpeg not found — frames saved in", FRAMES)
            print("Install ffmpeg and run:")
            print(
                f'  ffmpeg -y -framerate {FPS} -i {seq_dir}/frame_%05d.png '
                f'-c:v libx264 -pix_fmt yuv420p -crf 18 {OUT}'
            )
            return

    cmd = [
        ffmpeg,
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(seq_dir / "frame_%05d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        str(OUT),
    ]
    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd)
    print("Wrote", OUT, f"({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
