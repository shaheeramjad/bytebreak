#!/usr/bin/env node
/**
 * Bundle CLI + daemon into a single npm-installable package.
 * Users only need: npm install -g bytebreak && bytebreak
 */
import * as esbuild from 'esbuild';
import {
  chmodSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
  // Inject __filename into globalThis for path resolution helpers
  banner: {
    js: 'globalThis.__filename = __filename; globalThis.__dirname = __dirname;',
  },
};

await esbuild.build({
  ...shared,
  entryPoints: [join(root, 'src/cli-entry.ts')],
  outfile: join(dist, 'cli.cjs'),
});

await esbuild.build({
  ...shared,
  entryPoints: [join(root, 'src/daemon-entry.ts')],
  outfile: join(dist, 'daemon.cjs'),
});

for (const name of ['cli.cjs', 'daemon.cjs']) {
  const file = join(dist, name);
  let src = readFileSync(file, 'utf8');
  if (!src.startsWith('#!')) {
    src = '#!/usr/bin/env node\n' + src;
    writeFileSync(file, src);
  }
  try {
    chmodSync(file, 0o755);
  } catch {
    /* windows */
  }
}

writeFileSync(join(dist, 'daemon.js'), `#!/usr/bin/env node\nrequire('./daemon.cjs');\n`);
try {
  chmodSync(join(dist, 'daemon.js'), 0o755);
} catch {
  /* ignore */
}

// bin must be .cjs because package.json has "type": "module"
const binDir = join(root, 'bin');
mkdirSync(binDir, { recursive: true });
const binPath = join(binDir, 'bytebreak.cjs');
writeFileSync(
  binPath,
  `#!/usr/bin/env node
const path = require('path');
// Always point the CLI at the bundled daemon next to itself
process.env.BYTEBREAK_DAEMON_PATH =
  process.env.BYTEBREAK_DAEMON_PATH || path.join(__dirname, '..', 'dist', 'daemon.cjs');
require('../dist/cli.cjs');
`,
);
try {
  chmodSync(binPath, 0o755);
} catch {
  /* ignore */
}

const stale = join(binDir, 'bytebreak.js');
if (existsSync(stale)) {
  try {
    unlinkSync(stale);
  } catch {
    /* ignore */
  }
}

console.log('✓ Bundled bytebreak → dist/cli.cjs + dist/daemon.cjs');
