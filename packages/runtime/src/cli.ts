#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import {
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_VERSION,
  IpcMethod,
  type DoctorReport,
  type DaemonStatus,
  type GameManifest,
} from '@bytebreak/shared';
import { LocalStore } from '@bytebreak/local-store';
import { runFirstRun, needsFirstRun } from './first-run.js';
import { ensureDaemon, stopDaemon } from './daemon-control.js';
import { IpcClient } from './ipc-client.js';
import { installShellHooks, uninstallShellHooks } from './hooks.js';
import { startPlaySession, pickRandomGameId } from './play.js';
import { randomUUID } from 'node:crypto';

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

/** Install once if needed, start daemon, start playing. */
async function ensureReadyAndPlay(opts: {
  gameId?: string;
  language?: string;
  durationSec?: number;
  random?: boolean;
} = {}): Promise<void> {
  if (needsFirstRun()) {
    await runFirstRun();
    console.log(chalk.bold('  Starting your first game…'));
    console.log('');
  } else {
    await ensureDaemon();
  }

  const gameId = opts.random
    ? await pickRandomGameId()
    : (opts.gameId ?? 'bug-blitz');

  await startPlaySession({
    gameId,
    language: opts.language ?? 'typescript',
    durationSec: opts.durationSec ?? 90,
    interactive: true,
  });
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('bytebreak')
    .description(`${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`)
    .version(PRODUCT_VERSION, '-V, --version', 'Print version')
    .option('-g, --game <id>', 'Game to play (default: bug-blitz)')
    .option('-l, --language <lang>', 'Puzzle language', 'typescript')
    .option('-d, --duration <sec>', 'Round length in seconds', '90')
    .option('-r, --random', 'Pick a random game', false)
    .action(async (_opts, command) => {
      // Default action only when no subcommand was used
      const opts = command.optsWithGlobals?.() ?? command.opts();
      try {
        await ensureReadyAndPlay({
          gameId: opts.game as string | undefined,
          language: (opts.language as string) ?? 'typescript',
          durationSec: Number(opts.duration ?? 90),
          random: Boolean(opts.random),
        });
      } catch (err) {
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  program
    .command('login')
    .description('Sign in with GitHub (Google/SSO planned). Optional — anonymous play always works.')
    .option('--provider <provider>', 'github|google', 'github')
    .action(async (opts: { provider: string }) => {
      console.log(chalk.yellow('Cloud auth lands in Milestone 4.'));
      console.log(
        chalk.dim(
          `Provider: ${opts.provider}. For now you play anonymously. XP is stored locally and will sync later.`,
        ),
      );
      console.log(chalk.cyan('  → Opening OAuth is a no-op until the API is deployed.'));
      // Scaffold: would open PUBLIC_API_URL/auth/github
      const store = new LocalStore();
      await store.open();
      console.log(chalk.green(`  Playing as ${store.getUser().profile.displayName}`));
    });

  program
    .command('logout')
    .description('Sign out and return to anonymous play')
    .action(async () => {
      const store = new LocalStore();
      await store.open();
      await store.clearAuth();
      console.log(chalk.green('Signed out. Anonymous identity ready.'));
    });

  program
    .command('status')
    .description('Show daemon and runtime status')
    .action(async () => {
      await ensureDaemon();
      const status = await withDaemon((c) => c.request<DaemonStatus & { games?: string[] }>(IpcMethod.STATUS));
      printStatus(status);
    });

  program
    .command('doctor')
    .description('Diagnose environment and installation')
    .action(async () => {
      try {
        await ensureDaemon();
        const report = await withDaemon((c) => c.request<DoctorReport>(IpcMethod.DOCTOR));
        printDoctor(report);
      } catch (err) {
        console.log(chalk.yellow('Daemon unreachable; running local checks…'));
        const { runDoctor } = await import('@bytebreak/daemon');
        const store = new LocalStore();
        await store.open();
        const report = runDoctor({ home: store.getHome(), store });
        printDoctor(report);
        if (err instanceof Error) console.log(chalk.dim(err.message));
      }
    });

  program
    .command('update')
    .description('Check for runtime updates')
    .action(() => {
      console.log(chalk.dim(`Current version: ${PRODUCT_VERSION}`));
      console.log('Auto-update: use npm/pnpm to update the global package:');
      console.log(chalk.cyan('  npm install -g bytebreak@latest'));
      console.log(chalk.cyan('  # or'));
      console.log(chalk.cyan('  npx bytebreak@latest'));
    });

  program
    .command('settings')
    .description('View or update local settings')
    .option('--set <key=value>', 'Set a config key', collect, [] as string[])
    .action(async (opts: { set: string[] }) => {
      await ensureDaemon();
      if (opts.set.length) {
        const partial: Record<string, unknown> = {};
        for (const pair of opts.set) {
          const [k, ...rest] = pair.split('=');
          if (!k) continue;
          const v = rest.join('=');
          partial[k] = coerce(v);
        }
        const cfg = await withDaemon((c) => c.request(IpcMethod.SET_CONFIG, partial));
        console.log(chalk.green('Updated settings:'));
        console.log(JSON.stringify(cfg, null, 2));
      } else {
        const cfg = await withDaemon((c) => c.request(IpcMethod.GET_CONFIG));
        console.log(JSON.stringify(cfg, null, 2));
      }
    });

  program
    .command('plugins')
    .description('List loaded plugins')
    .action(async () => {
      await ensureDaemon();
      const status = await withDaemon((c) =>
        c.request<DaemonStatus & { games?: string[] }>(IpcMethod.STATUS),
      );
      console.log(chalk.bold('Event detectors'));
      for (const d of status.detectors) {
        console.log(`  ${chalk.cyan(d.id)}  ${d.name}  [${d.kinds.join(', ')}]`);
      }
      console.log(chalk.bold('\nGames'));
      const games = await withDaemon((c) => c.request<GameManifest[]>(IpcMethod.LIST_GAMES));
      for (const g of games) {
        console.log(`  ${chalk.cyan(g.id)}  ${g.name} v${g.version}`);
      }
    });

  program
    .command('games')
    .description('List available games')
    .action(async () => {
      await ensureDaemon();
      const games = await withDaemon((c) => c.request<GameManifest[]>(IpcMethod.LIST_GAMES));
      if (!games.length) {
        console.log(chalk.yellow('No games registered.'));
        return;
      }
      for (const g of games) {
        console.log(
          `${chalk.bold.cyan(g.id.padEnd(16))} ${g.name}  ${chalk.dim(g.description)}`,
        );
        console.log(
          chalk.dim(
            `                  languages: ${g.languages.join(', ')} · default ${g.defaultDurationSec}s`,
          ),
        );
      }
    });

  program
    .command('play [gameId]')
    .description('Start a solo game (same as bare `bytebreak`)')
    .option('-l, --language <lang>', 'Language', 'typescript')
    .option('-d, --duration <sec>', 'Duration seconds', '90')
    .option('-r, --random', 'Pick a random game', false)
    .action(async (gameId: string | undefined, opts: { language: string; duration: string; random?: boolean }) => {
      await ensureReadyAndPlay({
        gameId,
        language: opts.language,
        durationSec: Number(opts.duration),
        random: opts.random,
      });
    });

  program
    .command('submit <sessionId>')
    .description('Submit an answer for an active session')
    .option('--lines <lines>', 'Comma-separated line numbers')
    .option('--explain <text>', 'Short explanation')
    .action(async (sessionId: string, opts: { lines?: string; explain?: string }) => {
      const answer = {
        lines: opts.lines?.split(',').map((s) => Number(s.trim())).filter(Boolean) ?? [],
        explanation: opts.explain ?? '',
      };
      const state = await withDaemon((c) =>
        c.request(IpcMethod.SUBMIT_GAME, { sessionId, answer }),
      );
      const finished = await withDaemon((c) =>
        c.request<{
          result: unknown;
          scores: Array<{ points: number; xp: number; perfect: boolean }>;
          xp: { totalXp: number; title: string; streak: number };
          totalAwarded: number;
        }>(IpcMethod.FINISH_GAME, { sessionId }),
      );
      console.log(chalk.green('Submitted.'));
      console.log(JSON.stringify({ state, scores: finished.scores, xp: finished.xp }, null, 2));
    });

  program
    .command('tournament')
    .description('Tournaments (coming soon)')
    .action(() => {
      console.log(chalk.yellow('Tournaments ship after multiplayer matchmaking (post-MVP).'));
      console.log(chalk.dim('Architecture already supports company & community tournaments.'));
    });

  program
    .command('version')
    .description('Print version')
    .action(() => {
      console.log(PRODUCT_VERSION);
    });

  program
    .command('init')
    .description('Run first-time setup')
    .action(async () => {
      await runFirstRun();
    });

  program
    .command('stop')
    .description('Stop the background daemon')
    .action(async () => {
      const ok = await stopDaemon();
      console.log(ok ? chalk.green('Daemon stopped.') : chalk.dim('Daemon was not running.'));
    });

  program
    .command('hooks')
    .description('Manage shell hooks')
    .argument('[action]', 'install|uninstall', 'install')
    .action((action: string) => {
      if (action === 'uninstall') {
        const ok = uninstallShellHooks();
        console.log(ok ? chalk.green('Hooks removed.') : chalk.dim('No hooks found.'));
      } else {
        const r = installShellHooks();
        console.log(chalk.green(`Hooks installed for ${r.shell}`), r.rcFile ?? '');
      }
    });

  // Internal: shell hook callbacks
  const hook = program.command('hook', { hidden: true }).description('Internal shell hook interface');

  hook
    .command('long-command')
    .requiredOption('--name <name>', 'Command basename only')
    .requiredOption('--elapsed <sec>', 'Elapsed seconds')
    .action(async (opts: { name: string; elapsed: string }) => {
      try {
        await ensureDaemon();
        await withDaemon((c) =>
          c.request(IpcMethod.EMIT_EVENT, {
            id: randomUUID(),
            kind: 'LONG_COMMAND',
            severity: 'opportunity',
            title: `${opts.name} is taking a while`,
            message: `Running for ${opts.elapsed}s — jump into a round?`,
            source: opts.name,
            suggestedDurationSec: 90,
            metadata: { elapsedSec: Number(opts.elapsed), via: 'shell-hook' },
            detectedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // Silent — never break the user's shell
      }
    });

  hook
    .command('ai-limit')
    .option('--source <name>', 'Agent label', 'Your AI agent')
    .action(async (opts: { source: string }) => {
      try {
        const label = opts.source || 'Your AI agent';
        await ensureDaemon();
        await withDaemon((c) =>
          c.request(IpcMethod.EMIT_EVENT, {
            id: randomUUID(),
            kind: 'AI_LIMIT_REACHED',
            severity: 'opportunity',
            title: 'Your AI agent is sleeping 😴',
            message: 'Rate limit or wait — ready for a 90-second battle?',
            source: label,
            suggestedDurationSec: 90,
            metadata: { via: 'shell-hook' },
            detectedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* silent */
      }
    });

  hook
    .command('peek')
    .description('Print and clear pending play suggestion (used by shell hooks)')
    .action(async () => {
      try {
        const { consumeSuggestion } = await import('@bytebreak/local-store');
        const s = consumeSuggestion();
        if (s?.banner) {
          process.stdout.write(s.banner);
          if (!s.banner.endsWith('\n')) process.stdout.write('\n');
        }
      } catch {
        /* silent — never break the shell prompt */
      }
    });

  // Public: any agent / user can fire a limit signal
  program
    .command('limit')
    .description('Signal that your AI agent hit a rate limit — suggests a game')
    .option('--source <name>', 'Optional label (default: Your AI agent)', 'Your AI agent')
    .action(async (opts: { source: string }) => {
      try {
        const label = opts.source || 'Your AI agent';
        await ensureDaemon();
        await withDaemon((c) =>
          c.request(IpcMethod.EMIT_EVENT, {
            id: randomUUID(),
            kind: 'AI_LIMIT_REACHED',
            severity: 'opportunity',
            title: 'Your AI agent is sleeping 😴',
            message: 'Rate limit or wait — ready for a 90-second battle?',
            source: label,
            suggestedDurationSec: 90,
            metadata: { via: 'cli-limit' },
            detectedAt: new Date().toISOString(),
          }),
        );
        console.log(chalk.magenta('  ⚡ Suggestion posted.'));
        console.log(chalk.dim('  It will appear on your next shell prompt, or run: bytebreak'));
        console.log('');
      } catch (err) {
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  return program;
}

function printStatus(status: DaemonStatus & { games?: string[]; activeSessions?: number }) {
  console.log('');
  console.log(chalk.bold.magenta(`  ${PRODUCT_NAME}`) + chalk.dim(`  v${status.version}`));
  console.log(chalk.green('  ●') + ' Daemon running' + chalk.dim(`  pid ${status.pid}  ·  up ${formatMs(status.uptimeMs)}`));
  console.log(chalk.dim(`  platform ${status.platform}  ·  shell ${status.shell ?? '?'}`));
  console.log(chalk.dim(`  memory ${status.memoryMb ?? '?'} MB  ·  detectors ${status.detectors.length}`));
  if (status.games) console.log(chalk.dim(`  games: ${status.games.join(', ') || 'none'}`));
  if (status.lastEventAt) console.log(chalk.dim(`  last event: ${status.lastEventAt}`));
  console.log('');
}

function printDoctor(report: DoctorReport) {
  console.log('');
  console.log(chalk.bold(report.healthy ? chalk.green('  Healthy') : chalk.red('  Issues found')));
  console.log('');
  for (const c of report.checks) {
    const icon = c.status === 'pass' ? chalk.green('✓') : c.status === 'warn' ? chalk.yellow('!') : chalk.red('✗');
    console.log(`  ${icon} ${c.name}: ${c.message}`);
    if (c.fix && c.status !== 'pass') console.log(chalk.dim(`      fix: ${c.fix}`));
  }
  console.log('');
  console.log(chalk.dim('  ' + JSON.stringify(report.environment)));
  console.log('');
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function collect(value: string, prev: string[]) {
  prev.push(value);
  return prev;
}

function coerce(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

/** Parse argv — used by package entrypoints only (not on import). */
export async function runCli(argv = process.argv): Promise<void> {
  const program = createCli();
  await program.parseAsync(argv);
}
