import { randomUUID } from 'node:crypto';
import type {
  Game,
  GameFactory,
  GameInitializeOptions,
  GameManifest,
  GameMode,
  GameResult,
  GameState,
  GameSubmission,
  GameScore,
  SupportedLanguage,
  GameDifficulty,
} from '@bytebreak/shared';
import { NotFoundError, PluginError } from '@bytebreak/shared';
import { computeXpFromScore } from './xp.js';

export interface ActiveSession {
  sessionId: string;
  gameId: string;
  game: Game;
  state: GameState;
  options: GameInitializeOptions;
  startedAt: number;
}

export interface GameEngineOptions {
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * Hosts game plugins. Supports unlimited registered games.
 * Multiplayer modes are accepted in the API surface; MVP runs solo in-process.
 */
export class GameEngine {
  private readonly factories = new Map<string, GameFactory>();
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly logger: NonNullable<GameEngineOptions['logger']>;

  constructor(options: GameEngineOptions = {}) {
    this.logger = options.logger ?? {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  register(factory: GameFactory): void {
    const game = factory();
    const id = game.manifest.id;
    if (this.factories.has(id)) {
      throw new PluginError(`Game already registered: ${id}`);
    }
    this.factories.set(id, factory);
    this.logger.info('Game registered', { id, name: game.manifest.name });
  }

  listGames(): GameManifest[] {
    return [...this.factories.values()].map((f) => f().manifest);
  }

  getManifest(gameId: string): GameManifest | undefined {
    const f = this.factories.get(gameId);
    return f ? f().manifest : undefined;
  }

  async startGame(input: {
    gameId: string;
    mode?: GameMode;
    language?: SupportedLanguage;
    difficulty?: GameDifficulty;
    durationSec?: number;
    seed?: string;
    user: GameInitializeOptions['user'];
  }): Promise<{ sessionId: string; state: GameState; manifest: GameManifest }> {
    const factory = this.factories.get(input.gameId);
    if (!factory) throw new NotFoundError('Game', input.gameId);

    const game = factory();
    const sessionId = randomUUID();
    const options: GameInitializeOptions = {
      sessionId,
      mode: input.mode ?? 'solo',
      language: input.language ?? game.manifest.languages[0] ?? 'typescript',
      difficulty: input.difficulty ?? 'medium',
      durationSec: input.durationSec ?? game.manifest.defaultDurationSec,
      seed: input.seed ?? randomUUID().slice(0, 8),
      playerIds: [input.user.id],
      user: input.user,
    };

    const state = await game.initialize(options);
    const playing = await game.play();

    this.sessions.set(sessionId, {
      sessionId,
      gameId: input.gameId,
      game,
      state: playing,
      options,
      startedAt: Date.now(),
    });

    this.logger.info('Game started', { sessionId, gameId: input.gameId, mode: options.mode });
    return { sessionId, state: playing, manifest: game.manifest };
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  async submit(sessionId: string, answer: unknown, playerId: string): Promise<GameState> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundError('Session', sessionId);

    const submission: GameSubmission = {
      sessionId,
      playerId,
      answer,
      elapsedMs: Date.now() - session.startedAt,
      submittedAt: new Date().toISOString(),
    };
    const state = await session.game.submit(submission);
    session.state = state;
    return state;
  }

  async finish(sessionId: string): Promise<{ result: GameResult; scores: GameScore[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundError('Session', sessionId);

    const result = await session.game.finish();
    // Enrich XP estimates
    for (const score of result.scores) {
      if (score.xp === 0) {
        score.xp = computeXpFromScore(score, session.options.durationSec);
      }
    }
    await session.game.cleanup();
    this.sessions.delete(sessionId);
    this.logger.info('Game finished', { sessionId, gameId: session.gameId });
    return { result, scores: result.scores };
  }

  async abandon(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.game.cleanup();
    this.sessions.delete(sessionId);
  }

  activeSessionCount(): number {
    return this.sessions.size;
  }
}
