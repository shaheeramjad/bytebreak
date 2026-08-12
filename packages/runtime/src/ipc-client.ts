import { createConnection, type Socket } from 'node:net';
import {
  NdjsonParser,
  createIpcRequest,
  parseIpcResponse,
  encodeMessage,
  type IpcResponse,
  type IpcNotification,
  IPC_PROTOCOL_VERSION,
} from '@bytebreak/shared';
import { paths } from '@bytebreak/local-store';

export class IpcClient {
  private socket: Socket | null = null;
  private readonly parser = new NdjsonParser();
  private readonly pending = new Map<
    string,
    { resolve: (r: IpcResponse) => void; reject: (e: Error) => void }
  >();
  private readonly notificationHandlers: Array<(n: IpcNotification) => void> = [];

  constructor(private readonly socketPath = paths().socket) {}

  async connect(timeoutMs = 2000): Promise<void> {
    if (this.socket) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new Error('Daemon connection timeout'));
      }, timeoutMs);

      const sock = createConnection(this.socketPath);
      sock.once('connect', () => {
        clearTimeout(timer);
        this.socket = sock;
        sock.on('data', (buf) => this.onData(buf.toString('utf8')));
        sock.on('close', () => this.onClose());
        sock.on('error', () => this.onClose());
        resolve();
      });
      sock.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private onData(chunk: string): void {
    for (const raw of this.parser.push(chunk)) {
      if (raw && typeof raw === 'object' && 'type' in raw && !('ok' in raw)) {
        for (const h of this.notificationHandlers) {
          h(raw as IpcNotification);
        }
        continue;
      }
      try {
        const res = parseIpcResponse(raw);
        const p = this.pending.get(res.id);
        if (p) {
          this.pending.delete(res.id);
          p.resolve(res);
        }
      } catch {
        /* ignore */
      }
    }
  }

  private onClose(): void {
    this.socket = null;
    for (const [id, p] of this.pending) {
      p.reject(new Error('Daemon disconnected'));
      this.pending.delete(id);
    }
  }

  onNotification(handler: (n: IpcNotification) => void): () => void {
    this.notificationHandlers.push(handler);
    return () => {
      const i = this.notificationHandlers.indexOf(handler);
      if (i >= 0) this.notificationHandlers.splice(i, 1);
    };
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.socket) await this.connect();
    const req = createIpcRequest(method, params);
    // ensure protocol version is present
    req.protocolVersion = IPC_PROTOCOL_VERSION;

    const response = await new Promise<IpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(req.id);
        reject(new Error(`IPC timeout: ${method}`));
      }, 10_000);
      this.pending.set(req.id, {
        resolve: (r) => {
          clearTimeout(timer);
          resolve(r);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.socket!.write(encodeMessage(req));
    });

    if (!response.ok) {
      throw new Error(response.error?.message ?? `IPC error: ${method}`);
    }
    return response.result as T;
  }

  close(): void {
    this.socket?.destroy();
    this.socket = null;
  }
}
