import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack regenerate-resume', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-regen-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3'], blockers: [],
    }, null, 2));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('gera RESUME.md em docs/tasks/feature-x/', () => {
    execFileSync('node', [BIN, 'regenerate-resume', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const resumePath = join(featureDir, 'RESUME.md');
    expect(existsSync(resumePath)).toBe(true);
    const content = readFileSync(resumePath, 'utf8');
    expect(content).toMatch(/feature-x/);
    expect(content).toMatch(/implementacao/);
  });

  it('falha se feature dir nao existe', () => {
    expect(() => {
      execFileSync('node', [BIN, 'regenerate-resume', 'feature-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrad|not found/i);
  });

  it('regenerate sobrescreve RESUME.md existente', () => {
    const resumePath = join(featureDir, 'RESUME.md');
    writeFileSync(resumePath, '# Conteudo antigo\n', 'utf8');
    execFileSync('node', [BIN, 'regenerate-resume', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const content = readFileSync(resumePath, 'utf8');
    expect(content).not.toMatch(/Conteudo antigo/);
    expect(content).toMatch(/feature-x — Resume/);
  });
});
