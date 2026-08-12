#!/usr/bin/env node
import { runCli } from '@bytebreak/runtime';

runCli().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
