import type {
  ByteBreakPlugin,
  GamePlugin,
  EventPlugin,
  ThemePlugin,
  IntegrationPlugin,
  AchievementPlugin,
  PluginManifest,
  ThemeDefinition,
  IntegrationDefinition,
} from './types.js';
import type { GameFactory, EventDetector, Achievement } from '@bytebreak/shared';
import { validateManifest } from './validate.js';

function basePlugin(
  manifest: PluginManifest,
  activate: ByteBreakPlugin['activate'],
): ByteBreakPlugin {
  validateManifest(manifest);
  return { manifest, activate };
}

/** Generic plugin definition helper */
export function definePlugin(plugin: ByteBreakPlugin): ByteBreakPlugin {
  validateManifest(plugin.manifest);
  return plugin;
}

export function defineGame(options: {
  manifest: Omit<PluginManifest, 'kind'> & { kind?: 'game' };
  createGame: GameFactory;
}): GamePlugin {
  const manifest = { ...options.manifest, kind: 'game' as const };
  validateManifest(manifest);
  return {
    manifest,
    createGame: options.createGame,
    activate(host) {
      host.registerGame(options.createGame);
    },
  };
}

export function defineEventDetector(options: {
  manifest: Omit<PluginManifest, 'kind'> & { kind?: 'event' };
  detector: EventDetector;
}): EventPlugin {
  const manifest = { ...options.manifest, kind: 'event' as const };
  validateManifest(manifest);
  return {
    manifest,
    detector: options.detector,
    activate(host) {
      host.registerEventDetector(options.detector);
    },
  };
}

export function defineTheme(options: {
  manifest: Omit<PluginManifest, 'kind'> & { kind?: 'theme' };
  theme: ThemeDefinition;
}): ThemePlugin {
  const manifest = { ...options.manifest, kind: 'theme' as const };
  validateManifest(manifest);
  return {
    manifest,
    theme: options.theme,
    activate(host) {
      host.registerTheme(options.theme);
    },
  };
}

export function defineIntegration(options: {
  manifest: Omit<PluginManifest, 'kind'> & { kind?: 'integration' };
  integration: IntegrationDefinition;
}): IntegrationPlugin {
  const manifest = { ...options.manifest, kind: 'integration' as const };
  validateManifest(manifest);
  return {
    manifest,
    integration: options.integration,
    activate(host, ctx) {
      host.registerIntegration(options.integration);
      return options.integration.install?.(ctx);
    },
  };
}

export function defineAchievementPack(options: {
  manifest: Omit<PluginManifest, 'kind'> & { kind?: 'achievement' };
  achievements: Achievement[];
}): AchievementPlugin {
  const manifest = { ...options.manifest, kind: 'achievement' as const };
  validateManifest(manifest);
  return {
    manifest,
    achievements: options.achievements,
    activate(host) {
      host.registerAchievements(options.achievements);
    },
  };
}

// silence unused import if tree-shaken
void basePlugin;
