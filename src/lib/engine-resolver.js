import { ENGINE_PATHS, detectEngines as defaultDetect } from './engines.js';

const ENGINE_LABELS = {
  'claude-code':  'Claude Code (.claude/)',
  'codex':        'OpenAI Codex (.codex/)',
  'cursor':       'Cursor (.cursor/)',
  'antigravity':  'Antigravity (AGENTS.md, .agents/skills)',
  'gemini-cli':   'Gemini CLI (.gemini/)',
  'windsurf':     'Windsurf (.windsurfrules)',
  'cline':        'Cline (.cline/)',
  'roo-code':     'Roo Code (.roo/)',
  'copilot':      'GitHub Copilot (.github/copilot/)',
  'aider':        'Aider (.aider.conf.yml)',
  'amazon-q':     'Amazon Q (.amazonq/)',
  'kiro':         'Kiro (.kiro/)',
  'opencode':     'opencode (.opencode/)',
};

export function getAllEngineChoices() {
  return Object.keys(ENGINE_PATHS).map((name) => ({
    value: name,
    name: ENGINE_LABELS[name] ?? name,
  }));
}

/**
 * Resolve quais engines instalar conforme opts + ambiente.
 *
 * Ordem de precedencia:
 * 1. `opts.engine` (csv) → override explicito, sempre vence
 * 2. `opts.yes === true` ou stdin nao-TTY → auto-detect (modo non-interactive / CI)
 * 3. interactive → checkbox prompt com todas as engines (detectadas pre-marcadas)
 *
 * Em modo (2) com auto-detect ativo (sem --no-dual-mirror): se claude-code detectado e
 * antigravity nao, adiciona antigravity (dual mirror always-on).
 *
 * @param {object} opts - flags do CLI
 * @param {string} projectRoot
 * @param {object} deps
 * @param {(root: string) => string[]} [deps.detect=defaultDetect]
 * @param {(detected: string[]) => Promise<string[]>} [deps.prompt] - obrigatorio se modo (3)
 * @param {boolean} [deps.isTTY] - default: process.stdin.isTTY
 * @returns {Promise<{engines: string[], mode: 'flag'|'auto'|'interactive'}>}
 */
export async function resolveEngines(opts, projectRoot, deps = {}) {
  const detect = deps.detect ?? defaultDetect;
  const isTTY = deps.isTTY ?? Boolean(process.stdin?.isTTY);

  // (1) flag explicita
  if (opts.engine) {
    const list = opts.engine.split(',').map((e) => e.trim()).filter(Boolean);
    return { engines: list, mode: 'flag' };
  }

  const detected = detect(projectRoot);

  // (2) non-interactive (--yes ou nao-TTY): auto-detect com dual mirror opcional
  if (opts.yes === true || !isTTY) {
    const set = new Set(detected);
    if (opts.dualMirror !== false && set.has('claude-code') && !set.has('antigravity')) {
      set.add('antigravity');
    }
    return { engines: Array.from(set), mode: 'auto' };
  }

  // (3) interactive: prompt checkbox com 13 engines, detectadas pre-marcadas
  if (!deps.prompt) {
    throw new Error('resolveEngines: modo interactive requer deps.prompt (Bug do chamador, nao do usuario).');
  }
  const chosen = await deps.prompt(detected);
  return { engines: chosen, mode: 'interactive' };
}
