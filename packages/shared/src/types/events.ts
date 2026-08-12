import { z } from 'zod';

/**
 * Built-in event kinds. Every event is a plugin — custom kinds use the same shape.
 * Event plugins only observe process/shell signals; they never read source files.
 */
export const BuiltinEventKind = {
  AI_LIMIT_REACHED: 'AI_LIMIT_REACHED',
  AI_WAITING: 'AI_WAITING',
  COMMAND_RUNNING: 'COMMAND_RUNNING',
  TESTS_RUNNING: 'TESTS_RUNNING',
  DOCKER_BUILD: 'DOCKER_BUILD',
  NPM_INSTALL: 'NPM_INSTALL',
  PNPM_INSTALL: 'PNPM_INSTALL',
  YARN_INSTALL: 'YARN_INSTALL',
  CARGO_BUILD: 'CARGO_BUILD',
  GO_BUILD: 'GO_BUILD',
  GIT_PULL: 'GIT_PULL',
  GIT_REBASE: 'GIT_REBASE',
  CI_RUNNING: 'CI_RUNNING',
  IDLE: 'IDLE',
  LONG_COMMAND: 'LONG_COMMAND',
} as const;

export type BuiltinEventKind = (typeof BuiltinEventKind)[keyof typeof BuiltinEventKind];

export type EventKind = BuiltinEventKind | (string & {});

export const EventSeveritySchema = z.enum(['info', 'opportunity', 'urgent']);
export type EventSeverity = z.infer<typeof EventSeveritySchema>;

export const DeveloperEventSchema = z.object({
  id: z.string().uuid(),
  kind: z.string().min(1),
  severity: EventSeveritySchema.default('opportunity'),
  title: z.string(),
  message: z.string(),
  /** Human-friendly source e.g. "Your AI agent", "pnpm", "docker" */
  source: z.string().optional(),
  /** Suggested game duration in seconds */
  suggestedDurationSec: z.number().int().positive().default(90),
  /** Opaque metadata — never include source code or secrets */
  metadata: z.record(z.unknown()).default({}),
  detectedAt: z.string().datetime(),
  /** When the wait is expected to end (ISO), if known */
  estimatedEndAt: z.string().datetime().optional(),
});

export type DeveloperEvent = z.infer<typeof DeveloperEventSchema>;

export interface EventContext {
  platform: NodeJS.Platform;
  shell: string;
  cwd?: string;
  /** Detected tool presence (names only, no secrets) */
  tools: Record<string, boolean>;
  /** Current process sample snapshot (command names only) */
  processes: ProcessSnapshot[];
  now: Date;
}

export interface ProcessSnapshot {
  pid: number;
  name: string;
  /** Short command line without args that may contain secrets */
  command: string;
  cpuPercent?: number;
  startedAt?: Date;
}

/**
 * Contract for event detector plugins.
 * Detectors must never read file contents of user projects.
 */
export interface EventDetector {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly kinds: EventKind[];
  /** How often the daemon should poll this detector (ms). 0 = event-driven only. */
  readonly pollIntervalMs: number;
  initialize?(ctx: { config: Record<string, unknown> }): Promise<void> | void;
  detect(ctx: EventContext): Promise<DeveloperEvent[]> | DeveloperEvent[];
  dispose?(): Promise<void> | void;
}
