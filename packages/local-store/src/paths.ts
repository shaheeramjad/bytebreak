import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  LOCAL_DB_NAME,
  DAEMON_PID_FILE,
  DAEMON_SOCKET_NAME,
  DAEMON_LOG_FILE,
  HOOKS_DIR_NAME,
  SUGGEST_FILE_NAME,
} from '@bytebreak/shared';

export function resolveBytebreakHome(override?: string): string {
  if (override) return override;
  if (process.env.BYTEBREAK_HOME) return process.env.BYTEBREAK_HOME;
  return join(homedir(), CONFIG_DIR_NAME);
}

export function paths(home?: string) {
  const root = resolveBytebreakHome(home);
  return {
    root,
    config: join(root, CONFIG_FILE_NAME),
    db: join(root, LOCAL_DB_NAME),
    pid: join(root, DAEMON_PID_FILE),
    socket: process.env.BYTEBREAK_SOCKET_PATH ?? join(root, DAEMON_SOCKET_NAME),
    log: join(root, DAEMON_LOG_FILE),
    hooks: join(root, HOOKS_DIR_NAME),
    plugins: join(root, 'plugins'),
    cache: join(root, 'cache'),
    data: join(root, 'data'),
    suggest: join(root, SUGGEST_FILE_NAME),
  };
}
