import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { paths } from '@bytebreak/local-store';
import { isDaemonRunning } from '@bytebreak/daemon';
import { IpcClient } from './ipc-client.js';

/** Works in ESM monorepo builds and esbuild CJS bundles */
function moduleFilename(): string {
  try {
    const u = import.meta.url;
    if (typeof u === 'string' && u.startsWith('file:')) {
      return fileURLToPath(u);
    }
  } catch {
    /* ignore */
  }
  // CJS bundle path (esbuild / node)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.__filename === 'string') return g.__filename as string;
  // Last resort: require.main
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require.main;
    if (m?.filename) return m.filename;
  } catch {
    /* ignore */
  }
  return fileURLToPath(pathToFileURL(process.argv[1] ?? '.').href);
}

function nodeRequire() {
  return createRequire(moduleFilename());
}

/**
 * Resolve daemon entry for:
 * 1) BYTEBREAK_DAEMON_PATH override (set by package bin)
 * 2) Packaged install (daemon next to bundled cli)
 * 3) @bytebreak/daemon workspace/npm package
 * 4) Monorepo relative path
 */
export function resolveDaemonMain(): string {
  if (process.env.BYTEBREAK_DAEMON_PATH && existsSync(process.env.BYTEBREAK_DAEMON_PATH)) {
    return process.env.BYTEBREAK_DAEMON_PATH;
  }

  const here = dirname(moduleFilename());
  const candidates: string[] = [
    join(here, 'daemon.cjs'),
    join(here, 'daemon.js'),
    join(here, 'daemon.mjs'),
    join(here, '..', 'daemon.cjs'),
    join(here, '..', 'daemon.js'),
    join(here, '..', 'dist', 'daemon.cjs'),
    join(here, '..', 'dist', 'daemon.js'),
  ];

  try {
    const pkg = nodeRequire().resolve('@bytebreak/daemon/package.json');
    candidates.push(join(dirname(pkg), 'dist', 'main.js'));
  } catch {
    /* not installed as separate package */
  }

  candidates.push(join(here, '..', '..', 'daemon', 'dist', 'main.js'));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  throw new Error(
    'ByteBreak daemon not found. Reinstall with: npm install -g bytebreak\n' +
      `Looked in:\n${candidates.map((c) => `  - ${c}`).join('\n')}`,
  );
}

export async function ensureDaemon(home?: string): Promise<{ started: boolean; pid?: number }> {
  const p = paths(home);
  const status = isDaemonRunning(home);
  if (status.running) {
    // Verify socket responds
    try {
      const client = new IpcClient(p.socket);
      await client.connect(500);
      await client.request('ping');
      client.close();
      return { started: false, pid: status.pid };
    } catch {
      // stale pid — fall through to restart
    }
  }

  const main = resolveDaemonMain();

  const child = spawn(process.execPath, [main], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      BYTEBREAK_HOME: p.root,
      BYTEBREAK_DAEMON_PATH: main,
    },
  });
  child.unref();

  // Wait for socket
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const client = new IpcClient(p.socket);
      await client.connect(200);
      await client.request('ping');
      client.close();
      return { started: true, pid: child.pid };
    } catch {
      await sleep(100);
    }
  }
  throw new Error('Daemon failed to start within 5s');
}

export async function stopDaemon(home?: string): Promise<boolean> {
  const p = paths(home);
  const status = isDaemonRunning(home);
  if (!status.running) return false;
  try {
    const client = new IpcClient(p.socket);
    await client.connect(500);
    await client.request('shutdown');
    client.close();
  } catch {
    if (status.pid) {
      try {
        process.kill(status.pid, 'SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
  await sleep(200);
  return true;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
