export { createCli, runCli } from './cli.js';
export { IpcClient } from './ipc-client.js';
export { ensureDaemon, stopDaemon, resolveDaemonMain } from './daemon-control.js';
export { installShellHooks, uninstallShellHooks } from './hooks.js';
export { runFirstRun, needsFirstRun } from './first-run.js';
export { startPlaySession, pickRandomGameId } from './play.js';
