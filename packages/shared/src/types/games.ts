import { z } from 'zod';
import type { SupportedLanguage } from '../constants.js';

export const GameModeSchema = z.enum([
  'solo',
  'practice',
  '1v1',
  '2v2',
  'friends',
  'company_tournament',
  'community_tournament',
  'spectator',
]);
export type GameMode = z.infer<typeof GameModeSchema>;

export const GameDifficultySchema = z.enum(['easy', 'medium', 'hard', 'expert']);
export type GameDifficulty = z.infer<typeof GameDifficultySchema>;

export const GameSessionStatusSchema = z.enum([
  'pending',
  'active',
  'submitted',
  'finished',
  'abandoned',
  'error',
]);
export type GameSessionStatus = z.infer<typeof GameSessionStatusSchema>;

export interface GameManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  /** Relative path or package name of the game plugin */
  entry: string;
  author?: string;
  tags: string[];
  languages: SupportedLanguage[];
  modes: GameMode[];
  defaultDurationSec: number;
  minDurationSec?: number;
  maxDurationSec?: number;
  /** Icon identifier or data URI */
  icon?: string;
}

export interface GameInitializeOptions {
  sessionId: string;
  mode: GameMode;
  language: SupportedLanguage;
  difficulty: GameDifficulty;
  durationSec: number;
  seed?: string;
  /** Player ids for multiplayer — solo uses single id */
  playerIds: string[];
  /** Opaque local/cloud user context */
  user: {
    id: string;
    displayName: string;
    isAnonymous: boolean;
  };
}

export interface GameState {
  sessionId: string;
  status: GameSessionStatus;
  startedAt?: string;
  endsAt?: string;
  /** Game-specific view model for the overlay — never includes secrets */
  payload: Record<string, unknown>;
}

export interface GameSubmission {
  sessionId: string;
  playerId: string;
  /** Player answer payload — game-defined */
  answer: unknown;
  elapsedMs: number;
  submittedAt: string;
}

export interface GameScore {
  sessionId: string;
  playerId: string;
  /** Raw points (0–100 typically) */
  points: number;
  /** Correctness ratio 0–1 */
  accuracy: number;
  /** Time bonus component */
  speedBonus: number;
  /** XP awarded (local estimate; cloud may adjust) */
  xp: number;
  perfect: boolean;
  details?: Record<string, unknown>;
}

export interface GameResult {
  sessionId: string;
  gameId: string;
  status: GameSessionStatus;
  scores: GameScore[];
  finishedAt: string;
  mode: GameMode;
}

/**
 * Plugin contract every game must implement.
 * Games run in-process (local) and must not access the network directly.
 */
export interface Game {
  readonly manifest: GameManifest;
  initialize(options: GameInitializeOptions): Promise<GameState>;
  play(): Promise<GameState>;
  submit(submission: GameSubmission): Promise<GameState>;
  finish(): Promise<GameResult>;
  score(playerId: string): Promise<GameScore>;
  cleanup(): Promise<void>;
}

export type GameFactory = () => Game;
