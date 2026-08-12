import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessSnapshot } from '@bytebreak/shared';

const execFileAsync = promisify(execFile);

/**
 * Sample running processes — command *names* only.
 * Never captures full argv (may contain secrets/paths to source).
 */
export async function sampleProcesses(): Promise<ProcessSnapshot[]> {
  if (process.platform === 'win32') {
    return sampleWindows();
  }
  return sampleUnix();
}

async function sampleUnix(): Promise<ProcessSnapshot[]> {
  try {
    // comm only — no args
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pid=,comm='], {
      timeout: 2000,
      maxBuffer: 2 * 1024 * 1024,
      encoding: 'utf8',
    });
    const lines = stdout.split('\n').filter(Boolean);
    const snaps: ProcessSnapshot[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(/^(\d+)\s+(.+)$/);
      if (!m) continue;
      const pid = Number(m[1]);
      const name = (m[2] ?? '').trim();
      if (!name || Number.isNaN(pid)) continue;
      // basename only
      const base = name.split('/').pop() ?? name;
      snaps.push({ pid, name: base, command: base });
    }
    return snaps;
  } catch {
    return [];
  }
}

async function sampleWindows(): Promise<ProcessSnapshot[]> {
  try {
    const { stdout } = await execFileAsync(
      'tasklist',
      ['/FO', 'CSV', '/NH'],
      { timeout: 3000, encoding: 'utf8' },
    );
    const snaps: ProcessSnapshot[] = [];
    for (const line of stdout.split('\n')) {
      // "name.exe","pid","session","session#","mem"
      const parts = line.match(/"([^"]+)"/g);
      if (!parts || parts.length < 2) continue;
      const name = parts[0]?.replace(/"/g, '') ?? '';
      const pid = Number(parts[1]?.replace(/"/g, ''));
      if (!name || Number.isNaN(pid)) continue;
      snaps.push({ pid, name, command: name });
    }
    return snaps;
  } catch {
    return [];
  }
}

/** Match process name against patterns (case-insensitive) */
export function matchProcess(
  processes: ProcessSnapshot[],
  patterns: RegExp[],
): ProcessSnapshot[] {
  return processes.filter((p) => patterns.some((re) => re.test(p.name) || re.test(p.command)));
}
