import { BuiltinEventKind, PERF, type EventDetector, type EventContext } from '@bytebreak/shared';
import { makeEvent } from './helpers.js';

/** Tracks first-seen time for process pids to detect long-running commands */
const seen = new Map<number, { name: string; firstSeen: number }>();

const INTERESTING = /^(npm|pnpm|yarn|cargo|go|docker|git|make|cmake|gradle|mvn|tsc|webpack|vite|next|turbo|nx|bazel)/i;

export const longCommandDetector: EventDetector = {
  id: 'builtin-long-command',
  name: 'Long Command',
  version: '1.0.0',
  kinds: [BuiltinEventKind.LONG_COMMAND, BuiltinEventKind.COMMAND_RUNNING],
  pollIntervalMs: PERF.DAEMON_IDLE_POLL_MS,
  detect(ctx: EventContext) {
    const now = ctx.now.getTime();
    const live = new Set<number>();
    const events = [];

    for (const p of ctx.processes) {
      if (!INTERESTING.test(p.name)) continue;
      live.add(p.pid);
      const prev = seen.get(p.pid);
      if (!prev) {
        seen.set(p.pid, { name: p.name, firstSeen: now });
        continue;
      }
      const elapsed = now - prev.firstSeen;
      if (elapsed >= PERF.LONG_COMMAND_THRESHOLD_MS) {
        events.push(
          makeEvent({
            kind: BuiltinEventKind.LONG_COMMAND,
            title: `${p.name} is taking a while`,
            message: `Running for ${Math.round(elapsed / 1000)}s — jump into a round?`,
            source: p.name,
            metadata: { pid: p.pid, elapsedMs: elapsed },
          }),
        );
      }
    }

    // GC dead pids
    for (const pid of seen.keys()) {
      if (!live.has(pid)) seen.delete(pid);
    }

    return events;
  },
};
