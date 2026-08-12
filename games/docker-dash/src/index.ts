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
  id: 'docker-dash',
  name: 'Docker Dash',
  description: 'Fix the broken Dockerfile before the build finishes.',
  version: '0.1.0',
  entry: '@bytebreak/docker-dash',
  tags: ['docker', 'devops'],
  languages: ['docker'],
  modes: ['solo', 'practice', '1v1'],
  defaultDurationSec: 120,
};

const BROKEN = `FROM node:20
COPY package.json .
RUN npm install
COPY . .
CMD node server.js`;

const ISSUES = [
  { id: 'no-workdir', label: 'Missing WORKDIR' },
  { id: 'npm-ci', label: 'Should use npm ci with lockfile for reproducible builds' },
  { id: 'layer-cache', label: 'Copy source before install kills cache (order matters)' },
  { id: 'non-root', label: 'Runs as root — add USER' },
];

class DockerDashGame implements Game {
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
        dockerfile: BROKEN,
        issues: ISSUES,
        prompt: 'Select all issues present in this Dockerfile.',
      },
    };
    return this.state;
  }

  async play(): Promise<GameState> {
    this.state = { ...this.state, status: 'active' };
    return this.state;
  }

  async submit(submission: GameSubmission): Promise<GameState> {
    const selected = new Set(
      ((submission.answer as { issueIds?: string[] })?.issueIds ?? []) as string[],
    );
    // All listed issues are present except layer-cache wording is subtle —
    // BROKEN does copy package.json first then source after install so cache is OK;
    // mark correct set:
    const correctIds = new Set(['no-workdir', 'npm-ci', 'non-root']);
    let hits = 0;
    let falsePos = 0;
    for (const id of selected) {
      if (correctIds.has(id)) hits += 1;
      else falsePos += 1;
    }
    const accuracy = hits / correctIds.size;
    const points = Math.max(0, Math.round(accuracy * 100 - falsePos * 20));
    this.scoreCache = {
      sessionId: this.options.sessionId,
      playerId: submission.playerId,
      points,
      accuracy,
      speedBonus: points > 60 ? 10 : 0,
      xp: Math.max(10, Math.round(points * 0.5)),
      perfect: hits === correctIds.size && falsePos === 0,
    };
    this.state = {
      ...this.state,
      status: 'submitted',
      payload: { ...this.state.payload, correctIds: [...correctIds], selected: [...selected] },
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

export function createDockerDashPlugin() {
  return defineGame({
    manifest: {
      id: MANIFEST.id,
      name: MANIFEST.name,
      version: MANIFEST.version,
      description: MANIFEST.description,
    },
    createGame: () => new DockerDashGame(),
  });
}
