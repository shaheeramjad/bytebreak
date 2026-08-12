import chalk from 'chalk';
import { IpcMethod, type GameManifest } from '@bytebreak/shared';
import { ensureDaemon } from './daemon-control.js';
import { IpcClient } from './ipc-client.js';

export interface PlayOptions {
  gameId?: string;
  language?: string;
  durationSec?: number;
  /** Prefer interactive prompts when TTY */
  interactive?: boolean;
}

type StartResult = {
  sessionId: string;
  state: {
    payload: Record<string, unknown>;
  };
  manifest: GameManifest;
};

async function withDaemon<T>(fn: (client: IpcClient) => Promise<T>): Promise<T> {
  await ensureDaemon();
  const client = new IpcClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}

/**
 * Start a solo game and (on TTY) collect answers interactively.
 * This is the default path after `npm install -g bytebreak` → `bytebreak`.
 */
export async function startPlaySession(options: PlayOptions = {}): Promise<void> {
  const gameId = options.gameId ?? 'bug-blitz';
  const language = options.language ?? 'typescript';
  const durationSec = options.durationSec ?? 90;
  const interactive = options.interactive ?? Boolean(process.stdin.isTTY);

  const started = await withDaemon((c) =>
    c.request<StartResult>(IpcMethod.START_GAME, {
      gameId,
      language,
      durationSec,
      mode: 'solo',
    }),
  );

  printGameBoard(started);

  if (!interactive) {
    console.log(
      chalk.dim(
        `  Non-interactive. Submit with:\n  bytebreak submit ${started.sessionId} --lines 3 --explain "..."`,
      ),
    );
    console.log('');
    return;
  }

  try {
    const answer = await promptForAnswer(gameId, started.state.payload);
    await withDaemon((c) =>
      c.request(IpcMethod.SUBMIT_GAME, {
        sessionId: started.sessionId,
        answer,
      }),
    );
    const finished = await withDaemon((c) =>
      c.request<{
        scores: Array<{ points: number; xp: number; perfect: boolean; details?: unknown }>;
        xp: { totalXp: number; title: string; streak: number };
        totalAwarded: number;
        result: { gameId: string };
      }>(IpcMethod.FINISH_GAME, { sessionId: started.sessionId }),
    );
    printResult(finished);
  } catch (err) {
    console.error(
      chalk.red('  Game error: ') + (err instanceof Error ? err.message : String(err)),
    );
    throw err;
  }
}

function printGameBoard(started: StartResult): void {
  const payload = started.state.payload;
  console.log('');
  console.log(chalk.bold.magenta(`  ${started.manifest.name}`));
  const title = String(payload.title ?? payload.prompt ?? started.manifest.name);
  const language = String(payload.language ?? '');
  console.log(chalk.dim(`  ${title}${language ? ` · ${language}` : ''}`));
  console.log(chalk.dim('  ────────────────────────────────────────'));

  const code = payload.code ?? payload.dockerfile ?? payload.conflict ?? payload.slow;
  if (typeof code === 'string') {
    code.split('\n').forEach((line, i) => {
      console.log(chalk.dim(String(i + 1).padStart(3)) + '  ' + line);
    });
  }

  if (Array.isArray(payload.choices)) {
    console.log('');
    for (const choice of payload.choices as Array<{ id: string; sql?: string }>) {
      console.log(chalk.cyan(`  [${choice.id}]`));
      if (choice.sql) {
        choice.sql.split('\n').forEach((l) => console.log('      ' + l));
      }
    }
  }

  if (Array.isArray(payload.issues)) {
    console.log('');
    console.log(chalk.dim('  Issues (select all that apply):'));
    for (const issue of payload.issues as Array<{ id: string; label: string }>) {
      console.log(`  ${chalk.cyan(issue.id.padEnd(14))} ${issue.label}`);
    }
  }

  if (typeof payload.schema === 'string') {
    console.log(chalk.dim('  Schema:'));
    payload.schema.split('\n').forEach((l) => console.log('  ' + l));
  }

  console.log(chalk.dim('  ────────────────────────────────────────'));
  console.log(chalk.dim(`  Session ${started.sessionId.slice(0, 8)}…`));
  console.log('');
}

