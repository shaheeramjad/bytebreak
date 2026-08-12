import { describe, it, expect } from 'vitest';
import { GameEngine } from './engine.js';
import type { Game } from '@bytebreak/shared';

function mockFactory(): Game {
  let points = 0;
  return {
    manifest: {
      id: 'mock',
      name: 'Mock',
      description: 'd',
      version: '1.0.0',
      entry: 'mock',
      tags: [],
      languages: ['typescript'],
      modes: ['solo'],
      defaultDurationSec: 90,
    },
    async initialize(opts) {
      return { sessionId: opts.sessionId, status: 'pending', payload: { q: 1 } };
    },
    async play() {
      return { sessionId: 'x', status: 'active', payload: { q: 1 } };
    },
    async submit(s) {
      points = s.answer === 42 ? 100 : 0;
      return { sessionId: s.sessionId, status: 'submitted', payload: {} };
    },
    async finish() {
      return {
        sessionId: 'x',
        gameId: 'mock',
        status: 'finished',
        scores: [
          {
            sessionId: 'x',
            playerId: 'p1',
            points,
            accuracy: points / 100,
            speedBonus: 10,
            xp: 0,
            perfect: points === 100,
          },
        ],
        finishedAt: new Date().toISOString(),
        mode: 'solo',
      };
    },
    async score(playerId) {
      return {
        sessionId: 'x',
        playerId,
        points,
        accuracy: points / 100,
        speedBonus: 10,
        xp: 0,
        perfect: false,
      };
    },
    async cleanup() {},
  };
}

describe('GameEngine', () => {
  it('runs a solo session end-to-end', async () => {
    const engine = new GameEngine();
    engine.register(() => mockFactory());
    const { sessionId, state } = await engine.startGame({
      gameId: 'mock',
      user: { id: 'p1', displayName: 'Dev', isAnonymous: true },
    });
    expect(state.status).toBe('active');
    await engine.submit(sessionId, 42, 'p1');
    const { result, scores } = await engine.finish(sessionId);
    expect(result.status).toBe('finished');
    expect(scores[0]?.points).toBe(100);
    expect(scores[0]?.xp).toBeGreaterThan(0);
    expect(engine.activeSessionCount()).toBe(0);
  });

  it('lists registered games', () => {
    const engine = new GameEngine();
    engine.register(() => mockFactory());
    expect(engine.listGames().map((g) => g.id)).toContain('mock');
  });
});
