import { describe, it, expect, vi } from 'vitest';
import {
  resolveDocLevel,
  getDocLevelChoices,
  DOC_LEVELS,
  DOC_LEVEL_DEFAULT,
} from '../../src/lib/doc-level-resolver.js';

describe('resolveDocLevel', () => {
  it('--doc-level flag valida sempre vence', async () => {
    const r = await resolveDocLevel({ docLevel: 'essencial' }, { isTTY: true, prompt: vi.fn() });
    expect(r).toEqual({ docLevel: 'essencial', mode: 'flag' });
  });

  it('--doc-level invalido lanca erro listando opcoes', async () => {
    await expect(resolveDocLevel({ docLevel: 'xyz' }, { isTTY: true })).rejects.toThrow(
      /doc-level invalido.*essencial.*completo/i
    );
  });

  it('--yes em TTY usa default completo', async () => {
    const r = await resolveDocLevel({ yes: true }, { isTTY: true });
    expect(r).toEqual({ docLevel: 'completo', mode: 'auto' });
  });

  it('non-TTY (CI) sem --yes usa default', async () => {
    const r = await resolveDocLevel({}, { isTTY: false });
    expect(r.docLevel).toBe(DOC_LEVEL_DEFAULT);
    expect(r.mode).toBe('auto');
  });

  it('interactive: chama prompt e retorna escolha', async () => {
    const prompt = vi.fn().mockResolvedValue('essencial');
    const r = await resolveDocLevel({}, { isTTY: true, prompt });
    expect(prompt).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ value: 'essencial' }),
      expect.objectContaining({ value: 'completo' }),
    ]));
    expect(r).toEqual({ docLevel: 'essencial', mode: 'interactive' });
  });

  it('interactive sem prompt nas deps: throw', async () => {
    await expect(resolveDocLevel({}, { isTTY: true })).rejects.toThrow(/requer deps\.prompt/);
  });

  it('prompt retorna valor invalido: throw (defesa contra bug do prompt)', async () => {
    const prompt = vi.fn().mockResolvedValue('xyz');
    await expect(resolveDocLevel({}, { isTTY: true, prompt })).rejects.toThrow(/valor invalido/);
  });
});

describe('getDocLevelChoices', () => {
  it('retorna 2 opcoes (essencial, completo) com descricao', () => {
    const choices = getDocLevelChoices();
    expect(choices).toHaveLength(2);
    expect(choices[0].value).toBe('essencial');
    expect(choices[0].name).toMatch(/MVP|pequeno/);
    expect(choices[1].value).toBe('completo');
    expect(choices[1].name).toMatch(/serio|paralel/);
  });
});

describe('DOC_LEVELS constant', () => {
  it('match o enum do schema', () => {
    expect(DOC_LEVELS).toEqual(['essencial', 'completo']);
  });
});
