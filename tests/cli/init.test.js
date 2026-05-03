import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack init', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-init-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('em projeto sem nenhuma engine, sem --engine, falha com mensagem clara', () => {
    expect(() => {
      execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nenhuma engine detectada/i);
  });

  it('em projeto com .claude/, init cria .xp-stack/manifest.json e index.json', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(true);
    expect(existsSync(join(tmp, '.xp-stack/index.json'))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    expect(manifest.schema_version).toBe('1.0');
    expect(manifest.installed_version).toBeTruthy();

    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('claude-code');
  });

  it('flag --engine sobrescreve detect (forca engines)', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code,antigravity', '--yes'], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('claude-code');
    expect(idx.engines_installed).toContain('antigravity');
  });

  it('idempotente: re-rodar init nao sobrescreve manifest existente', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const m1 = readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8');
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const m2 = readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8');
    // installed_at pode mudar mas estrutura deve permanecer estavel
    const j1 = JSON.parse(m1);
    const j2 = JSON.parse(m2);
    expect(j2.installed_version).toBe(j1.installed_version);
    expect(Object.keys(j2.files).sort()).toEqual(Object.keys(j1.files).sort());
  });

  it('--no-dual-mirror desabilita instalacao em .agents/skills/ quando claude-code detectado', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--no-dual-mirror', '--yes'], { encoding: 'utf8' });
    // sem --no-dual-mirror, antigravity (.agents/skills) seria adicionado mesmo sem AGENTS.md
    // com --no-dual-mirror, so claude-code
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toEqual(['claude-code']);
  });

  it('com 2+ engines reais detectadas, imprime warning sugerindo --engine explicit', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    mkdirSync(join(tmp, '.cursor'), { recursive: true });
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const out = execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(out).toMatch(/multiplas engines detectadas|multiple engines/i);
    expect(out).toMatch(/--engine/);
  });
});
