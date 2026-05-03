import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack add-skill', () => {
  let tmp, optInDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-skill-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    // Garante skill opt-in dummy pra teste
    optInDir = join(REPO_ROOT, 'templates', 'opt-in-skills', 'demo-skill');
    mkdirSync(optInDir, { recursive: true });
    writeFileSync(join(optInDir, 'SKILL.md'), '# demo skill\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(join(REPO_ROOT, 'templates', 'opt-in-skills'), { recursive: true, force: true });
  });

  it('instala skill opt-in conhecida', () => {
    execFileSync('node', [BIN, 'add-skill', 'demo-skill', '--cwd', tmp], { encoding: 'utf8' });
    const installed = join(tmp, '.claude/skills/demo-skill/SKILL.md');
    expect(existsSync(installed)).toBe(true);
  });

  it('falha pra skill nao existente em templates/opt-in-skills', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-skill', 'skill-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/skill nao encontrada|skill not found/i);
  });
});
