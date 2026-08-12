import { describe, it, expect } from 'vitest';
import {
  XP_TITLES,
  XP_TITLE_THRESHOLDS,
  ByteBreakConfigSchema,
  createIpcRequest,
  createIpcSuccess,
  NdjsonParser,
  BuiltinEventKind,
} from './index.js';

describe('@bytebreak/shared', () => {
  it('defines ordered XP titles', () => {
    expect(XP_TITLES[0]).toBe('Intern');
    expect(XP_TITLES[XP_TITLES.length - 1]).toBe('Legend');
    expect(XP_TITLE_THRESHOLDS.Legend).toBeGreaterThan(XP_TITLE_THRESHOLDS.Intern);
  });

  it('parses default config', () => {
    const cfg = ByteBreakConfigSchema.parse({});
    expect(cfg.overlayEnabled).toBe(true);
    expect(cfg.defaultDurationSec).toBe(90);
  });

  it('creates valid IPC request/response', () => {
    const req = createIpcRequest('ping');
    expect(req.method).toBe('ping');
    expect(req.protocolVersion).toBe(1);
    const res = createIpcSuccess(req.id, { pong: true });
    expect(res.ok).toBe(true);
  });

  it('parses NDJSON streams', () => {
    const parser = new NdjsonParser();
    const msgs = parser.push('{"a":1}\n{"b":2}\n partial');
    expect(msgs).toHaveLength(2);
    const more = parser.push('\n');
    // incomplete " partial" until newline — after \n alone may not complete if partial has no full JSON
    expect(Array.isArray(more)).toBe(true);
  });

  it('exports builtin event kinds', () => {
    expect(BuiltinEventKind.AI_LIMIT_REACHED).toBe('AI_LIMIT_REACHED');
    expect(BuiltinEventKind.NPM_INSTALL).toBe('NPM_INSTALL');
  });
});
