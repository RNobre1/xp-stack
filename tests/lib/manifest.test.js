import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hashFile,
  readManifest,
  writeManifest,
  detectDrift,
  EMPTY_MANIFEST,
} from '../../src/lib/manifest.js';

describe('manifest - EMPTY_MANIFEST', () => {
  it('retorna manifest vazio com schema_version 1.0', () => {
    const m = EMPTY_MANIFEST('1.0.0');
    expect(m.schema_version).toBe('1.0');
    expect(m.installed_version).toBe('1.0.0');
    expect(m.files).toEqual({});
    expect(m.installed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('manifest - hashFile', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('retorna hash sha256: prefix + 64 hex chars pra arquivo conhecido', () => {
    const f = join(tmp, 'a.txt');
    writeFileSync(f, 'hello');
    const h = hashFile(f);
    expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(h).toBe('sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('hashes diferentes pra contents diferentes', () => {
    const f1 = join(tmp, 'a.txt');
    const f2 = join(tmp, 'b.txt');
    writeFileSync(f1, 'a');
    writeFileSync(f2, 'b');
    expect(hashFile(f1)).not.toBe(hashFile(f2));
  });
});

describe('manifest - read/write', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-rw-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeManifest persiste e readManifest le de volta', () => {
    const m = EMPTY_MANIFEST('1.0.0');
    m.files['.claude/skills/x.md'] = {
      hash: 'sha256:abc',
      source: 'templates/skills/x.md',
      user_modified: false,
    };
    writeManifest(tmp, m);

    const read = readManifest(tmp);
    expect(read).toEqual(m);
  });

  it('readManifest retorna null se manifest nao existe', () => {
    const result = readManifest(tmp);
    expect(result).toBeNull();
  });

  it('writeManifest valida contra schema antes de escrever', () => {
    const invalid = { schema_version: 'errado', installed_version: '1.0.0', installed_at: '2026-05-03T00:00:00Z', files: {} };
    expect(() => writeManifest(tmp, invalid)).toThrow();
  });
});

describe('manifest - detectDrift', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-drift-'));
    mkdirSync(join(tmp, 'subdir'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('detecta arquivo nao-modificado quando hash bate', () => {
    const f = join(tmp, 'subdir', 'a.txt');
    writeFileSync(f, 'hello');
    const result = detectDrift(tmp, 'subdir/a.txt', 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result).toBe('unchanged');
  });

  it('detecta arquivo modificado quando hash diverge', () => {
    const f = join(tmp, 'subdir', 'a.txt');
    writeFileSync(f, 'modified content');
    const result = detectDrift(tmp, 'subdir/a.txt', 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result).toBe('modified');
  });

  it('detecta arquivo deletado', () => {
    const result = detectDrift(tmp, 'subdir/inexistente.txt', 'sha256:any');
    expect(result).toBe('deleted');
  });
});
