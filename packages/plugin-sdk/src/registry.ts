import type {
  ByteBreakPlugin,
  PluginContext,
  PluginHost,
  ThemeDefinition,
  IntegrationDefinition,
} from './types.js';
import type { GameFactory, EventDetector, Achievement } from '@bytebreak/shared';
import { PluginError } from '@bytebreak/shared';

/**
 * In-process plugin registry used by the daemon host.
 * Plugins cannot register twice under the same id.
 */
export class PluginRegistry implements PluginHost {
  private readonly plugins = new Map<string, ByteBreakPlugin>();
  private readonly games = new Map<string, GameFactory>();
  private readonly detectors = new Map<string, EventDetector>();
  private readonly themes = new Map<string, ThemeDefinition>();
  private readonly integrations = new Map<string, IntegrationDefinition>();
  private readonly achievements: Achievement[] = [];

  async load(plugin: ByteBreakPlugin, ctx: PluginContext): Promise<void> {
    const { id } = plugin.manifest;
    if (this.plugins.has(id)) {
      throw new PluginError(`Plugin already loaded: ${id}`);
    }
    await plugin.activate(this, ctx);
    this.plugins.set(id, plugin);
  }

  async unload(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    await plugin.deactivate?.();
    this.plugins.delete(id);
    // Detectors / games keyed by their own ids may outlive plugin unload intentionally
  }

  registerGame(factory: GameFactory): void {
    const game = factory();
    const id = game.manifest.id;
    if (this.games.has(id)) {
      throw new PluginError(`Game already registered: ${id}`);
    }
    this.games.set(id, factory);
  }

  registerEventDetector(detector: EventDetector): void {
    if (this.detectors.has(detector.id)) {
      throw new PluginError(`Event detector already registered: ${detector.id}`);
    }
    this.detectors.set(detector.id, detector);
  }

  registerTheme(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  registerIntegration(integration: IntegrationDefinition): void {
    this.integrations.set(integration.id, integration);
  }

  registerAchievements(achievements: Achievement[]): void {
    this.achievements.push(...achievements);
  }

  listPlugins(): ByteBreakPlugin[] {
    return [...this.plugins.values()];
  }

  listGames(): GameFactory[] {
    return [...this.games.values()];
  }

  getGame(id: string): GameFactory | undefined {
    return this.games.get(id);
  }

  listDetectors(): EventDetector[] {
    return [...this.detectors.values()];
  }

  listThemes(): ThemeDefinition[] {
    return [...this.themes.values()];
  }

  listIntegrations(): IntegrationDefinition[] {
    return [...this.integrations.values()];
  }

  listAchievements(): Achievement[] {
    return [...this.achievements];
  }
}
