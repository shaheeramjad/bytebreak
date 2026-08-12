/**
 * Wire protocol helpers for daemon IPC.
 * Framing: newline-delimited JSON (NDJSON) over Unix domain socket.
 */
import {
  IpcRequestSchema,
  IpcResponseSchema,
  IpcNotificationSchema,
  type IpcRequest,
  type IpcResponse,
  type IpcNotification,
} from '../types/ipc.js';
import { IPC_PROTOCOL_VERSION } from '../constants.js';
import { randomUUID } from 'node:crypto';

export function createIpcRequest(method: string, params?: unknown): IpcRequest {
  return {
    id: randomUUID(),
    method,
    params,
    protocolVersion: IPC_PROTOCOL_VERSION,
  };
}

export function createIpcSuccess(id: string, result?: unknown): IpcResponse {
  return { id, ok: true, result };
}

export function createIpcError(
  id: string,
  code: string,
  message: string,
  details?: unknown,
): IpcResponse {
  return { id, ok: false, error: { code, message, details } };
}

export function parseIpcRequest(raw: unknown): IpcRequest {
  return IpcRequestSchema.parse(raw);
}

export function parseIpcResponse(raw: unknown): IpcResponse {
  return IpcResponseSchema.parse(raw);
}

export function parseIpcNotification(raw: unknown): IpcNotification {
  return IpcNotificationSchema.parse(raw);
}

export function encodeMessage(msg: unknown): string {
  return `${JSON.stringify(msg)}\n`;
}

/**
 * Incremental NDJSON parser for streaming socket data.
 */
export class NdjsonParser {
  private buffer = '';

  push(chunk: string): unknown[] {
    this.buffer += chunk;
    const messages: unknown[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        messages.push(JSON.parse(line) as unknown);
      } catch {
        // Skip malformed lines; caller may log
      }
    }
    return messages;
  }

  reset(): void {
    this.buffer = '';
  }
}
