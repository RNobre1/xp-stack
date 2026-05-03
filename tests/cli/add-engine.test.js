import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack add-engine', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-engine-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('adiciona engine no index e instala templates pra ela', () => {
    execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('cursor');
  });

  it('falha com engine name desconhecido', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'engine-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/engine desconhecida|unknown engine/i);
  });

  it('idempotente: adicionar engine ja presente nao falha', () => {
    execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    }).not.toThrow();
  });
});
