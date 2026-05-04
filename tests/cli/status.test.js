import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');
const PKG_VERSION = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version;

describe('xp-stack status', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-status-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('em projeto sem init, status reporta "nao instalado"', () => {
    const out = execFileSync('node', [BIN, 'status', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/nao instalado|not installed/i);
  });

  it('apos init, status mostra version + engines + count de files', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const out = execFileSync('node', [BIN, 'status', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toContain(`version: ${PKG_VERSION}`);
    expect(out).toMatch(/engines:.*claude-code/);
    expect(out).toMatch(/files:/);
  });
});
