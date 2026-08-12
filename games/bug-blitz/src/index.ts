import { defineGame } from '@bytebreak/plugin-sdk';
import { BugBlitzGame, BUG_BLITZ_MANIFEST } from './game.js';

export { BugBlitzGame, BUG_BLITZ_MANIFEST };
export { PUZZLES, selectPuzzle } from './puzzles.js';

export function createBugBlitzPlugin() {
  return defineGame({
    manifest: {
      id: 'bug-blitz',
      name: BUG_BLITZ_MANIFEST.name,
      version: BUG_BLITZ_MANIFEST.version,
      description: BUG_BLITZ_MANIFEST.description,
      author: 'ByteBreak',
    },
    createGame: () => new BugBlitzGame(),
  });
}
