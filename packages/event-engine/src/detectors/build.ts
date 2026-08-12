import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';

export const buildDetector: EventDetector = {
  id: 'builtin-build',
  name: 'Build Tools',
  version: '1.0.0',
  kinds: [BuiltinEventKind.CARGO_BUILD, BuiltinEventKind.GO_BUILD, BuiltinEventKind.COMMAND_RUNNING],
  pollIntervalMs: 1000,
  detect(ctx: EventContext) {
    const events = [];
    if (matchProcess(ctx.processes, [/^cargo$/i, /^rustc$/i]).length) {
      events.push(
        makeEvent({
          kind: BuiltinEventKind.CARGO_BUILD,
          title: 'Cargo is compiling',
          message: 'Rust build in flight. Warm up with a blitz?',
          source: 'cargo',
        }),
      );
    }
    // Do not emit GO_BUILD from bare `go` processes — too many false positives.
    return events;
  },
};
