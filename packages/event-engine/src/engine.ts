import { EventEmitter } from 'node:events';
import type {
  DeveloperEvent,
  EventDetector,
  EventContext,
  ByteBreakConfig,
} from '@bytebreak/shared';
import { PERF } from '@bytebreak/shared';
import { sampleProcesses } from './process-sample.js';
import { detectEnvironment } from './environment.js';
import { createBuiltinDetectors } from './detectors/index.js';

export type EventListener = (event: DeveloperEvent) => void;

export interface EventEngineOptions {
  config: ByteBreakConfig;
  detectors?: EventDetector[];
  /** Disable process sampling (tests) */
  disableSampling?: boolean;
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * Heart of ByteBreak. Polls event detector plugins and emits opportunities.
 * Dedupes by kind within cooldown window. Never reads user source code.
 */
export class EventEngine {
  private readonly emitters = new EventEmitter();
  private readonly detectors = new Map<string, EventDetector>();
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastEmitByKind = new Map<string, number>();
  private readonly recentIds = new Set<string>();
  private config: ByteBreakConfig;
  private running = false;
  private env = detectEnvironment();
  private readonly logger: NonNullable<EventEngineOptions['logger']>;
  private readonly disableSampling: boolean;
  private pollCount = 0;

  constructor(options: EventEngineOptions) {
    this.config = options.config;
    this.disableSampling = options.disableSampling ?? false;
    this.logger = options.logger ?? {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    const list = options.detectors ?? createBuiltinDetectors();
    for (const d of list) this.detectors.set(d.id, d);
  }

  onEvent(listener: EventListener): () => void {
    this.emitters.on('event', listener);
    return () => this.emitters.off('event', listener);
  }

  listDetectors(): EventDetector[] {
    return [...this.detectors.values()];
  }

  registerDetector(detector: EventDetector): void {
    this.detectors.set(detector.id, detector);
    if (this.running) this.schedule(detector);
  }

  unregisterDetector(id: string): void {
    this.detectors.delete(id);
    const t = this.timers.get(id);
    if (t) clearInterval(t);
    this.timers.delete(id);
  }

  updateConfig(config: ByteBreakConfig): void {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.env = detectEnvironment();
    for (const d of this.detectors.values()) {
      await d.initialize?.({ config: {} });
      this.schedule(d);
    }
    this.logger.info('Event engine started', {
      detectors: this.detectors.size,
      platform: this.env.platform,
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
    for (const d of this.detectors.values()) {
      await d.dispose?.();
    }
  }

  /**
   * Inject an event from shell hooks / external sources.
   * Same dedupe + cooldown rules apply.
   */
  inject(event: DeveloperEvent): boolean {
    return this.publish(event);
  }

  /** Manual poll — useful for tests and `doctor` */
  async tick(): Promise<DeveloperEvent[]> {
    const published: DeveloperEvent[] = [];
    const ctx = await this.buildContext();
    for (const d of this.detectors.values()) {
      try {
        const events = await d.detect(ctx);
        for (const e of events) {
          if (this.publish(e)) published.push(e);
        }
      } catch (err) {
        this.logger.warn(`Detector ${d.id} failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    this.pollCount += 1;
    return published;
  }

  getStats() {
    return {
      running: this.running,
      detectors: this.detectors.size,
      pollCount: this.pollCount,
      lastEmitByKind: Object.fromEntries(this.lastEmitByKind),
    };
  }

  private schedule(detector: EventDetector): void {
    if (detector.pollIntervalMs <= 0) return;
    if (this.timers.has(detector.id)) return;
    const interval = Math.max(detector.pollIntervalMs, PERF.DAEMON_IDLE_POLL_MS);
    const timer = setInterval(() => {
      void this.runDetector(detector);
    }, interval);
    // Don't keep the process alive solely for idle detectors when nothing else runs
    timer.unref?.();
    this.timers.set(detector.id, timer);
  }

  private async runDetector(detector: EventDetector): Promise<void> {
    if (!this.running) return;
    try {
      const ctx = await this.buildContext();
      const events = await detector.detect(ctx);
      for (const e of events) this.publish(e);
    } catch (err) {
      this.logger.debug(`Detector ${detector.id} error`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async buildContext(): Promise<EventContext> {
    const processes = this.disableSampling ? [] : await sampleProcesses();
    return {
      platform: this.env.platform,
      shell: this.env.shell,
      tools: { ...this.env.tools, ...this.env.aiTools, ...this.env.editors },
      processes,
      now: new Date(),
    };
  }

  private publish(event: DeveloperEvent): boolean {
    if (this.recentIds.has(event.id)) return false;

    const enabled = this.config.enabledEvents;
    if (enabled.length > 0 && !enabled.includes(event.kind)) {
      return false;
    }

    const cooldownMs = this.config.cooldownSec * 1000;
    const last = this.lastEmitByKind.get(event.kind) ?? 0;
    if (Date.now() - last < cooldownMs) {
      return false;
    }

    // Quiet hours
    if (this.config.quietHours.enabled && inQuietHours(this.config.quietHours)) {
      return false;
    }

    this.lastEmitByKind.set(event.kind, Date.now());
    this.recentIds.add(event.id);
    // Bound memory
    if (this.recentIds.size > 500) {
      const first = this.recentIds.values().next().value;
      if (first) this.recentIds.delete(first);
    }

    this.emitters.emit('event', event);
    this.logger.debug('Event published', { kind: event.kind, id: event.id });
    return true;
  }
}

function inQuietHours(qh: { start: string; end: string }): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = qh.start.split(':').map(Number);
  const [eh, em] = qh.end.split(':').map(Number);
  const start = (sh ?? 0) * 60 + (sm ?? 0);
  const end = (eh ?? 0) * 60 + (em ?? 0);
  if (start === end) return false;
  if (start < end) return mins >= start && mins < end;
  // wraps midnight
  return mins >= start || mins < end;
}
