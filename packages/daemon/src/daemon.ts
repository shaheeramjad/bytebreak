import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { PRODUCT_VERSION, IpcMethod, DeveloperEventSchema, type IpcRequest } from '@bytebreak/shared';
import { LocalStore, paths } from '@bytebreak/local-store';
import { EventEngine, detectEnvironment } from '@bytebreak/event-engine';
import { GameEngine } from '@bytebreak/game-engine';
import { PluginRegistry } from '@bytebreak/plugin-sdk';
import { createBugBlitzPlugin } from '@bytebreak/bug-blitz';
import { createOutputRushPlugin } from '@bytebreak/output-rush';
import { createSqlSprintPlugin } from '@bytebreak/sql-sprint';
import { createDockerDashPlugin } from '@bytebreak/docker-dash';
import { createGitArenaPlugin } from '@bytebreak/git-arena';
import { IpcServer } from './ipc-server.js';
import { createLogger, type Logger } from './logger.js';
import { runDoctor } from './doctor.js';
import { publishPlaySuggestion } from './suggest-on-event.js';

export interface DaemonOptions {
  home?: string;
  foreground?: boolean;
}

/**
 * Always-on background process:
 * - Event engine (wait detection)
 * - Game engine (session host)
 * - Local store (offline-first)
 * - IPC server (runtime + overlay clients)
 */
export class Daemon {
  private readonly home: string;
  private readonly p: ReturnType<typeof paths>;
  private readonly logger: Logger;
  private store!: LocalStore;
  private eventEngine!: EventEngine;
  private gameEngine!: GameEngine;
  private plugins!: PluginRegistry;
  private ipc!: IpcServer;
  private startedAt = 0;
  private lastEventAt?: string;
  private shuttingDown = false;

