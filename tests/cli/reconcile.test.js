import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack reconcile', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-reconcile-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3', 'T4'], blockers: [],
    }, null, 2));
    writeFileSync(join(featureDir, '00-overview.md'), `# feature-x

## Tasks

| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [ ] Pendente |
| T2 | Segunda | [ ] Pendente |
| T3 | Terceira | [ ] Pendente |
| T4 | Quarta | [ ] Pendente |
`, 'utf8');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('detecta divergencia + atualiza markdown (JSON wins)', () => {
    execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp, '--apply'], { encoding: 'utf8' });
    const overview = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    expect(overview).toMatch(/T1.*\[x\] Concluida/);
    expect(overview).toMatch(/T2.*\[x\] Concluida/);
    expect(overview).toMatch(/T3.*\[ \] Pendente/);
    expect(overview).toMatch(/T4.*\[ \] Pendente/);
  });

  it('sem --apply, mostra diff em dry-run (markdown nao muda)', () => {
    const before = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    const out = execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const after = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    expect(after).toBe(before);
    expect(out).toMatch(/divergencia|drift|diff/i);
  });

  it('sem divergencia, reporta "ja sincronizado"', () => {
    execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp, '--apply'], { encoding: 'utf8' });
    const out = execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/sincronizado|nothing to reconcile|sync/i);
  });

  it('falha se feature nao existe', () => {
    expect(() => {
      execFileSync('node', [BIN, 'reconcile', 'feature-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrad|not found/i);
  });
});
