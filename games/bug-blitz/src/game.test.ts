import { describe, it, expect } from 'vitest';
import { BugBlitzGame } from './game.js';

describe('BugBlitzGame', () => {
  it('scores correct line selection', async () => {
    const game = new BugBlitzGame();
    const state = await game.initialize({
      sessionId: 's1',
      mode: 'solo',
      language: 'javascript',
      difficulty: 'easy',
      durationSec: 90,
      seed: 'js-off-by-one',
      playerIds: ['p1'],
      user: { id: 'p1', displayName: 'Dev', isAnonymous: true },
    });
    expect(state.status).toBe('pending');
    await game.play();
    const payload = state.payload as { code: string };
    expect(payload.code.length).toBeGreaterThan(0);

    // Submit line 3 which is the classic off-by-one for that puzzle family
    const submitted = await game.submit({
      sessionId: 's1',
      playerId: 'p1',
      answer: { lines: [3], explanation: 'off-by-one' },
      elapsedMs: 5000,
      submittedAt: new Date().toISOString(),
    });
    expect(submitted.status).toBe('submitted');
    const result = await game.finish();
    expect(result.scores[0]?.points).toBeGreaterThan(0);
  });
});
