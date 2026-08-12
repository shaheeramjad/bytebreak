#!/usr/bin/env node
import chalk from 'chalk';
import { runCli } from './cli.js';

runCli().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
