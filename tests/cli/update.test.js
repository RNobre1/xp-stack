import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');
const RULES = '.claude/skills/akita-xp-rules/SKILL.md';
const SOURCE = 'plugins/xp-stack/skills/akita-xp-rules/SKILL.md';
const hash = (s) => `sha256:${createHash('sha256').update(s).digest('hex')}`;

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
    const trackedFile = join(tmp, RULES);
    expect(existsSync(trackedFile)).toBe(true);
      writeFileSync(trackedFile, '# User-modified content\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--keep-mine'], { encoding: 'utf8' });
      const m = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
      expect(m.files[RULES].user_modified).toBe(true);
  });

  it('--yes + --take-theirs sobrescreve user-modified', () => {
    const trackedFile = join(tmp, RULES);
    expect(existsSync(trackedFile)).toBe(true);
      writeFileSync(trackedFile, '# User-modified\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { encoding: 'utf8' });
      const content = readFileSync(trackedFile, 'utf8');
      expect(content).toBe(readFileSync(join(REPO_ROOT, SOURCE), 'utf8'));
  });

  it('falha se manifest nao existe (nao foi feito init)', () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'xp-stack-update-noinit-'));
    expect(() => {
      execFileSync('node', [BIN, 'update', '--cwd', tmp2, '--yes'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/manifest nao encontrado|run init first/i);
    rmSync(tmp2, { recursive: true, force: true });
  });

  it('drift detectado sem --yes retorna exit 1', () => {
    const trackedFile = join(tmp, RULES);
    expect(existsSync(trackedFile)).toBe(true);
      writeFileSync(trackedFile, '# User-modified\n', 'utf8');
      expect(() => {
        execFileSync('node', [BIN, 'update', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
      }).toThrow(/Drift detectado/);
  });

  function manifest() {
    return JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
  }

  function saveManifest(value) {
    writeFileSync(join(tmp, '.xp-stack/manifest.json'), JSON.stringify(value));
  }

  function simulateOlderRules() {
    const old = '# An older installed release\n';
    writeFileSync(join(tmp, RULES), old);
    const m = manifest();
    m.files[RULES].hash = hash(old);
    m.installed_version = '1.0.0';
    saveManifest(m);
  }

  it('atualiza source novo mesmo sem drift e preserva arquivo local não gerenciado', () => {
    simulateOlderRules();
    writeFileSync(join(tmp, 'my-notes.md'), 'keep me');
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    const source = readFileSync(join(REPO_ROOT, SOURCE), 'utf8');
    expect(readFileSync(join(tmp, RULES), 'utf8')).toBe(source);
    expect(manifest().files[RULES].hash).toBe(hash(source));
    expect(manifest().installed_version).toBe(JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version);
    expect(readFileSync(join(tmp, 'my-notes.md'), 'utf8')).toBe('keep me');
  });

  it('descobre novas referências da skill instalada nos dois mirrors sem instalar opt-ins', () => {
    const m = manifest();
    const rels = ['.claude', '.agents'].map((engine) => `${engine}/skills/optimizing-github-actions/references/caching.md`);
    for (const rel of rels) {
      expect(m.files[rel]).toBeTruthy();
      delete m.files[rel];
      rmSync(join(tmp, rel));
    }
    saveManifest(m);
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    for (const rel of rels) {
      expect(existsSync(join(tmp, rel))).toBe(true);
      expect(manifest().files[rel].source).toBe('plugins/xp-stack/skills/optimizing-github-actions/references/caching.md');
    }
    expect(existsSync(join(tmp, '.claude/skills/paperclip-orchestrator'))).toBe(false);
  });

  it('atualiza template de tarefa legado cujo manifest guardava reticências como source', () => {
    const rel = 'docs/tasks/_template/TEMPLATE-overview.md';
    const m = manifest();
    expect(m.files[rel]).toBeTruthy();
    writeFileSync(join(tmp, rel), '# old template');
    m.files[rel].hash = hash('# old template');
    m.files[rel].source = 'plugins/xp-stack/templates/docs-tasks-template/...';
    saveManifest(m);
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    const source = 'plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-overview.md';
    expect(readFileSync(join(tmp, rel), 'utf8')).toBe(readFileSync(join(REPO_ROOT, source), 'utf8'));
    expect(manifest().files[rel].source).toBe(source);
  });

  it('nova referência que colide com conteúdo local não é sobrescrita nem adotada', () => {
    const rel = '.claude/skills/optimizing-github-actions/references/caching.md';
    const m = manifest();
    delete m.files[rel];
    saveManifest(m);
    writeFileSync(join(tmp, rel), 'local reference');
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, rel), 'utf8')).toBe('local reference');
    expect(manifest().files[rel]).toBeUndefined();
  });

  it('preserva exclusão local por default e restaura só com take-theirs', () => {
    rmSync(join(tmp, RULES));
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    expect(existsSync(join(tmp, RULES))).toBe(false);
    expect(manifest().files[RULES].user_modified).toBe(true);
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, RULES), 'utf8')).toBe(readFileSync(join(REPO_ROOT, SOURCE), 'utf8'));
  });

  it('detecta conflito antes de qualquer escrita em outro arquivo atualizável', () => {
    simulateOlderRules();
    writeFileSync(join(tmp, '.claude/skills/tdd-conventions/SKILL.md'), '# local instructions');
    const before = readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8');
    expect(() => execFileSync('node', [BIN, 'update', '--cwd', tmp], { stdio: 'pipe' })).toThrow(/Drift detectado/);
    expect(readFileSync(join(tmp, RULES), 'utf8')).toBe('# An older installed release\n');
    expect(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8')).toBe(before);
  });

  it('recusa destino que atravesse symlink sem alterar o alvo', () => {
    const outside = join(tmp, 'outside.txt');
    writeFileSync(outside, 'untouched');
    rmSync(join(tmp, RULES));
    symlinkSync(outside, join(tmp, RULES));
    expect(() => execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { stdio: 'pipe' })).toThrow(/symlink|link simbólico/i);
    expect(readFileSync(outside, 'utf8')).toBe('untouched');
  });

  it('recusa path que escape do projeto antes de tocar arquivos', () => {
    const m = manifest();
    m.files['../outside.md'] = { hash: hash('old'), source: SOURCE };
    saveManifest(m);
    expect(() => execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' })).toThrow(/path|caminho|fora/i);
  });

  it('recusa manifest simbólico antes de gravar no alvo externo', () => {
    const manifestPath = join(tmp, '.xp-stack/manifest.json');
    const before = readFileSync(manifestPath, 'utf8');
    const target = join(tmp, 'private-manifest.json');
    writeFileSync(target, before);
    rmSync(manifestPath);
    symlinkSync(target, manifestPath);
    expect(() => execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' })).toThrow(/symlink|link simbólico/i);
    expect(readFileSync(target, 'utf8')).toBe(before);
  });

  it('valida schema do manifest antes de atualizar o conteúdo instalado', () => {
    simulateOlderRules();
    const m = manifest();
    m.invalidField = true;
    saveManifest(m);
    expect(() => execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' })).toThrow(/Manifest invalido/);
    expect(readFileSync(join(tmp, RULES), 'utf8')).toBe('# An older installed release\n');
  });

  it.each(['CLAUDE.md', '.claude/settings.json'])('preserva %s do projeto mesmo com take-theirs', (rel) => {
    const local = rel.endsWith('.json') ? '{"permissions":{"deny":["Bash(rm:*)"]}}\n' : '# Projeto\nADR importante\n';
    writeFileSync(join(tmp, rel), local);
    const out = execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { encoding: 'utf8' });
    expect(readFileSync(join(tmp, rel), 'utf8')).toBe(local);
    expect(out).toContain(rel);
    expect(out).toMatch(/projeto.*preservado|preservado.*projeto/i);
  });

  it.each(['CLAUDE.md', '.claude/settings.json'])('não troca %s nem quando o source mudou e não há drift local', (rel) => {
    const old = rel.endsWith('.json') ? '{"hooks":{}}\n' : '# Instruções de release anterior\n';
    writeFileSync(join(tmp, rel), old);
    const m = manifest();
    m.files[rel].hash = hash(old);
    saveManifest(m);
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, rel), 'utf8')).toBe(old);
  });

  it('avisa exclusão local sem exigir take-theirs nem parar atualizações independentes', () => {
    simulateOlderRules();
    const rel = 'docs/pesquisas/_template/TEMPLATE-pesquisa.md';
    rmSync(join(tmp, rel));
    const out = execFileSync('node', [BIN, 'update', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toContain('removido localmente');
    expect(existsSync(join(tmp, rel))).toBe(false);
    expect(readFileSync(join(tmp, RULES), 'utf8')).toBe(readFileSync(join(REPO_ROOT, SOURCE), 'utf8'));
    expect(out).toContain(RULES);
  });

  it('descobre novo template somente dentro do diretório de templates já instalado', () => {
    const rel = 'docs/tasks/_template/TEMPLATE-task.md';
    const m = manifest();
    delete m.files[rel];
    rmSync(join(tmp, rel));
    saveManifest(m);
    execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, rel), 'utf8')).toBe(readFileSync(join(REPO_ROOT, 'plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-task.md'), 'utf8'));
    expect(manifest().files[rel].source).toBe('plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-task.md');
  });
});
