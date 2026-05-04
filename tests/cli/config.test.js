import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack config', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-config-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], {
      encoding: 'utf8',
    });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('get', () => {
    it('imprime config completa quando sem key', () => {
      const out = execFileSync('node', [BIN, 'config', 'get', '--cwd', tmp], { encoding: 'utf8' });
      expect(out).toMatch(/doc_level_default: completo/);
      expect(out).toMatch(/engines_installed: claude-code/);
      expect(out).toMatch(/active_features:/);
    });

    it('com key, imprime so o valor', () => {
      const out = execFileSync('node', [BIN, 'config', 'get', 'doc_level_default', '--cwd', tmp], {
        encoding: 'utf8',
      });
      expect(out.trim()).toBe('completo');
    });

    it('key desconhecida: erro listando opcoes', () => {
      expect(() => {
        execFileSync('node', [BIN, 'config', 'get', 'foo', '--cwd', tmp], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      }).toThrow(/key "foo" desconhecida/i);
    });

    it('sem index (init nao rodado): erro claro', () => {
      const tmp2 = mkdtempSync(join(tmpdir(), 'xp-stack-config-noinit-'));
      try {
        expect(() => {
          execFileSync('node', [BIN, 'config', 'get', '--cwd', tmp2], { encoding: 'utf8', stdio: 'pipe' });
        }).toThrow(/nenhum index encontrado/i);
      } finally {
        rmSync(tmp2, { recursive: true, force: true });
      }
    });
  });

  describe('doc-level', () => {
    it('valor valido: atualiza index.json', () => {
      const out = execFileSync('node', [BIN, 'config', 'doc-level', 'essencial', '--cwd', tmp], {
        encoding: 'utf8',
      });
      expect(out).toMatch(/completo -> essencial/);
      const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
      expect(idx.doc_level_default).toBe('essencial');
    });

    it('mesmo valor: idempotente, nao reescreve', () => {
      const out = execFileSync('node', [BIN, 'config', 'doc-level', 'completo', '--cwd', tmp], {
        encoding: 'utf8',
      });
      expect(out).toMatch(/ja esta em "completo"/);
    });

    it('valor invalido: erro listando aceitos', () => {
      expect(() => {
        execFileSync('node', [BIN, 'config', 'doc-level', 'xyz', '--cwd', tmp], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      }).toThrow(/valor invalido.*essencial.*completo/i);
    });

    it('sem init: erro claro', () => {
      const tmp2 = mkdtempSync(join(tmpdir(), 'xp-stack-config-doclvl-noinit-'));
      try {
        expect(() => {
          execFileSync('node', [BIN, 'config', 'doc-level', 'essencial', '--cwd', tmp2], {
            encoding: 'utf8',
            stdio: 'pipe',
          });
        }).toThrow(/nenhum index encontrado/i);
      } finally {
        rmSync(tmp2, { recursive: true, force: true });
      }
    });
  });
});

describe('xp-stack init --doc-level', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-init-doclvl-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('--doc-level essencial: grava essencial em index.json', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes', '--doc-level', 'essencial'], {
      encoding: 'utf8',
    });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.doc_level_default).toBe('essencial');
  });

  it('--doc-level invalido: erro', () => {
    expect(() => {
      execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes', '--doc-level', 'xyz'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).toThrow(/doc-level invalido/i);
  });

  it('--yes sem --doc-level: usa default completo', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], {
      encoding: 'utf8',
    });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.doc_level_default).toBe('completo');
  });

  it('re-init NAO re-pergunta doc_level se ja existe (preserva)', () => {
    // primeiro init com essencial
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes', '--doc-level', 'essencial'], { encoding: 'utf8' });
    expect(JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8')).doc_level_default).toBe('essencial');
    // re-init sem flag — deve preservar 'essencial' (nao voltar pra default 'completo')
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    expect(JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8')).doc_level_default).toBe('essencial');
  });

  it('re-init com --doc-level explicito sobrescreve', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes', '--doc-level', 'essencial'], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes', '--doc-level', 'completo'], { encoding: 'utf8' });
    expect(JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8')).doc_level_default).toBe('completo');
  });
});
