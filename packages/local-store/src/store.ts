import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ByteBreakConfigSchema,
  DEFAULT_CONFIG,
  XP_TITLE_THRESHOLDS,
  XP_TITLES,
  type ByteBreakConfig,
  type LocalUserState,
  type XpState,
  type XpTitle,
  type GameResult,
  type DeveloperEvent,
  type UserProfile,
} from '@bytebreak/shared';
import { paths, resolveBytebreakHome } from './paths.js';
import type { GameHistoryRow, LocalStoreOptions, PendingSyncItem, StoreSnapshot } from './types.js';

interface DbFile {
  version: 1;
  config: ByteBreakConfig;
  user: LocalUserState | null;
  xp: XpState;
  history: GameHistoryRow[];
  pendingSync: PendingSyncItem[];
  recentEvents: DeveloperEvent[];
}

function titleForXp(totalXp: number): XpTitle {
  let current: XpTitle = 'Intern';
  for (const title of XP_TITLES) {
    if (totalXp >= XP_TITLE_THRESHOLDS[title]) current = title;
  }
  return current;
}

function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1;
}

function xpToNextTitle(totalXp: number): number {
  const title = titleForXp(totalXp);
  const idx = XP_TITLES.indexOf(title);
  const next = XP_TITLES[idx + 1];
  if (!next) return 0;
  return Math.max(0, XP_TITLE_THRESHOLDS[next] - totalXp);
}

function defaultXp(): XpState {
  return {
    totalXp: 0,
    title: 'Intern',
    streak: 0,
    bestStreak: 0,
    level: 1,
    xpToNextTitle: XP_TITLE_THRESHOLDS.Junior,
  };
}

