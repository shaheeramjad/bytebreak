import { existsSync, accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function which(bin: string): boolean {
  try {
    const pathEnv = process.env.PATH ?? '';
    for (const dir of pathEnv.split(':')) {
      if (!dir) continue;
      const full = join(dir, bin);
      try {
        accessSync(full, constants.X_OK);
        return true;
      } catch {
        /* continue */
      }
    }
    // Windows-style .cmd / .exe
    if (process.platform === 'win32') {
      for (const dir of pathEnv.split(';')) {
        for (const ext of ['.exe', '.cmd', '.bat', '']) {
          try {
            accessSync(join(dir, bin + ext), constants.F_OK);
            return true;
          } catch {
            /* continue */
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

function hasDir(...parts: string[]): boolean {
  try {
    return existsSync(join(...parts));
  } catch {
    return false;
  }
}

export interface EnvironmentInfo {
  platform: NodeJS.Platform;
  shell: string;
  arch: string;
  nodeVersion: string;
  tools: Record<string, boolean>;
  editors: Record<string, boolean>;
  aiTools: Record<string, boolean>;
}

/**
 * Detect OS, shell, AI tools, git, docker, node, editors.
 * Never reads secrets or project source.
 */
export function detectEnvironment(): EnvironmentInfo {
  const shell =
    process.env.SHELL?.split('/').pop() ??
    process.env.ComSpec?.split('\\').pop() ??
    'unknown';

  const aiTools: Record<string, boolean> = {
    'claude-code': which('claude') || hasDir(homedir(), '.claude'),
    'codex-cli': which('codex'),
    'gemini-cli': which('gemini'),
    'grok-cli': which('grok') || which('grok-cli') || hasDir(homedir(), '.grok'),
    aider: which('aider'),
    cline: which('cline'),
    'cursor-cli': which('cursor') || which('cursor-agent'),
    'windsurf-cli': which('windsurf'),
    continue: hasDir(homedir(), '.continue'),
    'roo-code': which('roo'),
  };

  const tools: Record<string, boolean> = {
    git: which('git'),
    docker: which('docker'),
    node: which('node'),
    npm: which('npm'),
    pnpm: which('pnpm'),
    yarn: which('yarn'),
    bun: which('bun'),
    cargo: which('cargo'),
    go: which('go'),
    rustc: which('rustc'),
    python: which('python') || which('python3'),
    java: which('java'),
    dotnet: which('dotnet'),
  };

  const editors: Record<string, boolean> = {
    vscode: which('code') || hasDir(homedir(), '.vscode'),
    cursor: which('cursor') || hasDir(homedir(), '.cursor'),
    vim: which('vim') || which('nvim'),
  };

  return {
    platform: process.platform,
    shell,
    arch: process.arch,
    nodeVersion: process.version,
    tools,
    editors,
    aiTools,
  };
}

/** Safe command existence check without shell injection */
export function commandExists(bin: string): boolean {
  return which(bin);
}
