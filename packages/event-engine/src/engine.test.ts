import { describe, it, expect, vi } from 'vitest';
import { EventEngine } from './engine.js';
import { DEFAULT_CONFIG, type EventDetector, type DeveloperEvent } from '@bytebreak/shared';
import { randomUUID } from 'node:crypto';

function fakeDetector(events: DeveloperEvent[]): EventDetector {
  return {
    id: 'fake',
    name: 'Fake',
    version: '1.0.0',
    kinds: ['TEST'],
    pollIntervalMs: 0,
    detect: () => events,
  };
}

function evt(kind = 'TEST'): DeveloperEvent {
  return {
    id: randomUUID(),
    kind,
    severity: 'opportunity',
    title: 't',
    message: 'm',
    suggestedDurationSec: 90,
    metadata: {},
    detectedAt: new Date().toISOString(),
  };
}

describe('EventEngine', () => {
  it('publishes detector events on tick', async () => {
    const e = evt('CUSTOM');
    const engine = new EventEngine({
      config: { ...DEFAULT_CONFIG, cooldownSec: 0 },
      detectors: [fakeDetector([e])],
      disableSampling: true,
    });
    const received: DeveloperEvent[] = [];
    engine.onEvent((ev) => received.push(ev));
    await engine.start();
    const published = await engine.tick();
    expect(published).toHaveLength(1);
    expect(received).toHaveLength(1);
    expect(received[0]?.kind).toBe('CUSTOM');
    await engine.stop();
  });

  it('respects cooldown', async () => {
    const engine = new EventEngine({
      config: { ...DEFAULT_CONFIG, cooldownSec: 60 },
      detectors: [
        {
          id: 'c',
          name: 'c',
          version: '1',
          kinds: ['X'],
          pollIntervalMs: 0,
          detect: () => [evt('X')],
        },
      ],
      disableSampling: true,
    });
    await engine.start();
    expect(await engine.tick()).toHaveLength(1);
    expect(await engine.tick()).toHaveLength(0);
    await engine.stop();
  });

  it('injects external events', async () => {
    const engine = new EventEngine({
      config: { ...DEFAULT_CONFIG, cooldownSec: 0 },
      detectors: [],
      disableSampling: true,
    });
    const spy = vi.fn();
    engine.onEvent(spy);
    expect(engine.inject(evt('AI_LIMIT_REACHED'))).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
  });
});
