import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';

const NPM = [/^npm$/, /^npm-cli\.js$/i];
const PNPM = [/^pnpm$/, /^pnpm\.cjs$/i];
const YARN = [/^yarn$/, /^yarn\.js$/i];

export const packageManagerDetector: EventDetector = {
  id: 'builtin-package-manager',
  name: 'Package Manager',
  version: '1.0.0',
  kinds: [
    BuiltinEventKind.NPM_INSTALL,
    BuiltinEventKind.PNPM_INSTALL,
    BuiltinEventKind.YARN_INSTALL,
  ],
  pollIntervalMs: 1000,
  detect(ctx: EventContext) {
    const events = [];
    if (matchProcess(ctx.processes, PNPM).length) {
      events.push(
        makeEvent({
          kind: BuiltinEventKind.PNPM_INSTALL,
          title: 'pnpm is working',
          message: 'Dependencies installing — perfect time for a 90-second battle.',
          source: 'pnpm',
          metadata: { tool: 'pnpm' },
        }),
      );
    } else if (matchProcess(ctx.processes, NPM).length) {
      events.push(
        makeEvent({
          kind: BuiltinEventKind.NPM_INSTALL,
          title: 'npm is working',
          message: 'Install in progress. Ready for a quick match?',
          source: 'npm',
          metadata: { tool: 'npm' },
        }),
      );
    } else if (matchProcess(ctx.processes, YARN).length) {
      events.push(
        makeEvent({
          kind: BuiltinEventKind.YARN_INSTALL,
          title: 'yarn is working',
          message: 'Packages resolving — jump into a round?',
          source: 'yarn',
          metadata: { tool: 'yarn' },
        }),
      );
    }
    return events;
  },
};
