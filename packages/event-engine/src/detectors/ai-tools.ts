import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Display name for any coding agent — brand-agnostic */
export const AGENT_LABEL = 'Your AI agent';

/**
 * Detect AI CLI agents and rate-limit markers.
 * Messaging is always generic ("Your AI agent") so it fits Claude, Codex,
 * Grok, Gemini, Cursor agent, etc.
 *
 * Never match always-on IDE binaries (e.g. Cursor.app) — they spam tips.
 */
export const aiToolDetector: EventDetector = {
  id: 'builtin-ai-tools',
  name: 'AI Coding Tools',
  version: '1.2.0',
  kinds: [BuiltinEventKind.AI_WAITING, BuiltinEventKind.AI_LIMIT_REACHED],
  pollIntervalMs: 5_000,
  detect(ctx: EventContext) {
    const events = [];

    // Explicit env signal when any agent hits a limit
    if (
      process.env.BYTEBREAK_AI_LIMIT === '1' ||
      process.env.CLAUDE_RATE_LIMIT ||
      process.env.CODEX_RATE_LIMIT ||
      process.env.GROK_RATE_LIMIT ||
      process.env.GEMINI_RATE_LIMIT
    ) {
      events.push(limitEvent(process.env.BYTEBREAK_AI_SOURCE || AGENT_LABEL, 'env'));
      return events;
    }

    const home = homedir();
    // Marker files — presence only. Source shown as generic agent label.
    const limitMarkers = [
      join(home, '.claude', 'rate-limit'),
      join(home, '.claude', 'rate_limit'),
      join(home, '.codex', 'rate-limit'),
      join(home, '.codex', 'rate_limit'),
      join(home, '.grok', 'rate-limit'),
      join(home, '.xai', 'rate-limit'),
      join(home, '.gemini', 'rate-limit'),
      join(home, '.bytebreak', 'triggers', 'ai-limit'),
    ];
    for (const path of limitMarkers) {
      if (existsSync(path)) {
        events.push(limitEvent(AGENT_LABEL, 'marker'));
        return events;
      }
    }

    // Transient AI CLI processes (not IDE apps)
    const aiCliProcs = matchProcess(ctx.processes, [
      /^claude$/i,
      /^codex$/i,
      /^gemini$/i,
      /^aider$/i,
      /^grok$/i,
      /^cursor-agent$/i,
    ]);

    if (aiCliProcs.length) {
      events.push(
        makeEvent({
          kind: BuiltinEventKind.AI_WAITING,
          title: `${AGENT_LABEL} is thinking`,
          message: 'Agent is busy.',
          source: AGENT_LABEL,
          severity: 'info',
          metadata: {
            process: aiCliProcs[0]?.name,
            suggest: false,
          },
        }),
      );
    }

    void ctx.tools;
    return events;
  },
};

function limitEvent(source: string, via: string) {
  return makeEvent({
    kind: BuiltinEventKind.AI_LIMIT_REACHED,
    title: `${AGENT_LABEL} is sleeping 😴`,
    message: 'Rate limit or wait — perfect time for a 90-second battle.',
    source: source || AGENT_LABEL,
    severity: 'opportunity',
    suggestedDurationSec: 90,
    metadata: { via },
  });
}
