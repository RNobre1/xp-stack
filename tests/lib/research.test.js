import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readSources,
  writeSources,
  readClaims,
  writeClaims,
  EMPTY_SOURCES,
  EMPTY_CLAIMS,
  addSource,
  addClaim,
} from '../../src/lib/research.js';

describe('research - EMPTY_SOURCES / EMPTY_CLAIMS', () => {
  it('retornam arrays vazios', () => {
    expect(EMPTY_SOURCES()).toEqual([]);
    expect(EMPTY_CLAIMS()).toEqual([]);
  });
});

describe('research - read/write sources', () => {
  let tmp, slugDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-research-test-'));
    slugDir = join(tmp, 'docs', 'pesquisas', 'estudo-x');
    mkdirSync(slugDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeSources + readSources roundtrip', () => {
    const sources = [
      { id: 'S1', url: 'https://example.com', title: 'Ex', type: 'official_docs', accessed_at: '2026-05-03', hash: 'sha256:abc' },
    ];
    writeSources(slugDir, sources);
    expect(readSources(slugDir)).toEqual(sources);
  });

  it('readSources retorna null se nao existe', () => {
    expect(readSources(slugDir)).toBeNull();
  });

  it('writeSources valida contra schema (rejeita url invalida)', () => {
    const invalid = [{ id: 'S1', url: 'not-a-url', title: 't', type: 'official_docs', accessed_at: '2026-05-03', hash: 'x' }];
    expect(() => writeSources(slugDir, invalid)).toThrow();
  });
});

describe('research - read/write claims', () => {
  let tmp, slugDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-research-claims-'));
    slugDir = join(tmp, 'docs', 'pesquisas', 'estudo-x');
    mkdirSync(slugDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeClaims + readClaims roundtrip', () => {
    const claims = [
      { id: 'C1', statement: 'X eh verdade', sources: ['S1'], confidence: '🟢', reviewed_by_critic: true },
    ];
    writeClaims(slugDir, claims);
    expect(readClaims(slugDir)).toEqual(claims);
  });

  it('writeClaims valida (confidence fora do enum)', () => {
    const invalid = [{ id: 'C1', statement: 'x', sources: ['S1'], confidence: 'maybe', reviewed_by_critic: false }];
    expect(() => writeClaims(slugDir, invalid)).toThrow();
  });
});

describe('research - addSource/addClaim helpers', () => {
  let tmp, slugDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-research-add-'));
    slugDir = join(tmp, 'docs', 'pesquisas', 'estudo-x');
    mkdirSync(slugDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('addSource adiciona ao array existente', () => {
    addSource(slugDir, { id: 'S1', url: 'https://a.com', title: 'A', type: 'official_docs', accessed_at: '2026-05-03', hash: 'sha256:1' });
    addSource(slugDir, { id: 'S2', url: 'https://b.com', title: 'B', type: 'blog_post', accessed_at: '2026-05-03', hash: 'sha256:2' });
    const s = readSources(slugDir);
    expect(s.length).toBe(2);
    expect(s[1].id).toBe('S2');
  });

  it('addClaim adiciona ao array existente', () => {
    addSource(slugDir, { id: 'S1', url: 'https://a.com', title: 'A', type: 'official_docs', accessed_at: '2026-05-03', hash: 'sha256:1' });
    addClaim(slugDir, { id: 'C1', statement: 'foo', sources: ['S1'], confidence: '🟡', reviewed_by_critic: false });
    const c = readClaims(slugDir);
    expect(c.length).toBe(1);
    expect(c[0].id).toBe('C1');
  });
});
