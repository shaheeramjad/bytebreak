/** Product identity */
export const PRODUCT_NAME = 'ByteBreak';
export const PRODUCT_TAGLINE = 'The entertainment layer for developers.';
export const PRODUCT_VERSION = '0.1.4';

/** Default API / cloud */
export const DEFAULT_API_URL = 'https://api.bytebreak.dev';
export const DEFAULT_WS_URL = 'wss://api.bytebreak.dev/ws';

/** Local runtime paths (relative to BYTEBREAK_HOME or ~/.bytebreak) */
export const CONFIG_DIR_NAME = '.bytebreak';
export const CONFIG_FILE_NAME = 'config.json';
export const LOCAL_DB_NAME = 'bytebreak.db';
export const DAEMON_PID_FILE = 'daemon.pid';
export const DAEMON_SOCKET_NAME = 'daemon.sock';
export const DAEMON_LOG_FILE = 'daemon.log';
export const HOOKS_DIR_NAME = 'hooks';
/** Pending one-shot play suggestion shown in the terminal */
export const SUGGEST_FILE_NAME = 'suggest';

/** Performance budgets */
export const PERF = {
  /** Cold CLI startup target (ms) */
  COLD_START_MS: 100,
  /** Game launch target (ms) */
  GAME_LAUNCH_MS: 1000,
  /** Daemon idle CPU should be near zero */
  DAEMON_IDLE_POLL_MS: 250,
  /** Long command threshold before LONG_COMMAND event (ms) */
  LONG_COMMAND_THRESHOLD_MS: 5_000,
  /** Idle detection threshold (ms) */
  IDLE_THRESHOLD_MS: 60_000,
} as const;

/** XP titles — ordered from lowest to highest rank */
export const XP_TITLES = [
  'Intern',
  'Junior',
  'Mid',
  'Senior',
  'Staff',
  'Principal',
  'Architect',
  'Legend',
] as const;

export type XpTitle = (typeof XP_TITLES)[number];

/** XP thresholds for titles (inclusive lower bound) */
export const XP_TITLE_THRESHOLDS: Record<XpTitle, number> = {
  Intern: 0,
  Junior: 500,
  Mid: 2_000,
  Senior: 5_000,
  Staff: 12_000,
  Principal: 25_000,
  Architect: 50_000,
  Legend: 100_000,
};

/** Default game duration options (seconds) */
export const GAME_DURATIONS = {
  BLITZ: 90,
  STANDARD: 180,
  EXTENDED: 300,
} as const;

/** Supported languages / technologies for games */
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'csharp',
  'sql',
  'docker',
  'yaml',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** IPC protocol version — bump on breaking daemon protocol changes */
export const IPC_PROTOCOL_VERSION = 1;

/** Privacy: we never collect source code */
export const PRIVACY_POLICY = {
  NEVER_COLLECT_CODE: true,
  NEVER_UPLOAD_SOURCE: true,
  ANALYTICS_OPT_IN_ONLY: true,
} as const;
