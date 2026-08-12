import { z } from 'zod';
import type { PluginManifest } from './types.js';
import { PluginError } from '@bytebreak/shared';

const ManifestSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
  name: z.string().min(1).max(80),
  version: z.string().min(1),
  kind: z.enum(['game', 'event', 'theme', 'integration', 'achievement']),
  description: z.string().max(500).optional(),
  author: z.string().max(120).optional(),
  homepage: z.string().url().optional(),
  engines: z.object({ bytebreak: z.string().optional() }).optional(),
  permissions: z
    .array(z.enum(['overlay', 'network.analytics', 'notifications', 'clipboard']))
    .optional(),
});

export function validateManifest(manifest: PluginManifest): PluginManifest {
  const result = ManifestSchema.safeParse(manifest);
  if (!result.success) {
    throw new PluginError(`Invalid plugin manifest: ${result.error.message}`, result.error.flatten());
  }
  return result.data as PluginManifest;
}