async function promptForAnswer(
  gameId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const ask = createAsker();

  try {
    switch (gameId) {
      case 'output-rush': {
        const output = await ask(chalk.cyan('  What does it print? '));
        return { output };
      }
      case 'sql-sprint': {
        const choiceId = await ask(chalk.cyan('  Best choice id (a/b/c): '));
        return { choiceId: choiceId.trim().toLowerCase() };
      }
      case 'docker-dash': {
        const raw = await ask(chalk.cyan('  Issue ids (comma-separated): '));
        return {
          issueIds: raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }
      case 'git-arena': {
        console.log(chalk.dim('  Paste resolved file, then empty line to finish:'));
        const lines: string[] = [];
        while (true) {
          const line = await ask('');
          if (line === '' && lines.length > 0) break;
          if (line === '' && lines.length === 0) continue;
          lines.push(line);
        }
        return { resolved: lines.join('\n') };
      }
      case 'bug-blitz':
      default: {
        void payload;
        const linesRaw = await ask(chalk.cyan('  Bug line number(s), comma-separated: '));
        const explanation = await ask(chalk.cyan('  Short explanation (optional): '));
        return {
          lines: linesRaw
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !Number.isNaN(n) && n > 0),
          explanation,
        };
      }
    }
  } finally {
    ask.close();
  }
}

function createAsker(): {
  (q: string): Promise<string>;
  close: () => void;
} {
  // Non-TTY (piped CI): buffer stdin once so answers are reliable
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    let resolved: string[] | null = null;
    let idx = 0;
    let waiters: Array<() => void> = [];

    const pump = () => {
      for (const w of waiters) w();
      waiters = [];
    };

    process.stdin.on('data', (c) => chunks.push(Buffer.from(c)));
    process.stdin.on('end', () => {
      resolved = Buffer.concat(chunks)
        .toString('utf8')
        .split(/\r?\n/);
      // drop trailing empty from final newline
      if (resolved[resolved.length - 1] === '') resolved.pop();
      pump();
    });
    // If data already ended before listeners (unlikely), still allow
    process.stdin.resume();

    const ask = async (q: string) => {
      process.stdout.write(q);
      if (!resolved) {
        await new Promise<void>((r) => waiters.push(r));
      }
      const line = resolved?.[idx] ?? '';
      idx += 1;
      process.stdout.write(line + '\n');
      return line;
    };
    ask.close = () => {
      try {
        process.stdin.pause();
      } catch {
        /* ignore */
      }
    };
    return ask;
  }

  // Interactive TTY
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const readline = require('node:readline') as typeof import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = Object.assign((q: string) => new Promise<string>((res) => rl.question(q, res)), {
    close: () => rl.close(),
  });
  return ask;
}

function printResult(finished: {
  scores: Array<{ points: number; xp: number; perfect: boolean }>;
  xp: { totalXp: number; title: string; streak: number };
  totalAwarded: number;
}): void {
  const s = finished.scores[0];
  console.log('');
  if (s && s.points > 0) {
    console.log(
      chalk.green.bold(
        `  ✓ +${finished.totalAwarded} XP  ·  ${s.points} pts${s.perfect ? '  ·  PERFECT' : ''}`,
      ),
    );
  } else {
    console.log(chalk.yellow(`  Round over — +${finished.totalAwarded} XP for playing`));
  }
  console.log(
    chalk.dim(
      `  Total XP: ${finished.xp.totalXp} · ${finished.xp.title} · streak ${finished.xp.streak}`,
    ),
  );
  console.log('');
  console.log(chalk.dim('  Play again:  bytebreak'));
  console.log(chalk.dim('  Other games: bytebreak play output-rush | sql-sprint | docker-dash | git-arena'));
  console.log('');
}

/** Pick a random installed game for variety on default `bytebreak` */
export async function pickRandomGameId(): Promise<string> {
  try {
    const games = await withDaemon((c) => c.request<GameManifest[]>(IpcMethod.LIST_GAMES));
    if (!games.length) return 'bug-blitz';
    const i = Math.floor(Math.random() * games.length);
    return games[i]?.id ?? 'bug-blitz';
  } catch {
    return 'bug-blitz';
  }
}
