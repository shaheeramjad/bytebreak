import { BuiltinEventKind, type EventDetector, type EventContext } from '@bytebreak/shared';
import { matchProcess } from '../process-sample.js';
import { makeEvent } from './helpers.js';

export const dockerDetector: EventDetector = {
  id: 'builtin-docker',
  name: 'Docker',
  version: '1.0.0',
  kinds: [BuiltinEventKind.DOCKER_BUILD],
  pollIntervalMs: 1500,
  detect(ctx: EventContext) {
    const matches = matchProcess(ctx.processes, [/^docker$/i, /^dockerd$/i, /^buildkitd$/i]);
    if (!matches.length) return [];
    // dockerd alone is always on — require docker CLI or buildkit
    const building = matchProcess(ctx.processes, [/^docker$/i, /^buildkitd$/i, /^buildctl$/i]);
    if (!building.length) return [];
    return [
      makeEvent({
        kind: BuiltinEventKind.DOCKER_BUILD,
        title: 'Docker is building',
        message: 'Image build underway. Perfect window for Docker Dash.',
        source: 'docker',
        suggestedDurationSec: 120,
      }),
    ];
  },
};
