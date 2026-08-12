import { BuiltinEventKind, PERF, type EventDetector, type EventContext } from '@bytebreak/shared';
import { makeEvent } from './helpers.js';

let lastActivityAt = Date.now();
let lastIdleEmitAt = 0;

/** Shell hooks should call markActivity() on each command */
export function markActivity(at = Date.now()): void {
  lastActivityAt = at;
}

export const idleDetector: EventDetector = {
  id: 'builtin-idle',
  name: 'Idle',
  version: '1.0.0',
  kinds: [BuiltinEventKind.IDLE],
  pollIntervalMs: 5_000,
  detect(ctx: EventContext) {
    // Any interesting process counts as activity
    const busy = ctx.processes.some((p) =>
      /^(node|python|cargo|go|docker|git|npm|pnpm|yarn|claude|codex)/i.test(p.name),
    );
    if (busy) {
      lastActivityAt = ctx.now.getTime();
      return [];
    }

    const idleFor = ctx.now.getTime() - lastActivityAt;
    if (idleFor < PERF.IDLE_THRESHOLD_MS) return [];

    // Rate-limit idle prompts to once per 10 minutes
    if (ctx.now.getTime() - lastIdleEmitAt < 10 * 60_000) return [];
    lastIdleEmitAt = ctx.now.getTime();

    // Idle is logged only — never auto-suggest (too noisy while coding)
    return [
      makeEvent({
        kind: BuiltinEventKind.IDLE,
        title: 'Quiet moment?',
        message: 'Nothing running.',
        source: 'idle',
        severity: 'info',
        suggestedDurationSec: 90,
        metadata: { idleMs: idleFor, suggest: false },
      }),
    ];
  },
};
