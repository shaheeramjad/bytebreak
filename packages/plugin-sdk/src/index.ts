/**
 * @bytebreak/plugin-sdk
 *
 * First-class plugin surface. External developers create games, events,
 * themes, integrations, and achievements without modifying core code.
 */
export {
  definePlugin,
  defineGame,
  defineEventDetector,
  defineTheme,
  defineIntegration,
  defineAchievementPack,
} from './define.js';
export type {
  PluginKind,
  PluginManifest,
  ByteBreakPlugin,
  GamePlugin,
  EventPlugin,
  ThemePlugin,
  IntegrationPlugin,
  AchievementPlugin,
  PluginContext,
  PluginHost,
} from './types.js';
export { PluginRegistry } from './registry.js';
export { validateManifest } from './validate.js';

// Re-export contracts plugins need
export type {
  Game,
  GameManifest,
  GameInitializeOptions,
  GameState,
  GameSubmission,
  GameScore,
  GameResult,
  EventDetector,
  DeveloperEvent,
  EventContext,
  Achievement,
} from '@bytebreak/shared';
