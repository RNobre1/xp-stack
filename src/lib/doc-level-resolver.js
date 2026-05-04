export const DOC_LEVELS = ['essencial', 'completo'];
export const DOC_LEVEL_DEFAULT = 'completo';

const DOC_LEVEL_DESCRIPTIONS = {
  essencial:
    'overview curto, sem ondas paralelas, T-files minimalistas (recomendado pra projeto pequeno/MVP)',
  completo:
    'overview + PROGRESS + T-files cheios com red->green->refactor + TERMINAL-PROMPTS pra paralelismo (recomendado pra projeto serio)',
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
 * 2. `opts.yes === true` ou non-TTY — usa default 'completo'
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
