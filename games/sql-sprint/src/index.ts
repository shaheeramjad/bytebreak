import { defineGame } from '@bytebreak/plugin-sdk';
import type {
  Game,
  GameInitializeOptions,
  GameManifest,
  GameResult,
  GameScore,
  GameState,
  GameSubmission,
} from '@bytebreak/shared';

const MANIFEST: GameManifest = {
  id: 'sql-sprint',
  name: 'SQL Sprint',
  description: 'Spot the anti-pattern and pick the optimized query.',
  version: '0.1.0',
  entry: '@bytebreak/sql-sprint',
  tags: ['sql', 'performance'],
  languages: ['sql'],
  modes: ['solo', 'practice', '1v1'],
  defaultDurationSec: 90,
};

const PUZZLE = {
  schema: `users(id PK, email UNIQUE, created_at)
orders(id PK, user_id FK, total, created_at)`,
  slow: `SELECT * FROM users u
WHERE u.id IN (
  SELECT o.user_id FROM orders o WHERE o.total > 100
);`,
  choices: [
    {
      id: 'a',
      sql: `SELECT DISTINCT u.*
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.total > 100;`,
      correct: true,
    },
    {
      id: 'b',
      sql: `SELECT * FROM users WHERE email LIKE '%@%';`,
      correct: false,
    },
    {
      id: 'c',
      sql: `SELECT * FROM orders CROSS JOIN users;`,
      correct: false,
    },
  ],
};

class SqlSprintGame implements Game {
  readonly manifest = MANIFEST;
  private options!: GameInitializeOptions;
  private state!: GameState;
  private scoreCache?: GameScore;

  async initialize(options: GameInitializeOptions): Promise<GameState> {
    this.options = options;
    this.state = {
      sessionId: options.sessionId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + options.durationSec * 1000).toISOString(),
      payload: {
        schema: PUZZLE.schema,
        slow: PUZZLE.slow,
        choices: PUZZLE.choices.map(({ id, sql }) => ({ id, sql })),
      },
    };
    return this.state;
  }

  async play(): Promise<GameState> {
    this.state = { ...this.state, status: 'active' };
    return this.state;
  }

  async submit(submission: GameSubmission): Promise<GameState> {
    const choiceId = String((submission.answer as { choiceId?: string })?.choiceId ?? '');
    const correct = PUZZLE.choices.some((c) => c.id === choiceId && c.correct);
    this.scoreCache = {
      sessionId: this.options.sessionId,
      playerId: submission.playerId,
      points: correct ? 100 : 0,
      accuracy: correct ? 1 : 0,
      speedBonus: correct ? 10 : 0,
      xp: correct ? 55 : 10,
      perfect: correct,
    };
    this.state = { ...this.state, status: 'submitted', payload: { ...this.state.payload, correct } };
    return this.state;
  }

  async finish(): Promise<GameResult> {
    const score = this.scoreCache ?? (await this.score(this.options.user.id));
    return {
      sessionId: this.options.sessionId,
      gameId: MANIFEST.id,
      status: 'finished',
      scores: [score],
      finishedAt: new Date().toISOString(),
      mode: this.options.mode,
    };
  }

  async score(playerId: string): Promise<GameScore> {
    return (
      this.scoreCache ?? {
        sessionId: this.options.sessionId,
        playerId,
        points: 0,
        accuracy: 0,
        speedBonus: 0,
        xp: 5,
        perfect: false,
      }
    );
  }

  async cleanup(): Promise<void> {}
}

export function createSqlSprintPlugin() {
  return defineGame({
    manifest: {
      id: MANIFEST.id,
      name: MANIFEST.name,
      version: MANIFEST.version,
      description: MANIFEST.description,
    },
    createGame: () => new SqlSprintGame(),
  });
}
