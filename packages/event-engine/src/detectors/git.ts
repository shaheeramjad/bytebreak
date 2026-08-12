import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';

export const gitDetector: EventDetector = {
  id: 'builtin-git',
  name: 'Git',
  version: '1.0.0',
  kinds: [BuiltinEventKind.GIT_PULL, BuiltinEventKind.GIT_REBASE],
  pollIntervalMs: 1000,
  detect(ctx: EventContext) {
    const git = matchProcess(ctx.processes, [/^git$/i]);
    if (!git.length) return [];
    // Without argv we can't distinguish pull vs rebase reliably —
    // emit GIT_PULL as the generic long git operation signal.
    // Shell hooks can emit precise kinds via EMIT_EVENT IPC.
    // Ambient `git` processes are too common — do not auto-suggest from sampling.
    // Shell hooks can still emit precise LONG_COMMAND for long git ops.
    return [];
  },
};
