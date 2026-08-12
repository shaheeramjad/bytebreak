#!/usr/bin/env node
const path = require('path');
// Always point the CLI at the bundled daemon next to itself
process.env.BYTEBREAK_DAEMON_PATH =
  process.env.BYTEBREAK_DAEMON_PATH || path.join(__dirname, '..', 'dist', 'daemon.cjs');
require('../dist/cli.cjs');