function createAnonymousUser(): LocalUserState {
  const id = `anon_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id,
    displayName: `Dev-${id.slice(-4).toUpperCase()}`,
    provider: 'anonymous',
    isAnonymous: true,
    createdAt: now,
    updatedAt: now,
  };
  return { profile };
}

/**
 * Offline-first local store.
 *
 * Uses an atomic JSON document at ~/.bytebreak/bytebreak.db for MVP portability
 * (no native bindings). Schema is versioned; a future migration path can move
 * to better-sqlite3 without changing the public LocalStore API.
 */
export class LocalStore {
  private readonly home: string;
  private readonly dbPath: string;
  private readonly memory: boolean;
  private data: DbFile;

  constructor(options: LocalStoreOptions = {}) {
    this.home = resolveBytebreakHome(options.home);
    this.dbPath = paths(this.home).db;
    this.memory = options.memory ?? false;
    this.data = {
      version: 1,
      config: { ...DEFAULT_CONFIG },
      user: null,
      xp: defaultXp(),
      history: [],
      pendingSync: [],
      recentEvents: [],
    };
  }

  async open(): Promise<void> {
    if (!this.memory) {
      mkdirSync(this.home, { recursive: true });
      mkdirSync(paths(this.home).data, { recursive: true });
      mkdirSync(paths(this.home).cache, { recursive: true });
      mkdirSync(paths(this.home).plugins, { recursive: true });
      mkdirSync(paths(this.home).hooks, { recursive: true });
    }

    if (!this.memory && existsSync(this.dbPath)) {
      try {
        const raw = readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw) as DbFile;
        this.data = {
          version: 1,
          config: ByteBreakConfigSchema.parse(parsed.config ?? {}),
          user: parsed.user ?? null,
          xp: parsed.xp ?? defaultXp(),
          history: parsed.history ?? [],
          pendingSync: parsed.pendingSync ?? [],
          recentEvents: parsed.recentEvents ?? [],
        };
      } catch {
        // Corrupt DB — keep defaults; doctor can report
      }
    }

    if (!this.data.user) {
      this.data.user = createAnonymousUser();
      await this.flush();
    }

    // Persist config file for human inspection
    if (!this.memory) {
      const cfgPath = paths(this.home).config;
      if (!existsSync(cfgPath)) {
        writeFileSync(cfgPath, JSON.stringify(this.data.config, null, 2), 'utf8');
      }
    }
  }

  private async flush(): Promise<void> {
    if (this.memory) return;
    const tmp = `${this.dbPath}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    renameSync(tmp, this.dbPath);
  }

  getConfig(): ByteBreakConfig {
    return this.data.config;
  }

  async setConfig(partial: Partial<ByteBreakConfig>): Promise<ByteBreakConfig> {
    const next = ByteBreakConfigSchema.parse({
      ...this.data.config,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
    this.data.config = next;
    if (!this.memory) {
      writeFileSync(paths(this.home).config, JSON.stringify(next, null, 2), 'utf8');
    }
    await this.flush();
    return next;
  }

  getUser(): LocalUserState {
    if (!this.data.user) {
      this.data.user = createAnonymousUser();
    }
    return this.data.user;
  }

  async setUser(user: LocalUserState): Promise<void> {
    this.data.user = user;
    await this.flush();
  }

  async clearAuth(): Promise<void> {
    // Keep anonymous identity if clearing cloud session
    this.data.user = createAnonymousUser();
    await this.flush();
  }

  getXp(): XpState {
    return this.data.xp;
  }

  async awardXp(amount: number, reason: string, meta?: { gameId?: string; sessionId?: string }) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let { streak, bestStreak, lastPlayedDate, totalXp } = this.data.xp;

    if (lastPlayedDate !== today) {
      if (lastPlayedDate) {
        const prev = new Date(lastPlayedDate);
        const diffDays = Math.floor((now.getTime() - prev.getTime()) / 86_400_000);
        streak = diffDays === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      lastPlayedDate = today;
      bestStreak = Math.max(bestStreak, streak);
    }

    const multipliers: Record<string, number> = {};
    if (streak >= 3) multipliers.streak = 1 + Math.min(streak, 14) * 0.05;

    let finalAmount = amount;
    for (const m of Object.values(multipliers)) finalAmount = Math.round(finalAmount * m);

    totalXp += finalAmount;
    const title = titleForXp(totalXp);
    this.data.xp = {
      totalXp,
      title,
      streak,
      bestStreak,
      lastPlayedDate,
      level: levelForXp(totalXp),
      xpToNextTitle: xpToNextTitle(totalXp),
    };

    const syncItem: PendingSyncItem = {
      id: randomUUID(),
      kind: 'xp',
      payload: {
        amount: finalAmount,
        reason,
        multipliers,
        ...meta,
        awardedAt: now.toISOString(),
      },
      createdAt: now.toISOString(),
      attempts: 0,
    };
    this.data.pendingSync.push(syncItem);
    await this.flush();
    return { xp: this.data.xp, awarded: finalAmount, multipliers };
  }

  async recordGameResult(result: GameResult): Promise<GameHistoryRow> {
    const row: GameHistoryRow = {
      id: result.sessionId,
      gameId: result.gameId,
      mode: result.mode,
      result,
      createdAt: result.finishedAt,
      synced: false,
    };
    this.data.history.unshift(row);
    // Cap history locally
    if (this.data.history.length > 500) {
      this.data.history = this.data.history.slice(0, 500);
    }
    this.data.pendingSync.push({
      id: randomUUID(),
      kind: 'game_result',
      payload: result,
      createdAt: result.finishedAt,
      attempts: 0,
    });
    await this.flush();
    return row;
  }

  listHistory(limit = 50): GameHistoryRow[] {
    return this.data.history.slice(0, limit);
  }

  async pushEvent(event: DeveloperEvent): Promise<void> {
    this.data.recentEvents.unshift(event);
    if (this.data.recentEvents.length > 100) {
      this.data.recentEvents = this.data.recentEvents.slice(0, 100);
    }
    await this.flush();
  }

  listEvents(limit = 20): DeveloperEvent[] {
    return this.data.recentEvents.slice(0, limit);
  }

  listPendingSync(): PendingSyncItem[] {
    return [...this.data.pendingSync];
  }

  async markSynced(ids: string[]): Promise<void> {
    const set = new Set(ids);
    this.data.pendingSync = this.data.pendingSync.filter((p) => !set.has(p.id));
    for (const h of this.data.history) {
      if (set.has(h.id)) h.synced = true;
    }
    await this.flush();
  }

  snapshot(): StoreSnapshot {
    return {
      config: this.data.config,
      user: this.data.user,
      xp: this.data.xp,
      history: this.data.history,
      pendingSync: this.data.pendingSync,
      recentEvents: this.data.recentEvents,
    };
  }

  getHome(): string {
    return this.home;
  }

  /** Plugin-isolated data directory */
  pluginDataDir(pluginId: string): string {
    const dir = join(paths(this.home).data, 'plugins', pluginId);
    if (!this.memory) mkdirSync(dir, { recursive: true });
    return dir;
  }
}
