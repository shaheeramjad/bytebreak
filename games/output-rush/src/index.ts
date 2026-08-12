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
  id: 'output-rush',
  name: 'Output Rush',
  description: 'Guess what the code prints — race the clock.',
  version: '0.1.0',
  entry: '@bytebreak/output-rush',
  tags: ['output', 'mental-model'],
  languages: ['javascript', 'typescript', 'python', 'go', 'rust'],
  modes: ['solo', 'practice', '1v1'],
  defaultDurationSec: 90,
};

const SNIPPETS: Record<string, { code: string; output: string }> = {
  javascript: {
    code: `console.log(typeof null);
console.log([1,2,3].map(n => n * 2)[1]);`,
    output: 'object\n4',
  },
  typescript: {
    code: `const xs = [1, 2, 3] as const;
console.log(xs.map(x => x + 1).join(','));`,
    output: '2,3,4',
  },
  python: {
    code: `print(bool("False"))
print([i*i for i in range(3)])`,
    output: 'True\n[0, 1, 4]',
  },
  go: {
    code: `fmt.Println(len("go") + cap(make([]int, 0, 3)))`,
    output: '5',
  },
  rust: {
    code: `println!("{}", "hi".len() + vec![1,2].len());`,
    output: '4',
  },
};

class OutputRushGame implements Game {
  readonly manifest = MANIFEST;
  private options!: GameInitializeOptions;
  private expected = '';
  private state!: GameState;
  private scoreCache?: GameScore;

  async initialize(options: GameInitializeOptions): Promise<GameState> {
    this.options = options;
    const lang = options.language in SNIPPETS ? options.language : 'javascript';
    const snip = SNIPPETS[lang] ?? SNIPPETS.javascript!;
    this.expected = snip.output.trim();
    this.state = {
      sessionId: options.sessionId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + options.durationSec * 1000).toISOString(),
      payload: { language: lang, code: snip.code },
    };
    return this.state;
  }

  async play(): Promise<GameState> {
    this.state = { ...this.state, status: 'active' };
    return this.state;
  }

  async submit(submission: GameSubmission): Promise<GameState> {
    const guess = String((submission.answer as { output?: string })?.output ?? '')
      .trim()
      .replace(/\r\n/g, '\n');
    const correct = guess === this.expected;
    const points = correct ? 100 : 0;
    this.scoreCache = {
      sessionId: this.options.sessionId,
      playerId: submission.playerId,
      points,
      accuracy: correct ? 1 : 0,
      speedBonus: correct ? 15 : 0,
      xp: correct ? 60 : 10,
      perfect: correct,
      details: { expected: this.expected, guess },
    };
    this.state = {
      ...this.state,
      status: 'submitted',
      payload: { ...this.state.payload, correct, expected: this.expected },
    };
    return this.state;
  }

  async finish(): Promise<GameResult> {
    const score =
      this.scoreCache ??
      (await this.score(this.options.user.id));
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

export function createOutputRushPlugin() {
  return defineGame({
    manifest: {
      id: MANIFEST.id,
      name: MANIFEST.name,
      version: MANIFEST.version,
      description: MANIFEST.description,
    },
    createGame: () => new OutputRushGame(),
  });
}

export { MANIFEST as OUTPUT_RUSH_MANIFEST };
