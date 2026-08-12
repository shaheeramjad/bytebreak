import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import type { DeveloperEvent } from '@bytebreak/shared';
import { paths } from './paths.js';

export interface PlaySuggestion {
  id: string;
  kind: string;
  title: string;
  message: string;
  source?: string;
  suggestedDurationSec: number;
  createdAt: string;
  /** Preformatted terminal banner (ANSI) */
  banner: string;
}

/**
 * Write a one-shot play suggestion.
 * Shell hooks display this on the next prompt, then delete the file.
 */
export function writeSuggestion(event: DeveloperEvent, home?: string): PlaySuggestion {
  const p = paths(home);
  mkdirSync(p.root, { recursive: true });

  const duration = event.suggestedDurationSec ?? 90;
  // Prefer a clean title; avoid brand-specific clutter in the tip line
  const banner = [
    '',
    `\x1b[35m  ⚡ ByteBreak\x1b[0m`,
    `\x1b[1m  ${event.title}\x1b[0m`,
    `\x1b[2m  ${event.message}\x1b[0m`,
    `\x1b[36m  → run \x1b[1mbytebreak\x1b[0m\x1b[36m for a ${duration}s battle\x1b[0m`,
    '',
  ].join('\n');

  const suggestion: PlaySuggestion = {
    id: event.id,
    kind: event.kind,
    title: event.title,
    message: event.message,
    source: event.source,
    suggestedDurationSec: duration,
    createdAt: event.detectedAt,
    banner,
  };

  const tmp = `${p.suggest}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(suggestion, null, 2), 'utf8');
  renameSync(tmp, p.suggest);
  return suggestion;
}

export function readSuggestion(home?: string): PlaySuggestion | null {
  const file = paths(home).suggest;
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as PlaySuggestion;
  } catch {
    return null;
  }
}

/** Read and remove so the tip only shows once */
export function consumeSuggestion(home?: string): PlaySuggestion | null {
  const file = paths(home).suggest;
  const s = readSuggestion(home);
  if (!s) return null;
  try {
    unlinkSync(file);
  } catch {
    /* ignore */
  }
  return s;
}

export function clearSuggestion(home?: string): void {
  const file = paths(home).suggest;
  if (existsSync(file)) {
    try {
      unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Desktop notification (best-effort). Never throws.
 * Linux: notify-send · macOS: osascript
 */
export function desktopNotifySafe(title: string, body: string): void {
  try {
    if (process.platform === 'linux') {
      const child = spawn('notify-send', ['-a', 'ByteBreak', '-u', 'normal', title, body], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return;
    }
    if (process.platform === 'darwin') {
      const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`;
      const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
      child.unref();
    }
  } catch {
    /* optional */
  }
}
