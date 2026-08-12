import { describe, it, expect } from 'vitest';
import { defineGame, defineEventDetector, PluginRegistry } from './index.js';
import type { Game, DeveloperEvent, EventContext } from '@bytebreak/shared';
import { DEFAULT_CONFIG } from '@bytebreak/shared';

function mockGame(id: string): Game {
  return {
    manifest: {
      id,
      name: id,
      description: 'test',
      version: '0.0.1',
      entry: id,
      tags: [],
      languages: ['typescript'],
      modes: ['solo'],
      defaultDurationSec: 90,
    },
    async initialize() {
      return { sessionId: 's', status: 'pending', payload: {} };
    },
    async play() {
      return { sessionId: 's', status: 'active', payload: {} };
    },
    async submit() {
      return { sessionId: 's', status: 'submitted', payload: {} };
    },
    async finish() {
      return {
        sessionId: 's',
        gameId: id,
        status: 'finished',
        scores: [],
        finishedAt: new Date().toISOString(),
        mode: 'solo',
      };
    },
    async score() {
      return {
        sessionId: 's',
        playerId: 'p',
        points: 0,
        accuracy: 0,
        speedBonus: 0,
        xp: 0,
        perfect: false,
      };
    },
    async cleanup() {},
  };
}

describe('PluginRegistry', () => {
  it('loads game and event plugins', async () => {
    const registry = new PluginRegistry();
    const ctx = {
      config: DEFAULT_CONFIG,
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      dataDir: '/tmp/bb-test',
    };

    const gamePlugin = defineGame({
      manifest: { id: 'test-game', name: 'Test Game', version: '1.0.0' },
      createGame: () => mockGame('test-game'),
    });

    const eventPlugin = defineEventDetector({
      manifest: { id: 'test-event', name: 'Test Event', version: '1.0.0' },
      detector: {
        id: 'test-detector',
        name: 'Test',
        version: '1.0.0',
        kinds: ['IDLE'],
        pollIntervalMs: 1000,
        detect(_ctx: EventContext): DeveloperEvent[] {
          return [];
        },
      },
    });

    await registry.load(gamePlugin, ctx);
    await registry.load(eventPlugin, ctx);

    expect(registry.listGames()).toHaveLength(1);
    expect(registry.listDetectors()).toHaveLength(1);
    expect(registry.getGame('test-game')).toBeDefined();
  });

  it('rejects duplicate plugin ids', async () => {
    const registry = new PluginRegistry();
    const ctx = {
      config: DEFAULT_CONFIG,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      dataDir: '/tmp/bb-test',
    };
    const p = defineGame({
      manifest: { id: 'dup', name: 'Dup', version: '1.0.0' },
      createGame: () => mockGame('dup'),
    });
    await registry.load(p, ctx);
    await expect(registry.load(p, ctx)).rejects.toThrow(/already loaded/);
  });
});
