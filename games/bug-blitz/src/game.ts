import type {
  Game,
  GameInitializeOptions,
  GameManifest,
  GameResult,
  GameScore,
  GameState,
  GameSubmission,
} from '@bytebreak/shared';
import { selectPuzzle, type BugPuzzle } from './puzzles.js';

export const BUG_BLITZ_MANIFEST: GameManifest = {
  id: 'bug-blitz',
  name: 'Bug Blitz',
  description: 'Find the bug in a snippet before the clock hits zero.',
  version: '0.1.0',
  entry: '@bytebreak/bug-blitz',
  author: 'ByteBreak',
  tags: ['bugs', 'code-review', 'blitz'],
  languages: [
    'javascript',
    'typescript',
    'python',
    'go',
    'rust',
    'java',
    'csharp',
    'sql',
    'docker',
    'yaml',
  ],
  modes: ['solo', 'practice', '1v1', '2v2', 'friends'],
  defaultDurationSec: 90,
  minDurationSec: 45,
  maxDurationSec: 180,
  icon: 'bug',
};

interface BugBlitzPayload {
  title: string;
  language: string;
  code: string;
  hint?: string;
  lineCount: number;
  showHint: boolean;
  result?: {
    correct: boolean;
    selectedLines: number[];
    bugLines: number[];
    explanation: string;
  };
}

export class BugBlitzGame implements Game {
  readonly manifest = BUG_BLITZ_MANIFEST;
  private options!: GameInitializeOptions;
  private puzzle!: BugPuzzle;
  private state!: GameState;
  private submission?: GameSubmission;
  private scoreCache?: GameScore;

  async initialize(options: GameInitializeOptions): Promise<GameState> {
    this.options = options;
    this.puzzle = selectPuzzle(options.language, options.difficulty, options.seed ?? '0');
    const endsAt = new Date(Date.now() + options.durationSec * 1000).toISOString();
    const payload: BugBlitzPayload = {
      title: this.puzzle.title,
      language: this.puzzle.language,
      code: this.puzzle.code,
      lineCount: this.puzzle.code.split('\n').length,
      showHint: false,
      hint: undefined,
    };
    this.state = {
      sessionId: options.sessionId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      endsAt,
      payload: payload as unknown as Record<string, unknown>,
    };
    return this.state;
  }

  async play(): Promise<GameState> {
    this.state = { ...this.state, status: 'active' };
    return this.state;
  }

  async submit(submission: GameSubmission): Promise<GameState> {
    this.submission = submission;
    const answer = submission.answer as {
      lines?: number[];
      explanation?: string;
      requestHint?: boolean;
    };

    if (answer.requestHint) {
      const payload = this.state.payload as unknown as BugBlitzPayload;
      payload.showHint = true;
      payload.hint = this.puzzle.hint;
      this.state = { ...this.state, payload: payload as unknown as Record<string, unknown> };
      return this.state;
    }

    const selected = (answer.lines ?? []).map(Number).filter((n) => n > 0);
    const lineHit = selected.some((l) => this.puzzle.bugLines.includes(l));
    const explanation = (answer.explanation ?? '').toLowerCase();
    const explainHit = this.puzzle.explanations.some((e) => explanation.includes(e.toLowerCase()));
    const correct = lineHit || explainHit;

    const payload = this.state.payload as unknown as BugBlitzPayload;
    payload.result = {
      correct,
      selectedLines: selected,
      bugLines: this.puzzle.bugLines,
      explanation: correct
        ? 'Nice catch!'
        : `Bug was on line(s) ${this.puzzle.bugLines.join(', ')}. Hint was: ${this.puzzle.hint}`,
    };

    this.scoreCache = this.computeScore(correct, submission.elapsedMs, selected);
    this.state = {
      ...this.state,
      status: 'submitted',
      payload: payload as unknown as Record<string, unknown>,
    };
    return this.state;
  }

  async finish(): Promise<GameResult> {
    const playerId = this.options.playerIds[0] ?? this.options.user.id;
    const score =
      this.scoreCache ??
      (await this.score(playerId));
    return {
      sessionId: this.options.sessionId,
      gameId: this.manifest.id,
      status: 'finished',
      scores: [score],
      finishedAt: new Date().toISOString(),
      mode: this.options.mode,
    };
  }

  async score(playerId: string): Promise<GameScore> {
    if (this.scoreCache) return { ...this.scoreCache, playerId };
    return {
      sessionId: this.options.sessionId,
      playerId,
      points: 0,
      accuracy: 0,
      speedBonus: 0,
      xp: 5,
      perfect: false,
    };
  }

  async cleanup(): Promise<void> {
    // no resources
  }

  private computeScore(correct: boolean, elapsedMs: number, selected: number[]): GameScore {
    const playerId = this.options.playerIds[0] ?? this.options.user.id;
    if (!correct) {
      return {
        sessionId: this.options.sessionId,
        playerId,
        points: 0,
        accuracy: 0,
        speedBonus: 0,
        xp: 10,
        perfect: false,
        details: { selected },
      };
    }
    const durationMs = this.options.durationSec * 1000;
    const remaining = Math.max(0, durationMs - elapsedMs);
    const speedBonus = Math.round((remaining / durationMs) * 30);
    const exact =
      selected.length > 0 &&
      selected.every((l) => this.puzzle.bugLines.includes(l)) &&
      selected.length === this.puzzle.bugLines.length;
    const points = exact ? 100 : 80;
    const accuracy = exact ? 1 : 0.8;
    const xp = Math.round(points * 0.6 + speedBonus + (exact ? 20 : 0));
    return {
      sessionId: this.options.sessionId,
      playerId,
      points,
      accuracy,
      speedBonus,
      xp,
      perfect: exact,
      details: { selected, bugLines: this.puzzle.bugLines },
    };
  }
}
