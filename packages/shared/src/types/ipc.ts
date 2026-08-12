import { z } from 'zod';
import { DeveloperEventSchema } from './events.js';
import { ByteBreakConfigSchema } from './config.js';

/**
 * Daemon ↔ Runtime ↔ Overlay JSON-RPC-style IPC over Unix socket (or named pipe on Windows).
 */
export const IpcMethod = {
  PING: 'ping',
  STATUS: 'status',
  GET_CONFIG: 'get_config',
  SET_CONFIG: 'set_config',
  LIST_EVENTS: 'list_events',
  EMIT_EVENT: 'emit_event',
  DISMISS_EVENT: 'dismiss_event',
  LIST_GAMES: 'list_games',
  START_GAME: 'start_game',
  SUBMIT_GAME: 'submit_game',
  FINISH_GAME: 'finish_game',
  GET_XP: 'get_xp',
  SHUTDOWN: 'shutdown',
  DOCTOR: 'doctor',
} as const;

export type IpcMethod = (typeof IpcMethod)[keyof typeof IpcMethod];

export const IpcRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
  protocolVersion: z.number().int().positive(),
});
export type IpcRequest = z.infer<typeof IpcRequestSchema>;

export const IpcResponseSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
});
export type IpcResponse = z.infer<typeof IpcResponseSchema>;

/** Server → client push notifications */
export const IpcNotificationSchema = z.object({
  type: z.enum(['event', 'game_state', 'xp_update', 'daemon_status']),
  payload: z.unknown(),
});
export type IpcNotification = z.infer<typeof IpcNotificationSchema>;

export const DaemonStatusSchema = z.object({
  running: z.boolean(),
  pid: z.number().int().optional(),
  version: z.string(),
  uptimeMs: z.number().nonnegative(),
  platform: z.string(),
  shell: z.string().optional(),
  eventEngineReady: z.boolean(),
  gameEngineReady: z.boolean(),
  overlayConnected: z.boolean(),
  online: z.boolean(),
  detectors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kinds: z.array(z.string()),
    }),
  ),
  lastEventAt: z.string().datetime().optional(),
  memoryMb: z.number().nonnegative().optional(),
});
export type DaemonStatus = z.infer<typeof DaemonStatusSchema>;

export const DoctorReportSchema = z.object({
  healthy: z.boolean(),
  checks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(['pass', 'warn', 'fail']),
      message: z.string(),
      fix: z.string().optional(),
    }),
  ),
  environment: z.record(z.string()),
});
export type DoctorReport = z.infer<typeof DoctorReportSchema>;

export { DeveloperEventSchema, ByteBreakConfigSchema };
