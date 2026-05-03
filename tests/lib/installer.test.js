import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installFile, installToDualMirror } from '../../src/lib/installer.js';
import { hashFile, readManifest } from '../../src/lib/manifest.js';

describe('installer - installFile', () => {
  let tmp, sourceDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-install-test-'));
    sourceDir = mkdtempSync(join(tmpdir(), 'xp-stack-install-source-'));
    writeFileSync(join(sourceDir, 'SKILL.md'), '# Test Skill\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('copia source pra destino e retorna hash', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    const result = installFile(src, dest);
    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, 'utf8')).toBe('# Test Skill\n');
    expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.hash).toBe(hashFile(src));
  });

  it('retorna skipped=true se destino ja existe e overwrite=false', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    mkdirSync(join(tmp, '.claude/skills/test'), { recursive: true });
    writeFileSync(dest, '# Existing\n');
    const result = installFile(src, dest, { overwrite: false });
    expect(result.skipped).toBe(true);
    expect(readFileSync(dest, 'utf8')).toBe('# Existing\n');
  });

  it('sobrescreve se overwrite=true', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    mkdirSync(join(tmp, '.claude/skills/test'), { recursive: true });
    writeFileSync(dest, '# Existing\n');
    const result = installFile(src, dest, { overwrite: true });
    expect(result.skipped).toBeFalsy();
    expect(readFileSync(dest, 'utf8')).toBe('# Test Skill\n');
  });
});

describe('installer - installToDualMirror', () => {
  let tmp, sourceDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-dual-test-'));
    sourceDir = mkdtempSync(join(tmpdir(), 'xp-stack-dual-source-'));
    mkdirSync(join(sourceDir, 'skills', 'test'), { recursive: true });
    writeFileSync(join(sourceDir, 'skills', 'test', 'SKILL.md'), '# Test\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('instala em multiplas engines simultaneamente', () => {
    const result = installToDualMirror({
      sourceRel: 'skills/test/SKILL.md',
      sourceRoot: sourceDir,
      projectRoot: tmp,
      engines: ['claude-code', 'antigravity'],
    });
    expect(existsSync(join(tmp, '.claude/skills/skills/test/SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, '.agents/skills/skills/test/SKILL.md'))).toBe(true);
    expect(result.installed.length).toBe(2);
    expect(result.installed[0].destRel).toMatch(/\.claude\/skills/);
    expect(result.installed[1].destRel).toMatch(/\.agents\/skills/);
  });

  it('skipa engine desconhecida silenciosamente', () => {
    const result = installToDualMirror({
      sourceRel: 'skills/test/SKILL.md',
      sourceRoot: sourceDir,
      projectRoot: tmp,
      engines: ['claude-code', 'engine-inexistente'],
    });
    expect(result.installed.length).toBe(1);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].engine).toBe('engine-inexistente');
  });
});
