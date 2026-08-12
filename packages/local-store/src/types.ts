import type {
  ByteBreakConfig,
  LocalUserState,
  XpState,
  GameResult,
  DeveloperEvent,
} from '@bytebreak/shared';

export interface LocalStoreOptions {
  /** Directory for DB + files (defaults to ~/.bytebreak) */
  home?: string;
  /** Use in-memory store (tests) */
  memory?: boolean;
}

export interface GameHistoryRow {
  id: string;
  gameId: string;
  mode: string;
  result: GameResult;
  createdAt: string;
  synced: boolean;
}

export interface PendingSyncItem {
  id: string;
  kind: 'xp' | 'game_result' | 'achievement' | 'settings';
  payload: unknown;
  createdAt: string;
  attempts: number;
}

export interface StoreSnapshot {
  config: ByteBreakConfig;
  user: LocalUserState | null;
  xp: XpState;
  history: GameHistoryRow[];
  pendingSync: PendingSyncItem[];
  recentEvents: DeveloperEvent[];
}
