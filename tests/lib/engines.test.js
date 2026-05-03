import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectEngines, ENGINE_PATHS } from '../../src/lib/engines.js';

describe('engines - ENGINE_PATHS export', () => {
  it('expoe os 13 engines suportados (alinhado com index.schema.json enum)', () => {
    const names = Object.keys(ENGINE_PATHS);
    expect(names).toContain('claude-code');
    expect(names).toContain('codex');
    expect(names).toContain('cursor');
    expect(names).toContain('antigravity');
    expect(names).toContain('gemini-cli');
    expect(names.length).toBe(13);
  });

  it('cada engine tem detectMarker e skillsDir definidos', () => {
    for (const [name, cfg] of Object.entries(ENGINE_PATHS)) {
      expect(cfg.detectMarker, `${name} missing detectMarker`).toBeTruthy();
      expect(cfg.skillsDir, `${name} missing skillsDir`).toBeTruthy();
    }
  });
});

describe('engines - detectEngines', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-engines-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('retorna array vazio em projeto sem nenhuma engine', () => {
    const result = detectEngines(tmp);
    expect(result).toEqual([]);
  });

  it('detecta claude-code via .claude/', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    const result = detectEngines(tmp);
    expect(result).toContain('claude-code');
  });

  it('detecta antigravity via AGENTS.md', () => {
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const result = detectEngines(tmp);
    expect(result).toContain('antigravity');
  });

  it('detecta multiplas engines simultaneamente', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    mkdirSync(join(tmp, '.cursor'), { recursive: true });
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const result = detectEngines(tmp);
    expect(result).toContain('claude-code');
    expect(result).toContain('cursor');
    expect(result).toContain('antigravity');
    expect(result.length).toBe(3);
  });
});
