import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR_NAME } from '@bytebreak/shared';

const MARKER_BEGIN = '# >>> bytebreak >>>';
const MARKER_END = '# <<< bytebreak <<<';

/**
 * Always install shell hooks against the REAL user home (~/.bytebreak),
 * never against a temporary BYTEBREAK_HOME used in tests.
 * That prevents poison paths like /tmp/bb-xxx/hooks in .bashrc.
 */
function userHooksHome(): string {
  return join(homedir(), CONFIG_DIR_NAME);
}

/**
 * Auto-install shell hooks. Idempotent.
 * - Long commands → notify daemon
 * - Every prompt → show pending play suggestion (AI limit / wait)
 * Privacy: never captures command arguments or file contents.
 */
export function installShellHooks(_home?: string): {
  shell: string;
  rcFile?: string;
  installed: boolean;
  hookFile: string;
} {
  if (process.env.BYTEBREAK_SKIP_HOOKS === '1') {
    return {
      shell: process.env.SHELL?.split('/').pop() ?? 'unknown',
      installed: false,
      hookFile: '',
    };
  }

  const shellPath = process.env.SHELL ?? '';
  const shell = shellPath.split('/').pop() ?? 'bash';
  const bbHome = userHooksHome();
  const hooksDir = join(bbHome, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hookFile = join(hooksDir, 'bytebreak.sh');
  writeFileSync(hookFile, buildHookScript(), { encoding: 'utf8', mode: 0o755 });

  const rcFile = resolveRcFile(shell);
  if (!rcFile) {
    return { shell, installed: true, hookFile };
  }

  try {
    // Source via $HOME so it survives and is never a /tmp test path
    const sourceLine = `[ -f "$HOME/${CONFIG_DIR_NAME}/hooks/bytebreak.sh" ] && source "$HOME/${CONFIG_DIR_NAME}/hooks/bytebreak.sh"`;
    const block = `${MARKER_BEGIN}\n${sourceLine}\n${MARKER_END}\n`;

    let content = '';
    if (existsSync(rcFile)) {
      content = readFileSync(rcFile, 'utf8');
    }

    if (content.includes(MARKER_BEGIN)) {
      const re = new RegExp(`${escapeReg(MARKER_BEGIN)}[\\s\\S]*?${escapeReg(MARKER_END)}\\n?`);
      content = content.replace(re, block);
      writeFileSync(rcFile, content, 'utf8');
    } else {
      appendFileSync(rcFile, `\n${block}`, 'utf8');
    }
    return { shell, rcFile, installed: true, hookFile };
  } catch {
    return { shell, installed: true, hookFile };
  }
}

export function uninstallShellHooks(_home?: string): boolean {
  const shellPath = process.env.SHELL ?? '';
  const shell = shellPath.split('/').pop() ?? 'bash';
  const rcFile = resolveRcFile(shell);
  if (!rcFile || !existsSync(rcFile)) return false;
  let content = readFileSync(rcFile, 'utf8');
  if (!content.includes(MARKER_BEGIN)) return false;
  const re = new RegExp(`\\n?${escapeReg(MARKER_BEGIN)}[\\s\\S]*?${escapeReg(MARKER_END)}\\n?`);
  content = content.replace(re, '\n');
  writeFileSync(rcFile, content, 'utf8');
  return true;
}

function resolveRcFile(shell: string): string | undefined {
  const home = homedir();
  switch (shell) {
    case 'zsh':
      return join(home, '.zshrc');
    case 'bash':
      if (existsSync(join(home, '.bashrc'))) return join(home, '.bashrc');
      return join(home, '.bash_profile');
    case 'fish':
      return join(home, '.config', 'fish', 'config.fish');
    default:
      return join(home, '.bashrc');
  }
}

function buildHookScript(): string {
  return `#!/usr/bin/env bash
# ByteBreak shell integration — auto-generated. Do not edit.
# Privacy: never captures command arguments or file contents.
export BYTEBREAK_HOME="\${BYTEBREAK_HOME:-$HOME/${CONFIG_DIR_NAME}}"

# Show one-shot play suggestion (written by daemon on AI limit / waits)
__bytebreak_show_suggest() {
  local f="\${BYTEBREAK_HOME}/suggest"
  [ -f "$f" ] || return 0
  if command -v bytebreak >/dev/null 2>&1; then
    bytebreak hook peek 2>/dev/null && return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$f" <<'PY' 2>/dev/null && rm -f "$f"
import json,sys
try:
  s=json.load(open(sys.argv[1]))
  print(s.get("banner") or "")
except Exception:
  pass
PY
    return 0
  fi
  echo ""
  echo "  ⚡ ByteBreak — free moment detected. Run: bytebreak"
  echo ""
  rm -f "$f"
}

__bytebreak_preexec() {
  export BYTEBREAK_CMD_START=$SECONDS
  local cmd="$1"
  export BYTEBREAK_CMD_NAME="\${cmd%% *}"
}

__bytebreak_precmd() {
  __bytebreak_show_suggest

  local start=\${BYTEBREAK_CMD_START:-0}
  local name=\${BYTEBREAK_CMD_NAME:-}
  unset BYTEBREAK_CMD_START BYTEBREAK_CMD_NAME
  [ -z "$name" ] && return 0
  local elapsed=$(( SECONDS - start ))
  if [ "$elapsed" -ge 5 ]; then
    local base
    base=$(basename -- "$name" 2>/dev/null || echo "$name")
    (command -v bytebreak >/dev/null 2>&1 && bytebreak hook long-command --name "$base" --elapsed "$elapsed" >/dev/null 2>&1 &)
  fi
  if [ -n "\${BYTEBREAK_AI_LIMIT:-}" ] || [ -n "\${CLAUDE_RATE_LIMIT:-}" ] || [ -n "\${CODEX_RATE_LIMIT:-}" ] || [ -n "\${GROK_RATE_LIMIT:-}" ] || [ -n "\${GEMINI_RATE_LIMIT:-}" ]; then
    local src="\${BYTEBREAK_AI_SOURCE:-Your AI agent}"
    (command -v bytebreak >/dev/null 2>&1 && bytebreak hook ai-limit --source "$src" >/dev/null 2>&1 &)
    unset BYTEBREAK_AI_LIMIT CLAUDE_RATE_LIMIT CODEX_RATE_LIMIT GROK_RATE_LIMIT GEMINI_RATE_LIMIT
  fi
}

# zsh
if [ -n "\${ZSH_VERSION:-}" ]; then
  autoload -Uz add-zsh-hook 2>/dev/null || true
  add-zsh-hook preexec __bytebreak_preexec 2>/dev/null || true
  add-zsh-hook precmd __bytebreak_precmd 2>/dev/null || true
fi

# bash
if [ -n "\${BASH_VERSION:-}" ]; then
  if [[ -z "\${BYTEBREAK_BASH_HOOKED:-}" ]]; then
    export BYTEBREAK_BASH_HOOKED=1
    trap '__bytebreak_preexec "$BASH_COMMAND"' DEBUG
    PROMPT_COMMAND="__bytebreak_precmd\${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
  fi
fi
`;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