  constructor(options: DaemonOptions = {}) {
    this.home = options.home ?? paths().root;
    this.p = paths(this.home);
    this.logger = createLogger(
      this.p.log,
      process.env.BYTEBREAK_LOG_LEVEL === 'debug' ? 'debug' : 'info',
    );
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();
    this.store = new LocalStore({ home: this.home });
    await this.store.open();

    this.gameEngine = new GameEngine({ logger: this.logger });
    this.plugins = new PluginRegistry();

    // Load built-in game plugins
    const builtinGames = [
      createBugBlitzPlugin(),
      createOutputRushPlugin(),
      createSqlSprintPlugin(),
      createDockerDashPlugin(),
      createGitArenaPlugin(),
    ];
    for (const plugin of builtinGames) {
      await this.plugins.load(plugin, {
        config: this.store.getConfig(),
        logger: this.logger,
        dataDir: this.store.pluginDataDir(plugin.manifest.id),
      });
    }
    for (const factory of this.plugins.listGames()) {
      this.gameEngine.register(factory);
    }

    this.eventEngine = new EventEngine({
      config: this.store.getConfig(),
      logger: this.logger,
    });
    // Register any event plugins from registry
    for (const d of this.plugins.listDetectors()) {
      this.eventEngine.registerDetector(d);
    }

    this.eventEngine.onEvent((event) => {
      this.lastEventAt = event.detectedAt;
      void this.store.pushEvent(event);
      this.ipc.broadcast({ type: 'event', payload: event });
      // Terminal tip + optional desktop notify for vibe-coding waits
      try {
        const cfg = this.store.getConfig();
        const suggestion = publishPlaySuggestion(event, cfg, this.home);
        if (suggestion) {
          this.logger.info('Play suggestion posted', { kind: event.kind, id: event.id });
        }
      } catch (err) {
        this.logger.debug('Suggestion failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    this.ipc = new IpcServer(this.p.socket);
    this.ipc.onRequest((req) => this.handleIpc(req));
    await this.ipc.listen();

    await this.eventEngine.start();

    writeFileSync(this.p.pid, String(process.pid), 'utf8');
    this.logger.info('Daemon started', {
      pid: process.pid,
      socket: this.p.socket,
      version: PRODUCT_VERSION,
    });

    const shutdown = () => {
      void this.stop();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async handleIpc(req: IpcRequest): Promise<unknown> {
    switch (req.method) {
      case IpcMethod.PING:
        return { pong: true, ts: Date.now() };

      case IpcMethod.STATUS:
        return this.status();

      case IpcMethod.GET_CONFIG:
        return this.store.getConfig();

      case IpcMethod.SET_CONFIG: {
        const partial = (req.params ?? {}) as Record<string, unknown>;
        const cfg = await this.store.setConfig(partial);
        this.eventEngine.updateConfig(cfg);
        return cfg;
      }

      case IpcMethod.LIST_EVENTS:
        return this.store.listEvents(
          typeof req.params === 'object' && req.params && 'limit' in req.params
            ? Number((req.params as { limit: number }).limit)
            : 20,
        );

      case IpcMethod.EMIT_EVENT: {
        const event = DeveloperEventSchema.parse(req.params);
        // inject() runs listeners (store + suggest) when cooldown allows.
        const ok = this.eventEngine.inject(event);
        if (ok) {
          this.lastEventAt = event.detectedAt;
          return { accepted: true, suggested: true };
        }
        // Cooldown blocked auto re-fire.
        // Only force a suggestion for explicit human/tool limit signals.
        const force =
          event.kind === 'AI_LIMIT_REACHED' ||
          event.metadata?.['via'] === 'cli-limit' ||
          event.metadata?.['via'] === 'shell-hook';
        if (force && event.kind === 'AI_LIMIT_REACHED') {
          await this.store.pushEvent(event);
          publishPlaySuggestion(event, this.store.getConfig(), this.home);
          this.ipc.broadcast({ type: 'event', payload: event });
          this.lastEventAt = event.detectedAt;
          return { accepted: true, suggested: true };
        }
        return { accepted: false, suggested: false };
      }

      case IpcMethod.DISMISS_EVENT:
        return { ok: true };

      case IpcMethod.LIST_GAMES:
        return this.gameEngine.listGames();

      case IpcMethod.START_GAME: {
        const params = req.params as {
          gameId: string;
          mode?: string;
          language?: string;
          difficulty?: string;
          durationSec?: number;
        };
        const user = this.store.getUser().profile;
        const started = await this.gameEngine.startGame({
          gameId: params.gameId,
          mode: (params.mode as 'solo') ?? 'solo',
          language: params.language as 'typescript' | undefined,
          difficulty: params.difficulty as 'medium' | undefined,
          durationSec: params.durationSec,
          user: {
            id: user.id,
            displayName: user.displayName,
            isAnonymous: user.isAnonymous,
          },
        });
        this.ipc.broadcast({ type: 'game_state', payload: started });
        return started;
      }

      case IpcMethod.SUBMIT_GAME: {
        const params = req.params as { sessionId: string; answer: unknown; playerId?: string };
        const user = this.store.getUser().profile;
        const state = await this.gameEngine.submit(
          params.sessionId,
          params.answer,
          params.playerId ?? user.id,
        );
        this.ipc.broadcast({ type: 'game_state', payload: state });
        return state;
      }

      case IpcMethod.FINISH_GAME: {
        const params = req.params as { sessionId: string };
        const { result, scores } = await this.gameEngine.finish(params.sessionId);
        await this.store.recordGameResult(result);
        let totalAwarded = 0;
        for (const s of scores) {
          const award = await this.store.awardXp(s.xp, `game:${result.gameId}`, {
            gameId: result.gameId,
            sessionId: result.sessionId,
          });
          totalAwarded += award.awarded;
        }
        const xp = this.store.getXp();
        this.ipc.broadcast({ type: 'xp_update', payload: xp });
        return { result, scores, xp, totalAwarded };
      }

      case IpcMethod.GET_XP:
        return {
          xp: this.store.getXp(),
          user: this.store.getUser().profile,
        };

      case IpcMethod.DOCTOR:
        return runDoctor({ home: this.home, store: this.store, eventEngine: this.eventEngine });

      case IpcMethod.SHUTDOWN:
        setTimeout(() => void this.stop(), 50);
        return { shuttingDown: true };

      default:
        throw Object.assign(new Error(`Unknown method: ${req.method}`), {
          code: 'METHOD_NOT_FOUND',
        });
    }
  }

  status() {
    const env = detectEnvironment();
    const mem = process.memoryUsage();
    return {
      running: true,
      pid: process.pid,
      version: PRODUCT_VERSION,
      uptimeMs: Date.now() - this.startedAt,
      platform: env.platform,
      shell: env.shell,
      eventEngineReady: true,
      gameEngineReady: true,
      overlayConnected: this.ipc.clientCount() > 0,
      online: false, // cloud sync in milestone 4
      detectors: this.eventEngine.listDetectors().map((d) => ({
        id: d.id,
        name: d.name,
        kinds: d.kinds as string[],
      })),
      lastEventAt: this.lastEventAt,
      memoryMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      games: this.gameEngine.listGames().map((g) => g.id),
      activeSessions: this.gameEngine.activeSessionCount(),
    };
  }

  async stop(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.logger.info('Daemon stopping');
    try {
      await this.eventEngine?.stop();
      await this.ipc?.close();
    } finally {
      if (existsSync(this.p.pid)) {
        try {
          unlinkSync(this.p.pid);
        } catch {
          /* ignore */
        }
      }
      process.exit(0);
    }
  }
}

export function isDaemonRunning(home?: string): { running: boolean; pid?: number } {
  const p = paths(home);
  if (!existsSync(p.pid)) return { running: false };
  try {
    const pid = Number(readFileSync(p.pid, 'utf8').trim());
    if (!pid) return { running: false };
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    return { running: false };
  }
}
