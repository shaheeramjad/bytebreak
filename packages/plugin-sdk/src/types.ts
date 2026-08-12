import type {
  Game,
  GameFactory,
  EventDetector,
  Achievement,
  ByteBreakConfig,
} from '@bytebreak/shared';

export type PluginKind = 'game' | 'event' | 'theme' | 'integration' | 'achievement';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  kind: PluginKind;
  description?: string;
  author?: string;
  homepage?: string;
  /** Semver range of compatible ByteBreak runtime */
  engines?: { bytebreak?: string };
  /** Permission requests — never include filesystem read of user code */
  permissions?: Array<'overlay' | 'network.analytics' | 'notifications' | 'clipboard'>;
}

export interface PluginContext {
  config: ByteBreakConfig;
  logger: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
  /** Data dir dedicated to this plugin */
  dataDir: string;
}

export interface PluginHost {
  registerGame(factory: GameFactory): void;
  registerEventDetector(detector: EventDetector): void;
  registerTheme(theme: ThemeDefinition): void;
  registerIntegration(integration: IntegrationDefinition): void;
  registerAchievements(achievements: Achievement[]): void;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  /** CSS variables / design tokens */
  tokens: Record<string, string>;
  overlayClassName?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  /** Tool binary names this integration detects */
  binaries?: string[];
  /** Hook setup called during `bytebreak` first-run */
  install?: (ctx: PluginContext) => Promise<void> | void;
  uninstall?: (ctx: PluginContext) => Promise<void> | void;
}

export interface ByteBreakPlugin {
  manifest: PluginManifest;
  activate(host: PluginHost, ctx: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
}

export interface GamePlugin extends ByteBreakPlugin {
  manifest: PluginManifest & { kind: 'game' };
  createGame: GameFactory;
}

export interface EventPlugin extends ByteBreakPlugin {
  manifest: PluginManifest & { kind: 'event' };
  detector: EventDetector;
}

export interface ThemePlugin extends ByteBreakPlugin {
  manifest: PluginManifest & { kind: 'theme' };
  theme: ThemeDefinition;
}

export interface IntegrationPlugin extends ByteBreakPlugin {
  manifest: PluginManifest & { kind: 'integration' };
  integration: IntegrationDefinition;
}

export interface AchievementPlugin extends ByteBreakPlugin {
  manifest: PluginManifest & { kind: 'achievement' };
  achievements: Achievement[];
}
