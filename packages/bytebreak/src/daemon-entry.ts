#!/usr/bin/env node
import { Daemon } from '@bytebreak/daemon';

async function main() {
  const daemon = new Daemon({
    home: process.env.BYTEBREAK_HOME,
    foreground: process.env.BYTEBREAK_DAEMON_FOREGROUND === '1',
  });
  await daemon.start();
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[bytebreak-daemon] fatal:', err);
  process.exit(1);
});
