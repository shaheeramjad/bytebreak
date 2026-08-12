import { createServer, type Server, type Socket } from 'node:net';
import { unlinkSync, existsSync, chmodSync } from 'node:fs';
import {
  NdjsonParser,
  parseIpcRequest,
  createIpcSuccess,
  createIpcError,
  encodeMessage,
  type IpcNotification,
  type IpcRequest,
} from '@bytebreak/shared';

export type IpcHandler = (req: IpcRequest) => Promise<unknown> | unknown;

/**
 * NDJSON Unix domain socket server for runtime ↔ daemon IPC.
 */
export class IpcServer {
  private server: Server | null = null;
  private readonly clients = new Set<Socket>();
  private handler: IpcHandler | null = null;

  constructor(private readonly socketPath: string) {}

  onRequest(handler: IpcHandler): void {
    this.handler = handler;
  }

  async listen(): Promise<void> {
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        /* ignore */
      }
    }

    await new Promise<void>((resolve, reject) => {
      this.server = createServer((socket) => this.handleSocket(socket));
      this.server.once('error', reject);
      this.server.listen(this.socketPath, () => {
        try {
          chmodSync(this.socketPath, 0o600);
        } catch {
          /* ignore */
        }
        resolve();
      });
    });
  }

  private handleSocket(socket: Socket): void {
    this.clients.add(socket);
    const parser = new NdjsonParser();

    socket.on('data', (buf) => {
      const messages = parser.push(buf.toString('utf8'));
      for (const raw of messages) {
        void this.dispatch(socket, raw);
      }
    });

    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', () => this.clients.delete(socket));
  }

  private async dispatch(socket: Socket, raw: unknown): Promise<void> {
    let req: IpcRequest;
    try {
      req = parseIpcRequest(raw);
    } catch (err) {
      socket.write(
        encodeMessage(
          createIpcError(
            'unknown',
            'INVALID_REQUEST',
            err instanceof Error ? err.message : 'Invalid request',
          ),
        ),
      );
      return;
    }

    if (!this.handler) {
      socket.write(encodeMessage(createIpcError(req.id, 'NO_HANDLER', 'No handler registered')));
      return;
    }

    try {
      const result = await this.handler(req);
      socket.write(encodeMessage(createIpcSuccess(req.id, result)));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : 'INTERNAL';
      socket.write(encodeMessage(createIpcError(req.id, code, message)));
    }
  }

  broadcast(notification: IpcNotification): void {
    const payload = encodeMessage(notification);
    for (const c of this.clients) {
      try {
        c.write(payload);
      } catch {
        /* ignore */
      }
    }
  }

  clientCount(): number {
    return this.clients.size;
  }

  async close(): Promise<void> {
    for (const c of this.clients) c.destroy();
    this.clients.clear();
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        /* ignore */
      }
    }
  }
}
