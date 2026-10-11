export const DOC_LEVELS = ['essencial', 'completo'];
export const DOC_LEVEL_DEFAULT = 'essencial';

const DOC_LEVEL_DESCRIPTIONS = {
  essencial:
    'estado único e documentação mínima do incremento; paralelismo conforme a sessão',
  completo:
    'acrescenta snapshots derivados quando a coordenação precisa; não cria outra fonte de estado',
};

export function getDocLevelChoices() {
  return DOC_LEVELS.map((value) => ({
    value,
    name: `${value} — ${DOC_LEVEL_DESCRIPTIONS[value]}`,
  }));
}

/**
 * Resolve doc_level conforme opts + ambiente.
 *
 * Precedencia:
 * 1. `opts.docLevel` (--doc-level flag) — sempre vence
 * 2. `opts.yes === true` ou non-TTY — usa DOC_LEVEL_DEFAULT
 * 3. interactive — chama prompt
 *
 * @param {object} opts
 * @param {object} deps
 * @param {(choices: object[]) => Promise<string>} [deps.prompt]
 * @param {boolean} [deps.isTTY]
 * @returns {Promise<{docLevel: string, mode: 'flag'|'auto'|'interactive'}>}
 */
export async function resolveDocLevel(opts, deps = {}) {
  const isTTY = deps.isTTY ?? Boolean(process.stdin?.isTTY);

  if (opts.docLevel) {
    if (!DOC_LEVELS.includes(opts.docLevel)) {
      throw new Error(
        `xp-stack: doc-level invalido "${opts.docLevel}". Aceitos: ${DOC_LEVELS.join(', ')}.`
      );
    }
    return { docLevel: opts.docLevel, mode: 'flag' };
  }

  if (opts.yes === true || !isTTY) {
    return { docLevel: DOC_LEVEL_DEFAULT, mode: 'auto' };
  }

  if (!deps.prompt) {
    throw new Error('resolveDocLevel: modo interactive requer deps.prompt.');
  }
  const chosen = await deps.prompt(getDocLevelChoices());
  if (!DOC_LEVELS.includes(chosen)) {
    throw new Error(`resolveDocLevel: prompt retornou valor invalido "${chosen}".`);
  }
  return { docLevel: chosen, mode: 'interactive' };
}
