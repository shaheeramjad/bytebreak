import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(logFile?: string, level: LogLevel = 'info') {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const min = order.indexOf(level);

  if (logFile) {
    try {
      mkdirSync(dirname(logFile), { recursive: true });
    } catch {
      /* ignore */
    }
  }

  function write(lvl: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (order.indexOf(lvl) < min) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...meta,
    });
    if (logFile) {
      try {
        appendFileSync(logFile, line + '\n');
      } catch {
        /* ignore */
      }
    }
    if (process.env.BYTEBREAK_DAEMON_FOREGROUND === '1') {
      // eslint-disable-next-line no-console
      console.error(line);
    }
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
