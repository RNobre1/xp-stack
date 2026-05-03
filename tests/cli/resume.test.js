import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack resume', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-resume-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('sem features ativas, lista vazia', () => {
    const out = execFileSync('node', [BIN, 'resume', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/nenhuma feature ativa|no active features/i);
  });

  it('com feature ativa, lista no output', () => {
    // simular feature ativa adicionando ao index.json + criando state.json
    const idxPath = join(tmp, '.xp-stack/index.json');
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    idx.active_features.push({ slug: 'feature-x', phase: 'fundacao', last_touched: new Date().toISOString() });
    writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n', 'utf8');
    mkdirSync(join(tmp, 'docs/tasks/feature-x'), { recursive: true });
    const stateFile = join(tmp, 'docs/tasks/feature-x/state.json');
    writeFileSync(stateFile, JSON.stringify({
      schema_version: '1.0',
      feature: 'feature-x',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [],
      tasks_pending: ['T1'],
      blockers: [],
    }, null, 2));

    const out = execFileSync('node', [BIN, 'resume', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/feature-x/);
    expect(out).toMatch(/fundacao/);
  });

  it('com slug especifico, mostra detalhes da feature', () => {
    const idxPath = join(tmp, '.xp-stack/index.json');
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    idx.active_features.push({ slug: 'feature-y', phase: 'implementacao', last_touched: new Date().toISOString() });
    writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n', 'utf8');
    mkdirSync(join(tmp, 'docs/tasks/feature-y'), { recursive: true });
    writeFileSync(join(tmp, 'docs/tasks/feature-y/state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-y', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3', 'T4'], blockers: [],
    }, null, 2));

    const out = execFileSync('node', [BIN, 'resume', 'feature-y', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/feature-y/);
    expect(out).toMatch(/implementacao/);
    expect(out).toMatch(/T3/);
  });
});
