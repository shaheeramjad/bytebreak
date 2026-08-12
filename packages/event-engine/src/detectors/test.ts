import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';

export const testDetector: EventDetector = {
  id: 'builtin-tests',
  name: 'Test Runners',
  version: '1.0.0',
  kinds: [BuiltinEventKind.TESTS_RUNNING],
  pollIntervalMs: 1000,
  detect(ctx: EventContext) {
    const matches = matchProcess(ctx.processes, [
      /^jest$/i,
      /^vitest$/i,
      /^mocha$/i,
      /^pytest$/i,
      /^go test$/i,
      /^cargo$/i, // cargo test shares binary — still a wait
      /^rspec$/i,
      /^phpunit$/i,
    ]);
    // Avoid double-firing pure cargo build — only when named test runners present
    const runners = matchProcess(ctx.processes, [
      /^jest$/i,
      /^vitest$/i,
      /^mocha$/i,
      /^pytest$/i,
      /^rspec$/i,
      /^phpunit$/i,
      /^node$/i, // often hosts jest/vitest
    ]);
    if (!runners.length && !matches.filter((m) => /jest|vitest|pytest|mocha|rspec/i.test(m.name)).length) {
      return [];
    }
    if (!matchProcess(ctx.processes, [/^jest$/i, /^vitest$/i, /^mocha$/i, /^pytest$/i, /^rspec$/i, /^phpunit$/i]).length) {
      return [];
    }
    return [
      makeEvent({
        kind: BuiltinEventKind.TESTS_RUNNING,
        title: 'Tests are running',
        message: 'Suite in progress. Squeeze in a quick match?',
        source: 'tests',
      }),
    ];
  },
};
