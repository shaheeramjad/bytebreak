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
  id: 'git-arena',
  name: 'Git Arena',
  description: 'Resolve the merge conflict correctly.',
  version: '0.1.0',
  entry: '@bytebreak/git-arena',
  tags: ['git', 'merge'],
  languages: ['javascript', 'typescript', 'yaml'],
  modes: ['solo', 'practice', '1v1'],
  defaultDurationSec: 90,
};

const CONFLICT = `function greet(name) {
<<<<<<< HEAD
  return "Hello, " + name;
=======
  return \`Hi, \${name}!\`;
>>>>>>> feature/greet
}`;

const RESOLVED = `function greet(name) {
  return \`Hi, \${name}!\`;
}`;

class GitArenaGame implements Game {
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
        conflict: CONFLICT,
        prompt: 'Paste the correctly resolved file (no conflict markers). Prefer template literal.',
      },
    };
    return this.state;
  }

  async play(): Promise<GameState> {
    this.state = { ...this.state, status: 'active' };
    return this.state;
  }

  async submit(submission: GameSubmission): Promise<GameState> {
    const text = String((submission.answer as { resolved?: string })?.resolved ?? '')
      .replace(/\r\n/g, '\n')
      .trim();
    const hasMarkers = /<<<<<<<|=======|>>>>>>>/.test(text);
    const normalized = text.replace(/\s+/g, ' ');
    const target = RESOLVED.replace(/\s+/g, ' ');
    const correct = !hasMarkers && (normalized === target || text.includes('`Hi, ${name}!`'));
    this.scoreCache = {
      sessionId: this.options.sessionId,
      playerId: submission.playerId,
      points: correct ? 100 : hasMarkers ? 0 : 40,
      accuracy: correct ? 1 : hasMarkers ? 0 : 0.4,
      speedBonus: correct ? 12 : 0,
      xp: correct ? 60 : hasMarkers ? 5 : 20,
      perfect: correct,
    };
    this.state = {
      ...this.state,
      status: 'submitted',
      payload: { ...this.state.payload, correct, expected: RESOLVED },
    };
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

export function createGitArenaPlugin() {
  return defineGame({
    manifest: {
      id: MANIFEST.id,
      name: MANIFEST.name,
      version: MANIFEST.version,
      description: MANIFEST.description,
    },
    createGame: () => new GitArenaGame(),
  });
}
