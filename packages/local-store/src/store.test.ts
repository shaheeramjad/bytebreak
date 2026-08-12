import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStore } from './store.js';

describe('LocalStore', () => {
  let store: LocalStore;

  beforeEach(async () => {
    store = new LocalStore({ memory: true });
    await store.open();
  });

  it('creates anonymous user on open', () => {
    const user = store.getUser();
    expect(user.profile.isAnonymous).toBe(true);
    expect(user.profile.provider).toBe('anonymous');
    expect(user.profile.id.startsWith('anon_')).toBe(true);
  });

  it('awards XP and updates title', async () => {
    const { xp, awarded } = await store.awardXp(100, 'test');
    expect(awarded).toBeGreaterThanOrEqual(100);
    expect(xp.totalXp).toBe(awarded);
    expect(xp.title).toBe('Intern');
  });

  it('merges config updates', async () => {
    const cfg = await store.setConfig({ defaultDurationSec: 120 });
    expect(cfg.defaultDurationSec).toBe(120);
    expect(store.getConfig().overlayEnabled).toBe(true);
  });

  it('records game history and pending sync', async () => {
    await store.recordGameResult({
      sessionId: 'sess-1',
      gameId: 'bug-blitz',
      status: 'finished',
      scores: [],
      finishedAt: new Date().toISOString(),
      mode: 'solo',
    });
    expect(store.listHistory()).toHaveLength(1);
    expect(store.listPendingSync().some((p) => p.kind === 'game_result')).toBe(true);
  });
});
