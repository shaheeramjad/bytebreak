import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { LocalStore, paths } from '@bytebreak/local-store';
import { detectEnvironment } from '@bytebreak/event-engine';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@bytebreak/shared';
import { installShellHooks } from './hooks.js';
import { ensureDaemon } from './daemon-control.js';

export interface FirstRunResult {
  home: string;
  env: ReturnType<typeof detectEnvironment>;
  hooks: ReturnType<typeof installShellHooks>;
  daemon: { started: boolean; pid?: number };
  anonymousUser: string;
}

/**
 * Zero-config first run:
 * detect env → create config → install hooks → start daemon → anonymous identity
 * OAuth is optional (`bytebreak login`).
 */
export async function runFirstRun(options: { quiet?: boolean } = {}): Promise<FirstRunResult> {
  const log = options.quiet
    ? () => {}
    : (msg: string) => console.log(msg);

  log('');
  log(chalk.bold.magenta(`  ${PRODUCT_NAME}`));
  log(chalk.dim(`  ${PRODUCT_TAGLINE}`));
  log('');

  const home = paths().root;
  const store = new LocalStore({ home });
  await store.open();

  const env = detectEnvironment();
  log(chalk.green('✓') + ` Detected ${env.platform}/${env.arch} · shell ${env.shell}`);
  log(chalk.green('✓') + ` Node ${env.nodeVersion}`);

  const toolHits = Object.entries({ ...env.tools, ...env.aiTools, ...env.editors })
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (toolHits.length) {
    log(chalk.green('✓') + ` Tools: ${toolHits.slice(0, 12).join(', ')}${toolHits.length > 12 ? '…' : ''}`);
  }

  const hooks = installShellHooks(home);
  log(chalk.green('✓') + ` Shell hooks installed (${hooks.shell}${hooks.rcFile ? ` → ${hooks.rcFile}` : ''})`);

  const daemon = await ensureDaemon(home);
  log(
    chalk.green('✓') +
      (daemon.started
        ? ` Daemon started (pid ${daemon.pid})`
        : ` Daemon already running (pid ${daemon.pid})`),
  );

  const user = store.getUser();
  log(chalk.green('✓') + ` Playing as ${user.profile.displayName} (anonymous)`);
  log(
    chalk.green('✓') +
      ` Auto-suggest on waits (AI limits, installs, long builds) — tip appears in your terminal`,
  );
  log(chalk.dim('  Privacy: source code is never collected. Login is optional.'));
  log(chalk.dim('  Tip: when any AI agent hits a limit, run  bytebreak limit  (or wait for the tip).'));
  log('');

  return {
    home,
    env,
    hooks,
    daemon,
    anonymousUser: user.profile.displayName,
  };
}

/** True when local config/store does not exist yet */
export function needsFirstRun(home?: string): boolean {
  const p = paths(home);
  return !existsSync(p.config) && !existsSync(p.db);
}
