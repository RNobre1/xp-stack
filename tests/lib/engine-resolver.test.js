import { describe, it, expect, vi } from 'vitest';
import { resolveEngines, getAllEngineChoices } from '../../src/lib/engine-resolver.js';

describe('resolveEngines', () => {
  it('--engine flag sempre vence (csv)', async () => {
    const r = await resolveEngines(
      { engine: 'claude-code,codex' },
      '/tmp/whatever',
      { detect: () => ['cursor'], isTTY: true, prompt: vi.fn() }
    );
    expect(r).toEqual({ engines: ['claude-code', 'codex'], mode: 'flag' });
  });

  it('--yes em projeto sem nada: retorna [] (caller decide se falha)', async () => {
    const r = await resolveEngines(
      { yes: true },
      '/tmp/empty',
      { detect: () => [], isTTY: true }
    );
    expect(r.engines).toEqual([]);
    expect(r.mode).toBe('auto');
  });

  it('--yes com claude-code detectado: adiciona antigravity (dual mirror)', async () => {
    const r = await resolveEngines(
      { yes: true },
      '/tmp/x',
      { detect: () => ['claude-code'], isTTY: true }
    );
    expect(r.engines).toEqual(expect.arrayContaining(['claude-code', 'antigravity']));
    expect(r.engines).toHaveLength(2);
  });

  it('--yes --no-dual-mirror: nao adiciona antigravity', async () => {
    const r = await resolveEngines(
      { yes: true, dualMirror: false },
      '/tmp/x',
      { detect: () => ['claude-code'], isTTY: true }
    );
    expect(r.engines).toEqual(['claude-code']);
  });

  it('non-TTY (CI/pipe) sem --yes: ainda usa auto-detect (mode=auto)', async () => {
    const r = await resolveEngines(
      {},
      '/tmp/x',
      { detect: () => ['cursor'], isTTY: false }
    );
    expect(r.engines).toEqual(['cursor']);
    expect(r.mode).toBe('auto');
  });

  it('interactive (TTY, sem --yes, sem --engine): chama prompt com detectadas como dica', async () => {
    const promptMock = vi.fn().mockResolvedValue(['claude-code', 'cursor']);
    const r = await resolveEngines(
      {},
      '/tmp/x',
      { detect: () => ['claude-code'], isTTY: true, prompt: promptMock }
    );
    expect(promptMock).toHaveBeenCalledWith(['claude-code']);
    expect(r.engines).toEqual(['claude-code', 'cursor']);
    expect(r.mode).toBe('interactive');
  });

  it('interactive em projeto sem nada: chama prompt com [] e nao falha', async () => {
    const promptMock = vi.fn().mockResolvedValue(['cursor', 'codex']);
    const r = await resolveEngines(
      {},
      '/tmp/empty',
      { detect: () => [], isTTY: true, prompt: promptMock }
    );
    expect(promptMock).toHaveBeenCalledWith([]);
    expect(r.engines).toEqual(['cursor', 'codex']);
  });

  it('interactive sem prompt nas deps: throw (bug do chamador)', async () => {
    await expect(
      resolveEngines({}, '/tmp/x', { detect: () => [], isTTY: true })
    ).rejects.toThrow(/requer deps\.prompt/);
  });
});

describe('getAllEngineChoices', () => {
  it('retorna 13 engines com value+name pra checkbox', () => {
    const choices = getAllEngineChoices();
    expect(choices).toHaveLength(13);
    const claude = choices.find((c) => c.value === 'claude-code');
    expect(claude).toBeDefined();
    expect(claude.name).toMatch(/Claude Code/);
  });
});
