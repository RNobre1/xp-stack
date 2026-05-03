import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack uninstall', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-uninstall-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('remove todos os files do manifest e o proprio manifest', () => {
    execFileSync('node', [BIN, 'uninstall', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(false);
    expect(existsSync(join(tmp, '.xp-stack/index.json'))).toBe(false);
  });

  it('preserva user-modified com --keep-user-modified', () => {
    // modifica algum arquivo trackado
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# Modified by user\n', 'utf8');
      execFileSync('node', [BIN, 'uninstall', '--cwd', tmp, '--yes', '--keep-user-modified'], { encoding: 'utf8' });
      expect(existsSync(trackedFile)).toBe(true); // preservado
      expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(false); // manifest removido
    }
  });

  it('falha sem --yes (interactive prompt requerido pra destrutivo)', () => {
    expect(() => {
      execFileSync('node', [BIN, 'uninstall', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/--yes obrigatorio|requires --yes/i);
  });
});
