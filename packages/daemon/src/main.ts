#!/usr/bin/env node
import { Daemon } from './daemon.js';

async function main() {
  if (process.env.BYTEBREAK_DAEMON_FOREGROUND === '1') {
    process.env.BYTEBREAK_DAEMON_FOREGROUND = '1';
  }
  const daemon = new Daemon({
    home: process.env.BYTEBREAK_HOME,
    foreground: process.env.BYTEBREAK_DAEMON_FOREGROUND === '1',
  });
  await daemon.start();
  // Keep alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[bytebreak-daemon] fatal:', err);
  process.exit(1);
});
