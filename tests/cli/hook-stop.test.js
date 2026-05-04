import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack hook-stop', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-hook-stop-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    const featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'fundacao',
      phases_completed: [], phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [], tasks_pending: ['T1'], blockers: [],
    }, null, 2));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('com --feature <slug>, atualiza index.json (last_touched novo)', () => {
    const idxPath = join(tmp, '.xp-stack/index.json');
    execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp, '--feature', 'feature-x'], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    const f = idx.active_features.find((x) => x.slug === 'feature-x');
    expect(f).toBeTruthy();
    expect(f.phase).toBe('fundacao');
    expect(f.last_touched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sem --feature, auto-detect feature mais recente em docs/tasks/', () => {
    const fyDir = join(tmp, 'docs', 'tasks', 'feature-y');
    mkdirSync(fyDir, { recursive: true });
    const fyStatePath = join(fyDir, 'state.json');
    writeFileSync(fyStatePath, JSON.stringify({
      schema_version: '1.0', feature: 'feature-y', phase: 'testes',
      phases_completed: ['fundacao'], phases_pending: ['implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [], tasks_pending: ['T1'], blockers: [],
    }, null, 2));
    // Forca mtime de feature-y 2s no futuro garantindo auto-detect correto
    const future = new Date(Date.now() + 2000);
    utimesSync(fyStatePath, future, future);

    execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp], { encoding: 'utf8' });

    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    const fy = idx.active_features.find((x) => x.slug === 'feature-y');
    expect(fy).toBeTruthy();
    expect(fy.phase).toBe('testes');
  });

  it('sem features (docs/tasks/ vazio): no-op silencioso (exit 0, sem erro)', () => {
    rmSync(join(tmp, 'docs', 'tasks'), { recursive: true, force: true });
    expect(() => {
      execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp], { encoding: 'utf8' });
    }).not.toThrow();
  });

  it('com --feature inexistente: throw com mensagem clara', () => {
    expect(() => {
      execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp, '--feature', 'feature-inexistente'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrada|not found/i);
  });
});

describe('xp-stack init --with-hooks', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-init-hooks-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('com --with-hooks, cria/atualiza .claude/settings.json com hook Stop', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    const settings = JSON.parse(readFileSync(join(tmp, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks).toBeTruthy();
    expect(settings.hooks.Stop).toBeTruthy();
    const stopHooksJson = JSON.stringify(settings.hooks.Stop);
    expect(stopHooksJson).toMatch(/xp-stack/);
    expect(stopHooksJson).toMatch(/hook-stop/);
  });

  it('sem --with-hooks, cria settings.json (do template) mas SEM hook Stop', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    // v1.1.0: init sempre scaffolda .claude/settings.json a partir do template (claude-settings-project.json),
    // que nao inclui hooks. --with-hooks injeta o hook Stop adicionalmente.
    expect(existsSync(join(tmp, '.claude', 'settings.json'))).toBe(true);
    const settings = JSON.parse(readFileSync(join(tmp, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks).toBeUndefined();
  });

  it('--with-hooks idempotente: re-rodar nao duplica hook entries', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    const settings = JSON.parse(readFileSync(join(tmp, '.claude', 'settings.json'), 'utf8'));
    const matches = JSON.stringify(settings.hooks.Stop).match(/hook-stop/g);
    expect(matches.length).toBe(1);
  });
});
