import { randomUUID } from 'node:crypto';
import type { DeveloperEvent, EventKind, EventSeverity } from '@bytebreak/shared';

export function makeEvent(input: {
  kind: EventKind;
  title: string;
  message: string;
  source?: string;
  severity?: EventSeverity;
  suggestedDurationSec?: number;
  metadata?: Record<string, unknown>;
  estimatedEndAt?: string;
}): DeveloperEvent {
  return {
    id: randomUUID(),
    kind: input.kind,
    severity: input.severity ?? 'opportunity',
    title: input.title,
    message: input.message,
    source: input.source,
    suggestedDurationSec: input.suggestedDurationSec ?? 90,
    metadata: input.metadata ?? {},
    detectedAt: new Date().toISOString(),
    estimatedEndAt: input.estimatedEndAt,
  };
}
