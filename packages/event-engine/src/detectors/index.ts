import type { EventDetector } from '@bytebreak/shared';
import { packageManagerDetector } from './package-manager.js';
import { buildDetector } from './build.js';
import { dockerDetector } from './docker.js';
import { gitDetector } from './git.js';
import { testDetector } from './test.js';
import { aiToolDetector } from './ai-tools.js';
import { longCommandDetector } from './long-command.js';
import { idleDetector } from './idle.js';

export function createBuiltinDetectors(): EventDetector[] {
  return [
    packageManagerDetector,
    buildDetector,
    dockerDetector,
    gitDetector,
    testDetector,
    aiToolDetector,
    longCommandDetector,
    idleDetector,
  ];
}
