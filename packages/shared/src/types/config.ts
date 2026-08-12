import { z } from 'zod';

export const OverlayPositionSchema = z.enum([
  'center',
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
]);
export type OverlayPosition = z.infer<typeof OverlayPositionSchema>;

export const ByteBreakConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  apiUrl: z.string().url().optional(),
  /** User consented to anonymous gameplay analytics */
  analyticsConsent: z.boolean().default(false),
  /**
   * Suggest a game when waits/limits are detected.
   * Shows a one-line tip in the terminal (via shell hooks) and optional desktop notify.
   */
  suggestionsEnabled: z.boolean().default(true),
  /** Desktop notification (notify-send / osascript) when a wait is detected */
  desktopNotify: z.boolean().default(true),
  /** @deprecated use suggestionsEnabled — kept for older configs */
  overlayEnabled: z.boolean().default(true),
  overlayPosition: OverlayPositionSchema.default('center'),
  /** Minimum seconds between automatic prompts (per event kind) */
  cooldownSec: z.number().int().nonnegative().default(300),
  /** Which event kinds should trigger the overlay */
  enabledEvents: z.array(z.string()).default([]),
  /** Preferred languages for game content */
  preferredLanguages: z.array(z.string()).default(['typescript', 'javascript', 'python']),
  /** Default game duration in seconds */
  defaultDurationSec: z.number().int().positive().default(90),
  /** Auto-start daemon on login */
  autoStartDaemon: z.boolean().default(true),
  /** Theme id */
  theme: z.string().default('default'),
  /** Quiet hours — ISO time "HH:mm" local */
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      start: z.string().default('22:00'),
      end: z.string().default('08:00'),
    })
    .default({}),
  updatedAt: z.string().datetime().optional(),
});

export type ByteBreakConfig = z.infer<typeof ByteBreakConfigSchema>;

export const DEFAULT_CONFIG: ByteBreakConfig = ByteBreakConfigSchema.parse({});
