import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFile } from '../../src/lib/manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack add-engine', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-engine-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
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
        destRel.startsWith('.claude/skills/') &&
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
      const skillRel = initDestRel.slice('.claude/skills/'.length);
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

  it('nao instala opt-ins que nao estavam habilitadas', () => {
    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    expect(existsSync(join(tmp, '.codex/skills/local-waves/SKILL.md'))).toBe(false);
    expect(existsSync(join(tmp, '.codex/skills/paperclip-orchestrator/SKILL.md'))).toBe(false);
  });

  it('replica opt-in ja habilitada e deixa outras opt-ins desabilitadas', () => {
    execFileSync('node', [BIN, 'add-skill', 'local-waves', '--cwd', tmp], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'add-engine', 'codex', '--cwd', tmp], { encoding: 'utf8' });

    const source = join(REPO_ROOT, 'plugins/xp-stack/skills/local-waves/SKILL.md');
    const dest = join(tmp, '.codex/skills/local-waves/SKILL.md');
    expect(readFileSync(dest, 'utf8')).toBe(readFileSync(source, 'utf8'));
    expect(existsSync(join(tmp, '.codex/skills/paperclip-orchestrator/SKILL.md'))).toBe(false);
    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    expect(manifest.files['.codex/skills/local-waves/SKILL.md']).toEqual({
      hash: hashFile(dest),
      source: 'plugins/xp-stack/skills/local-waves/SKILL.md',
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
