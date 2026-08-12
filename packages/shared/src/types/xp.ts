import type { XpTitle } from '../constants.js';

export interface XpState {
  totalXp: number;
  title: XpTitle;
  /** Current consecutive daily play days */
  streak: number;
  /** Longest streak ever */
  bestStreak: number;
  /** ISO date of last play day (UTC) */
  lastPlayedDate?: string;
  level: number;
  xpToNextTitle: number;
}

export interface XpAward {
  amount: number;
  reason: string;
  gameId?: string;
  sessionId?: string;
  awardedAt: string;
  /** Multipliers applied e.g. streak, first-of-day */
  multipliers: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  title: XpTitle;
  score: number;
  country?: string;
  companyId?: string;
}

export type LeaderboardScope =
  | 'global'
  | 'weekly'
  | 'monthly'
  | 'friends'
  | 'company'
  | 'country'
  | 'language'
  | 'technology';

export interface LeaderboardQuery {
  scope: LeaderboardScope;
  period?: 'weekly' | 'monthly' | 'all_time';
  language?: string;
  technology?: string;
  country?: string;
  companyId?: string;
  limit?: number;
  offset?: number;
}
