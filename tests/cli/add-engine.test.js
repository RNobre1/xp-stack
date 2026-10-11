import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFile } from '../../src/lib/manifest.js';
import { OPT_IN_SKILLS } from '../../src/lib/opt-in-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack add-engine', () => {
  let tmp;
  let outside;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-engine-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (outside) rmSync(outside, { recursive: true, force: true });
    outside = undefined;
  });

  it('adiciona engine no index e instala templates pra ela', () => {
    execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('cursor');
  });

  it('instala skills core e referencias registradas pelo init na nova engine e rastreia hashes', () => {
    const initManifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const initializedSkillFiles = Object.entries(initManifest.files).filter(
      ([destRel, entry]) =>
        destRel.split('\\').join('/').startsWith('.claude/skills/') &&
        entry.source?.startsWith('plugins/xp-stack/skills/'),
    );
    expect(initializedSkillFiles.some(
      ([, entry]) => entry.source === 'plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md',
    )).toBe(true);

    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const index = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(manifest.engines).toEqual(index.engines_installed);
    for (const [initDestRel, initEntry] of initializedSkillFiles) {
      const skillRel = initDestRel.split('\\').join('/').slice('.claude/skills/'.length);
      const source = join(REPO_ROOT, ...initEntry.source.split('/'));
      const destRel = join('.codex/skills', skillRel);
      const dest = join(tmp, destRel);
      expect(readFileSync(dest, 'utf8')).toBe(readFileSync(source, 'utf8'));
      expect(manifest.files[destRel]).toEqual({
        hash: hashFile(dest),
        source: initEntry.source,
        user_modified: false,
      });
    }
  });

  it('nao promove opt-ins de templates a skills ativos quando nao habilitados', () => {
    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    // Legacy template payloads stay nested under opt-in-skills; none becomes an active top-level skill.
    for (const skillName of Object.keys(OPT_IN_SKILLS)) {
      expect(existsSync(join(tmp, `.codex/skills/${skillName}/SKILL.md`))).toBe(false);
    }
  });

  it('replica opt-in ja habilitada e deixa outras opt-ins desabilitadas', () => {
    execFileSync('node', [BIN, 'add-skill', 'local-waves', '--cwd', tmp], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'add-skill', 'db-archaeologist', '--cwd', tmp], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    const source = join(REPO_ROOT, 'plugins/xp-stack/skills/local-waves/SKILL.md');
    const dest = join(tmp, '.codex/skills/local-waves/SKILL.md');
    expect(readFileSync(dest, 'utf8')).toBe(readFileSync(source, 'utf8'));
    const registrySource = join(REPO_ROOT, 'templates/opt-in-skills/db-archaeologist/SKILL.md');
    const registryDest = join(tmp, '.codex/skills/db-archaeologist/SKILL.md');
    expect(readFileSync(registryDest, 'utf8')).toBe(readFileSync(registrySource, 'utf8'));
    expect(existsSync(join(tmp, '.codex/skills/paperclip-orchestrator/SKILL.md'))).toBe(false);
    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    expect(manifest.files['.codex/skills/local-waves/SKILL.md']).toEqual({
      hash: hashFile(dest),
      source: 'plugins/xp-stack/skills/local-waves/SKILL.md',
      user_modified: false,
    });
    expect(manifest.files['.codex/skills/db-archaeologist/SKILL.md']).toEqual({
      hash: hashFile(registryDest),
      source: 'templates/opt-in-skills/db-archaeologist/SKILL.md',
      user_modified: false,
    });
  });

  it('preserva arquivo customizado no destino da nova engine', () => {
    const dest = join(tmp, '.codex/skills/akita-xp-rules/SKILL.md');
    mkdirSync(join(tmp, '.codex/skills/akita-xp-rules'), { recursive: true });
    writeFileSync(dest, '# Custom rules\n');

    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    expect(readFileSync(dest, 'utf8')).toBe('# Custom rules\n');
    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    expect(manifest.files['.codex/skills/akita-xp-rules/SKILL.md']).toBeUndefined();
  });

  it('rejeita skillsDir symlink antes de qualquer escrita fora do projeto', () => {
    outside = mkdtempSync(join(tmpdir(), 'xp-stack-add-engine-outside-'));
    symlinkSync(outside, join(tmp, '.codex'), process.platform === 'win32' ? 'junction' : 'dir');
    const manifestPath = join(tmp, '.xp-stack/manifest.json');
    const indexPath = join(tmp, '.xp-stack/index.json');
    const manifestBefore = readFileSync(manifestPath, 'utf8');
    const indexBefore = readFileSync(indexPath, 'utf8');

    const result = spawnSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}\n${result.stdout}`).toMatch(/symlink no caminho gerenciado/i);
    expect(readdirSync(outside)).toEqual([]);
    expect(readFileSync(manifestPath, 'utf8')).toBe(manifestBefore);
    expect(readFileSync(indexPath, 'utf8')).toBe(indexBefore);
  });

  it('falha com engine name desconhecido', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'engine-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/engine desconhecida|unknown engine/i);
  });

  it('idempotente: adicionar engine ja presente nao falha', () => {
    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });
    const manifest1 = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const index1 = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });
    }).not.toThrow();
    const manifest2 = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const index2 = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(manifest2.files).toEqual(manifest1.files);
    expect(index2.engines_installed).toEqual(index1.engines_installed);
  });
});
