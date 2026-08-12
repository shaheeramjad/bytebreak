import { existsSync } from 'node:fs';
import { PRODUCT_VERSION, type DoctorReport } from '@bytebreak/shared';
import { paths, type LocalStore } from '@bytebreak/local-store';
import { detectEnvironment, type EventEngine } from '@bytebreak/event-engine';
import { isDaemonRunning } from './daemon.js';

export function runDoctor(input: {
  home: string;
  store?: LocalStore;
  eventEngine?: EventEngine;
}): DoctorReport {
  const p = paths(input.home);
  const env = detectEnvironment();
  const checks: DoctorReport['checks'] = [];

  checks.push({
    id: 'node',
    name: 'Node.js',
    status: env.tools.node ? 'pass' : 'fail',
    message: env.tools.node ? `Node ${env.nodeVersion}` : 'Node.js not found in PATH',
    fix: 'Install Node.js 20+ from https://nodejs.org',
  });

  checks.push({
    id: 'home',
    name: 'ByteBreak home',
    status: existsSync(p.root) ? 'pass' : 'warn',
    message: existsSync(p.root) ? p.root : `Will create ${p.root}`,
  });

  const daemon = isDaemonRunning(input.home);
  checks.push({
    id: 'daemon',
    name: 'Daemon',
    status: daemon.running ? 'pass' : 'warn',
    message: daemon.running ? `Running (pid ${daemon.pid})` : 'Not running',
    fix: 'Run: bytebreak (starts daemon automatically)',
  });

  checks.push({
    id: 'socket',
    name: 'IPC socket',
    status: existsSync(p.socket) ? 'pass' : daemon.running ? 'fail' : 'warn',
    message: existsSync(p.socket) ? p.socket : 'Socket not found',
  });

  checks.push({
    id: 'git',
    name: 'Git',
    status: env.tools.git ? 'pass' : 'warn',
    message: env.tools.git ? 'Detected' : 'Not found (optional)',
  });

  checks.push({
    id: 'docker',
    name: 'Docker',
    status: env.tools.docker ? 'pass' : 'warn',
    message: env.tools.docker ? 'Detected' : 'Not found (optional for Docker Dash)',
  });

  const aiFound = Object.entries(env.aiTools).filter(([, v]) => v).map(([k]) => k);
  checks.push({
    id: 'ai-tools',
    name: 'AI coding tools',
    status: aiFound.length ? 'pass' : 'warn',
    message: aiFound.length ? `Found: ${aiFound.join(', ')}` : 'None detected (hooks still install)',
  });

  const editors = Object.entries(env.editors).filter(([, v]) => v).map(([k]) => k);
  checks.push({
    id: 'editors',
    name: 'Editors',
    status: editors.length ? 'pass' : 'warn',
    message: editors.length ? `Found: ${editors.join(', ')}` : 'No known editors detected',
  });

  if (input.eventEngine) {
    checks.push({
      id: 'event-engine',
      name: 'Event engine',
      status: 'pass',
      message: `${input.eventEngine.listDetectors().length} detectors loaded`,
    });
  }

  if (input.store) {
    const user = input.store.getUser();
    checks.push({
      id: 'identity',
      name: 'Identity',
      status: 'pass',
      message: user.profile.isAnonymous
        ? `Anonymous (${user.profile.displayName})`
        : `Signed in as ${user.profile.displayName}`,
    });
  }

  checks.push({
    id: 'privacy',
    name: 'Privacy',
    status: 'pass',
    message: 'Source code is never collected or uploaded',
  });

  const healthy = checks.every((c) => c.status !== 'fail');

  return {
    healthy,
    checks,
    environment: {
      version: PRODUCT_VERSION,
      platform: env.platform,
      arch: env.arch,
      shell: env.shell,
      node: env.nodeVersion,
      home: p.root,
    },
  };
}
