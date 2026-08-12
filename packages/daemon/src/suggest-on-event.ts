import type { ByteBreakConfig, DeveloperEvent } from '@bytebreak/shared';
import {
  writeSuggestion,
  desktopNotifySafe,
  type PlaySuggestion,
} from '@bytebreak/local-store';

/**
 * Only high-signal waits get a tip.
 * Never AI_WAITING (always-on tools) or IDLE (too noisy).
 */
const SUGGEST_KINDS = new Set([
  'AI_LIMIT_REACHED',
  'NPM_INSTALL',
  'PNPM_INSTALL',
  'YARN_INSTALL',
  'DOCKER_BUILD',
  'LONG_COMMAND',
]);

/** Desktop popup only for real limits / explicit signals — not routine builds */
const DESKTOP_NOTIFY_KINDS = new Set(['AI_LIMIT_REACHED']);

/** Global spacing so we never spam (regardless of event kind cooldown) */
const MIN_SUGGEST_GAP_MS = 5 * 60_000; // 5 minutes between any tips
const MIN_DESKTOP_GAP_MS = 10 * 60_000; // 10 minutes between desktop notifies

let lastSuggestAt = 0;
let lastDesktopAt = 0;

export function shouldSuggest(event: DeveloperEvent, config: ByteBreakConfig): boolean {
  if (config.suggestionsEnabled === false) return false;
  if (config.overlayEnabled === false && config.suggestionsEnabled !== true) return false;
  if (config.enabledEvents.length > 0 && !config.enabledEvents.includes(event.kind)) {
    return false;
  }
  // Explicit opt-out from detectors
  if (event.metadata && event.metadata['suggest'] === false) return false;

  if (!SUGGEST_KINDS.has(event.kind)) return false;

  // LONG_COMMAND: only shell-hook signals (user actually waited on a command),
  // not ambient process sampling noise
  if (event.kind === 'LONG_COMMAND') {
    const via = event.metadata?.['via'];
    if (via !== 'shell-hook') return false;
  }

  const now = Date.now();
  if (now - lastSuggestAt < MIN_SUGGEST_GAP_MS) return false;

  return true;
}

export function publishPlaySuggestion(
  event: DeveloperEvent,
  config: ByteBreakConfig,
  home: string,
): PlaySuggestion | null {
  if (!shouldSuggest(event, config)) return null;

  lastSuggestAt = Date.now();
  const suggestion = writeSuggestion(event, home);

  if (
    config.desktopNotify !== false &&
    DESKTOP_NOTIFY_KINDS.has(event.kind) &&
    Date.now() - lastDesktopAt >= MIN_DESKTOP_GAP_MS
  ) {
    lastDesktopAt = Date.now();
    desktopNotifySafe(
      `ByteBreak · ${event.title}`,
      `${event.message} Run: bytebreak`,
    );
  }

  return suggestion;
}

/** Used by tests / doctor */
export function resetSuggestRateLimits(): void {
  lastSuggestAt = 0;
  lastDesktopAt = 0;
}
