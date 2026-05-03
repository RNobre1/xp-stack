import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack update', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-update-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('sem mudancas, update reporta "nothing to update"', () => {
    const out = execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(out).toMatch(/nothing to update|nada pra atualizar/i);
  });

  it('detecta arquivo user-modified e marca como tal no manifest', () => {
    // Modificar um arquivo trackado (README.md do templates/skills)
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# User-modified content\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--keep-mine'], { encoding: 'utf8' });
      const m = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
      expect(m.files['.claude/skills/skills/README.md'].user_modified).toBe(true);
    }
  });

  it('--yes + --take-theirs sobrescreve user-modified', () => {
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# User-modified\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { encoding: 'utf8' });
      const content = readFileSync(trackedFile, 'utf8');
      expect(content).toBe('# Templates de skills (populado em W3+)\n');
    }
  });

  it('falha se manifest nao existe (nao foi feito init)', () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'xp-stack-update-noinit-'));
    expect(() => {
      execFileSync('node', [BIN, 'update', '--cwd', tmp2, '--yes'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/manifest nao encontrado|run init first/i);
    rmSync(tmp2, { recursive: true, force: true });
  });
});
