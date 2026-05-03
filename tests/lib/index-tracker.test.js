import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readIndex,
  writeIndex,
  registerFeature,
  EMPTY_INDEX,
} from '../../src/lib/index-tracker.js';

describe('index-tracker - EMPTY_INDEX', () => {
  it('cria index vazio com defaults validos', () => {
    const idx = EMPTY_INDEX();
    expect(idx.schema_version).toBe('1.0');
    expect(idx.active_features).toEqual([]);
    expect(idx.archived_features).toEqual([]);
    expect(idx.doc_level_default).toBe('completo');
    expect(idx.engines_installed).toEqual([]);
  });
});

describe('index-tracker - read/write', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-index-test-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeIndex persiste e readIndex le de volta', () => {
    const idx = EMPTY_INDEX();
    idx.engines_installed = ['claude-code'];
    writeIndex(tmp, idx);

    const read = readIndex(tmp);
    expect(read).toEqual(idx);
  });

  it('readIndex retorna null se nao existe', () => {
    expect(readIndex(tmp)).toBeNull();
  });

  it('writeIndex valida contra schema antes de escrever', () => {
    const invalid = { schema_version: 'errado', active_features: [], archived_features: [], doc_level_default: 'completo', engines_installed: [] };
    expect(() => writeIndex(tmp, invalid)).toThrow();
  });
});

describe('index-tracker - registerFeature', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-index-rf-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
    writeIndex(tmp, EMPTY_INDEX());
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('adiciona feature em active_features', () => {
    registerFeature(tmp, 'v1.0.0-ship', 'fundacao');
    const idx = readIndex(tmp);
    expect(idx.active_features.length).toBe(1);
    expect(idx.active_features[0].slug).toBe('v1.0.0-ship');
    expect(idx.active_features[0].phase).toBe('fundacao');
    expect(idx.active_features[0].last_touched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('atualiza last_touched + phase se feature ja existe', async () => {
    registerFeature(tmp, 'v1.0.0-ship', 'fundacao');
    await new Promise((r) => setTimeout(r, 5));
    registerFeature(tmp, 'v1.0.0-ship', 'testes');
    const idx = readIndex(tmp);
    expect(idx.active_features.length).toBe(1);
    expect(idx.active_features[0].phase).toBe('testes');
  });
});
