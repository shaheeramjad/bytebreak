import type { GameMode } from './games.js';

/**
 * Multiplayer architecture is designed from day one.
 * MVP implements Solo only; matchmaking types remain stable for later milestones.
 */
export type MatchStatus =
  | 'queued'
  | 'matched'
  | 'starting'
  | 'in_progress'
  | 'finished'
  | 'cancelled';

export interface MatchPlayer {
  userId: string;
  displayName: string;
  team?: number;
  isReady: boolean;
  isSpectator: boolean;
}

export interface Match {
  id: string;
  mode: GameMode;
  gameId: string;
  status: MatchStatus;
  players: MatchPlayer[];
  spectators: MatchPlayer[];
  seed: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  scope: 'community' | 'company';
  companyId?: string;
  gameIds: string[];
  startsAt: string;
  endsAt: string;
  maxPlayers?: number;
  status: 'upcoming' | 'active' | 'finished';
}
