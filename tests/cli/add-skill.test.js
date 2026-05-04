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
  let tmp, optInRoot;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-skill-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    // Cria opt-in dir num tmp ISOLADO (NAO no REPO_ROOT) e aponta o CLI via env var.
    // Razao: tocar em REPO_ROOT/templates/opt-in-skills apaga as 3 skills opt-in reais
    // (db-archaeologist, flowchart-extractor, screenshot-spec-writer) entre runs do vitest.
    optInRoot = mkdtempSync(join(tmpdir(), 'xp-stack-optin-test-'));
    const demoSkillDir = join(optInRoot, 'demo-skill');
    mkdirSync(demoSkillDir, { recursive: true });
    writeFileSync(join(demoSkillDir, 'SKILL.md'), '# demo skill\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(optInRoot, { recursive: true, force: true });
  });

  it('instala skill opt-in conhecida', () => {
    execFileSync('node', [BIN, 'add-skill', 'demo-skill', '--cwd', tmp], {
      encoding: 'utf8',
      env: { ...process.env, XP_STACK_OPT_IN_ROOT: optInRoot },
    });
    const installed = join(tmp, '.claude/skills/demo-skill/SKILL.md');
    expect(existsSync(installed)).toBe(true);
  });

  it('falha pra skill nao existente em templates/opt-in-skills', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-skill', 'skill-inexistente', '--cwd', tmp], {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, XP_STACK_OPT_IN_ROOT: optInRoot },
      });
    }).toThrow(/skill nao encontrada|skill not found/i);
  });
});
